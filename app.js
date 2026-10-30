/**
 * app.js
 * Orquestador principal del generador de CV.
 * Flujo paso a paso: una sola pregunta a la vez en pantalla.
 * 100% en memoria del navegador: cero backend, cero almacenamiento persistente (sin localStorage ni cookies).
 */

import { CATALOGO_AREAS, DURACIONES, ESTUDIOS_LABELS, NIVELES_IDIOMA, VEHICULO_LABELS } from "./catalogo.js";
import { validarEstado, limpiarTexto, normalizarNombre, normalizarTelefono } from "./validacion.js";
import { buildCV } from "./cv-builder.js";
import { renderizarCV, crearElemento } from "./render.js";
import { descargarPDF, liberarRecursosPDF } from "./pdf.js";

// Estado en memoria (se pierde intencionalmente al recargar la página por privacidad)
let estado = {
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
    inmediata: true
  },
  referencia: null
};

// Opciones de visualización finales
let configPresentacion = {
  plantilla: "clasico", // "clasico" | "lateral" | "ejecutivo"
  densidad: "normal"    // "normal" | "compacta"
};

// Control de navegación paso a paso
let pasoActual = 0;

// Lista ordenada de los pasos del asistente
const PASOS = [
  "nombre",
  "telefono",
  "zona",
  "correo",
  "areas",
  "experiencia_filtro",
  "experiencia_detalle",
  "habilidades",
  "vehiculo",
  "idiomas",
  "estudios",
  "disponibilidad",
  "referencia",
  "final"
];

// Referencias a elementos del DOM
let contPaso = null;
let contVistaPrevia = null;
let contFinal = null;
let contWizard = null;
let bannerError = null;

/**
 * Inicialización al cargar la página
 */
document.addEventListener("DOMContentLoaded", () => {
  contWizard = document.getElementById("wizard-container");
  contPaso = document.getElementById("paso-contenido");
  contFinal = document.getElementById("pantalla-final");
  contVistaPrevia = document.getElementById("contenedor-cv-preview");
  bannerError = document.getElementById("mensaje-error");

  irAPaso(0);
});

/**
 * Muestra el mensaje de error de validación temporal
 */
function mostrarError(mensaje) {
  if (!bannerError) return;
  bannerError.textContent = mensaje;
  bannerError.hidden = false;
  bannerError.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function limpiarError() {
  if (!bannerError) return;
  bannerError.textContent = "";
  bannerError.hidden = true;
}

/**
 * Navega a un paso específico
 */
export function irAPaso(indice) {
  limpiarError();
  // Regla de omisión: Si no tiene experiencia, saltar el paso de experiencia_detalle
  if (PASOS[indice] === "experiencia_detalle" && estado.sinExperiencia) {
    if (indice > pasoActual) {
      pasoActual = indice + 1;
    } else {
      pasoActual = indice - 1;
    }
  } else {
    pasoActual = indice;
  }

  if (pasoActual < 0) pasoActual = 0;
  if (pasoActual >= PASOS.length) pasoActual = PASOS.length - 1;

  renderizarPasoActual();
}

export function pasoAnterior() {
  if (pasoActual > 0) {
    irAPaso(pasoActual - 1);
  }
}

export function pasoSiguiente() {
  if (pasoActual < PASOS.length - 1) {
    irAPaso(pasoActual + 1);
  }
}

/**
 * Renderiza exclusivamente la pregunta del paso actual
 */
function renderizarPasoActual() {
  const clavePaso = PASOS[pasoActual];

  if (clavePaso === "final") {
    contWizard.hidden = true;
    contFinal.hidden = false;
    actualizarVistaFinal();
    return;
  }

  contWizard.hidden = false;
  contFinal.hidden = true;

  while (contPaso.firstChild) {
    contPaso.removeChild(contPaso.firstChild);
  }

  switch (clavePaso) {
    case "nombre":
      renderPasoNombre();
      break;
    case "telefono":
      renderPasoTelefono();
      break;
    case "zona":
      renderPasoZona();
      break;
    case "correo":
      renderPasoCorreo();
      break;
    case "areas":
      renderPasoAreas();
      break;
    case "experiencia_filtro":
      renderPasoExperienciaFiltro();
      break;
    case "experiencia_detalle":
      renderPasoExperienciaDetalle();
      break;
    case "habilidades":
      renderPasoHabilidades();
      break;
    case "vehiculo":
      renderPasoVehiculo();
      break;
    case "idiomas":
      renderPasoIdiomas();
      break;
    case "estudios":
      renderPasoEstudios();
      break;
    case "disponibilidad":
      renderPasoDisponibilidad();
      break;
    case "referencia":
      renderPasoReferencia();
      break;
  }
}

// ============================================================================
// COMPONENTES DE PREGUNTAS (UNA SOLA A LA VEZ)
// ============================================================================

/**
 * Paso 1: Nombre completo
 */
function renderPasoNombre() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Cuéntanos sobre ti... (Paso 1 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Cuál es tu nombre completo?"));

  const formFila = crearElemento("div", "input-accion-fila");
  const input = crearElemento("input", "input-pill");
  input.type = "text";
  input.placeholder = "Ej. Juan Carlos Pérez";
  input.value = estado.contacto.nombre;
  input.maxLength = 60;
  input.autocomplete = "name";

  const btnEnviar = crearElemento("button", "btn-pill-accion", "Continuar");
  btnEnviar.type = "button";

  const procesar = () => {
    const val = input.value.trim();
    if (val.length < 2) {
      mostrarError("Escriba su nombre completo (mínimo 2 letras)");
      return;
    }
    estado.contacto.nombre = normalizarNombre(val);
    pasoSiguiente();
  };

  btnEnviar.addEventListener("click", procesar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") procesar();
  });

  formFila.appendChild(input);
  formFila.appendChild(btnEnviar);
  wrapper.appendChild(formFila);
  contPaso.appendChild(wrapper);

  setTimeout(() => input.focus(), 50);
}

