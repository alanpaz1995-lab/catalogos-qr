import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function validarFirmaWebhook(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "Falta MERCADOPAGO_WEBHOOK_SECRET en las variables de entorno."
    );
  }

  const xSignature =
    request.headers.get("x-signature") ?? "";

  const xRequestId =
    request.headers.get("x-request-id") ?? "";

  const dataId =
    request.nextUrl.searchParams
      .get("data.id")
      ?.toLowerCase() ?? "";

  let ts = "";
  let hashRecibido = "";

  for (const parte of xSignature.split(",")) {
    const [clave, valor] = parte.split("=", 2);

    if (!clave || !valor) {
      continue;
    }

    const claveLimpia = clave.trim();
    const valorLimpio = valor.trim();

    if (claveLimpia === "ts") {
      ts = valorLimpio;
    }

    if (claveLimpia === "v1") {
      hashRecibido = valorLimpio;
    }
  }

  if (!ts || !hashRecibido) {
    return false;
  }

  const partesManifest: string[] = [];

  if (dataId) {
    partesManifest.push(`id:${dataId}`);
  }

  if (xRequestId) {
    partesManifest.push(`request-id:${xRequestId}`);
  }

  partesManifest.push(`ts:${ts}`);

  const manifest = `${partesManifest.join(";")};`;

  const hashCalculado = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const recibido = Buffer.from(
    hashRecibido,
    "utf8"
  );

  const calculado = Buffer.from(
    hashCalculado,
    "utf8"
  );

  if (recibido.length !== calculado.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    recibido,
    calculado
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const firmaValida =
      validarFirmaWebhook(request);

    if (!firmaValida) {
      console.warn(
        "Webhook Mercado Pago rechazado: firma inválida."
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Firma inválida.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const tipo =
      request.nextUrl.searchParams.get("type") ??
      body?.type ??
      "";

    const dataId =
      request.nextUrl.searchParams.get("data.id") ??
      body?.data?.id ??
      "";

    console.log(
      "Webhook Mercado Pago recibido:",
      {
        tipo,
        dataId,
        action: body?.action ?? null,
        liveMode: body?.live_mode ?? null,
      }
    );

    /*
     * PRIMERA ETAPA:
     * Solo validamos y registramos la notificación.
     *
     * Todavía NO activamos suscripciones ni cargamos pagos
     * en Supabase. Primero vamos a usar el simulador de
     * Mercado Pago y observar qué tipo de evento e ID llegan
     * realmente para nuestra integración de Suscripciones.
     */

    return NextResponse.json(
      {
        ok: true,
        recibido: true,
        tipo,
        dataId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error procesando webhook Mercado Pago:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo procesar el webhook.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    servicio: "Webhook Mercado Pago ComerSys",
  });
}