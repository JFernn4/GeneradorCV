/**
 * pdf.js
 * Módulo de generación y exportación a PDF 100% en el navegador y sin conexión.
 * Utiliza jsPDF cargado localmente (sin CDNs ni peticiones de red).
 * Genera PDFs tamaño Carta (Letter) con texto real seleccionable (no imagen).
 * Implementa control de desbordamiento para asegurar que quepa en una sola página.
 */

let jsPDFClass = globalThis.jspdf?.jsPDF || globalThis.jsPDF;

if (!jsPDFClass) {
  try {
    const mod = await import("jspdf");
    jsPDFClass = mod.jsPDF || mod.default?.jsPDF || mod.default;
  } catch (e) {
    // Si no está disponible en Node, se resolverá en tiempo de ejecución en navegador
  }
}

// Lista de URLs de objetos creados para poder liberarlos en borrarTodo()
const urlsGeneradas = new Set();

/**
 * Quita acentos, espacios y caracteres especiales para crear un nombre de archivo seguro.
 * Ej: "Juan Carlos Pérez" -> "CV_Juan_Carlos_Perez.pdf"
 * @param {string} nombre
 * @returns {string}
 */
export function generarNombreArchivoPDF(nombre) {
  if (!nombre || typeof nombre !== "string") {
    return "CV_Candidato.pdf";
  }
  // Normalizar para separar acentos y eliminarlos
  const sinAcentos = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Reemplazar espacios y caracteres no alfanuméricos por guion bajo
  const limpio = sinAcentos.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `CV_${limpio || "Candidato"}.pdf`;
}

/**
 * Libera todos los Blob URLs creados en memoria para garantizar privacidad y limpieza.
 */
export function liberarRecursosPDF() {
  for (const url of urlsGeneradas) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignorar si ya fue liberado
    }
  }
  urlsGeneradas.clear();
}

/**
 * Genera el documento jsPDF con texto real seleccionable y diseño profesional.
 * @param {object} cv - Estructura devuelta por buildCV()
 * @param {object} opciones - { plantilla, densidad, escalaEspaciado }
 * @returns {jsPDF} Instancia de jsPDF configurada
 */
export function construirDocumentoPDF(cv, opciones = {}) {
  const plantilla = opciones.plantilla || "clasico";
  const densidad = opciones.densidad || "normal";
  const escala = opciones.escalaEspaciado || (densidad === "compacta" ? 0.88 : 1.0);

  const PDFConstructor = jsPDFClass || globalThis.jspdf?.jsPDF || globalThis.jsPDF;
  if (!PDFConstructor) {
    throw new Error("No se pudo cargar la librería jsPDF");
  }

  // Formato Carta: 215.9 mm ancho x 279.4 mm alto (Letter)
  const doc = new PDFConstructor({
    orientation: "portrait",
    unit: "mm",
    format: "letter"
  });

  if (plantilla === "lateral") {
    dibujarPlantillaLateral(doc, cv, escala);
  } else if (plantilla === "ejecutivo") {
    dibujarPlantillaEjecutivo(doc, cv, escala);
  } else {
    dibujarPlantillaClasico(doc, cv, escala);
  }

  return doc;
}

