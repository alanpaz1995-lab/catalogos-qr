export type ModoIA = "desarrollo" | "openai";

export type AccionIA =
  | "analizar_producto"
  | "mejorar_descripcion"
  | "generar_titulo"
  | "generar_publicacion"
  | "generar_palabras_clave"
  | "detectar_categoria"
  | "sugerir_precio";

export interface ProductoIA {
  empresaId: number;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  imagenUrl?: string;
}

export interface SolicitudIA {
  accion: AccionIA;
  producto: ProductoIA;
  opciones?: Record<string, unknown>;
}

export interface ResultadoIA {
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  palabrasClave?: string[];
  precioSugerido?: number;
  publicacion?: string;
  confianza?: "alta" | "media" | "baja";
}

export interface RespuestaIA {
  ok: boolean;
  modo: ModoIA;
  resultado?: ResultadoIA;
  error?: string;
}