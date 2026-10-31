/**
 * render.js
 * Capa de presentación desacoplada del generador de CV.
 * Renderiza la estructura canónica producida por buildCV en el DOM usando
 * manipulación segura (document.createElement y textContent), sin innerHTML para datos del usuario.
 * Soporta 3 plantillas visuales inspiradas en los diseños de referencia:
 * 1. "clasico": Estilo minimalista con divisores horizontales (tipo Isabela Fernández).
 * 2. "lateral": Estilo con barra lateral contrastada (tipo Ricardo Salinas).
 * 3. "ejecutivo": Estilo corporativo con franja superior azul y columnas alineadas (tipo Mariana Napolitani).
 */

/**
 * Crea un elemento DOM de forma segura con clase opcional y texto opcional.
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [texto]
 * @returns {HTMLElement}
 */
export function crearElemento(tag, className = "", texto = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (texto !== undefined && texto !== null && texto !== "") {
    el.textContent = texto;
  }
  return el;
}

/**
 * Renderiza el CV según la plantilla elegida.
 * @param {object} cvEstructura - Objeto devuelto por buildCV()
 * @param {HTMLElement} contenedor - Elemento DOM donde se insertará el CV
 * @param {{ plantilla?: "clasico" | "lateral" | "ejecutivo", densidad?: "normal" | "compacta" }} opciones
 */
export function renderizarCV(cvEstructura, contenedor, opciones = {}) {
  if (!contenedor) return;
  const plantilla = opciones.plantilla || "clasico";
  const densidad = opciones.densidad || "normal";

  // Limpiar contenedor
  while (contenedor.firstChild) {
    contenedor.removeChild(contenedor.firstChild);
  }

  const hoja = crearElemento("article", `cv-hoja cv-plantilla-${plantilla} cv-densidad-${densidad}`);

  if (plantilla === "lateral") {
    renderizarPlantillaLateral(cvEstructura, hoja);
  } else if (plantilla === "ejecutivo") {
    renderizarPlantillaEjecutivo(cvEstructura, hoja);
  } else {
    renderizarPlantillaClasico(cvEstructura, hoja);
  }

  contenedor.appendChild(hoja);
}

// ============================================================================
// 1. PLANTILLA CLÁSICA (Minimalista con divisores limpios)
// ============================================================================
function renderizarPlantillaClasico(cv, hoja) {
  // Encabezado
  const header = crearElemento("header", "cv-header-clasico");

  if (cv.encabezado.foto) {
    const fotoBox = crearElemento("div", "cv-header-foto-box");
    const img = document.createElement("img");
    img.src = cv.encabezado.foto;
    img.alt = "Fotografía";
    img.className = "cv-foto-redonda";
    fotoBox.appendChild(img);
    header.appendChild(fotoBox);
  }

  const headerLeft = crearElemento("div", "cv-header-left");
  const nombreEl = crearElemento("h1", "cv-nombre", cv.encabezado.nombre || "Currículum Vitae");
  headerLeft.appendChild(nombreEl);

  const headerRight = crearElemento("div", "cv-header-right cv-contactos");
  for (const c of cv.encabezado.contactos) {
    const item = crearElemento("span", "cv-contacto-item", c);
    headerRight.appendChild(item);
  }

  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  hoja.appendChild(header);

  // Divisor horizontal
  hoja.appendChild(crearElemento("hr", "cv-divisor"));

  // Cuerpo de secciones
  const cuerpo = crearElemento("main", "cv-cuerpo-clasico");

  for (const sec of cv.secciones) {
    const secEl = crearElemento("section", `cv-seccion cv-seccion-${sec.id}`);
    const tituloEl = crearElemento("h2", "cv-seccion-titulo", sec.titulo);
    secEl.appendChild(tituloEl);

    if (sec.tipo === "texto") {
      const p = crearElemento("p", "cv-seccion-texto", sec.contenido);
      secEl.appendChild(p);
    } else if (sec.tipo === "entradas") {
      const listaEntradas = crearElemento("div", "cv-entradas-lista");
      for (const ent of sec.contenido) {
        const itemEntrada = crearElemento("div", "cv-entrada-item");
        const entTitulo = crearElemento("h3", "cv-entrada-titulo", ent.titulo);
        const entSub = crearElemento("div", "cv-entrada-subtitulo", ent.subtitulo);
        itemEntrada.appendChild(entTitulo);
        itemEntrada.appendChild(entSub);

        if (Array.isArray(ent.viñetas) && ent.viñetas.length > 0) {
          const ul = crearElemento("ul", "cv-viñetas");
          for (const v of ent.viñetas) {
            const li = crearElemento("li", "cv-viñeta-item", v);
            ul.appendChild(li);
          }
          itemEntrada.appendChild(ul);
        }
        listaEntradas.appendChild(itemEntrada);
      }
      secEl.appendChild(listaEntradas);
    } else if (sec.tipo === "lista") {
      const ul = crearElemento("ul", "cv-lista-simple");
      for (const itemTexto of sec.contenido) {
        const li = crearElemento("li", "cv-item-simple", itemTexto);
        ul.appendChild(li);
      }
      secEl.appendChild(ul);
    }

    cuerpo.appendChild(secEl);
  }

  hoja.appendChild(cuerpo);
}

