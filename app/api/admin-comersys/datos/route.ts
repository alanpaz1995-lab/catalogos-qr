import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function respuesta(datos: unknown, status = 200) {
  return NextResponse.json(datos, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// Lectura exclusiva del SuperAdmin: nunca consulta Mercado Pago ni modifica datos.
export async function GET(request: NextRequest) {
  try {
    const autorizacion = request.headers.get("authorization") ?? "";
    const coincidencia = /^Bearer\s+(\S+)$/i.exec(autorizacion.trim());
    if (!coincidencia) {
      return respuesta({ ok: false, error: "Sesión requerida." }, 401);
    }

    const {
      data: { user },
      error: errorUsuario,
    } = await supabaseAdmin.auth.getUser(coincidencia[1]);

    if (errorUsuario || !user) {
      return respuesta({ ok: false, error: "Sesión inválida o vencida." }, 401);
    }

    const { data: superadmin, error: errorSuperadmin } = await supabaseAdmin
      .from("superadmins")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorSuperadmin) {
      console.error("Error verificando autorización SuperAdmin:", errorSuperadmin);
      return respuesta({ ok: false, error: "No se pudo verificar el acceso." }, 500);
    }

    if (!superadmin) {
      return respuesta({ ok: false, error: "Acceso reservado al SuperAdmin." }, 403);
    }

    // Mantiene el mismo inicio de mes calculado por el panel existente.
    const inicioMesParametro = request.nextUrl.searchParams.get("inicioMes");
    let inicioMes: string;
    if (inicioMesParametro !== null) {
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(inicioMesParametro) ||
        !Number.isFinite(Date.parse(inicioMesParametro))
      ) {
        return respuesta({ ok: false, error: "Fecha de inicio inválida." }, 400);
      }
      inicioMes = inicioMesParametro;
    } else {
      const hoy = new Date();
      hoy.setDate(1);
      hoy.setHours(0, 0, 0, 0);
      inicioMes = hoy.toISOString();
    }

    const [consultaEmpresas, consultaPagos] = await Promise.all([
      supabaseAdmin
        .from("empresas")
        .select(
          "id, nombre, email, plan, estado_suscripcion, prueba_inicio, prueba_fin, suscripcion_activa, mercado_pago_suscripcion_id, proximo_pago"
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("pagos_suscripcion")
        .select(
          "id, empresa_id, importe, fecha_pago, periodo, estado, medio_pago, referencia_pago"
        )
        .gte("fecha_pago", inicioMes)
        .order("fecha_pago", { ascending: false }),
    ]);

    if (consultaEmpresas.error || consultaPagos.error) {
      console.error("Error consultando datos SuperAdmin:", {
        empresas: consultaEmpresas.error,
        pagos: consultaPagos.error,
      });
      return respuesta({ ok: false, error: "No se pudieron cargar los datos administrativos." }, 500);
    }

    return respuesta({
      ok: true,
      empresas: consultaEmpresas.data ?? [],
      pagos: consultaPagos.data ?? [],
    });
  } catch (error) {
    console.error("Error al cargar datos de SuperAdmin:", error);
    return respuesta({ ok: false, error: "Ocurrió un error al consultar el panel." }, 500);
  }
}