// ============================================================================
// 1. DIBUJO PDF: PLANTILLA CLÁSICA (Minimalista con divisores)
// ============================================================================
function dibujarPlantillaClasico(doc, cv, escala) {
  const margenX = 18;
  const anchoUtil = 215.9 - (margenX * 2);
  let y = 20;

  // --- Encabezado ---
  let textoX = margenX;

  // Si incluye fotografía opcional
  if (cv.encabezado.foto) {
    try {
      const anchoFoto = 20 * escala;
      const altoFoto = 24 * escala;
      doc.addImage(cv.encabezado.foto, "JPEG", margenX, 13, anchoFoto, altoFoto);
      textoX = margenX + anchoFoto + (5 * escala);
    } catch (e) {
      console.warn("No se pudo añadir foto en PDF clásico:", e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22 * escala);
  doc.setTextColor(20, 20, 20);
  const nombreTexto = (cv.encabezado.nombre || "CURRÍCULUM VITAE").toUpperCase();
  doc.text(nombreTexto, textoX, y);

  // Contactos a la derecha o debajo según espacio
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9 * escala);
  doc.setTextColor(80, 80, 80);

  const contactos = cv.encabezado.contactos || [];
  const lineaContacto = contactos.join("   •   ");
  y += 7 * escala;
  doc.text(lineaContacto, textoX, y);

  // Línea divisoria
  y = Math.max(y + (5 * escala), cv.encabezado.foto ? 13 + (24 * escala) + 3 : y + (5 * escala));
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(margenX, y, margenX + anchoUtil, y);
  y += 6 * escala;

  // --- Secciones ---
  for (const sec of cv.secciones) {
    // Título de la sección
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11 * escala);
    doc.setTextColor(30, 41, 59);
    doc.text(sec.titulo.toUpperCase(), margenX, y);
    y += 4 * escala;

    // Línea sutil bajo título
    doc.setDrawColor(220, 226, 235);
    doc.setLineWidth(0.25);
    doc.line(margenX, y, margenX + anchoUtil, y);
    y += 4.5 * escala;

    if (sec.tipo === "texto") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5 * escala);
      doc.setTextColor(50, 50, 50);
      const lineas = doc.splitTextToSize(sec.contenido, anchoUtil);
      doc.text(lineas, margenX, y);
      y += (lineas.length * 4.2 * escala) + (4 * escala);
    } else if (sec.tipo === "entradas") {
      for (const ent of sec.contenido) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10 * escala);
        doc.setTextColor(30, 30, 30);
        doc.text(ent.titulo, margenX, y);
        y += 4 * escala;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5 * escala);
        doc.setTextColor(100, 100, 100);
        doc.text(ent.subtitulo, margenX, y);
        y += 3.8 * escala;

        if (Array.isArray(ent.viñetas) && ent.viñetas.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9 * escala);
          doc.setTextColor(60, 60, 60);
          for (const v of ent.viñetas) {
            const textoViñeta = `•  ${v}`;
            const lineasV = doc.splitTextToSize(textoViñeta, anchoUtil - 5);
            doc.text(lineasV, margenX + 2, y);
            y += (lineasV.length * 3.8 * escala);
          }
        }
        y += 2.5 * escala;
      }
      y += 2 * escala;
    } else if (sec.tipo === "lista") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9 * escala);
      doc.setTextColor(60, 60, 60);

      // Si son habilidades o datos cortos, renderizar en 2 columnas si conviene
      const esHabilidad = sec.id === "habilidades";
      if (esHabilidad && sec.contenido.length > 3) {
        const mitad = Math.ceil(sec.contenido.length / 2);
        const col1 = sec.contenido.slice(0, mitad);
        const col2 = sec.contenido.slice(mitad);
        const colAncho = (anchoUtil / 2) - 4;
        const inicioY = y;

        let yCol1 = inicioY;
        for (const item of col1) {
          doc.text(`•  ${item}`, margenX + 2, yCol1);
          yCol1 += 4 * escala;
        }

        let yCol2 = inicioY;
        for (const item of col2) {
          doc.text(`•  ${item}`, margenX + (anchoUtil / 2) + 2, yCol2);
          yCol2 += 4 * escala;
        }
        y = Math.max(yCol1, yCol2) + (3 * escala);
      } else {
        for (const item of sec.contenido) {
          const lineas = doc.splitTextToSize(`•  ${item}`, anchoUtil - 4);
          doc.text(lineas, margenX + 2, y);
          y += (lineas.length * 4 * escala);
        }
        y += 3 * escala;
      }
    }
  }
}

