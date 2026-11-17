import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CABECERAS = { "Cache-Control": "no-store, max-age=0" };

function responder(datos: unknown, status = 200) {
  return NextResponse.json(datos, { status, headers: CABECERAS });
}

// Esta ruta es pública: devuelve exclusivamente la información necesaria para
// mostrar catálogos ACTIVOS y productos ACTIVOS y VISIBLES.
// Nunca seleccionar costo, stock_minimo ni otros campos administrativos.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
  if (!slug || slug.length > 180 || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return responder({ ok: false, error: "El enlace del catálogo no es válido." }, 400);
  }

  try {
    const { data: catalogo, error: errorCatalogo } = await supabaseAdmin
      .from("catalogos_externos")
      .select("id, nombre, slug, descripcion, logo_url, foto_perfil_url, portada_url, whatsapp, color_principal, color_secundario, activo")
      .eq("slug", slug)
      .eq("activo", true)
      .maybeSingle();

    if (errorCatalogo) throw errorCatalogo;
    if (!catalogo) {
      return responder({ ok: false, error: "No encontramos este catálogo o todavía no está publicado." }, 404);
    }

    const [consultaCategorias, consultaProductos, consultaColores] = await Promise.all([
      supabaseAdmin.from("categorias_externas")
        .select("id, catalogo_id, nombre, orden, activo")
        .eq("catalogo_id", catalogo.id)
        .eq("activo", true)
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true }),
      supabaseAdmin.from("productos_externos")
        .select("id, catalogo_id, categoria_id, nombre, codigo, descripcion, precio, precio_mayorista, cantidad_minima_mayorista, stock, controlar_stock, imagen_url, activo, visible, colores")
        .eq("catalogo_id", catalogo.id)
        .eq("activo", true)
        .eq("visible", true),
      supabaseAdmin.from("colores_catalogos_externos")
        .select("nombre, codigo_hex")
        .eq("catalogo_id", catalogo.id)
        .order("nombre", { ascending: true }),
    ]);

    if (consultaCategorias.error) throw consultaCategorias.error;
    if (consultaProductos.error) throw consultaProductos.error;
    // Los colores son opcionales; un fallo no impide mostrar productos.
    if (consultaColores.error) {
      console.warn("No se pudieron cargar colores públicos del catálogo externo:", consultaColores.error);
    }

    const productos = consultaProductos.data ?? [];
    const idsPublicos = productos.map((producto) => producto.id);
    let multimedia: Array<{
      id: number; producto_id: number; tipo: string; url: string; orden: number; activo: boolean;
    }> = [];

    if (idsPublicos.length > 0) {
      const { data: fotos, error: errorMultimedia } = await supabaseAdmin
        .from("producto_multimedia_externo")
        .select("id, producto_id, tipo, url, orden, activo")
        .eq("catalogo_id", catalogo.id)
        .eq("activo", true)
        .in("producto_id", idsPublicos)
        .order("orden", { ascending: true })
        .order("id", { ascending: true });
      if (errorMultimedia) throw errorMultimedia;
      multimedia = fotos ?? [];
    }

    return responder({
      ok: true,
      catalogo,
      categorias: consultaCategorias.data ?? [],
      productos,
      colores: consultaColores.error ? [] : (consultaColores.data ?? []),
      multimedia,
    });
  } catch (error) {
    console.error("Error cargando catálogo externo público:", error);
    return responder({ ok: false, error: "No pudimos cargar el catálogo. Intentá nuevamente más tarde." }, 500);
  }
}
