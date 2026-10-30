/**
 * tests.js
 * Suite de pruebas automatizadas para la lógica pura del generador de CV.
 * Ejecutable directamente con Node.js (`node tests.js` o `npm test`).
 */

import { buildCV, formatearListaY, armarFraseDisponibilidad } from "./cv-builder.js";
import { validarEstado, normalizarNombre, normalizarTelefono, limpiarTexto } from "./validacion.js";
import { construirDocumentoPDF, generarNombreArchivoPDF } from "./pdf.js";

let exitosos = 0;
let fallidos = 0;

function assert(condicion, descripcion, detalle = "") {
  if (condicion) {
    console.log(`✅ [PASS] ${descripcion}`);
    exitosos++;
  } else {
    console.error(`❌ [FAIL] ${descripcion}`);
    if (detalle) console.error(`   Detalle: ${detalle}`);
    fallidos++;
  }
}

console.log("==========================================");
console.log("EJECUTANDO PRUEBAS DEL GENERADOR DE CV");
console.log("==========================================\n");

// ----------------------------------------------------
// CASO 1: Con experiencia
// ----------------------------------------------------
console.log("--- Caso 1: Con experiencia ---");
const entradaCaso1 = {
  contacto: {
    nombre: "juan carlos pérez",
    telefono: "55551234",
    zona: "Mixco, Guatemala"
  },
  areas: ["construccion", "limpieza"],
  experiencias: [
    {
      puesto: "Ayudante de construcción",
      lugar: "trabajo independiente",
      duracion: "1_3a",
      tareas: ["Carga y descarga de materiales", "Limpieza de obra"]
    }
  ],
  disponibilidad: {
    jornada: "completo",
    inmediata: true
  }
};

const cv1 = buildCV(entradaCaso1);
const perfil1 = cv1.secciones.find(s => s.id === "perfil")?.contenido;
const perfilEsperado1 = "Persona con más de 1 año de experiencia en construcción. Busca empleo en construcción y limpieza. Disponibilidad de tiempo completo, con inicio inmediato.";

assert(
  cv1.encabezado.nombre === "Juan Carlos Pérez",
  "Caso 1: Normalización de nombre en Title Case",
  `Obtenido: "${cv1.encabezado.nombre}" | Esperado: "Juan Carlos Pérez"`
);

assert(
  cv1.encabezado.contactos[0] === "+502 5555 1234",
  "Caso 1: Formato de teléfono local (+502 XXXX XXXX)",
  `Obtenido: "${cv1.encabezado.contactos[0]}" | Esperado: "+502 5555 1234"`
);

assert(
  perfil1 === perfilEsperado1,
  "Caso 1: Frase de perfil calculada con experiencia",
  `Obtenido: "${perfil1}"\nEsperado: "${perfilEsperado1}"`
);

const secExp1 = cv1.secciones.find(s => s.id === "experiencia");
assert(
  secExp1 && secExp1.contenido.length === 1 && secExp1.contenido[0].subtitulo.includes("trabajo independiente · 1 a 3 años"),
  "Caso 1: Sección de experiencia estructurada",
  `Subtítulo: ${secExp1?.contenido[0]?.subtitulo}`
);

// ----------------------------------------------------
// CASO 2: Sin experiencia
// ----------------------------------------------------
console.log("\n--- Caso 2: Sin experiencia ---");
const entradaCaso2 = {
  contacto: {
    nombre: "Ana Gómez",
    telefono: "44441111",
    zona: "Zona 1, Ciudad de Guatemala"
  },
  sinExperiencia: true,
  areas: ["cocina"],
  habilidades: ["Preparación de alimentos", "Trabajo en equipo"],
  disponibilidad: {
    jornada: "medio"
  }
};

const cv2 = buildCV(entradaCaso2);
const perfil2 = cv2.secciones.find(s => s.id === "perfil")?.contenido;
const perfilEsperado2 = "Persona que busca empleo en cocina. Cuenta con habilidades en preparación de alimentos y trabajo en equipo. Disponibilidad de medio tiempo.";

assert(
  perfil2 === perfilEsperado2,
  "Caso 2: Frase de perfil para persona sin experiencia",
  `Obtenido: "${perfil2}"\nEsperado: "${perfilEsperado2}"`
);

// Verificar orden de secciones: Habilidades debe ir justo después de Perfil (índice 1)
const indicePerfil = cv2.secciones.findIndex(s => s.id === "perfil");
const indiceHabilidades = cv2.secciones.findIndex(s => s.id === "habilidades");
const existeExperiencia = cv2.secciones.some(s => s.id === "experiencia");

assert(
  indiceHabilidades === indicePerfil + 1,
  "Caso 2: Habilidades aparece antes de las demás secciones (inmediatamente tras Perfil)",
  `Índice perfil: ${indicePerfil}, Índice habilidades: ${indiceHabilidades}`
);

assert(
  !existeExperiencia,
  "Caso 2: No existe sección de experiencia cuando sinExperiencia es true",
  `Secciones presentes: ${cv2.secciones.map(s => s.id).join(", ")}`
);

// ----------------------------------------------------
// CASO 3: Mínimo
// ----------------------------------------------------
console.log("\n--- Caso 3: Mínimo ---");
const entradaCaso3 = {
  contacto: {
    nombre: "Pedro Morales",
    telefono: "55559999",
    zona: "Villa Nueva"
  },
  areas: ["limpieza"],
  disponibilidad: {
    jornada: "temporal"
  }
};

