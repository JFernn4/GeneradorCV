/**
 * validacion.js
 * Módulo de validación y normalización de entradas de usuario.
 * Garantiza datos limpios, seguros y consistentes según las reglas de negocio.
 */

const PARTICULAS_MINUSCULAS = new Set(["de", "del", "la", "las", "los", "y"]);

/**
 * Trimea y colapsa espacios múltiples.
 * @param {string|any} str
 * @returns {string}
 */
export function limpiarTexto(str) {
  if (typeof str !== "string") return "";
  return str.trim().replace(/\s+/g, " ");
}

/**
 * Normaliza un nombre a formato Título (Title Case),
 * manteniendo partículas en minúscula salvo al inicio.
 * Ej: "juan carlos pérez" -> "Juan Carlos Pérez"
 *     "juan de la rosa"   -> "Juan de la Rosa"
 *     "de la cruz juan"   -> "De la Cruz Juan"
 * @param {string} nombre
 * @returns {string}
 */
export function normalizarNombre(nombre) {
  const limpio = limpiarTexto(nombre);
  if (!limpio) return "";

  const palabras = limpio.split(" ");
  const resultado = palabras.map((palabra, index) => {
    const palabraMin = palabra.toLowerCase();
    if (index > 0 && PARTICULAS_MINUSCULAS.has(palabraMin)) {
      return palabraMin;
    }
    return palabraMin.charAt(0).toUpperCase() + palabraMin.slice(1);
  });

  return resultado.join(" ");
}

/**
 * Valida y normaliza un número de teléfono.
 * Reglas:
 * - 8 dígitos: +502 XXXX XXXX
 * - 11 dígitos empezando con 502: +502 XXXX XXXX
 * - Prefijo '+' con 8 a 15 dígitos: conserva formato internacional
 * En cualquier otro caso retorna { valido: false, telefono: null }
 * @param {string} tel
 * @returns {{ valido: boolean, telefono: string|null }}
 */
export function normalizarTelefono(tel) {
  if (!tel || typeof tel !== "string") {
    return { valido: false, telefono: null };
  }

  const sinEspaciosNiGuiones = tel.replace(/[\s\-]/g, "");

  // Caso 8 dígitos locales (Guatemala)
  if (/^\d{8}$/.test(sinEspaciosNiGuiones)) {
    const parte1 = sinEspaciosNiGuiones.slice(0, 4);
    const parte2 = sinEspaciosNiGuiones.slice(4);
    return { valido: true, telefono: `+502 ${parte1} ${parte2}` };
  }

  // Caso 11 dígitos empezando por 502
  if (/^502\d{8}$/.test(sinEspaciosNiGuiones)) {
    const parte1 = sinEspaciosNiGuiones.slice(3, 7);
    const parte2 = sinEspaciosNiGuiones.slice(7);
    return { valido: true, telefono: `+502 ${parte1} ${parte2}` };
  }

  // Caso internacional que empieza con '+' y tiene entre 8 y 15 dígitos en total
  if (/^\+\d{8,15}$/.test(sinEspaciosNiGuiones)) {
    // Si es +502 seguido de 8 dígitos, formatear con espacios
    if (/^\+502\d{8}$/.test(sinEspaciosNiGuiones)) {
      const parte1 = sinEspaciosNiGuiones.slice(4, 8);
      const parte2 = sinEspaciosNiGuiones.slice(8);
      return { valido: true, telefono: `+502 ${parte1} ${parte2}` };
    }
    return { valido: true, telefono: sinEspaciosNiGuiones };
  }

  return { valido: false, telefono: null };
}

/**
 * Valida formato básico de correo electrónico.
 * @param {string} correo
 * @returns {boolean}
 */
export function validarCorreo(correo) {
  if (!correo) return true; // El correo es opcional
  const limpio = limpiarTexto(correo);
  if (!limpio) return true;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(limpio);
}

/**
 * Elimina duplicados de un arreglo de cadenas sin distinguir mayúsculas/minúsculas,
 * preservando el primer caso encontrado.
 * @param {string[]} lista
 * @returns {string[]}
 */
