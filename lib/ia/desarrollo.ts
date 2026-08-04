import type {
  RespuestaIA,
  ResultadoIA,
  SolicitudIA,
} from "./types";

function formatearPrecio(
  precio?: number
) {
  if (
    precio === undefined ||
    !Number.isFinite(precio)
  ) {
    return "";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
}

function generarHashtags(
  nombre: string,
  categoria?: string
) {
  const palabras = [
    nombre,
    categoria || "",
    "ComerSys",
    "NuevoIngreso",
  ]
    .filter(Boolean)
    .flatMap((texto) =>
      texto
        .split(/\s+/)
        .map((palabra) =>
          palabra.replace(
            /[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g,
            ""
          )
        )
    )
    .filter((palabra) => palabra.length > 2)
    .slice(0, 8)
    .map((palabra) => `#${palabra}`);

  return Array.from(
    new Set(palabras)
  ).join(" ");
}

function generarResultado(
  solicitud: SolicitudIA
): ResultadoIA {
  const { accion, producto, opciones } =
    solicitud;

  const nombre =
    producto.nombre.trim() ||
    "Producto nuevo";

  const categoria =
    producto.categoria?.trim() ||
    "Sin categoría";

  const descripcion =
    producto.descripcion?.trim() ||
    `${nombre} disponible en nuestro catálogo.`;

  switch (accion) {
    case "analizar_producto":
      return {
        nombre,
        categoria:
          categoria === "Sin categoría"
            ? "Productos"
            : categoria,
        descripcion,
        palabrasClave: [
          nombre,
          categoria,
          "producto",
          "catálogo",
        ],
        confianza: "media",
      };

    case "mejorar_descripcion":
      return {
        descripcion: `${nombre} es una propuesta pensada para quienes buscan calidad, practicidad y una presentación cuidada. Ideal para sumar a tu día a día o para regalar. Consultanos por disponibilidad y más detalles.`,
      };

    case "generar_titulo":
      return {
        nombre: `${nombre} Premium`,
      };

    case "generar_palabras_clave":
      return {
        palabrasClave: [
          nombre,
          categoria,
          "calidad",
          "producto",
          "nuevo ingreso",
        ],
      };

    case "detectar_categoria":
      return {
        categoria:
          categoria === "Sin categoría"
            ? "Productos"
            : categoria,
      };

    case "sugerir_precio":
      return {
        precioSugerido:
          producto.precio &&
          producto.precio > 0
            ? Math.round(
                producto.precio * 1.1
              )
            : 10000,
      };

    case "generar_publicacion": {
      const plataforma = String(
        opciones?.plataforma ||
          "Instagram"
      );

      const tono = String(
        opciones?.tono || "Cercano"
      );

      const incluirPrecio =
        opciones?.incluirPrecio !== false;

      const incluirHashtags =
        opciones?.incluirHashtags !== false;

      const encabezados: Record<
        string,
        string
      > = {
        Profesional: `Conocé ${nombre}, una nueva opción disponible en nuestro catálogo.`,
        Cercano: `¡Mirá lo que tenemos para vos! ${nombre} ya está disponible.`,
        Entusiasta: `🔥 ¡Llegó ${nombre}! Una incorporación que no te podés perder.`,
        Elegante: `${nombre}: una propuesta pensada para quienes valoran cada detalle.`,
      };

      const llamadas: Record<
        string,
        string
      > = {
        Instagram:
          "📩 Escribinos para más información o para hacer tu pedido.",
        Facebook:
          "Consultanos por mensaje privado y reservá el tuyo.",
        WhatsApp:
          "Respondé este mensaje y te ayudamos con tu pedido.",
      };

      const lineaPrecio =
        incluirPrecio &&
        producto.precio !== undefined
          ? `\n💰 Precio: ${formatearPrecio(
              producto.precio
            )}`
          : "";

      const lineaStock =
        producto.stock !== undefined &&
        producto.stock <= 0
          ? "\n⚠️ Consultar disponibilidad"
          : "\n✅ Disponible";

      const hashtags =
        incluirHashtags
          ? `\n\n${generarHashtags(
              nombre,
              categoria
            )}`
          : "";

      return {
        publicacion: `${
          encabezados[tono] ||
          encabezados.Cercano
        }

${descripcion}${lineaPrecio}${lineaStock}

${
  llamadas[plataforma] ||
  llamadas.Instagram
}${hashtags}`,
      };
    }

    default:
      return {};
  }
}

export function ejecutarModoDesarrollo(
  solicitud: SolicitudIA
): RespuestaIA {
  return {
    ok: true,
    modo: "desarrollo",
    resultado:
      generarResultado(solicitud),
  };
}