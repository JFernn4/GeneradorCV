/**
 * app.js
 * Orquestador principal del generador de CV.
 * Flujo paso a paso: una sola pregunta a la vez en pantalla.
 * 100% en memoria del navegador: cero backend, cero almacenamiento persistente (sin localStorage ni cookies).
 */

import { CATALOGO_AREAS, DURACIONES, ESTUDIOS_LABELS, NIVELES_IDIOMA, VEHICULO_LABELS } from "./catalogo.js";
import { validarEstado, limpiarTexto, normalizarNombre, normalizarTelefono, validarArchivoFoto } from "./validacion.js";
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
  foto: null, // string dataURL (JPEG sin EXIF de máx 400px) o null
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
let modoNuevaExperiencia = false;

// Lista ordenada de los pasos del asistente
const PASOS = [
  "nombre",
  "telefono",
  "zona",
  "correo",
  "foto",
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

// Control de flujo de cámara en vivo
let camaraStreamActivo = null;

function detenerCamaraActiva() {
  if (camaraStreamActivo) {
    try {
      camaraStreamActivo.getTracks().forEach((track) => track.stop());
    } catch (_) {}
    camaraStreamActivo = null;
  }
}

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

  if (PASOS[pasoActual] === "experiencia_detalle" && estado.experiencias.length === 0) {
    modoNuevaExperiencia = true;
  }

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
  detenerCamaraActiva();
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
    case "foto":
      renderPasoFoto();
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
 * Paso 5: Fotografía opcional
 */
function renderPasoFoto() {
  detenerCamaraActiva();

  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Fotografía (Opcional)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Deseas agregar una foto a tu currículum?"));

  // Texto obligatorio de privacidad
  const avisoPrivacidad = crearElemento("div", "aviso-privacidad-foto");
  avisoPrivacidad.appendChild(crearElemento("p", "", "La foto es opcional. No se guarda ni se envía: se queda en su celular."));
  wrapper.appendChild(avisoPrivacidad);

  // Contenedor principal de fotografía
  const cajaFoto = crearElemento("div", "caja-foto-container");

  // Input oculto para archivo desde galería o explorador
  const inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.accept = "image/jpeg,image/png,image/webp";
  inputFile.style.display = "none";

  // Input oculto para fallback en móvil con capture
  const inputCamara = document.createElement("input");
  inputCamara.type = "file";
  inputCamara.accept = "image/*";
  inputCamara.capture = "user";
  inputCamara.style.display = "none";

  cajaFoto.appendChild(inputFile);
  cajaFoto.appendChild(inputCamara);

  // Canvas de 300 x 400 px (proporción 3:4, máx 400 px de lado largo)
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 400;
  canvas.className = "canvas-foto-preview";

  let zoomActual = 1.0;
  let panY = 0;
  let imgEnMemoria = null;

  const redibujarCanvas = () => {
    if (!imgEnMemoria) return;
    const ctx = canvas.getContext("2d");
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);

    const imgRatio = imgEnMemoria.width / imgEnMemoria.height;
    const canvasRatio = cw / ch;

    let baseW, baseH;
    if (imgRatio > canvasRatio) {
      baseH = ch;
      baseW = ch * imgRatio;
    } else {
      baseW = cw;
      baseH = cw / imgRatio;
    }

    const w = baseW * zoomActual;
    const h = baseH * zoomActual;
    const x = (cw - w) / 2;
    const y = ((ch - h) / 2) + panY;

    ctx.drawImage(imgEnMemoria, x, y, w, h);

    // Exportar como JPEG a calidad ~0.8 (elimina metadatos EXIF / ubicación GPS y reduce peso)
    estado.foto = canvas.toDataURL("image/jpeg", 0.8);
  };

  const procesarArchivo = (file) => {
    limpiarError();
    const resVal = validarArchivoFoto(file);
    if (!resVal.valido) {
      mostrarError(resVal.error);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imgEnMemoria = img;
        zoomActual = 1.0;
        panY = 0;
        redibujarCanvas();
        renderizarPasoActual();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  inputFile.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarArchivo(e.target.files[0]);
    }
  });

  inputCamara.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarArchivo(e.target.files[0]);
    }
  });

  const iniciarCamara = async () => {
    limpiarError();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        });
        camaraStreamActivo = stream;
        mostrarVisorCamara(stream);
      } catch (err) {
        console.warn("No se pudo abrir la cámara directamente:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          mostrarError("Permiso de cámara no concedido. Puedes seleccionar una foto de tu galería.");
        }
        inputCamara.click();
      }
    } else {
      inputCamara.click();
    }
  };

  const mostrarVisorCamara = (stream) => {
    while (cajaFoto.firstChild) {
      cajaFoto.removeChild(cajaFoto.firstChild);
    }
    cajaFoto.appendChild(inputFile);
    cajaFoto.appendChild(inputCamara);

    const visorBox = crearElemento("div", "camara-viewfinder-box");
    visorBox.appendChild(crearElemento("p", "pregunta-nota", "Apunta la cámara a tu rostro y presiona 'Capturar foto'"));

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.className = "camara-video-preview";
    video.srcObject = stream;
    visorBox.appendChild(video);

    const controlesCam = crearElemento("div", "camara-controles-fila");

    const btnCapturar = crearElemento("button", "btn-pill-grande", "Capturar foto");
    btnCapturar.type = "button";
    btnCapturar.addEventListener("click", () => {
      const vW = video.videoWidth || 640;
      const vH = video.videoHeight || 480;
      const targetRatio = 300 / 400; // 0.75
      const vRatio = vW / vH;

      let sW, sH, sX, sY;
      if (vRatio > targetRatio) {
        sH = vH;
        sW = vH * targetRatio;
        sX = (vW - sW) / 2;
        sY = 0;
      } else {
        sW = vW;
        sH = vW / targetRatio;
        sX = 0;
        sY = (vH - sH) / 2;
      }

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      estado.foto = canvas.toDataURL("image/jpeg", 0.8);
      detenerCamaraActiva();
      renderizarPasoActual();
    });

    const btnCancelarCam = crearElemento("button", "btn-opcion-neutro", "Cancelar cámara");
    btnCancelarCam.type = "button";
    btnCancelarCam.addEventListener("click", () => {
      detenerCamaraActiva();
      renderizarPasoActual();
    });

    controlesCam.appendChild(btnCapturar);
    controlesCam.appendChild(btnCancelarCam);
    visorBox.appendChild(controlesCam);
    cajaFoto.appendChild(visorBox);
  };

  if (estado.foto) {
    const imgPrevia = new Image();
    imgPrevia.onload = () => {
      imgEnMemoria = imgPrevia;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgPrevia, 0, 0, canvas.width, canvas.height);
    };
    imgPrevia.src = estado.foto;

    cajaFoto.appendChild(canvas);

    // Controles de ajuste de encuadre (Zoom y Posición Vertical)
    const controlesBox = crearElemento("div", "foto-controles-box");
    controlesBox.appendChild(crearElemento("label", "label-campo", "Ajustar tamaño (Zoom):"));

    const sliderZoom = document.createElement("input");
    sliderZoom.type = "range";
    sliderZoom.min = "1.0";
    sliderZoom.max = "2.5";
    sliderZoom.step = "0.05";
    sliderZoom.value = "1.0";
    sliderZoom.className = "slider-foto";

    sliderZoom.addEventListener("input", (e) => {
      zoomActual = parseFloat(e.target.value);
      redibujarCanvas();
    });
    controlesBox.appendChild(sliderZoom);

    controlesBox.appendChild(crearElemento("label", "label-campo", "Centrar encuadre (Arriba / Abajo):"));
    const sliderY = document.createElement("input");
    sliderY.type = "range";
    sliderY.min = "-120";
    sliderY.max = "120";
    sliderY.step = "2";
    sliderY.value = "0";
    sliderY.className = "slider-foto";

    sliderY.addEventListener("input", (e) => {
      panY = parseInt(e.target.value, 10);
      redibujarCanvas();
    });
    controlesBox.appendChild(sliderY);

    const filaBtnsFoto = crearElemento("div", "fila-acciones-foto");
    const btnCambiar = crearElemento("button", "btn-opcion-neutro", "Cambiar foto");
    btnCambiar.type = "button";
    btnCambiar.addEventListener("click", () => {
      estado.foto = null;
      imgEnMemoria = null;
      inputFile.value = "";
      inputCamara.value = "";
      renderizarPasoActual();
    });

    const btnQuitar = crearElemento("button", "btn-eliminar-tarjeta", "Quitar foto");
    btnQuitar.type = "button";
    btnQuitar.addEventListener("click", () => {
      estado.foto = null;
      imgEnMemoria = null;
      inputFile.value = "";
      inputCamara.value = "";
      renderizarPasoActual();
    });

    filaBtnsFoto.appendChild(btnCambiar);
    filaBtnsFoto.appendChild(btnQuitar);
    controlesBox.appendChild(filaBtnsFoto);
    cajaFoto.appendChild(controlesBox);

    wrapper.appendChild(cajaFoto);

    // Botón continuar con la foto
    const btnContinuar = crearElemento("button", "btn-pill-grande", "Continuar con esta foto");
    btnContinuar.type = "button";
    btnContinuar.addEventListener("click", () => pasoSiguiente());
    wrapper.appendChild(btnContinuar);
  } else {
    // Si aún no ha subido foto
    const colOpciones = crearElemento("div", "opciones-destacadas-col");

    const btnGaleria = crearElemento("button", "btn-opcion-destacada");
    btnGaleria.type = "button";
    const txtGal = crearElemento("div", "btn-opcion-textos");
    txtGal.appendChild(crearElemento("strong", "", "Elegir foto de la galería"));
    txtGal.appendChild(crearElemento("span", "", "Formatos JPG, PNG o WebP"));
    btnGaleria.appendChild(txtGal);
    btnGaleria.addEventListener("click", () => inputFile.click());

    const btnTomar = crearElemento("button", "btn-opcion-destacada");
    btnTomar.type = "button";
    const txtTomar = crearElemento("div", "btn-opcion-textos");
    txtTomar.appendChild(crearElemento("strong", "", "Tomar foto con la cámara"));
    txtTomar.appendChild(crearElemento("span", "", "Usa la cámara del dispositivo"));
    btnTomar.appendChild(txtTomar);
    btnTomar.addEventListener("click", iniciarCamara);

    colOpciones.appendChild(btnGaleria);
    colOpciones.appendChild(btnTomar);
    cajaFoto.appendChild(colOpciones);
    wrapper.appendChild(cajaFoto);

    // Botón omitir
    const btnOmitir = crearElemento("button", "btn-pill-grande", "Continuar sin foto / Omitir");
    btnOmitir.type = "button";
    btnOmitir.addEventListener("click", () => {
      estado.foto = null;
      pasoSiguiente();
    });
    wrapper.appendChild(btnOmitir);
  }

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Paso 6: Áreas de trabajo buscadas
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
 * Muestra el formulario para ingresar un trabajo o el resumen claro de los ya agregados
 */
