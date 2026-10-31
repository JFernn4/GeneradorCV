/**
 * cv-builder.js
 * Función pura buildCV(datos, opciones) que genera la estructura canónica del CV.
 * Sin HTML, sin estilos y totalmente desacoplada de la capa visual.
 */

import { CATALOGO_AREAS, DURACIONES, ESTUDIOS_LABELS, NIVELES_IDIOMA, VEHICULO_LABELS } from "./catalogo.js";
import { validarEstado, desduplicarCadenas, normalizarNombre, normalizarTelefono } from "./validacion.js";

/**
 * Une una lista de elementos en lenguaje natural usando comas y "y" final.
 * Ej: ["construcción", "limpieza"] -> "construcción y limpieza"
 *     ["a", "b", "c"] -> "a, b y c"
 * @param {string[]} items
 * @returns {string}
 */
export function formatearListaY(items) {
  if (!items || items.length === 0) return "";
  const limpios = items.filter(Boolean);
  if (limpios.length === 0) return "";
  if (limpios.length === 1) return limpios[0];
  if (limpios.length === 2) return `${limpios[0]} y ${limpios[1]}`;
  const resto = limpios.slice(0, -1).join(", ");
  return `${resto} y ${limpios[limpios.length - 1]}`;
}

/**
 * Obtiene el nombre en minúscula para mostrar de un id de área.
 * @param {string} areaId
 * @param {string|null} areaOtraTexto
 * @returns {string}
 */
function obtenerNombreArea(areaId, areaOtraTexto) {
  if (areaId === "otro" && areaOtraTexto) {
    return areaOtraTexto.trim().toLowerCase();
  }
  const cat = CATALOGO_AREAS[areaId];
  return cat ? cat.nombreMinuscula : areaId.toLowerCase();
}

/**
 * Detecta las áreas ocupacionales de las experiencias laborales registradas.
 * @param {Array<{puesto: string, area?: string}>} experiencias
 * @param {string[]} areasBuscadas
 * @param {string|null} areaOtraTexto
 * @returns {string[]} Nombres en minúscula (máx 3)
 */
function deducirAreasExperiencia(experiencias, areasBuscadas, areaOtraTexto) {
  const detectadas = [];
  const vistas = new Set();

  for (const exp of experiencias) {
    let encontrada = null;
    if (exp.area) {
      encontrada = obtenerNombreArea(exp.area, areaOtraTexto);
    } else if (exp.puesto) {
      const puestoMin = exp.puesto.toLowerCase();
      for (const [key, cat] of Object.entries(CATALOGO_AREAS)) {
        if (key === "otro") continue;
        const coincidePuesto = cat.puestos.some(p => p.toLowerCase() === puestoMin);
        const coincideNombre = puestoMin.includes(cat.nombreMinuscula);
        if (coincidePuesto || coincideNombre) {
          encontrada = cat.nombreMinuscula;
          break;
        }
      }
    }

    if (encontrada && !vistas.has(encontrada)) {
      vistas.add(encontrada);
      detectadas.push(encontrada);
    }
  }

  // Si no se dedujo de los puestos, tomar de las áreas de trabajo indicadas por el usuario
  if (detectadas.length === 0 && areasBuscadas && areasBuscadas.length > 0) {
    for (const a of areasBuscadas) {
      const nom = obtenerNombreArea(a, areaOtraTexto);
      if (!vistas.has(nom)) {
        vistas.add(nom);
        detectadas.push(nom);
      }
    }
  }

  return detectadas.slice(0, 3);
}

/**
 * Calcula la estimación conservadora de experiencia según cotas inferiores en meses.
 * lt6m=0, 6m_1a=6, 1_3a=12, gt3a=36.
 * @param {Array<{duracion: string}>} experiencias
 * @returns {{ texto: string|null, totalMeses: number }}
 */
function calcularTiempoExperiencia(experiencias) {
  const cotas = {
    lt6m: 0,
    "6m_1a": 6,
    "1_3a": 12,
    gt3a: 36
  };

  let totalMeses = 0;
  for (const exp of experiencias) {
    totalMeses += (cotas[exp.duracion] !== undefined ? cotas[exp.duracion] : 0);
  }

  if (totalMeses >= 60) return { texto: "más de 5 años", totalMeses };
  if (totalMeses >= 36) return { texto: "más de 3 años", totalMeses };
  if (totalMeses >= 24) return { texto: "más de 2 años", totalMeses };
  if (totalMeses >= 12) return { texto: "más de 1 año", totalMeses };
  if (totalMeses >= 6) return { texto: "más de 6 meses", totalMeses };
  return { texto: null, totalMeses };
}