// ============================================================================
// 2. PLANTILLA CON BARRA LATERAL (Inspirada en Ricardo Salinas)
// ============================================================================
function renderizarPlantillaLateral(cv, hoja) {
  const contenedorDoble = crearElemento("div", "cv-layout-lateral");

  // Barra lateral (izquierda)
  const sidebar = crearElemento("aside", "cv-sidebar");

  if (cv.encabezado.foto) {
    const fotoBox = crearElemento("div", "cv-sidebar-foto-box");
    const img = document.createElement("img");
    img.src = cv.encabezado.foto;
    img.alt = "Fotografía";
    img.className = "cv-sidebar-foto-img";
    fotoBox.appendChild(img);
    sidebar.appendChild(fotoBox);
  }

  // Contacto en barra lateral
  const secContacto = crearElemento("div", "cv-sidebar-bloque");
  secContacto.appendChild(crearElemento("h2", "cv-sidebar-titulo", "CONTACTO"));
  const listaContactos = crearElemento("div", "cv-sidebar-contactos");
  for (const c of cv.encabezado.contactos) {
    listaContactos.appendChild(crearElemento("div", "cv-sidebar-contacto-item", c));
  }
  secContacto.appendChild(listaContactos);
  sidebar.appendChild(secContacto);

  // Secciones secundarias que van al sidebar: perfil, habilidades, idiomas, adicional
  const idsSidebar = new Set(["perfil", "habilidades", "idiomas", "adicional"]);
  const seccionesSidebar = cv.secciones.filter(s => idsSidebar.has(s.id));
  const seccionesPrincipal = cv.secciones.filter(s => !idsSidebar.has(s.id));

  for (const sec of seccionesSidebar) {
    const bloque = crearElemento("div", `cv-sidebar-bloque cv-bloque-${sec.id}`);
    bloque.appendChild(crearElemento("h2", "cv-sidebar-titulo", sec.titulo.toUpperCase()));

    if (sec.tipo === "texto") {
      bloque.appendChild(crearElemento("p", "cv-sidebar-texto", sec.contenido));
    } else if (sec.tipo === "lista") {
      const ul = crearElemento("ul", "cv-sidebar-lista");
      for (const item of sec.contenido) {
        ul.appendChild(crearElemento("li", "cv-sidebar-item", item));
      }
      bloque.appendChild(ul);
    }
    sidebar.appendChild(bloque);
  }

  // Columna principal (derecha)
  const principal = crearElemento("main", "cv-main-col");
  const mainHeader = crearElemento("header", "cv-main-header");
  mainHeader.appendChild(crearElemento("h1", "cv-nombre-grande", cv.encabezado.nombre || "Currículum Vitae"));
  principal.appendChild(mainHeader);

  for (const sec of seccionesPrincipal) {
    const secEl = crearElemento("section", `cv-seccion-main cv-seccion-${sec.id}`);
    secEl.appendChild(crearElemento("h2", "cv-main-titulo", sec.titulo.toUpperCase()));

    if (sec.tipo === "entradas") {
      const listaEnt = crearElemento("div", "cv-entradas-lista");
      for (const ent of sec.contenido) {
        const item = crearElemento("div", "cv-entrada-item");
        item.appendChild(crearElemento("h3", "cv-entrada-titulo", ent.titulo));
        item.appendChild(crearElemento("div", "cv-entrada-subtitulo", ent.subtitulo));
        if (Array.isArray(ent.viñetas) && ent.viñetas.length > 0) {
          const ul = crearElemento("ul", "cv-viñetas");
          for (const v of ent.viñetas) {
            ul.appendChild(crearElemento("li", "cv-viñeta-item", v));
          }
          item.appendChild(ul);
        }
        listaEnt.appendChild(item);
      }
      secEl.appendChild(listaEnt);
    } else if (sec.tipo === "lista") {
      const ul = crearElemento("ul", "cv-lista-simple");
      for (const item of sec.contenido) {
        ul.appendChild(crearElemento("li", "cv-item-simple", item));
      }
      secEl.appendChild(ul);
    } else if (sec.tipo === "texto") {
      secEl.appendChild(crearElemento("p", "cv-seccion-texto", sec.contenido));
    }
    principal.appendChild(secEl);
  }

  contenedorDoble.appendChild(sidebar);
  contenedorDoble.appendChild(principal);
  hoja.appendChild(contenedorDoble);
}