const cv3 = buildCV(entradaCaso3);
const idsSecciones3 = cv3.secciones.map(s => s.id);

assert(
  cv3.encabezado.nombre === "Pedro Morales" && cv3.encabezado.contactos.length === 2,
  "Caso 3: Encabezado válido solo con teléfono y zona",
  JSON.stringify(cv3.encabezado)
);

assert(
  !idsSecciones3.includes("experiencia") &&
  !idsSecciones3.includes("habilidades") &&
  !idsSecciones3.includes("idiomas") &&
  !idsSecciones3.includes("estudios") &&
  !idsSecciones3.includes("referencias"),
  "Caso 3: Omite todas las secciones vacías (experiencia, habilidades, idiomas, estudios, referencias)",
  `Secciones presentes: ${idsSecciones3.join(", ")}`
);

assert(
  idsSecciones3.includes("perfil") && idsSecciones3.includes("adicional"),
  "Caso 3: Mantiene perfil y disponibilidad adicional mínima",
  `Secciones presentes: ${idsSecciones3.join(", ")}`
);

// ----------------------------------------------------
// CASO 4: Errores de validación
// ----------------------------------------------------
console.log("\n--- Caso 4: Errores de validación ---");
const entradaCaso4 = {
  contacto: {
    nombre: "",
    telefono: "123",
    zona: "Villa Nueva"
  },
  areas: []
};

const resultadoValidacion4 = validarEstado(entradaCaso4);
assert(
  resultadoValidacion4.valido === false,
  "Caso 4: Estado catalogado como inválido",
  `valido: ${resultadoValidacion4.valido}`
);

const errorNombre = resultadoValidacion4.errores.find(e => e.campo === "nombre");
const errorTelefono = resultadoValidacion4.errores.find(e => e.campo === "telefono");
const errorAreas = resultadoValidacion4.errores.find(e => e.campo === "areas");

assert(
  Boolean(errorNombre && errorNombre.mensaje),
  "Caso 4: Error de nombre vacío detectado con mensaje claro",
  errorNombre ? `Mensaje: "${errorNombre.mensaje}"` : "No encontrado"
);

assert(
  Boolean(errorTelefono && errorTelefono.mensaje),
  "Caso 4: Error de teléfono '123' detectado con mensaje claro",
  errorTelefono ? `Mensaje: "${errorTelefono.mensaje}"` : "No encontrado"
);

assert(
  Boolean(errorAreas && errorAreas.mensaje),
  "Caso 4: Error de áreas vacías detectado con mensaje claro",
  errorAreas ? `Mensaje: "${errorAreas.mensaje}"` : "No encontrado"
);

// ----------------------------------------------------
// CASO ADICIONAL: Partículas en minúscula ("juan de la rosa")
// ----------------------------------------------------
console.log("\n--- Casos adicionales: Partículas en nombres ---");
const entradaParticulas = {
  contacto: {
    nombre: "juan de la rosa",
    telefono: "55551122",
    zona: "Antigua Guatemala"
  },
  areas: ["taller"]
};
const cvParticulas = buildCV(entradaParticulas);
assert(
  cvParticulas.encabezado.nombre === "Juan de la Rosa",
  "Caso adicional: Partículas en minúscula 'Juan de la Rosa'",
  `Obtenido: "${cvParticulas.encabezado.nombre}"`
);

// ----------------------------------------------------
// CASOS DE GENERACIÓN DE PDF Y ARCHIVOS
// ----------------------------------------------------
console.log("\n--- Pruebas de exportación a PDF ---");
const nombreArchivoGenerado = generarNombreArchivoPDF("María Isabela Fernández Álvarez");
assert(
  nombreArchivoGenerado === "CV_Maria_Isabela_Fernandez_Alvarez.pdf",
  "PDF: Nombre de archivo sin acentos, espacios ni caracteres especiales",
  `Obtenido: ${nombreArchivoGenerado}`
);

const docClasico = construirDocumentoPDF(cv1, { plantilla: "clasico" });
const docLateral = construirDocumentoPDF(cv1, { plantilla: "lateral" });
const docEjecutivo = construirDocumentoPDF(cv1, { plantilla: "ejecutivo" });

assert(
  docClasico.internal.getNumberOfPages() === 1,
  "PDF: Plantilla clásica cabe exactamente en 1 página Carta",
  `Páginas: ${docClasico.internal.getNumberOfPages()}`
);

assert(
  docLateral.internal.getNumberOfPages() === 1,
  "PDF: Plantilla lateral cabe exactamente en 1 página Carta",
  `Páginas: ${docLateral.internal.getNumberOfPages()}`
);

assert(
  docEjecutivo.internal.getNumberOfPages() === 1,
  "PDF: Plantilla ejecutiva cabe exactamente en 1 página Carta",
  `Páginas: ${docEjecutivo.internal.getNumberOfPages()}`
);

// ----------------------------------------------------
// RESUMEN
// ----------------------------------------------------
console.log("\n==========================================");
console.log(`TOTAL PRUEBAS: ${exitosos + fallidos} | EXITOSAS: ${exitosos} | FALLIDAS: ${fallidos}`);
console.log("==========================================");

if (fallidos > 0) {
  process.exit(1);
}
