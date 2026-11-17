import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccionSuscripcion =
  | "activar_profesional"
  | "pausar_suscripcion"
  | "extender_prueba";

type Solicitud = {
  empresaId?: unknown;
  accion?: unknown;
};

function respuestaError(mensaje: string, status: number) {
  return NextResponse.json(
    { ok: false, error: mensaje },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  try {
    // El token se comprueba contra Supabase Auth desde el servidor.
    const authorization = request.headers.get("authorization") || "";
    const matchToken = authorization.match(/^Bearer\s+([^\s]+)$/i);
    if (!matchToken) return respuestaError("No autorizado.", 401);

    const { data: { user }, error: errorUsuario } =
      await supabaseAdmin.auth.getUser(matchToken[1]);

    if (errorUsuario || !user) {
      return respuestaError("La sesión no es válida o venció.", 401);
    }

    // La autorización no depende del panel ni de un ID enviado por el cliente.
    const { data: superadmin, error: errorSuperadmin } = await supabaseAdmin
      .from("superadmins")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorSuperadmin) {
      console.error("ComerSys: comprobación SuperAdmin fallida:", errorSuperadmin);
      return respuestaError("No se pudo verificar la autorización.", 500);
    }
    if (!superadmin) {
      return respuestaError("Esta acción requiere permisos de SuperAdmin.", 403);
    }

    const tipoContenido = request.headers.get("content-type") || "";
    if (!/^application\/json(?:\s*;|\s*$)/i.test(tipoContenido)) {
      return respuestaError("La solicitud debe ser JSON.", 415);
    }

    const textoCuerpo = await request.text();
    if (new TextEncoder().encode(textoCuerpo).length > 2048) {
      return respuestaError("La solicitud es demasiado grande.", 413);
    }
    let cuerpo: Solicitud;
    try {
      const valor: unknown = JSON.parse(textoCuerpo);
      if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
        return respuestaError("Solicitud inválida.", 400);
      }
      cuerpo = valor as Solicitud;
    } catch {
      return respuestaError("JSON inválido.", 400);
    }

    const empresaId = cuerpo.empresaId;
    if (typeof empresaId !== "number" || !Number.isSafeInteger(empresaId) || empresaId <= 0) {
      return respuestaError("La empresa indicada no es válida.", 400);
    }

    const accion = cuerpo.accion;
    if (accion !== "activar_profesional" && accion !== "pausar_suscripcion" && accion !== "extender_prueba") {
      return respuestaError("Acción no permitida.", 400);
    }
    const accionValidada: AccionSuscripcion = accion;

    const { data: empresa, error: errorEmpresa } = await supabaseAdmin
      .from("empresas")
      .select("id, plan, prueba_inicio, prueba_fin, suscripcion_activa")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      console.error("ComerSys: error al consultar empresa:", errorEmpresa);
      return respuestaError("No se pudo consultar la empresa.", 500);
    }
    if (!empresa) return respuestaError("La empresa no existe.", 404);

    // Lista cerrada de modificaciones, establecida en el servidor.
    // Nunca se aceptan columnas o valores de suscripción desde el navegador.
    let cambios: Record<string, string | boolean | null>;
    if (accionValidada === "activar_profesional") {
      cambios = {
        plan: "profesional",
        estado_suscripcion: "activa",
        suscripcion_activa: true,
      };
    } else if (accionValidada === "pausar_suscripcion") {
      cambios = {
        estado_suscripcion: "pausada",
        suscripcion_activa: false,
      };
    } else {
      // Mantiene la misma regla que usaba el panel: sumar siete días
      // a la fecha futura o, si ya venció, al momento actual.
      const fechaFin = typeof empresa.prueba_fin === "string" ? new Date(empresa.prueba_fin) : null;
      const ahora = new Date();
      const base = fechaFin && Number.isFinite(fechaFin.getTime()) && fechaFin > ahora
        ? fechaFin
        : ahora;
      base.setDate(base.getDate() + 7);
      cambios = {
        plan: "prueba",
        estado_suscripcion: "prueba",
        suscripcion_activa: false,
        prueba_inicio: empresa.prueba_inicio || ahora.toISOString(),
        prueba_fin: base.toISOString(),
        aviso_vencimiento_enviado: false,
      };
    }

    const { data: actualizada, error: errorActualizacion } = await supabaseAdmin
      .from("empresas")
      .update(cambios)
      .eq("id", empresaId)
      .select("id, plan, estado_suscripcion, suscripcion_activa, prueba_inicio, prueba_fin")
      .single();

    if (errorActualizacion) {
      console.error("ComerSys: error al actualizar suscripción:", errorActualizacion);
      return respuestaError("No se pudo actualizar la suscripción.", 500);
    }

    console.info("ComerSys: acción administrativa de suscripción", {
      accion: accionValidada,
      empresaId,
      superadminId: user.id,
    });

    return NextResponse.json(
      { ok: true, empresa: actualizada },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ComerSys: error inesperado administrando suscripciones:", error);
    return respuestaError("No se pudo completar la operación.", 500);
  }
}