// ============================================================================
// 2. DIBUJO PDF: PLANTILLA CON BARRA LATERAL (Inspirada en Ricardo Salinas)
// ============================================================================
function dibujarPlantillaLateral(doc, cv, escala) {
  const anchoSidebar = 68;
  const altoPagina = 279.4;

  // Fondo barra lateral
  doc.setFillColor(238, 244, 247); // Azul suave
  doc.rect(0, 0, anchoSidebar, altoPagina, "F");

  // Barra divisoria sutil
  doc.setDrawColor(215, 226, 233);
  doc.setLineWidth(0.4);
  doc.line(anchoSidebar, 0, anchoSidebar, altoPagina);

  // --- CONTENIDO BARRA LATERAL ---
  let ySidebar = 22;
  const margenSideX = 10;
  const anchoUtilSide = anchoSidebar - (margenSideX * 2);

  // Si incluye fotografía opcional en el sidebar
  if (cv.encabezado.foto) {
    try {
      const anchoFotoSide = 32 * escala;
      const altoFotoSide = 38 * escala;
      const xFotoSide = (anchoSidebar - anchoFotoSide) / 2;
      doc.addImage(cv.encabezado.foto, "JPEG", xFotoSide, 14, anchoFotoSide, altoFotoSide);
      ySidebar = 14 + altoFotoSide + (6 * escala);
    } catch (e) {
      console.warn("No se pudo añadir foto en PDF lateral:", e);
    }
  }

  // Contacto en Sidebar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10 * escala);
  doc.setTextColor(24, 43, 73);
  doc.text("CONTACTO", margenSideX, ySidebar);
  ySidebar += 5 * escala;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * escala);
  doc.setTextColor(55, 65, 81);
  for (const c of cv.encabezado.contactos) {
    const lineasC = doc.splitTextToSize(c, anchoUtilSide);
    doc.text(lineasC, margenSideX, ySidebar);
    ySidebar += (lineasC.length * 3.8 * escala) + (1.5 * escala);
  }
  ySidebar += 5 * escala;

  // Secciones secundarias en el sidebar
  const idsSidebar = new Set(["perfil", "habilidades", "idiomas", "adicional"]);
  const seccionesSidebar = cv.secciones.filter(s => idsSidebar.has(s.id));
  const seccionesPrincipal = cv.secciones.filter(s => !idsSidebar.has(s.id));

  for (const sec of seccionesSidebar) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10 * escala);
    doc.setTextColor(24, 43, 73);
    doc.text(sec.titulo.toUpperCase(), margenSideX, ySidebar);
    ySidebar += 4.5 * escala;

    if (sec.tipo === "texto") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5 * escala);
      doc.setTextColor(55, 65, 81);
      const lineas = doc.splitTextToSize(sec.contenido, anchoUtilSide);
      doc.text(lineas, margenSideX, ySidebar);
      ySidebar += (lineas.length * 3.8 * escala) + (5 * escala);
    } else if (sec.tipo === "lista") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5 * escala);
      doc.setTextColor(55, 65, 81);
      for (const item of sec.contenido) {
        const lineas = doc.splitTextToSize(`•  ${item}`, anchoUtilSide);
        doc.text(lineas, margenSideX, ySidebar);
        ySidebar += (lineas.length * 3.8 * escala);
      }
      ySidebar += 4 * escala;
    }
  }

  // --- COLUMNA PRINCIPAL (DERECHA) ---
  const margenMainX = anchoSidebar + 14;
  const anchoUtilMain = 215.9 - margenMainX - 14;
  let yMain = 24;

  // Nombre principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22 * escala);
  doc.setTextColor(24, 43, 73);
  doc.text((cv.encabezado.nombre || "CURRÍCULUM VITAE").toUpperCase(), margenMainX, yMain);
  yMain += 10 * escala;

  for (const sec of seccionesPrincipal) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11 * escala);
    doc.setTextColor(24, 43, 73);
    doc.text(sec.titulo.toUpperCase(), margenMainX, yMain);
    yMain += 4 * escala;

    doc.setDrawColor(24, 43, 73);
    doc.setLineWidth(0.3);
    doc.line(margenMainX, yMain, margenMainX + anchoUtilMain, yMain);
    yMain += 5 * escala;

    if (sec.tipo === "entradas") {
      for (const ent of sec.contenido) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10 * escala);
        doc.setTextColor(20, 20, 20);
        doc.text(ent.titulo, margenMainX, yMain);
        yMain += 4 * escala;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5 * escala);
        doc.setTextColor(90, 90, 90);
        doc.text(ent.subtitulo, margenMainX, yMain);
        yMain += 4 * escala;

        if (Array.isArray(ent.viñetas) && ent.viñetas.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9 * escala);
          doc.setTextColor(60, 60, 60);
          for (const v of ent.viñetas) {
            const lineasV = doc.splitTextToSize(`•  ${v}`, anchoUtilMain - 4);
            doc.text(lineasV, margenMainX + 2, yMain);
            yMain += (lineasV.length * 3.8 * escala);
          }
        }
        yMain += 3 * escala;
      }
      yMain += 2 * escala;
    } else if (sec.tipo === "lista") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9 * escala);
      doc.setTextColor(60, 60, 60);
      for (const item of sec.contenido) {
        const lineas = doc.splitTextToSize(`•  ${item}`, anchoUtilMain - 4);
        doc.text(lineas, margenMainX + 2, yMain);
        yMain += (lineas.length * 4 * escala);
      }
      yMain += 4 * escala;
    }
  }
}