/**
 * Paso 2: Teléfono
 */
function renderPasoTelefono() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Contacto directo (Paso 2 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Cuál es tu número de teléfono?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Para que te puedan llamar o escribir por WhatsApp"));

  const formFila = crearElemento("div", "input-accion-fila");
  const input = crearElemento("input", "input-pill");
  input.type = "tel";
  input.placeholder = "Ej. 5555 1234";
  input.value = estado.contacto.telefono;
  input.maxLength = 20;

  const btnEnviar = crearElemento("button", "btn-pill-accion", "Continuar");
  btnEnviar.type = "button";

  const procesar = () => {
    const res = normalizarTelefono(input.value);
    if (!res.valido) {
      mostrarError("Escriba un número de teléfono válido (ej. 8 dígitos)");
      return;
    }
    estado.contacto.telefono = res.telefono;
    pasoSiguiente();
  };

  btnEnviar.addEventListener("click", procesar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") procesar();
  });

  formFila.appendChild(input);
  formFila.appendChild(btnEnviar);
  wrapper.appendChild(formFila);

  // Barra de navegación atrás
  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);

  setTimeout(() => input.focus(), 50);
}

/**
 * Paso 3: Zona o Municipio
 */
function renderPasoZona() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Ubicación general (Paso 3 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿En qué municipio o zona vives?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Por privacidad, no se pide dirección exacta; solo el municipio o zona"));

  const formFila = crearElemento("div", "input-accion-fila");
  const input = crearElemento("input", "input-pill");
  input.type = "text";
  input.placeholder = "Ej. Mixco, Villa Nueva o Zona 1";
  input.value = estado.contacto.zona;
  input.maxLength = 60;

  const btnEnviar = crearElemento("button", "btn-pill-accion", "Continuar");

  const procesar = () => {
    const val = limpiarTexto(input.value);
    if (!val) {
      mostrarError("Indique su municipio o zona");
      return;
    }
    estado.contacto.zona = val;
    pasoSiguiente();
  };

  btnEnviar.addEventListener("click", procesar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") procesar();
  });

  formFila.appendChild(input);
  formFila.appendChild(btnEnviar);
  wrapper.appendChild(formFila);
  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);

  setTimeout(() => input.focus(), 50);
}

/**
 * Paso 4: Correo electrónico (opcional)
 */
function renderPasoCorreo() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Contacto opcional (Paso 4 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Tienes correo electrónico?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Si no usas correo, puedes omitirlo tranquilamente"));

  const formFila = crearElemento("div", "input-accion-fila");
  const input = crearElemento("input", "input-pill");
  input.type = "email";
  input.placeholder = "correo@ejemplo.com";
  input.value = estado.contacto.correo || "";

  const btnEnviar = crearElemento("button", "btn-pill-accion", "Guardar");

  const procesar = () => {
    const val = limpiarTexto(input.value);
    if (val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        mostrarError("Escriba un correo electrónico válido o toque 'No tengo'");
        return;
      }
      estado.contacto.correo = val.toLowerCase();
    } else {
      estado.contacto.correo = null;
    }
    pasoSiguiente();
  };

  btnEnviar.addEventListener("click", procesar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") procesar();
  });

  formFila.appendChild(input);
  formFila.appendChild(btnEnviar);
  wrapper.appendChild(formFila);

  // Botón omitir
  const btnOmitir = crearElemento("button", "btn-opcion-neutro", "No tengo correo / Omitir");
  btnOmitir.type = "button";
  btnOmitir.addEventListener("click", () => {
    estado.contacto.correo = null;
    pasoSiguiente();
  });
  wrapper.appendChild(btnOmitir);

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 5: Áreas de trabajo buscadas
 */
