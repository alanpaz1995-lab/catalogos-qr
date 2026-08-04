import { supabase } from "@/lib/supabase";

const BUCKET = "productos";

const TAMANIO_MAXIMO = 10 * 1024 * 1024;

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function validarImagen(file: File) {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error(
      "Solo se permiten imágenes JPG, PNG o WEBP."
    );
  }

  if (file.size > TAMANIO_MAXIMO) {
    throw new Error(
      "La imagen supera los 10 MB."
    );
  }
}

function extension(nombre: string) {
  return nombre.split(".").pop()?.toLowerCase() || "jpg";
}

function nombreSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();
}

export async function subirImagenProducto(
  archivo: File,
  empresaId: number
) {
  validarImagen(archivo);

  const ext = extension(archivo.name);

  const nombre =
    `${Date.now()}-${nombreSeguro(
      archivo.name.replace(/\.[^/.]+$/, "")
    )}.${ext}`;

  const ruta = `${empresaId}/${nombre}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, {
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(ruta);

  return {
    ruta,
    url: data.publicUrl,
  };
}

export async function eliminarImagen(
  ruta: string
) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([ruta]);

  if (error) {
    throw error;
  }
}

export function obtenerUrlImagen(
  ruta: string
) {
  return supabase.storage
    .from(BUCKET)
    .getPublicUrl(ruta).data.publicUrl;
}