/**
 * Genera la frase de disponibilidad horaria e inmediata.
 * @param {{jornada: string, inmediata: boolean}} disponibilidad
 * @returns {string}
 */
export function armarFraseDisponibilidad(disponibilidad) {
  if (!disponibilidad) return "Disponibilidad de tiempo completo.";
  const jornada = disponibilidad.jornada || "completo";
  const inmediata = Boolean(disponibilidad.inmediata);

  let base = "Disponibilidad de tiempo completo";
  if (jornada === "medio") {
    base = "Disponibilidad de medio tiempo";
  } else if (jornada === "temporal") {
    base = "Disponibilidad para trabajo por día o temporal";
  }

  if (inmediata) {
    base += ", con inicio inmediato";
  }

  return base + ".";
}

/**
 * Ordena y prioriza las habilidades según el orden de las áreas elegidas.
 * @param {string[]} habilidades
 * @param {string[]} areas
 * @param {number} max
 * @returns {string[]}
 */
function priorizarHabilidades(habilidades, areas, max) {
  if (!Array.isArray(habilidades)) return [];
  const vistas = new Set();
  const priorizadas = [];

  // 1. Añadir habilidades que pertenecen a las áreas seleccionadas (en su orden)
  for (const areaId of areas || []) {
    const cat = CATALOGO_AREAS[areaId];
    if (cat && Array.isArray(cat.habilidades)) {
      for (const habCat of cat.habilidades) {
        const encontrada = habilidades.find(h => h.toLowerCase() === habCat.toLowerCase());
        if (encontrada && !vistas.has(encontrada.toLowerCase())) {
          vistas.add(encontrada.toLowerCase());
          priorizadas.push(encontrada);
        }
      }
    }
  }

  // 2. Añadir las habilidades restantes ingresadas por el usuario
  for (const hab of habilidades) {
    const clave = hab.toLowerCase();
    if (!vistas.has(clave)) {
      vistas.add(clave);
      priorizadas.push(hab);
    }
  }

  return priorizadas.slice(0, max);
}

/**
 * Función pura buildCV(datos, opciones)
 * @param {object} datosEntrada
 * @param {{ densidad?: "normal" | "compacta" }} opciones
 * @returns {{ encabezado: { nombre: string, contactos: string[] }, secciones: Array<{ id: string, titulo: string, tipo: string, contenido: any }> }}
 */
