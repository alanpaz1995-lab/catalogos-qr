import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function responder(datos: unknown, estado = 200) {
  return NextResponse.json(datos, {
    status: estado,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// Solo información destinada al catálogo público. Nunca incluir aquí
// auth_user_id, plan, estado_suscripcion ni datos de Mercado Pago.
const CAMPOS_PUBLICOS =
  "id, nombre, slug, descripcion, rubro, logo, portada, whatsapp, email, direccion, ciudad, provincia, pais, instagram, facebook, tiktok, sitio_web, horario, horarios_semana, latitud, longitud, medios_pago, realiza_envios, color_principal, color_secundario, carritos_catalogo, permitir_compras, mostrar_precios, estado, catalogo_activo";

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
    if (!slug || slug.length > 180 || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return responder({ ok: false, error: "El catálogo solicitado no es válido." }, 400);
    }

    const { data: empresa, error } = await supabaseAdmin
      .from("empresas")
      .select(CAMPOS_PUBLICOS)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("Error consultando los datos públicos del catálogo:", error);
      return responder({ ok: false, error: "No se pudo cargar el catálogo." }, 500);
    }

    if (!empresa) {
      return responder({ ok: false, error: "No encontramos ese catálogo." }, 404);
    }

    if ((empresa.estado && empresa.estado !== "Activo") || empresa.catalogo_activo === false) {
      return responder({ ok: false, error: "Este catálogo no se encuentra disponible." }, 404);
    }

    return responder({ ok: true, empresa });
  } catch (error) {
    console.error("Error inesperado al consultar el catálogo público:", error);
    return responder({ ok: false, error: "Ocurrió un error al consultar el catálogo." }, 500);
  }
}