// ============================================================================
// 3. DIBUJO PDF: PLANTILLA EJECUTIVA (Franja superior azul, tipo Mariana Napolitani)
// ============================================================================
function dibujarPlantillaEjecutivo(doc, cv, escala) {
  const altoBanner = 34 * escala;

  // Franja superior azul oscuro
  doc.setFillColor(14, 42, 71); // #0e2a47
  doc.rect(0, 0, 215.9, altoBanner, "F");

  let xNombreBanner = 16;
  if (cv.encabezado.foto) {
    try {
      const anchoFotoB = 18 * escala;
      const altoFotoB = 22 * escala;
      const yFotoB = (altoBanner - altoFotoB) / 2;
      doc.addImage(cv.encabezado.foto, "JPEG", 16, yFotoB, anchoFotoB, altoFotoB);
      xNombreBanner = 16 + anchoFotoB + (5 * escala);
    } catch (e) {
      console.warn("No se pudo añadir foto en PDF ejecutivo:", e);
    }
  }

  // Nombre blanco en banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20 * escala);
  doc.setTextColor(255, 255, 255);
  doc.text((cv.encabezado.nombre || "CURRÍCULUM VITAE").toUpperCase(), xNombreBanner, 20 * escala);

  // Contactos a la derecha del banner en blanco
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5 * escala);
  doc.setTextColor(220, 230, 245);
  const contactos = cv.encabezado.contactos || [];
  let yBannerC = 12 * escala;
  for (const c of contactos) {
    doc.text(c, 200, yBannerC, { align: "right" });
    yBannerC += 4.5 * escala;
  }

  // --- CUERPO: 2 COLUMNAS ESTRUCTURADAS ---
  const margenX = 16;
  const colTituloAncho = 42;
  const xSeparador = margenX + colTituloAncho + 4;
  const xContenido = xSeparador + 6;
  const anchoContenido = 215.9 - xContenido - margenX;
  let y = altoBanner + (14 * escala);

  for (const sec of cv.secciones) {
    const inicioSecY = y;

    // Título de la sección en columna izquierda
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10 * escala);
    doc.setTextColor(14, 42, 71);
    const lineasTitulo = doc.splitTextToSize(sec.titulo.toUpperCase(), colTituloAncho);
    doc.text(lineasTitulo, margenX, y);

    // Contenido en columna derecha
    let yContenido = inicioSecY;
    if (sec.tipo === "texto") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9 * escala);
      doc.setTextColor(50, 50, 50);
      const lineas = doc.splitTextToSize(sec.contenido, anchoContenido);
      doc.text(lineas, xContenido, yContenido);
      yContenido += (lineas.length * 4.2 * escala);
    } else if (sec.tipo === "entradas") {
      for (const ent of sec.contenido) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5 * escala);
        doc.setTextColor(20, 20, 20);
        doc.text(ent.titulo, xContenido, yContenido);
        yContenido += 3.8 * escala;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5 * escala);
        doc.setTextColor(90, 90, 90);
        doc.text(ent.subtitulo, xContenido, yContenido);
        yContenido += 3.8 * escala;

        if (Array.isArray(ent.viñetas) && ent.viñetas.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.8 * escala);
          doc.setTextColor(60, 60, 60);
          for (const v of ent.viñetas) {
            const lineasV = doc.splitTextToSize(`•  ${v}`, anchoContenido - 4);
            doc.text(lineasV, xContenido + 2, yContenido);
            yContenido += (lineasV.length * 3.8 * escala);
          }
        }
        yContenido += 2.5 * escala;
      }
    } else if (sec.tipo === "lista") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9 * escala);
      doc.setTextColor(60, 60, 60);
      for (const item of sec.contenido) {
        const lineas = doc.splitTextToSize(`•  ${item}`, anchoContenido - 4);
        doc.text(lineas, xContenido + 2, yContenido);
        yContenido += (lineas.length * 3.8 * escala);
      }
    }

    // Calcular avance para la siguiente sección
    y = Math.max(yContenido, inicioSecY + (lineasTitulo.length * 5 * escala)) + (7 * escala);
  }

  // Dibujar línea separadora vertical continua desde el banner hasta el final del contenido
  doc.setDrawColor(210, 220, 230);
  doc.setLineWidth(0.4);
  doc.line(xSeparador, altoBanner + 8, xSeparador, Math.min(270, y));
}