function renderPasoExperienciaDetalle() {
  const wrapper = crearElemento("div", "pregunta-box");

  // Si ya tiene experiencias y no está activamente agregando una nueva, mostrar el Resumen
  if (estado.experiencias.length > 0 && !modoNuevaExperiencia) {
    renderResumenExperiencias(wrapper);
    return;
  }

  // De lo contrario, mostrar el formulario para ingresar un trabajo
  renderFormularioExperiencia(wrapper);
}

/**
 * Vista de resumen de trabajos guardados con confirmación y opciones claras
 */
function renderResumenExperiencias(wrapper) {
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", `Experiencias registradas (${estado.experiencias.length}/3)`));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "Tus trabajos agregados"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Revisa tus experiencias o agrega otra antes de continuar:"));

  const listado = crearElemento("div", "lista-tarjetas-exp");
  estado.experiencias.forEach((exp, idx) => {
    const card = crearElemento("div", "tarjeta-exp-guardada");
    const info = crearElemento("div", "tarjeta-exp-info");
    info.appendChild(crearElemento("strong", "tarjeta-exp-titulo", exp.puesto));

    const duracionLegible = DURACIONES[exp.duracion] || "Menos de 6 meses";
    const sub = exp.lugar ? `${exp.lugar} · ${duracionLegible}` : duracionLegible;
    info.appendChild(crearElemento("span", "tarjeta-exp-subtitulo", sub));

    if (exp.tareas && exp.tareas.length > 0) {
      const textoTareas = exp.tareas.slice(0, 3).join(", ") + (exp.tareas.length > 3 ? "..." : "");
      info.appendChild(crearElemento("span", "tarjeta-exp-tareas", `Tareas: ${textoTareas}`));
    }
    card.appendChild(info);

    const btnQuitar = crearElemento("button", "btn-eliminar-tarjeta", "Quitar");
    btnQuitar.type = "button";
    btnQuitar.addEventListener("click", () => {
      estado.experiencias.splice(idx, 1);
      if (estado.experiencias.length === 0) {
        modoNuevaExperiencia = true;
      }
      renderizarPasoActual();
    });
    card.appendChild(btnQuitar);

    listado.appendChild(card);
  });
  wrapper.appendChild(listado);

  // Botón principal destacado: Continuar al siguiente paso
  const btnContinuar = crearElemento("button", "btn-pill-grande", "Continuar al siguiente paso");
  btnContinuar.type = "button";
  btnContinuar.addEventListener("click", () => {
    pasoSiguiente();
  });
  wrapper.appendChild(btnContinuar);

  // Botón secundario para agregar otro trabajo (si hay menos de 3)
  if (estado.experiencias.length < 3) {
    const btnAgregarOtra = crearElemento("button", "btn-opcion-neutro", `+ Agregar otro trabajo (${estado.experiencias.length}/3)`);
    btnAgregarOtra.type = "button";
    btnAgregarOtra.addEventListener("click", () => {
      modoNuevaExperiencia = true;
      renderizarPasoActual();
    });
    wrapper.appendChild(btnAgregarOtra);
  }

  wrapper.appendChild(crearBarraNavegacion({ showAtras: true }));
  contPaso.appendChild(wrapper);
}

