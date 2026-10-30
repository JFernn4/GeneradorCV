/**
 * catalogo.js
 * Catálogo editable de áreas ocupacionales, puestos frecuentes, tareas sugeridas y habilidades.
 * Estructura exclusivamente de datos (sin lógica de negocio).
 * Todas las descripciones en formato neutro (sustantivo o infinitivo).
 */

export const CATALOGO_AREAS = {
  construccion: {
    id: "construccion",
    etiqueta: "Construcción",
    nombreMinuscula: "construcción",
    puestos: [
      "Ayudante de construcción",
      "Albañilería",
      "Pintura de obra"
    ],
    tareas: [
      "Preparación de mezcla",
      "Carga y descarga de materiales",
      "Levantado de paredes",
      "Pintura de interiores y exteriores",
      "Limpieza de obra",
      "Uso de herramientas manuales"
    ],
    habilidades: [
      "Uso de herramientas manuales",
      "Lectura básica de medidas",
      "Resistencia física",
      "Trabajo en equipo",
      "Puntualidad"
    ]
  },

  cocina: {
    id: "cocina",
    etiqueta: "Cocina y Restauración",
    nombreMinuscula: "cocina",
    puestos: [
      "Auxiliar de cocina",
      "Preparación de alimentos",
      "Atención de mesas"
    ],
    tareas: [
      "Preparación de ingredientes",
      "Cocción de platillos",
      "Limpieza y orden de la cocina",
      "Manejo higiénico de alimentos",
      "Atención de mesas",
      "Lavado de trastos"
    ],
    habilidades: [
      "Preparación de alimentos",
      "Manejo higiénico de alimentos",
      "Trabajo bajo presión",
      "Trabajo en equipo",
      "Atención al cliente"
    ]
  },

  limpieza: {
    id: "limpieza",
    etiqueta: "Limpieza y Servicios",
    nombreMinuscula: "limpieza",
    puestos: [
      "Limpieza de casas",
      "Limpieza de oficinas y locales",
      "Limpieza de hoteles"
    ],
    tareas: [
      "Limpieza de pisos, baños y superficies",
      "Lavado y planchado de ropa",
      "Orden de espacios",
      "Uso de productos de limpieza",
      "Limpieza de vidrios"
    ],
    habilidades: [
      "Orden y organización",
      "Atención al detalle",
      "Puntualidad",
      "Trabajo en equipo"
    ]
  },

  agricultura: {
    id: "agricultura",
    etiqueta: "Agricultura y Campo",
    nombreMinuscula: "agricultura",
    puestos: [
      "Trabajo en finca",
      "Cosecha",
      "Cuidado de cultivos"
    ],
    tareas: [
      "Siembra",
      "Cosecha",
      "Riego",
      "Cuidado de cultivos",
      "Empaque de productos",
      "Cuidado de animales"
    ],
    habilidades: [
      "Resistencia física",
      "Trabajo al aire libre",
      "Uso de herramientas de campo",
      "Trabajo en equipo"
    ]
  },

  ventas: {
    id: "ventas",
    etiqueta: "Ventas y Comercio",
    nombreMinuscula: "ventas",
    puestos: [
      "Ventas en mostrador",
      "Atención al cliente",
      "Ventas en tienda"
    ],
    tareas: [
      "Atención al cliente",
      "Manejo de caja",
      "Orden de mercadería",
      "Cobro y entrega de cambio",
      "Control básico de inventario"
    ],
    habilidades: [
      "Atención al cliente",
      "Manejo de efectivo",
      "Comunicación",
      "Cálculo básico"
    ]
  },

  cuidado: {
    id: "cuidado",
    etiqueta: "Cuidado de Personas",
    nombreMinuscula: "cuidado",
    puestos: [
      "Cuidado de personas adultas mayores",
      "Cuidado de niñez",
      "Apoyo en el hogar"
    ],
    tareas: [
      "Acompañamiento diario",
      "Preparación de alimentos",
      "Apoyo en rutinas diarias",
      "Cuidado y juego con niñez",
      "Acompañamiento a citas"
    ],
    habilidades: [
      "Paciencia",
      "Acompañamiento",
      "Preparación de alimentos",
      "Responsabilidad en el cuidado"
    ]
  },

  transporte: {
    id: "transporte",
    etiqueta: "Transporte y Entrega",
    nombreMinuscula: "transporte",
    puestos: [
      "Mensajería",
      "Reparto",
      "Conducción"
    ],
    tareas: [
      "Entrega de paquetes",
      "Reparto de mercadería",
      "Conocimiento de rutas locales",
      "Carga y descarga",
      "Manejo de efectivo en entregas"
    ],
    habilidades: [
      "Conocimiento de rutas locales",
      "Manejo de vehículo",
      "Puntualidad",
      "Manejo de efectivo"
    ]
  },

  taller: {
    id: "taller",
    etiqueta: "Taller y Oficios",
    nombreMinuscula: "taller",
    puestos: [
      "Ayudante de taller",
      "Mecánica básica",
      "Carpintería"
    ],
    tareas: [
      "Mantenimiento básico de vehículos",
      "Cambio de aceite y llantas",
      "Lijado y pintura",
      "Uso de herramientas",
      "Orden del taller"
    ],
    habilidades: [
      "Uso de herramientas",
      "Mecánica básica",
      "Atención al detalle",
      "Trabajo en equipo"
    ]
  },

  oficina: {
    id: "oficina",
    etiqueta: "Oficina y Recepción",
    nombreMinuscula: "oficina",
    puestos: [
      "Auxiliar de oficina",
      "Digitación",
      "Recepción"
    ],
    tareas: [
      "Atención telefónica",
      "Archivo de documentos",
      "Digitación",
      "Uso básico de Word y Excel",
      "Atención a visitas"
    ],
    habilidades: [
      "Uso básico de Word y Excel",
      "Digitación",
      "Atención telefónica",
      "Organización de documentos"
    ]
  },

  otro: {
    id: "otro",
    etiqueta: "Otra área",
    nombreMinuscula: "otra área",
    puestos: [],
    tareas: [],
    habilidades: []
  }
};

/**
 * Constantes de etiquetas legibles
 */
export const DURACIONES = {
  lt6m: "Menos de 6 meses",
  "6m_1a": "6 meses a 1 año",
  "1_3a": "1 a 3 años",
  gt3a: "Más de 3 años"
};

export const ESTUDIOS_LABELS = {
  primaria: "Primaria",
  basico: "Básico",
  diversificado: "Diversificado",
  tecnico_universitario: "Técnico o universitario",
  cursos: "Cursos y capacitaciones"
};

export const NIVELES_IDIOMA = {
  basico: "Básico",
  medio: "Intermedio",
  alto: "Avanzado"
};

export const VEHICULO_LABELS = {
  no: null,
  moto: "Maneja moto",
  carro: "Maneja carro",
  con_licencia: "Cuenta con licencia de conducir"
};