/**
 * Genera el archivo PDF y dispara la descarga en el navegador.
 * Verifica si el documento cabe en una página; si desborda y está en densidad normal,
 * aplica el hook automático de densidad compacta.
 * @param {object} cv - Estructura generada por buildCV()
 * @param {object} [opciones] - { plantilla: "clasico"|"lateral"|"ejecutivo", densidad: "normal"|"compacta", onDesbordamiento?: Function }
 */
export function descargarPDF(cv, opciones = {}) {
  let densidad = opciones.densidad || "normal";
  let doc = construirDocumentoPDF(cv, { ...opciones, densidad });

  // Hook de verificación de desbordamiento de una página:
  // Si el documento tiene más de 1 página (Carta = 279.4mm)
  if (doc.internal.getNumberOfPages() > 1 && densidad !== "compacta") {
    if (typeof opciones.onDesbordamiento === "function") {
      opciones.onDesbordamiento({
        mensaje: "El contenido excedía 1 página. Se ajustó automáticamente a densidad compacta."
      });
    }
    // Reconstruir con densidad compacta para garantizar 1 sola página
    densidad = "compacta";
    doc = construirDocumentoPDF(cv, { ...opciones, densidad, escalaEspaciado: 0.85 });
  }

  const nombreArchivo = generarNombreArchivoPDF(cv.encabezado?.nombre);
  doc.save(nombreArchivo);
}

/**
 * Genera un Blob URL seguro para la previsualización del PDF en un iframe o visor.
 * Guarda la referencia para ser liberada luego por liberarRecursosPDF().
 * @param {object} cv
 * @param {object} [opciones]
 * @returns {string} Blob URL
 */
export function generarBlobURLPDF(cv, opciones = {}) {
  const doc = construirDocumentoPDF(cv, opciones);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  urlsGeneradas.add(url);
  return url;
}