function renderPasoAreas() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Trabajo buscado (Paso 5 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿En qué áreas te gustaría trabajar?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Toca una o varias opciones:"));

  const contenedorChips = crearElemento("div", "grid-opciones-tactiles");
  const areasSeleccionadas = new Set(estado.areas);

  let inputOtroArea = null;

  for (const [key, area] of Object.entries(CATALOGO_AREAS)) {
    const btn = crearElemento("button", "btn-chip-tactil");
    btn.type = "button";

    const textoSpan = crearElemento("span", "chip-texto", area.etiqueta);
    btn.appendChild(textoSpan);

    if (areasSeleccionadas.has(key)) {
      btn.classList.add("seleccionado");
    }

    btn.addEventListener("click", () => {
      if (areasSeleccionadas.has(key)) {
        areasSeleccionadas.delete(key);
        btn.classList.remove("seleccionado");
      } else {
        areasSeleccionadas.add(key);
        btn.classList.add("seleccionado");
      }

      if (key === "otro") {
        if (inputOtroArea) {
          inputOtroArea.hidden = !areasSeleccionadas.has("otro");
          if (!inputOtroArea.hidden) inputOtroArea.focus();
        }
      }
    });

    contenedorChips.appendChild(btn);
  }

  wrapper.appendChild(contenedorChips);

  // Campo para cuando elija "Otro"
  const bloqueOtro = crearElemento("div", "campo-otro-container");
  inputOtroArea = crearElemento("input", "input-pill");
  inputOtroArea.type = "text";
  inputOtroArea.placeholder = "¿Qué otra área de trabajo buscas?";
  inputOtroArea.value = estado.areaOtraTexto || "";
  inputOtroArea.maxLength = 40;
  inputOtroArea.hidden = !areasSeleccionadas.has("otro");
  bloqueOtro.appendChild(inputOtroArea);
  wrapper.appendChild(bloqueOtro);

  // Botón continuar
  const btnContinuar = crearElemento("button", "btn-pill-grande", "Continuar con estas áreas");
  btnContinuar.addEventListener("click", () => {
    if (areasSeleccionadas.size === 0) {
      mostrarError("Seleccione al menos un área de trabajo");
      return;
    }
    if (areasSeleccionadas.has("otro")) {
      const otroVal = limpiarTexto(inputOtroArea.value);
      if (!otroVal) {
        mostrarError("Escriba el nombre del área de trabajo");
        return;
      }
      estado.areaOtraTexto = otroVal;
    } else {
      estado.areaOtraTexto = null;
    }

    estado.areas = Array.from(areasSeleccionadas);
    pasoSiguiente();
  });

  wrapper.appendChild(btnContinuar);
  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 6: Filtro de experiencia previa
 */
function renderPasoExperienciaFiltro() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Experiencia laboral (Paso 6 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Tienes experiencia de trabajo previa?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Puede ser en un empleo formal, en negocio familiar o por cuenta propia"));

  const opcionesVerticales = crearElemento("div", "opciones-destacadas-col");

  // Opción Con Experiencia
  const btnConExp = crearElemento("button", "btn-opcion-destacada");
  const txtCon = crearElemento("div", "btn-opcion-textos");
  txtCon.appendChild(crearElemento("strong", "", "Sí, quiero agregar mi experiencia"));
  txtCon.appendChild(crearElemento("span", "", "He trabajado antes y deseo incluirlo"));
  btnConExp.appendChild(txtCon);

  btnConExp.addEventListener("click", () => {
    estado.sinExperiencia = false;
    pasoSiguiente();
  });

  // Opción Sin Experiencia (Botón destacado como pide el requerimiento)
  const btnSinExp = crearElemento("button", "btn-opcion-destacada btn-destacado-neutro");
  const txtSin = crearElemento("div", "btn-opcion-textos");
  txtSin.appendChild(crearElemento("strong", "", "No tengo experiencia formal"));
  txtSin.appendChild(crearElemento("span", "", "El CV destacará mis habilidades y disposición"));
  btnSinExp.appendChild(txtSin);

  btnSinExp.addEventListener("click", () => {
    estado.sinExperiencia = true;
    estado.experiencias = [];
    pasoSiguiente(); // Saltará automáticamente a habilidades
  });

  opcionesVerticales.appendChild(btnConExp);
  opcionesVerticales.appendChild(btnSinExp);
  wrapper.appendChild(opcionesVerticales);

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 7: Detalle de experiencia (hasta 3)
 */
function renderPasoExperienciaDetalle() {
  const wrapper = crearElemento("div", "pregunta-box");
  const numExp = estado.experiencias.length + 1;

  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", `Experiencia laboral (${estado.experiencias.length}/3 agregadas)`));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", `Trabajo o experiencia #${numExp}`));

  // Si ya tiene experiencias cargadas, mostrarlas resumidas
  if (estado.experiencias.length > 0) {
    const listadoExps = crearElemento("div", "experiencias-agregadas-resumen");
    listadoExps.appendChild(crearElemento("strong", "", "Experiencias ya registradas:"));
    estado.experiencias.forEach((exp, idx) => {
      const item = crearElemento("div", "item-exp-resumen");
      item.appendChild(crearElemento("span", "", `${idx + 1}. ${exp.puesto} (${exp.lugar || "Sin lugar"})`));
      const btnBorrar = crearElemento("button", "btn-borrar-item", "Quitar");
      btnBorrar.addEventListener("click", () => {
        estado.experiencias.splice(idx, 1);
        renderPasoExperienciaDetalle();
      });
      item.appendChild(btnBorrar);
      listadoExps.appendChild(item);
    });
    wrapper.appendChild(listadoExps);

    // Si ya completó 3 o desea avanzar
    const btnAvanzar = crearElemento("button", "btn-opcion-neutro", "Continuar con estas experiencias");
    btnAvanzar.addEventListener("click", () => pasoSiguiente());
    wrapper.appendChild(btnAvanzar);

    if (estado.experiencias.length >= 3) {
      wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
      contPaso.appendChild(wrapper);
      return;
    }
  }

  // Formulario para nueva experiencia
  const formExp = crearElemento("div", "form-experiencia-box");

  // 1. Puesto: sugerencias según áreas elegidas + texto libre
  formExp.appendChild(crearElemento("label", "label-campo", "Puesto o cargo desempeñado:"));
  const puestosSugeridos = [];
  for (const a of estado.areas) {
    if (CATALOGO_AREAS[a] && CATALOGO_AREAS[a].puestos) {
      puestosSugeridos.push(...CATALOGO_AREAS[a].puestos);
    }
  }

  const chipsPuestos = crearElemento("div", "chips-sugerencias-fila");
  const inputPuesto = crearElemento("input", "input-pill");
  inputPuesto.placeholder = "Escribe o toca un puesto sugerido";
  inputPuesto.maxLength = 80;

  for (const p of puestosSugeridos.slice(0, 8)) {
    const btnP = crearElemento("button", "chip-sugerencia", p);
    btnP.type = "button";
    btnP.addEventListener("click", () => {
      inputPuesto.value = p;
    });
    chipsPuestos.appendChild(btnP);
  }
  formExp.appendChild(chipsPuestos);
  formExp.appendChild(inputPuesto);

  // 2. Lugar: con opciones rápidas "Trabajo independiente", "Trabajo familiar"
  formExp.appendChild(crearElemento("label", "label-campo", "Lugar o empresa donde trabajaste:"));
  const filaLugaresRapidos = crearElemento("div", "chips-sugerencias-fila");
  const inputLugar = crearElemento("input", "input-pill");
  inputLugar.placeholder = "Nombre de empresa o negocio (opcional)";
  inputLugar.maxLength = 80;

  const btnIndep = crearElemento("button", "chip-sugerencia", "Trabajo independiente");
  btnIndep.addEventListener("click", () => { inputLugar.value = "Trabajo independiente"; });
  const btnFam = crearElemento("button", "chip-sugerencia", "Trabajo familiar");
  btnFam.addEventListener("click", () => { inputLugar.value = "Trabajo familiar"; });

  filaLugaresRapidos.appendChild(btnIndep);
  filaLugaresRapidos.appendChild(btnFam);
  formExp.appendChild(filaLugaresRapidos);
  formExp.appendChild(inputLugar);

  // 3. Duración
  formExp.appendChild(crearElemento("label", "label-campo", "¿Cuánto tiempo trabajaste allí?"));
  const duracionSelect = crearElemento("select", "select-pill");
  for (const [val, label] of Object.entries(DURACIONES)) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    duracionSelect.appendChild(opt);
  }
  formExp.appendChild(duracionSelect);

  // 4. Tareas realizadas (sugerencias según el área + texto libre)
  formExp.appendChild(crearElemento("label", "label-campo", "Tareas que realizabas (toca las que apliquen):"));
  const tareasSugeridas = [];
  for (const a of estado.areas) {
    if (CATALOGO_AREAS[a] && CATALOGO_AREAS[a].tareas) {
      tareasSugeridas.push(...CATALOGO_AREAS[a].tareas);
    }
  }

  const tareasElegidas = new Set();
  const chipsTareas = crearElemento("div", "grid-opciones-tactiles");
  for (const t of [...new Set(tareasSugeridas)]) {
    const btnT = crearElemento("button", "btn-chip-tactil", t);
    btnT.type = "button";
    btnT.addEventListener("click", () => {
      if (tareasElegidas.has(t)) {
        tareasElegidas.delete(t);
        btnT.classList.remove("seleccionado");
      } else {
        tareasElegidas.add(t);
        btnT.classList.add("seleccionado");
      }
    });
    chipsTareas.appendChild(btnT);
  }
  formExp.appendChild(chipsTareas);

  // Tarea libre adicional
  const inputOtraTarea = crearElemento("input", "input-pill");
  inputOtraTarea.placeholder = "Agregar otra tarea (opcional)";
  inputOtraTarea.maxLength = 80;
  formExp.appendChild(inputOtraTarea);

  // Botón guardar experiencia
  const btnGuardarExp = crearElemento("button", "btn-pill-grande", "Guardar esta experiencia");
  btnGuardarExp.addEventListener("click", () => {
    const puesto = limpiarTexto(inputPuesto.value);
    if (!puesto) {
      mostrarError("Escriba o seleccione el puesto desempeñado");
      return;
    }

    const lugar = limpiarTexto(inputLugar.value) || "Trabajo independiente";
    const duracion = duracionSelect.value;
    const tareasArray = Array.from(tareasElegidas);

    const otraTarea = limpiarTexto(inputOtraTarea.value);
    if (otraTarea && !tareasArray.includes(otraTarea)) {
      tareasArray.push(otraTarea);
    }

    estado.experiencias.push({
      puesto,
      lugar,
      duracion,
      tareas: tareasArray
    });

    limpiarError();
    renderPasoExperienciaDetalle();
  });

  formExp.appendChild(btnGuardarExp);
  wrapper.appendChild(formExp);

  // Botón para saltar o continuar si ya tiene al menos una
  if (estado.experiencias.length === 0) {
    const btnOmitir = crearElemento("button", "btn-opcion-neutro", "Prefiero no agregar experiencia formal");
    btnOmitir.addEventListener("click", () => {
      estado.sinExperiencia = true;
      estado.experiencias = [];
      pasoSiguiente();
    });
    wrapper.appendChild(btnOmitir);
  }

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 8: Habilidades
 */
