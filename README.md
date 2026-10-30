# Generador de CV - "CV YA!"

Generador de currículums 100% en el navegador y sin backend, diseñado para personas migrantes y población general en Guatemala, con enfoque mobile-first y máxima privacidad.

---

## 🎯 Arquitectura y Módulos

El proyecto está construido en **JavaScript puro (ES Modules)** y HTML/CSS, sin frameworks ni dependencias de servidor.

```
GeneradorCV/
├── catalogo.js       # Catálogo editable (áreas, puestos, tareas, habilidades). Solo datos, sin lógica.
├── validacion.js     # Reglas de validación, limpieza y normalización de entradas.
├── cv-builder.js     # Función pura buildCV(datos, opciones) que produce la estructura del CV.
├── render.js         # Capa de presentación desacoplada (renderizado DOM con 3 plantillas).
├── pdf.js            # Exportación a PDF tamaño Carta con texto real seleccionable (jsPDF local).
├── app.js            # Orquestador del asistente paso a paso (una pregunta a la vez).
├── styles.css        # Estilos visuales del asistente y previsualización de hojas de CV.
├── index.html        # Estructura principal y contenedor accesible.
├── tests.js          # Suite de pruebas automatizadas (Node.js y navegador).
├── lib/              # Librerías locales (jspdf.es.min.js y jspdf.umd.min.js - sin CDNs).
└── assets/           # Logotipos y recursos visuales.
```

---

## 🛡️ Privacidad Estricta

1. **Cero red con datos personales**: Ningún dato sale del dispositivo del usuario. No hay analítica, telemetría ni llamadas API externas.
2. **Sin persistencia en disco**: Prohibido el uso de `localStorage`, `sessionStorage`, `cookies` e `IndexedDB`. Todo el estado reside exclusivamente en la memoria RAM del navegador. Si la página se recarga o se cierra, los datos desaparecen por completo.
3. **Función `borrarTodo()`**: Reinicia el estado a blanco, limpia formularios y libera los Object URLs (`URL.revokeObjectURL`) para evitar fugas de memoria.
4. **Seguridad contra inyecciones XSS**: La inserción de información del usuario en el DOM se realiza siempre mediante `textContent` y creación nativa de nodos, nunca mediante `innerHTML` con cadenas sin sanitizar.
5. **No discriminación**: No se solicitan datos sobre situación migratoria, documento de identidad (DPI), estado civil, edad exacta, religión, fotografía ni dirección exacta.

---

## 📚 Cómo agregar áreas al catálogo (`catalogo.js`)

`catalogo.js` es un módulo puramente de datos. Para añadir una nueva área ocupacional, basta con agregar una nueva clave dentro del objeto `CATALOGO_AREAS`:

```javascript
// catalogo.js
export const CATALOGO_AREAS = {
  // ... áreas existentes ...

  seguridad: {
    id: "seguridad",
    etiqueta: "Seguridad y Vigilancia",
    nombreMinuscula: "seguridad privada",
    icono: "🛡️",
    puestos: [
      "Agente de seguridad",
      "Vigilancia nocturna",
      "Control de accesos"
    ],
    tareas: [
      "Monitoreo de entradas y salidas",
      "Rondines de vigilancia",
      "Reporte de novedades",
      "Revisión de paquetería"
    ],
    habilidades: [
      "Atención al detalle",
      "Puntualidad",
      "Manejo de situaciones de alerta",
      "Trabajo en equipo"
    ]
  }
};
```

- **Convención**: Las tareas y habilidades deben escribirse en **sustantivo o infinitivo neutro**, sin género ni tiempo verbal.
- Una vez agregada, la nueva área aparecerá automáticamente en las opciones de selección, y sus puestos, tareas y habilidades sugeridas se integrarán de inmediato en los pasos correspondientes.

---

## 🔌 Cómo conectar una nueva capa de presentación a `buildCV`

La función `buildCV(datos, { densidad: "normal" | "compacta" })` es una **función pura**: misma entrada siempre genera la misma salida estructurada. No produce HTML ni estilos.

### Estructura canónica devuelta por `buildCV`:

```json
{
  "encabezado": {
    "nombre": "Juan Carlos Pérez",
    "contactos": ["+502 5555 1234", "correo@ejemplo.com", "Mixco, Guatemala"]
  },
  "secciones": [
    {
      "id": "perfil",
      "titulo": "Perfil",
      "tipo": "texto",
      "contenido": "Persona con más de 1 año de experiencia..."
    },
    {
      "id": "experiencia",
      "titulo": "Experiencia laboral",
      "tipo": "entradas",
      "contenido": [
        {
          "titulo": "Ayudante de construcción",
          "subtitulo": "trabajo independiente · 1 a 3 años",
          "viñetas": ["Carga y descarga de materiales", "Limpieza de obra"]
        }
      ]
    },
    {
      "id": "habilidades",
      "titulo": "Habilidades",
      "tipo": "lista",
      "contenido": ["Uso de herramientas manuales", "Puntualidad"]
    }
  ]
}
```

### Ejemplo de integración con una nueva interfaz:

```javascript
import { buildCV } from "./cv-builder.js";

// 1. Obtener la estructura
const cvEstructura = buildCV(estadoUsuario, { densidad: "normal" });

// 2. Consumir la estructura en su propio renderizador
function miRenderPersonalizado(cv, contenedorDOM) {
  contenedorDOM.innerHTML = ""; // Limpieza previa

  const header = document.createElement("header");
  const h1 = document.createElement("h1");
  h1.textContent = cv.encabezado.nombre;
  header.appendChild(h1);
  contenedorDOM.appendChild(header);

  for (const seccion of cv.secciones) {
    const sec = document.createElement("section");
    const titulo = document.createElement("h2");
    titulo.textContent = seccion.titulo;
    sec.appendChild(titulo);

    if (seccion.tipo === "texto") {
      const p = document.createElement("p");
      p.textContent = seccion.contenido;
      sec.appendChild(p);
    } else if (seccion.tipo === "lista") {
      const ul = document.createElement("ul");
      seccion.contenido.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      sec.appendChild(ul);
    }
    contenedorDOM.appendChild(sec);
  }
}
```

---

## 🧪 Ejecutar pruebas

El proyecto incluye 19 casos de prueba automatizados que validan:
- Caso 1: Con experiencia previa (normalización de nombre, teléfono y cálculo de perfil con cotas inferiores).
- Caso 2: Sin experiencia formal (habilidades ubicadas inmediatamente después del perfil).
- Caso 3: Mínimo (omisión de secciones vacías).
- Caso 4: Detección y mensajes claros de error de validación.
- Exportación a PDF: Nombres de archivo estandarizados (`CV_{Nombre_Apellido}.pdf`) y ajuste garantizado en 1 página Carta.

Para ejecutar los tests en consola:

```bash
npm test
# o directamente:
node tests.js
```