export function buildCV(datosEntrada, opciones = {}) {
  // Asegurar normalización básica de datos mediante la capa de validación
  const normalizado = validarEstado(datosEntrada);
  const datos = normalizado.datos;
  const densidad = opciones.densidad === "compacta" ? "compacta" : "normal";

  const maxTareas = densidad === "compacta" ? 3 : 4;
  const maxHabilidades = densidad === "compacta" ? 6 : 8;

  // 1. Encabezado
  const contactos = [];
  if (datos.contacto.telefono) contactos.push(datos.contacto.telefono);
  if (datos.contacto.correo) contactos.push(datos.contacto.correo);
  if (datos.contacto.zona) contactos.push(datos.contacto.zona);

  const encabezado = {
    nombre: datos.contacto.nombre,
    contactos
  };

  // Fotografía opcional: solo incluirla en encabezado si existe y es válida.
  // Si es null o no fue provista, la propiedad 'foto' NO debe existir en el encabezado.
  const fotoVal = datos.foto || datosEntrada.foto || null;
  if (fotoVal && typeof fotoVal === "string" && fotoVal.startsWith("data:image/")) {
    encabezado.foto = fotoVal;
  }

  // 2. Construcción de secciones
  const secciones = [];

  // --- Perfil ---
  const areasBuscadas = (datos.areas || [])
    .slice(0, 3)
    .map(a => obtenerNombreArea(a, datos.areaOtraTexto));
  const textoAreasBuscadas = formatearListaY(areasBuscadas);
  const fraseDisp = armarFraseDisponibilidad(datos.disponibilidad);

  let textoPerfil = "";
  const tieneExperiencias = !datos.sinExperiencia && Array.isArray(datos.experiencias) && datos.experiencias.length > 0;

  if (tieneExperiencias) {
    const areasExp = deducirAreasExperiencia(datos.experiencias, datos.areas, datos.areaOtraTexto);
    const textoAreasExp = formatearListaY(areasExp);
    const expCalculada = calcularTiempoExperiencia(datos.experiencias);

    let frase1 = "";
    if (expCalculada.texto) {
      frase1 = `Persona con ${expCalculada.texto} de experiencia en ${textoAreasExp}.`;
    } else {
      frase1 = `Persona con experiencia en ${textoAreasExp}.`;
    }

    const frase2 = `Busca empleo en ${textoAreasBuscadas}.`;
    const frase3 = fraseDisp;
    textoPerfil = `${frase1} ${frase2} ${frase3}`;
  } else {
    // Sin experiencia
    const frase1 = `Persona que busca empleo en ${textoAreasBuscadas}.`;
    let frase2 = "";
    if (datos.habilidades && datos.habilidades.length > 0) {
      const dosHabs = datos.habilidades.slice(0, 2).map(h => h.toLowerCase());
      frase2 = `Cuenta con habilidades en ${formatearListaY(dosHabs)}. `;
    }
    const frase3 = fraseDisp;
    textoPerfil = `${frase1} ${frase2}${frase3}`;
  }

  secciones.push({
    id: "perfil",
    titulo: "Perfil",
    tipo: "texto",
    contenido: textoPerfil
  });

  // --- Experiencia Laboral (solo si tiene y sinExperiencia es false) ---
  const seccionExperiencia = {
    id: "experiencia",
    titulo: "Experiencia laboral",
    tipo: "entradas",
    contenido: []
  };

  if (tieneExperiencias) {
    for (const exp of datos.experiencias) {
      const duracionLegible = DURACIONES[exp.duracion] || "Menos de 6 meses";
      const subtitulo = exp.lugar ? `${exp.lugar} · ${duracionLegible}` : duracionLegible;
      const tareasFiltradas = (exp.tareas || []).slice(0, maxTareas);

      seccionExperiencia.contenido.push({
        titulo: exp.puesto,
        subtitulo,
        viñetas: tareasFiltradas
      });
    }
  }

  // --- Habilidades ---
  const habilidadesOrdenadas = priorizarHabilidades(datos.habilidades, datos.areas, maxHabilidades);
  const seccionHabilidades = {
    id: "habilidades",
    titulo: "Habilidades",
    tipo: "lista",
    contenido: habilidadesOrdenadas
  };

  // Orden según sinExperiencia:
  // Si sinExperiencia es true: Habilidades va justo después de Perfil
  if (datos.sinExperiencia) {
    if (seccionHabilidades.contenido.length > 0) {
      secciones.push(seccionHabilidades);
    }
  } else {
    if (seccionExperiencia.contenido.length > 0) {
      secciones.push(seccionExperiencia);
    }
    if (seccionHabilidades.contenido.length > 0) {
      secciones.push(seccionHabilidades);
    }
  }

  // --- Idiomas ---
  if (datos.idiomas && datos.idiomas.length > 0) {
    const listaIdiomas = datos.idiomas.map(item => {
      const nivelLegible = NIVELES_IDIOMA[item.nivel] || "Intermedio";
      return `${item.idioma} (${nivelLegible})`;
    });
    if (listaIdiomas.length > 0) {
      secciones.push({
        id: "idiomas",
        titulo: "Idiomas",
        tipo: "lista",
        contenido: listaIdiomas
      });
    }
  }

  // --- Estudios ---
  if (datos.estudios && ESTUDIOS_LABELS[datos.estudios]) {
    secciones.push({
      id: "estudios",
      titulo: "Estudios",
      tipo: "lista",
      contenido: [ESTUDIOS_LABELS[datos.estudios]]
    });
  }

  // --- Información adicional ---
  const lineasAdicionales = [];
  if (datos.vehiculo && VEHICULO_LABELS[datos.vehiculo]) {
    lineasAdicionales.push(VEHICULO_LABELS[datos.vehiculo]);
  }
  // Línea de disponibilidad resumida
  if (datos.disponibilidad) {
    const dispSinPunto = fraseDisp.endsWith(".") ? fraseDisp.slice(0, -1) : fraseDisp;
    lineasAdicionales.push(dispSinPunto);
  }

  if (lineasAdicionales.length > 0) {
    secciones.push({
      id: "adicional",
      titulo: "Información adicional",
      tipo: "lista",
      contenido: lineasAdicionales
    });
  }

  // --- Referencia (solo si fue proporcionada) ---
  if (datos.referencia && datos.referencia.nombre && datos.referencia.telefono) {
    secciones.push({
      id: "referencias",
      titulo: "Referencias",
      tipo: "lista",
      contenido: [`${datos.referencia.nombre} · ${datos.referencia.telefono}`]
    });
  }

  return {
    encabezado,
    secciones
  };
}