/**
 * Formulario limpio para registrar un nuevo trabajo
 */
function renderFormularioExperiencia(wrapper) {
  const numExp = estado.experiencias.length + 1;
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", `Experiencia laboral (#${numExp} de 3)`));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", numExp === 1 ? "¿En qué has trabajado recientemente?" : `Trabajo o experiencia #${numExp}`));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Completa los datos de este puesto de trabajo"));

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
      chipsPuestos.querySelectorAll(".chip-sugerencia").forEach(c => c.classList.remove("seleccionado"));
      btnP.classList.add("seleccionado");
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
  btnIndep.type = "button";
  btnIndep.addEventListener("click", () => {
    inputLugar.value = "Trabajo independiente";
    filaLugaresRapidos.querySelectorAll(".chip-sugerencia").forEach(c => c.classList.remove("seleccionado"));
    btnIndep.classList.add("seleccionado");
  });

  const btnFam = crearElemento("button", "chip-sugerencia", "Trabajo familiar");
  btnFam.type = "button";
  btnFam.addEventListener("click", () => {
    inputLugar.value = "Trabajo familiar";
    filaLugaresRapidos.querySelectorAll(".chip-sugerencia").forEach(c => c.classList.remove("seleccionado"));
    btnFam.classList.add("seleccionado");
  });

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
  const btnGuardarExp = crearElemento("button", "btn-pill-grande", "Guardar este trabajo");
  btnGuardarExp.type = "button";
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
    modoNuevaExperiencia = false;
    renderizarPasoActual();
  });

  formExp.appendChild(btnGuardarExp);
  wrapper.appendChild(formExp);

  // Si ya tiene alguna experiencia y estaba agregando otra, botón para volver a la lista
  if (estado.experiencias.length > 0) {
    const btnVolver = crearElemento("button", "btn-opcion-neutro", "Volver a la lista de experiencias");
    btnVolver.type = "button";
    btnVolver.addEventListener("click", () => {
      modoNuevaExperiencia = false;
      renderizarPasoActual();
    });
    wrapper.appendChild(btnVolver);
  } else {
    // Si no tiene ninguna, botón de omitir
    const btnOmitir = crearElemento("button", "btn-opcion-neutro", "No tengo experiencia formal / Omitir");
    btnOmitir.type = "button";
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
      renderizarPasoActual();
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
 * Diseño compacto y ordenado, sin saltos extraños de espaciado
 */
function renderPasoIdiomas() {
  const wrapper = crearElemento("div", "pregunta-box");
  wrapper.appendChild(crearElemento("p", "pregunta-subtitulo", "Idiomas adicionales (Paso 9 de 12)"));
  wrapper.appendChild(crearElemento("h2", "pregunta-titulo", "¿Hablas algún idioma además de español?"));
  wrapper.appendChild(crearElemento("p", "pregunta-nota", "Español se asume nativo. Puedes agregar idiomas mayas, inglés u otros"));

  // Si ya hay idiomas agregados, mostrarlos como chips limpios con botón de quitar
  if (estado.idiomas.length > 0) {
    const contChipsIdiomas = crearElemento("div", "chips-idiomas-agregados");
    estado.idiomas.forEach((i, idx) => {
      const chip = crearElemento("div", "chip-idioma-item");
      chip.appendChild(crearElemento("span", "", `${i.idioma} (${NIVELES_IDIOMA[i.nivel] || "Intermedio"})`));
      
      const btnQuitar = crearElemento("button", "btn-quitar-idioma-chip", "✕");
      btnQuitar.type = "button";
      btnQuitar.setAttribute("aria-label", `Quitar idioma ${i.idioma}`);
      btnQuitar.addEventListener("click", () => {
        estado.idiomas.splice(idx, 1);
        renderizarPasoActual();
      });
      chip.appendChild(btnQuitar);
      contChipsIdiomas.appendChild(chip);
    });
    wrapper.appendChild(contChipsIdiomas);
  }

  // Idiomas comunes en Guatemala (chips de sugerencias rápidas)
  const sugerencias = ["K'iche'", "Kaqchikel", "Q'eqchi'", "Mam", "Inglés"];
  const chipsI = crearElemento("div", "chips-sugerencias-fila");

  for (const s of sugerencias) {
    const btnS = crearElemento("button", "chip-sugerencia", s);
    btnS.type = "button";
    btnS.addEventListener("click", () => {
      inputIdioma.value = s;
      chipsI.querySelectorAll(".chip-sugerencia").forEach(c => c.classList.remove("seleccionado"));
      btnS.classList.add("seleccionado");
      inputIdioma.focus();
    });
    chipsI.appendChild(btnS);
  }
  wrapper.appendChild(chipsI);

  // Formulario compacto y armonioso de agregar idioma
  const cajaAgregar = crearElemento("div", "caja-agregar-idioma");

  const inputIdioma = crearElemento("input", "input-pill");
  inputIdioma.placeholder = "Escribe o toca un idioma";
  inputIdioma.maxLength = 40;
  cajaAgregar.appendChild(inputIdioma);

  const filaControles = crearElemento("div", "fila-idioma-controles");

  const selectNivel = crearElemento("select", "select-idioma-compacto");
  selectNivel.appendChild(new Option("Nivel Básico", "basico"));
  selectNivel.appendChild(new Option("Nivel Intermedio", "medio", true, true));
  selectNivel.appendChild(new Option("Nivel Avanzado", "alto"));

  const btnAgregar = crearElemento("button", "btn-pill-accion", "+ Agregar idioma");
  btnAgregar.type = "button";
  btnAgregar.addEventListener("click", () => {
    const nom = limpiarTexto(inputIdioma.value);
    if (!nom) {
      mostrarError("Escribe o selecciona un idioma para agregarlo");
      return;
    }
    estado.idiomas.push({ idioma: nom, nivel: selectNivel.value });
    limpiarError();
    renderizarPasoActual();
  });

  filaControles.appendChild(selectNivel);
  filaControles.appendChild(btnAgregar);
  cajaAgregar.appendChild(filaControles);
  wrapper.appendChild(cajaAgregar);

  // Botón principal de continuación
  if (estado.idiomas.length > 0) {
    const btnContinuar = crearElemento("button", "btn-pill-grande", "Continuar con estos idiomas");
    btnContinuar.type = "button";
    btnContinuar.addEventListener("click", () => pasoSiguiente());
    wrapper.appendChild(btnContinuar);
  } else {
    const btnSoloEspanol = crearElemento("button", "btn-pill-grande", "Solo hablo español / Continuar");
    btnSoloEspanol.type = "button";
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
  detenerCamaraActiva();
  estado = {
    contacto: {
      nombre: "",
      telefono: "",
      correo: null,
      zona: ""
    },
    foto: null,
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