// ============================================================================
// 3. PLANTILLA EJECUTIVA (Inspirada en Mariana Napolitani: franja azul superior)
// ============================================================================
function renderizarPlantillaEjecutivo(cv, hoja) {
  // Franja superior azul
  const banner = crearElemento("header", "cv-banner-ejecutivo");
  const bannerLeft = crearElemento("div", "cv-banner-left");

  if (cv.encabezado.foto) {
    const fotoBox = crearElemento("div", "cv-banner-foto-box");
    const img = document.createElement("img");
    img.src = cv.encabezado.foto;
    img.alt = "Fotografía";
    img.className = "cv-banner-foto-img";
    fotoBox.appendChild(img);
    bannerLeft.appendChild(fotoBox);
  }

  const bannerTextos = crearElemento("div", "cv-banner-textos");
  bannerTextos.appendChild(crearElemento("h1", "cv-banner-nombre", cv.encabezado.nombre || "Currículum"));
  bannerLeft.appendChild(bannerTextos);
  banner.appendChild(bannerLeft);

  const bannerRight = crearElemento("div", "cv-banner-right");
  for (const c of cv.encabezado.contactos) {
    bannerRight.appendChild(crearElemento("div", "cv-banner-contacto", c));
  }
  banner.appendChild(bannerRight);
  hoja.appendChild(banner);

  // Contenido de dos columnas alineadas con separador vertical
  const contenedorFilas = crearElemento("main", "cv-cuerpo-ejecutivo");

  for (const sec of cv.secciones) {
    const fila = crearElemento("div", `cv-ejecutivo-fila cv-fila-${sec.id}`);

    // Columna izquierda: Título de sección en mayúsculas
    const colTitulo = crearElemento("div", "cv-ejecutivo-col-titulo");
    colTitulo.appendChild(crearElemento("h2", "cv-ejecutivo-titulo", sec.titulo.toUpperCase()));
    fila.appendChild(colTitulo);

    // Divisor vertical
    fila.appendChild(crearElemento("div", "cv-ejecutivo-separador-v"));

    // Columna derecha: Contenido
    const colContenido = crearElemento("div", "cv-ejecutivo-col-contenido");

    if (sec.tipo === "texto") {
      colContenido.appendChild(crearElemento("p", "cv-ejecutivo-texto", sec.contenido));
    } else if (sec.tipo === "entradas") {
      const listaEnt = crearElemento("div", "cv-entradas-lista");
      for (const ent of sec.contenido) {
        const item = crearElemento("div", "cv-entrada-item");
        item.appendChild(crearElemento("h3", "cv-entrada-titulo", ent.titulo));
        item.appendChild(crearElemento("div", "cv-entrada-subtitulo", ent.subtitulo));
        if (Array.isArray(ent.viñetas) && ent.viñetas.length > 0) {
          const ul = crearElemento("ul", "cv-viñetas");
          for (const v of ent.viñetas) {
            ul.appendChild(crearElemento("li", "cv-viñeta-item", v));
          }
          item.appendChild(ul);
        }
        listaEnt.appendChild(item);
      }
      colContenido.appendChild(listaEnt);
    } else if (sec.tipo === "lista") {
      const ul = crearElemento("ul", "cv-lista-simple");
      for (const item of sec.contenido) {
        ul.appendChild(crearElemento("li", "cv-item-simple", item));
      }
      colContenido.appendChild(ul);
    }

    fila.appendChild(colContenido);
    contenedorFilas.appendChild(fila);
  }

  hoja.appendChild(contenedorFilas);
}

