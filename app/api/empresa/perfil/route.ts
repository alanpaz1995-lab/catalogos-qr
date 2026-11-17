import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function responder(datos: unknown, estado = 200) {
  return NextResponse.json(datos, {
    status: estado,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(request: NextRequest) {
  try {
    const autorizacion = request.headers.get("authorization") ?? "";
    const coincidencia = /^Bearer\s+(\S+)$/i.exec(autorizacion.trim());

    if (!coincidencia) {
      return responder({ ok: false, error: "Sesión requerida." }, 401);
    }

    const {
      data: { user },
      error: errorUsuario,
    } = await supabaseAdmin.auth.getUser(coincidencia[1]);

    if (errorUsuario || !user) {
      return responder({ ok: false, error: "Sesión inválida o vencida." }, 401);
    }

    const { data: empresa, error: errorEmpresa } = await supabaseAdmin
      .from("empresas")
      .select(
        "id, nombre, descripcion, rubro, logo, portada, whatsapp, email, direccion, ciudad, provincia, pais, instagram, facebook, tiktok, sitio_web, horario, horarios_semana, latitud, longitud, medios_pago, realiza_envios, color_principal, color_secundario, carritos_catalogo"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (errorEmpresa) {
      console.error("No se pudo consultar el perfil de la empresa:", errorEmpresa);
      return responder({ ok: false, error: "No se pudo cargar el perfil de la empresa." }, 500);
    }

    if (!empresa) {
      return responder({ ok: false, error: "No encontramos una empresa asociada a tu cuenta." }, 404);
    }

    return responder({ ok: true, empresa });
  } catch (error) {
    console.error("Error inesperado al cargar el perfil de la empresa:", error);
    return responder({ ok: false, error: "Ocurrió un error al consultar el perfil de la empresa." }, 500);
  }
}
