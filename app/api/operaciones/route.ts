import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SolicitudOperacion = {
  slug?: unknown;
  clave_solicitud?: unknown;
};

const MAX_CUERPO_BYTES = 1024;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CABECERAS_NO_CACHE = { "Cache-Control": "no-store" };

function responderError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    { status: estado, headers: CABECERAS_NO_CACHE }
  );
}

function formatearNumeroOperacion(numero: number): string {
  return `${String(Math.floor(numero / 100)).padStart(5, "0")}-${String(numero % 100).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  // Esta ruta debe seguir siendo pública para que un cliente del catálogo pueda
  // descargar su cálculo sin iniciar sesión. Origin y Sec-Fetch-Site ayudan a
  // frenar llamadas desde otros sitios, pero NO impiden bots que envían
  // solicitudes HTTP directamente. Se requiere protección antiabuso adicional.
  const origen = request.headers.get("origin");
  if (!origen) {
    return responderError("Origen de solicitud no autorizado.", 403);
  }

  try {
    if (new URL(origen).origin !== request.nextUrl.origin) {
      return responderError("Origen de solicitud no autorizado.", 403);
    }
  } catch {
    return responderError("Origen de solicitud no autorizado.", 403);
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return responderError("Origen de solicitud no autorizado.", 403);
  }

  const tipoContenido = request.headers.get("content-type") || "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(tipoContenido)) {
    return responderError("La solicitud debe enviarse como JSON.", 415);
  }

  let cuerpo: SolicitudOperacion;
  try {
    const contenido = await request.text();
    if (new TextEncoder().encode(contenido).length > MAX_CUERPO_BYTES) {
      return responderError("Solicitud demasiado grande.", 413);
    }
    const valor: unknown = JSON.parse(contenido);
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
      return responderError("Datos de solicitud inválidos.", 400);
    }
    cuerpo = valor as SolicitudOperacion;
  } catch {
    return responderError("La solicitud debe contener un JSON válido.", 400);
  }

  const slug = typeof cuerpo.slug === "string" ? cuerpo.slug.trim() : "";
  if (!slug || slug.length > 150 || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return responderError("Catálogo no válido.", 400);
  }

  const claveSolicitud =
    typeof cuerpo.clave_solicitud === "string"
      ? cuerpo.clave_solicitud.trim()
      : "";
  if (!UUID_REGEX.test(claveSolicitud)) {
    return responderError(
      "Falta una clave única válida para identificar el cálculo.",
      400
    );
  }

  try {
    // El servidor resuelve la empresa mediante el slug público.
    const { data: empresa, error: errorEmpresa } = await supabaseAdmin
      .from("empresas")
      .select("id,estado,catalogo_activo")
      .eq("slug", slug)
      .maybeSingle();

    if (errorEmpresa) {
      console.error("ComerSys: error al comprobar catálogo:", errorEmpresa);
      return responderError("No fue posible comprobar el catálogo.", 500);
    }
    if (
      !empresa ||
      (empresa.estado && empresa.estado !== "Activo") ||
      empresa.catalogo_activo === false
    ) {
      return responderError("El catálogo no está disponible.", 404);
    }

    // La función SQL gestiona idempotencia y aplica el límite ATÓMICO de
    // 120 operaciones nuevas por empresa/hora. Ese límite no reemplaza un
    // control de abuso por visitante o una protección anti-bots.
    const { data, error } = await supabaseAdmin.rpc(
      "comersys_obtener_o_crear_operacion",
      {
        p_empresa_id: Number(empresa.id),
        p_clave_solicitud: claveSolicitud,
      }
    );

    if (error) {
      const mensaje = String(error.message || "");
      if (mensaje.includes("Se alcanzó el límite temporal de operaciones")) {
        return responderError(
          "Se alcanzó el límite temporal de nuevos cálculos de esta empresa. Intentá nuevamente más tarde.",
          429
        );
      }
      console.error("ComerSys: error reservando número de operación:", error);
      return responderError("No se pudo reservar el número de operación.", 500);
    }

    const fila = Array.isArray(data) ? data[0] : data;
    const numero = Number(fila?.numero);
    const operacionId = fila?.operacion_id;
    if (
      !Number.isSafeInteger(numero) ||
      numero < 1 ||
      typeof operacionId !== "string" ||
      !UUID_REGEX.test(operacionId)
    ) {
      console.error("ComerSys: respuesta inválida al reservar operación.");
      return responderError("No se pudo confirmar el número reservado.", 500);
    }

    return NextResponse.json(
      {
        operacion_id: operacionId,
        numero,
        numero_formateado: formatearNumeroOperacion(numero),
      },
      { status: 200, headers: CABECERAS_NO_CACHE }
    );
  } catch (error) {
    console.error("ComerSys: error inesperado creando operación:", error);
    return responderError("No se pudo crear la operación.", 500);
  }
}