export function desduplicarCadenas(lista) {
  if (!Array.isArray(lista)) return [];
  const vistos = new Set();
  const resultado = [];
  for (const item of lista) {
    if (typeof item !== "string") continue;
    const limpio = limpiarTexto(item);
    if (!limpio) continue;
    const clave = limpio.toLowerCase();
    if (!vistos.has(clave)) {
      vistos.add(clave);
      resultado.push(limpio);
    }
  }
  return resultado;
}

/**
 * Valida y normaliza el estado completo del CV.
 * @param {object} entrada
 * @returns {{ valido: boolean, errores: Array<{campo: string, mensaje: string}>, datos: object }}
 */
export function validarEstado(entrada) {
  const errores = [];
  const datos = {
    contacto: {
      nombre: "",
      telefono: "",
      correo: null,
      zona: ""
    },
    areas: [],
    areaOtraTexto: null,
    sinExperiencia: false,
    experiencias: [],
    habilidades: [],
    idiomas: [],
    vehiculo: "no",
    estudios: null,
    disponibilidad: {
      jornada: "completo",
      inmediata: false
    },
    referencia: null,
    foto: null
  };

  const crudo = entrada || {};

  // 1. Nombre
  const nombreLimpio = limpiarTexto(crudo.contacto?.nombre || crudo.nombre || "");
  if (!nombreLimpio || nombreLimpio.length < 2) {
    errores.push({ campo: "nombre", mensaje: "Escriba su nombre completo" });
  } else if (nombreLimpio.length > 60) {
    errores.push({ campo: "nombre", mensaje: "El nombre no puede tener más de 60 caracteres" });
  } else {
    datos.contacto.nombre = normalizarNombre(nombreLimpio);
  }

  // 2. Teléfono
  const telCrudo = crudo.contacto?.telefono || crudo.telefono || "";
  const telResultado = normalizarTelefono(telCrudo);
  if (!telResultado.valido) {
    errores.push({ campo: "telefono", mensaje: "Escriba un número de teléfono válido" });
  } else {
    datos.contacto.telefono = telResultado.telefono;
  }

  // 3. Correo (opcional)
  const correoCrudo = crudo.contacto?.correo || crudo.correo || "";
  const correoLimpio = limpiarTexto(correoCrudo);
  if (correoLimpio) {
    if (!validarCorreo(correoLimpio)) {
      errores.push({ campo: "correo", mensaje: "Escriba un correo electrónico válido" });
    } else {
      datos.contacto.correo = correoLimpio.toLowerCase();
    }
  }

  // 4. Zona (obligatoria)
  const zonaLimpia = limpiarTexto(crudo.contacto?.zona || crudo.zona || "");
  if (!zonaLimpia) {
    errores.push({ campo: "zona", mensaje: "Indique su municipio o zona" });
  } else if (zonaLimpia.length > 60) {
    errores.push({ campo: "zona", mensaje: "La zona o municipio no debe superar 60 caracteres" });
  } else {
    datos.contacto.zona = zonaLimpia;
  }

  // 5. Áreas (mínimo 1)
  const areasEntrada = Array.isArray(crudo.areas) ? crudo.areas : [];
  if (areasEntrada.length === 0) {
    errores.push({ campo: "areas", mensaje: "Seleccione al menos un área de trabajo" });
  } else {
    datos.areas = [...new Set(areasEntrada.map(a => String(a).trim().toLowerCase()))];
    if (datos.areas.includes("otro")) {
      const otroTexto = limpiarTexto(crudo.areaOtraTexto || "");
      if (!otroTexto) {
        errores.push({ campo: "areaOtraTexto", mensaje: "Escriba el nombre del área de trabajo" });
      } else if (otroTexto.length > 40) {
        errores.push({ campo: "areaOtraTexto", mensaje: "El área no debe superar 40 caracteres" });
      } else {
        datos.areaOtraTexto = otroTexto;
      }
    }
  }

  // 6. Experiencia
  datos.sinExperiencia = Boolean(crudo.sinExperiencia);
  if (datos.sinExperiencia) {
    datos.experiencias = [];
  } else {
    const exps = Array.isArray(crudo.experiencias) ? crudo.experiencias.slice(0, 3) : [];
    datos.experiencias = exps.map(exp => {
      const puesto = limpiarTexto(exp.puesto || "").slice(0, 80);
      const lugar = limpiarTexto(exp.lugar || "").slice(0, 80);
      const duracionesValidas = ["lt6m", "6m_1a", "1_3a", "gt3a"];
      const duracion = duracionesValidas.includes(exp.duracion) ? exp.duracion : "lt6m";
      const tareasCrudas = Array.isArray(exp.tareas) ? exp.tareas : [];
      const tareas = desduplicarCadenas(tareasCrudas.map(t => limpiarTexto(t).slice(0, 80)));
      return { puesto, lugar, duracion, tareas };
    }).filter(exp => exp.puesto.length > 0);
  }

  // 7. Habilidades
  const habsCrudas = Array.isArray(crudo.habilidades) ? crudo.habilidades : [];
  datos.habilidades = desduplicarCadenas(habsCrudas.map(h => limpiarTexto(h).slice(0, 80)));

  // 8. Idiomas
  const idiomasCrudos = Array.isArray(crudo.idiomas) ? crudo.idiomas : [];
  datos.idiomas = idiomasCrudos.map(item => {
    const idioma = limpiarTexto(item.idioma || "").slice(0, 40);
    const nivel = ["basico", "medio", "alto"].includes(item.nivel) ? item.nivel : "medio";
    return { idioma, nivel };
  }).filter(i => i.idioma.length > 0);

  // 9. Vehículo
  const vehiculosValidos = ["no", "moto", "carro", "con_licencia"];
  datos.vehiculo = vehiculosValidos.includes(crudo.vehiculo) ? crudo.vehiculo : "no";

  // 10. Estudios
  const estudiosValidos = ["primaria", "basico", "diversificado", "tecnico_universitario", "cursos"];
  datos.estudios = estudiosValidos.includes(crudo.estudios) ? crudo.estudios : null;

  // 11. Disponibilidad
  const jornadasValidas = ["completo", "medio", "temporal"];
  const dispEntrada = crudo.disponibilidad || {};
  datos.disponibilidad = {
    jornada: jornadasValidas.includes(dispEntrada.jornada || crudo.jornada) ? (dispEntrada.jornada || crudo.jornada) : "completo",
    inmediata: Boolean(dispEntrada.inmediata !== undefined ? dispEntrada.inmediata : crudo.inmediata)
  };

  // 12. Referencia (opcional)
  if (crudo.referencia && typeof crudo.referencia === "object") {
    const refNombre = limpiarTexto(crudo.referencia.nombre || "").slice(0, 60);
    const refTel = limpiarTexto(crudo.referencia.telefono || "");
    if (refNombre && refTel) {
      const telRes = normalizarTelefono(refTel);
      datos.referencia = {
        nombre: normalizarNombre(refNombre),
        telefono: telRes.valido ? telRes.telefono : refTel
      };
    } else {
      datos.referencia = null;
    }
  } else {
    datos.referencia = null;
  }

  // 13. Fotografía opcional (solo se admite dataURL de imagen en memoria)
  if (typeof crudo.foto === "string" && crudo.foto.startsWith("data:image/")) {
    datos.foto = crudo.foto;
  } else {
    datos.foto = null;
  }

  return {
    valido: errores.length === 0,
    errores,
    datos
  };
}

/**
 * Valida un archivo de imagen para fotografía.
 * Tipos admitidos: JPEG, PNG, WebP.
 * Tamaño máximo de entrada: 10 MB.
 * @param {File} archivo
 * @returns {{ valido: boolean, error: string|null }}
 */
export function validarArchivoFoto(archivo) {
  if (!archivo) {
    return { valido: false, error: "Seleccione una imagen" };
  }
  const tiposValidos = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const tipo = (archivo.type || "").toLowerCase();
  if (!tiposValidos.includes(tipo)) {
    return { valido: false, error: "Formato no compatible. Seleccione una imagen en formato JPG, PNG o WebP." };
  }
  const maxBytes = 10 * 1024 * 1024; // 10 MB
  if (archivo.size > maxBytes) {
    return { valido: false, error: "La foto supera los 10 MB. Elija una imagen más liviana." };
  }
  return { valido: true, error: null };
}

