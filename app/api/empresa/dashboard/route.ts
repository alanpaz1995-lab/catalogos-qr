import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function responder(datos: unknown, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// Solo devuelve la empresa asociada con la identidad verificada en el servidor.
// No escribe datos ni ejecuta acciones de suscripcion o Mercado Pago.
export async function GET(request: NextRequest) {
  try {
    const autorizacion = request.headers.get("authorization") ?? "";
    const coincidencia = /^Bearer\s+(\S+)$/i.exec(autorizacion.trim());
    if (!coincidencia) {
      return responder({ ok: false, error: "Sesion requerida." }, 401);
    }

    const {
      data: { user },
      error: errorUsuario,
    } = await supabaseAdmin.auth.getUser(coincidencia[1]);

    if (errorUsuario || !user) {
      return responder({ ok: false, error: "Sesion invalida o vencida." }, 401);
    }

    const { data: empresa, error: errorEmpresa } = await supabaseAdmin
      .from("empresas")
      .select(
        "id, nombre, slug, descripcion, rubro, logo, portada, whatsapp, direccion, ciudad, provincia, horarios_semana, color_principal, color_secundario, plan, estado_suscripcion, prueba_inicio, prueba_fin, suscripcion_activa"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (errorEmpresa) {
      console.error("Error consultando empresa del dashboard:", errorEmpresa);
      return responder({ ok: false, error: "No se pudo cargar la empresa." }, 500);
    }
    if (!empresa) {
      return responder({ ok: false, error: "No encontramos una empresa asociada a tu cuenta." }, 404);
    }

    return responder({ ok: true, empresa });
  } catch (error) {
    console.error("Error al consultar empresa del dashboard:", error);
    return responder({ ok: false, error: "Ocurrio un error al consultar la empresa." }, 500);
  }
}
