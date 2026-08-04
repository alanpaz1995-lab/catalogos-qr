export type ModoIA = "openai" | "desarrollo";

export type ConfianzaIA =
  | "alta"
  | "media"
  | "baja";

export type AccionProductoIA =
  | "analizar_producto"
  | "mejorar_descripcion"
  | "generar_titulo"
  | "generar_palabras_clave"
  | "detectar_categoria"
  | "sugerir_precio"
  | "crear_publicacion"
  | "traducir_descripcion";

export type PlataformaMarketing =
  | "Instagram"
  | "Facebook"
  | "WhatsApp";

export type TonoMarketing =
  | "Profesional"
  | "Cercano"
  | "Entusiasta"
  | "Elegante";

export type ProductoParaIA = {
  id?: number;
  empresaId: number;
  nombre: string;
  categoria?: string | null;
  descripcion?: string | null;
  precio?: number | null;
  stock?: number | null;
  stockMinimo?: number | null;
  imagenUrl?: string | null;
  oferta?: boolean;
  nuevoIngreso?: boolean;
  destacado?: boolean;
};

export type OpcionesPublicacionIA = {
  plataforma: PlataformaMarketing;
  tono: TonoMarketing;
  incluirPrecio: boolean;
  incluirHashtags: boolean;
};

export type ResultadoProductoIA = {
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  palabrasClave?: string[];
  precioSugerido?: number;
  publicacion?: string;
  traduccion?: string;
  observaciones?: string[];
  confianza?: ConfianzaIA;
};

export type RespuestaMotorIA = {
  ok: boolean;
  modo: ModoIA;
  accion: AccionProductoIA;
  resultado?: ResultadoProductoIA;
  advertencia?: string;
  error?: string;
};

export type SolicitudMotorIA = {
  accion: AccionProductoIA;
  producto: ProductoParaIA;
  opcionesPublicacion?: OpcionesPublicacionIA;
};