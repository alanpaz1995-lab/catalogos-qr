import type {
  AccionIA,
  ProductoIA,
  SolicitudIA,
} from "./types";

function datosProducto(producto: ProductoIA) {
  return `
Datos actuales del producto:

Nombre: ${producto.nombre || "Sin nombre"}
Categoría: ${producto.categoria || "Sin categoría"}
Descripción: ${producto.descripcion || "Sin descripción"}
Precio: ${producto.precio ?? "Sin precio"}
Stock: ${producto.stock ?? "Sin stock informado"}
Imagen: ${producto.imagenUrl || "Sin imagen"}
  `.trim();
}

function promptAnalizarProducto(
  producto: ProductoIA
) {
  return `
Analizá este producto para un catálogo comercial.

${datosProducto(producto)}

Devolvé:

- nombre comercial;
- categoría;
- descripción breve y atractiva;
- palabras clave;
- nivel de confianza.

Reglas:

- No inventes materiales, marcas, medidas ni características.
- No sugieras precio.
- Escribí en español de Argentina.
- La descripción debe ser clara y profesional.
  `.trim();
}

function promptMejorarDescripcion(
  producto: ProductoIA
) {
  return `
Mejorá la descripción comercial de este producto.

${datosProducto(producto)}

Reglas:

- Conservá únicamente información comprobable.
- No inventes características.
- Usá español de Argentina.
- Escribí entre 40 y 90 palabras.
- El texto debe servir para catálogo y redes sociales.
  `.trim();
}

function promptGenerarTitulo(
  producto: ProductoIA
) {
  return `
Generá un título comercial claro y atractivo para este producto.

${datosProducto(producto)}

Reglas:

- Máximo 8 palabras.
- No inventes marca ni modelo.
- Evitá frases exageradas.
- Usá español de Argentina.
  `.trim();
}

function promptGenerarPublicacion(
  producto: ProductoIA,
  opciones?: Record<string, unknown>
) {
  const plataforma =
    String(opciones?.plataforma || "Instagram");

  const tono =
    String(opciones?.tono || "Cercano");

  const incluirPrecio =
    opciones?.incluirPrecio !== false;

  const incluirHashtags =
    opciones?.incluirHashtags !== false;

  return `
Creá una publicación comercial para ${plataforma}.

${datosProducto(producto)}

Configuración:

Tono: ${tono}
Incluir precio: ${incluirPrecio ? "Sí" : "No"}
Incluir hashtags: ${incluirHashtags ? "Sí" : "No"}

Reglas:

- Usá español de Argentina.
- Incluí una llamada a la acción.
- No inventes promociones.
- No inventes características.
- Adaptá la extensión a la plataforma.
  `.trim();
}

function promptPalabrasClave(
  producto: ProductoIA
) {
  return `
Generá entre 5 y 10 palabras clave para este producto.

${datosProducto(producto)}

Reglas:

- Usá términos útiles para búsqueda y catálogo.
- No repitas palabras.
- No inventes marcas.
- Devolvé únicamente palabras o frases breves.
  `.trim();
}

function promptDetectarCategoria(
  producto: ProductoIA
) {
  return `
Sugerí la categoría más adecuada para este producto.

${datosProducto(producto)}

Reglas:

- Elegí una categoría breve.
- No inventes información.
- Si no hay suficiente información, devolvé "Sin categoría".
  `.trim();
}

function promptSugerirPrecio(
  producto: ProductoIA
) {
  return `
Analizá la información comercial de este producto y devolvé una referencia de precio.

${datosProducto(producto)}

Reglas:

- Indicá claramente que es una sugerencia.
- No afirmes que es un precio de mercado exacto.
- Tené en cuenta el precio actual si existe.
- Devolvé también una breve explicación.
  `.trim();
}

export function obtenerPrompt(
  solicitud: SolicitudIA
) {
  const {
    accion,
    producto,
    opciones,
  } = solicitud;

  const prompts: Record<
    AccionIA,
    () => string
  > = {
    analizar_producto: () =>
      promptAnalizarProducto(producto),

    mejorar_descripcion: () =>
      promptMejorarDescripcion(producto),

    generar_titulo: () =>
      promptGenerarTitulo(producto),

    generar_publicacion: () =>
      promptGenerarPublicacion(
        producto,
        opciones
      ),

    generar_palabras_clave: () =>
      promptPalabrasClave(producto),

    detectar_categoria: () =>
      promptDetectarCategoria(producto),

    sugerir_precio: () =>
      promptSugerirPrecio(producto),
  };

  return prompts[accion]();
}