function renderPasoHabilidades() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Destrezas principales (Paso 7 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Cuáles son tus principales habilidades?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Toca las que mejor sabes hacer (sugeridas según tus áreas):"));

  const habsSugeridas = [];
  for (const a of estado.areas) {
    if (CATALOGO_AREAS[a] && CATALOGO_AREAS[a].habilidades) {
      habsSugeridas.push(...CATALOGO_AREAS[a].habilidades);
    }
  }

  const habsSeleccionadas = new Set(estado.habilidades);
  const chipsHabs = crearElemento("div", "grid-opciones-tactiles");

  for (const h of [...new Set(habsSugeridas)]) {
    const btnH = crearElemento("button", "btn-chip-tactil", h);
    btnH.type = "button";
    if (habsSeleccionadas.has(h)) btnH.classList.add("seleccionado");

    btnH.addEventListener("click", () => {
      if (habsSeleccionadas.has(h)) {
        habsSeleccionadas.delete(h);
        btnH.classList.remove("seleccionado");
      } else {
        habsSeleccionadas.add(h);
        btnH.classList.add("seleccionado");
      }
    });
    chipsHabs.appendChild(btnH);
  }
  wrapper.appendChild(chipsHabs);

  // Entrada para agregar otra habilidad personalizada
  const filaAgregar = crearElemento("div", "input-accion-fila");
  const inputOtra = crearElemento("input", "input-pill");
  inputOtra.placeholder = "Escribe otra habilidad y toca '+'";
  inputOtra.maxLength = 80;

  const btnMas = crearElemento("button", "btn-pill-accion", "+ Agregar");
  btnMas.type = "button";
  btnMas.addEventListener("click", () => {
    const val = limpiarTexto(inputOtra.value);
    if (val && !habsSeleccionadas.has(val)) {
      habsSeleccionadas.add(val);
      inputOtra.value = "";
      estado.habilidades = Array.from(habsSeleccionadas);
      renderPasoHabilidades();
    }
  });

  filaAgregar.appendChild(inputOtra);
  filaAgregar.appendChild(btnMas);
  wrapper.appendChild(filaAgregar);

  const btnContinuar = crearElemento("button", "btn-pill-grande", "Continuar");
  btnContinuar.addEventListener("click", () => {
    estado.habilidades = Array.from(habsSeleccionadas);
    pasoSiguiente();
  });
  wrapper.appendChild(btnContinuar);

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 9: Vehículo y conducción
 */
function renderPasoVehiculo() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Movilidad y conducción (Paso 8 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Cuentas con vehículo o licencia?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Útil para puestos de reparto, mensajería o traslados"));

  const opciones = [
    { valor: "no", etiqueta: "No tengo vehículo ni licencia" },
    { valor: "moto", etiqueta: "Manejo motocicleta" },
    { valor: "carro", etiqueta: "Manejo automóvil" },
    { valor: "con_licencia", etiqueta: "Cuento con licencia de conducir" }
  ];

  const colOpciones = crearElemento("div", "opciones-destacadas-col");
  for (const op of opciones) {
    const btn = crearElemento("button", "btn-opcion-destacada");
    btn.appendChild(crearElemento("strong", "", op.etiqueta));

    if (estado.vehiculo === op.valor) {
      btn.classList.add("seleccionado");
    }

    btn.addEventListener("click", () => {
      estado.vehiculo = op.valor;
      pasoSiguiente();
    });
    colOpciones.appendChild(btn);
  }

  wrapper.appendChild(colOpciones);
  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 10: Idiomas
 */
function renderPasoIdiomas() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Idiomas adicionales (Paso 9 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Hablas algún idioma además de español?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Español se asume nativo. Puedes agregar idiomas mayas, inglés u otros"));

  // Resumen de idiomas ya agregados
  if (estado.idiomas.length > 0) {
    const listaI = crearElemento("div", "experiencias-agregadas-resumen");
    estado.idiomas.forEach((i, idx) => {
      const item = crearElemento("div", "item-exp-resumen");
      item.appendChild(crearElemento("span", "", `${i.idioma} (${NIVELES_IDIOMA[i.nivel]})`));
      const btnBorrar = crearElemento("button", "btn-borrar-item", "Quitar");
      btnBorrar.addEventListener("click", () => {
        estado.idiomas.splice(idx, 1);
        renderPasoIdiomas();
      });
      item.appendChild(btnBorrar);
      listaI.appendChild(item);
    });
    wrapper.appendChild(listaI);
  }

  // Idiomas comunes en Guatemala
  const sugerencias = ["K'iche'", "Kaqchikel", "Q'eqchi'", "Mam", "Inglés"];
  const chipsI = crearElemento("div", "chips-sugerencias-fila");
  const inputIdioma = crearElemento("input", "input-pill");
  inputIdioma.placeholder = "Escribe o toca un idioma";
  inputIdioma.maxLength = 40;

  for (const s of sugerencias) {
    const btnS = crearElemento("button", "chip-sugerencia", s);
    btnS.type = "button";
    btnS.addEventListener("click", () => { inputIdioma.value = s; });
    chipsI.appendChild(btnS);
  }
  wrapper.appendChild(chipsI);
  wrapper.appendChild(inputIdioma);

  const filaNivel = crearElemento("div", "input-accion-fila");
  const selectNivel = crearElemento("select", "select-pill");
  selectNivel.appendChild(new Option("Nivel Básico", "basico"));
  selectNivel.appendChild(new Option("Nivel Intermedio", "medio", true, true));
  selectNivel.appendChild(new Option("Nivel Avanzado", "alto"));

  const btnAgregar = crearElemento("button", "btn-pill-accion", "+ Agregar idioma");
  btnAgregar.addEventListener("click", () => {
    const nom = limpiarTexto(inputIdioma.value);
    if (!nom) {
      mostrarError("Escriba el nombre del idioma o toque 'Solo hablo español'");
      return;
    }
    estado.idiomas.push({ idioma: nom, nivel: selectNivel.value });
    inputIdioma.value = "";
    limpiarError();
    renderPasoIdiomas();
  });

  filaNivel.appendChild(selectNivel);
  filaNivel.appendChild(btnAgregar);
  wrapper.appendChild(filaNivel);

  // Botón continuar / omitir
  const btnContinuar = crearElemento("button", "btn-pill-grande", "Continuar");
  btnContinuar.addEventListener("click", () => pasoSiguiente());
  wrapper.appendChild(btnContinuar);

  if (estado.idiomas.length === 0) {
    const btnSoloEspanol = crearElemento("button", "btn-opcion-neutro", "Solo hablo español / Omitir");
    btnSoloEspanol.addEventListener("click", () => {
      estado.idiomas = [];
      pasoSiguiente();
    });
    wrapper.appendChild(btnSoloEspanol);
  }

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 11: Estudios
 */
function renderPasoEstudios() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Educación (Paso 10 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Cuál es tu nivel de estudios alcanzado?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Selecciona la opción más alta alcanzada:"));

  const opciones = [
    { valor: "primaria", etiqueta: "Primaria" },
    { valor: "basico", etiqueta: "Básico" },
    { valor: "diversificado", etiqueta: "Diversificado" },
    { valor: "tecnico_universitario", etiqueta: "Técnico o universitario" },
    { valor: "cursos", etiqueta: "Cursos y capacitaciones" },
    { valor: null, etiqueta: "Omitir este apartado" }
  ];

  const colOpciones = crearElemento("div", "opciones-destacadas-col");
  for (const op of opciones) {
    const btn = crearElemento("button", "btn-opcion-destacada");
    btn.appendChild(crearElemento("strong", "", op.etiqueta));

    if (estado.estudios === op.valor) {
      btn.classList.add("seleccionado");
    }

    btn.addEventListener("click", () => {
      estado.estudios = op.valor;
      pasoSiguiente();
    });
    colOpciones.appendChild(btn);
  }

  wrapper.appendChild(colOpciones);
  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 12: Disponibilidad y horario
 */
function renderPasoDisponibilidad() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Disponibilidad (Paso 11 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Qué jornada de trabajo buscas?"));

  const opcionesJornada = [
    { valor: "completo", etiqueta: "Tiempo completo", desc: "Jornada habitual completa" },
    { valor: "medio", etiqueta: "Medio tiempo", desc: "Media jornada (mañanas o tardes)" },
    { valor: "temporal", etiqueta: "Por día o temporal", desc: "Trabajos por turnos o proyecto" }
  ];

  let jornadaSeleccionada = estado.disponibilidad.jornada || "completo";
  let inmediataSeleccionada = estado.disponibilidad.inmediata !== undefined ? estado.disponibilidad.inmediata : true;

  const colJornadas = crearElemento("div", "opciones-destacadas-col");
  const botonesJornada = [];

  for (const j of opcionesJornada) {
    const btn = crearElemento("button", "btn-opcion-destacada");
    btn.appendChild(crearElemento("strong", "", j.etiqueta));
    btn.appendChild(crearElemento("span", "", j.desc));

    if (jornadaSeleccionada === j.valor) {
      btn.classList.add("seleccionado");
    }

    btn.addEventListener("click", () => {
      jornadaSeleccionada = j.valor;
      botonesJornada.forEach(b => b.classList.remove("seleccionado"));
      btn.classList.add("seleccionado");
    });

    botonesJornada.push(btn);
    colJornadas.appendChild(btn);
  }
  wrapper.appendChild(colJornadas);

  // Pregunta inmediata
  const bloqueInmediata = crearElemento("div", "pregunta-inmediata-box");
  bloqueInmediata.appendChild(crearElemento("h3", "", "¿Puedes comenzar a trabajar de inmediato?"));

  const filaBtnsInmediata = crearElemento("div", "chips-sugerencias-fila");
  const btnSi = crearElemento("button", "chip-sugerencia", "Sí, inicio inmediato");
  const btnNo = crearElemento("button", "chip-sugerencia", "No de inmediato");

  if (inmediataSeleccionada) btnSi.classList.add("seleccionado");
  else btnNo.classList.add("seleccionado");

  btnSi.addEventListener("click", () => {
    inmediataSeleccionada = true;
    btnSi.classList.add("seleccionado");
    btnNo.classList.remove("seleccionado");
  });

  btnNo.addEventListener("click", () => {
    inmediataSeleccionada = false;
    btnNo.classList.add("seleccionado");
    btnSi.classList.remove("seleccionado");
  });

  filaBtnsInmediata.appendChild(btnSi);
  filaBtnsInmediata.appendChild(btnNo);
  bloqueInmediata.appendChild(filaBtnsInmediata);
  wrapper.appendChild(bloqueInmediata);

  // Botón continuar
  const btnContinuar = crearElemento("button", "btn-pill-grande", "Continuar");
  btnContinuar.addEventListener("click", () => {
    estado.disponibilidad = {
      jornada: jornadaSeleccionada,
      inmediata: inmediataSeleccionada
    };
    pasoSiguiente();
  });
  wrapper.appendChild(btnContinuar);

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 13: Referencia opcional
 */
function renderPasoReferencia() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Referencias personales o laborales (Paso 12 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Deseas agregar una persona de referencia?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Opcional. Alguien que pueda dar fe de tu trabajo"));

  const inputNombre = crearElemento("input", "input-pill");
  inputNombre.placeholder = "Nombre de la persona (ej. Carlos Méndez)";
  inputNombre.value = estado.referencia?.nombre || "";
  inputNombre.maxLength = 60;

  const inputTel = crearElemento("input", "input-pill");
  inputTel.placeholder = "Teléfono de la persona (ej. 5555 9876)";
  inputTel.value = estado.referencia?.telefono || "";
  inputTel.type = "tel";
  inputTel.maxLength = 20;

  wrapper.appendChild(crearElemento("label", "label-campo", "Nombre de contacto:"));
  wrapper.appendChild(inputNombre);

  wrapper.appendChild(crearElemento("label", "label-campo", "Teléfono de contacto:"));
  wrapper.appendChild(inputTel);

  const btnGuardar = crearElemento("button", "btn-pill-grande", "Guardar y generar CV");
  btnGuardar.addEventListener("click", () => {
    const nom = limpiarTexto(inputNombre.value);
    const tel = limpiarTexto(inputTel.value);

    if (nom || tel) {
      if (!nom) {
        mostrarError("Escriba el nombre de la referencia o toque 'Omitir'");
        return;
      }
      const telRes = normalizarTelefono(tel);
      if (!telRes.valido) {
        mostrarError("Escriba un número de teléfono válido para la referencia");
        return;
      }
      estado.referencia = {
        nombre: normalizarNombre(nom),
        telefono: telRes.telefono
      };
    } else {
      estado.referencia = null;
    }

    pasoSiguiente(); // Llega a la pantalla final
  });
  wrapper.appendChild(btnGuardar);

  const btnOmitir = crearElemento("button", "btn-opcion-neutro", "No agregar referencia / Omitir");
  btnOmitir.addEventListener("click", () => {
    estado.referencia = null;
    pasoSiguiente();
  });
  wrapper.appendChild(btnOmitir);

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

// ============================================================================
// BARRA DE NAVEGACIÓN ENTRE PREGUNTAS
// ============================================================================
function crearBarraNavegacion(opciones = {}) {
  const nav = crearElemento("div", "barra-navegacion-paso");

  if (opciones.showAtras && pasoActual > 0) {
    const btnAtras = crearElemento("button", "btn-nav-atras", "← Pregunta anterior");
    btnAtras.type = "button";
    btnAtras.addEventListener("click", pasoAnterior);
    nav.appendChild(btnAtras);
  }

  return nav;
}

// ============================================================================
// PANTALLA FINAL: VISTA PREVIA, ELECCIÓN DE PLANTILLAS Y DESCARGA PDF
// ============================================================================
function actualizarVistaFinal() {
  // Construir la estructura canónica pura
  const estructuraCV = buildCV(estado, { densidad: configPresentacion.densidad });

  // Renderizar la vista previa en el contenedor del DOM
  renderizarCV(estructuraCV, contVistaPrevia, {
    plantilla: configPresentacion.plantilla,
    densidad: configPresentacion.densidad
  });

  const selectorPlantillas = document.getElementById("selector-plantillas");
  if (selectorPlantillas) {
    while (selectorPlantillas.firstChild) {
      selectorPlantillas.removeChild(selectorPlantillas.firstChild);
    }

    const plantillasDisponibles = [
      {
        id: "clasico",
        nombre: "Elegante Clásico",
        desc: "Líneas finas, encabezado limpio y formato tradicional"
      },
      {
        id: "lateral",
        nombre: "Barra Lateral",
        desc: "Columna izquierda azul con contacto y destrezas destacadas"
      },
      {
        id: "ejecutivo",
        nombre: "Ejecutivo Moderno",
        desc: "Franja superior azul marino y dos columnas alineadas"
      }
    ];

    for (const pl of plantillasDisponibles) {
      const card = crearElemento("button", "card-plantilla-selector");
      card.type = "button";
      if (configPresentacion.plantilla === pl.id) {
        card.classList.add("seleccionado");
      }

      card.appendChild(crearElemento("strong", "plantilla-nombre", pl.nombre));
      card.appendChild(crearElemento("span", "plantilla-desc", pl.desc));

      card.addEventListener("click", () => {
        configPresentacion.plantilla = pl.id;
        actualizarVistaFinal();
      });

      selectorPlantillas.appendChild(card);
    }
  }

  // Configurar botones de acción final
  configurarAccionesFinales(estructuraCV);
}

function configurarAccionesFinales(estructuraCV) {
  // 1. Selector de densidad
  const btnDensidadNormal = document.getElementById("btn-densidad-normal");
  const btnDensidadCompacta = document.getElementById("btn-densidad-compacta");

  if (btnDensidadNormal && btnDensidadCompacta) {
    if (configPresentacion.densidad === "compacta") {
      btnDensidadCompacta.classList.add("activo");
      btnDensidadNormal.classList.remove("activo");
    } else {
      btnDensidadNormal.classList.add("activo");
      btnDensidadCompacta.classList.remove("activo");
    }

    btnDensidadNormal.onclick = () => {
      configPresentacion.densidad = "normal";
      actualizarVistaFinal();
    };

    btnDensidadCompacta.onclick = () => {
      configPresentacion.densidad = "compacta";
      actualizarVistaFinal();
    };
  }

  // 2. Botón Descargar PDF
  const btnDescargar = document.getElementById("btn-descargar-pdf");
  if (btnDescargar) {
    btnDescargar.onclick = () => {
      descargarPDF(estructuraCV, {
        plantilla: configPresentacion.plantilla,
        densidad: configPresentacion.densidad,
        onDesbordamiento: (info) => {
          mostrarAvisoModal(info.mensaje);
        }
      });
    };
  }

  // 3. Botón Editar respuestas
  const btnEditar = document.getElementById("btn-editar-respuestas");
  if (btnEditar) {
    btnEditar.onclick = () => {
      irAPaso(0);
    };
  }

  // 4. Botón Borrar Todo (Privacidad estricta)
  const btnBorrarTodo = document.getElementById("btn-borrar-todo");
  if (btnBorrarTodo) {
    btnBorrarTodo.onclick = () => {
      if (confirm("¿Estás seguro de borrar todos tus datos? Por privacidad no quedará nada guardado.")) {
        borrarTodo();
      }
    };
  }
}

/**
 * Función borrarTodo():
 * - Reinicia el estado en memoria a valores por defecto
 * - Limpia los formularios
 * - Libera blobs y URLs creados con URL.revokeObjectURL
 * - Regresa a la primera pregunta
 */
export function borrarTodo() {
  estado = {
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
      inmediata: true
    },
    referencia: null
  };

  liberarRecursosPDF();
  limpiarError();
  irAPaso(0);
}

function mostrarAvisoModal(mensaje) {
  alert(mensaje);
}

