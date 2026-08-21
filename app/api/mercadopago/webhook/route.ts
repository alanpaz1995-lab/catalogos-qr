import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type PreapprovalMercadoPago = {
  id?: string;
  status?: string;
  payer_id?: number;
  payer_email?: string;
  external_reference?: string | number | null;
  next_payment_date?: string | null;
  payment_method_id?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
  summarized?: {
    charged_quantity?: number | null;
    charged_amount?: number | null;
    last_charged_date?: string | null;
    last_charged_amount?: number | null;
  };
};

function validarFirmaWebhook(request: NextRequest) {
  const secret =
    process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Falta MERCADOPAGO_WEBHOOK_SECRET."
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
    const [clave, valor] =
      parte.split("=", 2);

    if (!clave || !valor) {
      continue;
    }

    const claveLimpia =
      clave.trim();

    const valorLimpio =
      valor.trim();

    if (claveLimpia === "ts") {
      ts = valorLimpio;
    }

    if (claveLimpia === "v1") {
      hashRecibido =
        valorLimpio;
    }
  }

  if (!ts || !hashRecibido) {
    return false;
  }

  const partesManifest: string[] = [];

  if (dataId) {
    partesManifest.push(
      `id:${dataId}`
    );
  }

  if (xRequestId) {
    partesManifest.push(
      `request-id:${xRequestId}`
    );
  }

  partesManifest.push(
    `ts:${ts}`
  );

  const manifest =
    `${partesManifest.join(";")};`;

  const hashCalculado =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(manifest)
      .digest("hex");

  const recibido =
    Buffer.from(
      hashRecibido,
      "utf8"
    );

  const calculado =
    Buffer.from(
      hashCalculado,
      "utf8"
    );

  if (
    recibido.length !==
    calculado.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    recibido,
    calculado
  );
}

async function obtenerSuscripcionMercadoPago(
  suscripcionId: string
): Promise<PreapprovalMercadoPago> {
  const accessToken =
    process.env
      .MERCADOPAGO_TEST_ACCESS_TOKEN
      ?.trim();

  if (!accessToken) {
    throw new Error(
      "Falta MERCADOPAGO_TEST_ACCESS_TOKEN."
    );
  }

  const respuesta =
    await fetch(
      `https://api.mercadopago.com/preapproval/${encodeURIComponent(
        suscripcionId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

  const texto =
    await respuesta.text();

  let data: unknown;

  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error(
      "Mercado Pago devolvió una respuesta inválida."
    );
  }

  if (!respuesta.ok) {
    console.error(
      "Mercado Pago no pudo consultar la suscripción:",
      {
        status: respuesta.status,
        data,
      }
    );

    throw new Error(
      "No se pudo consultar la suscripción en Mercado Pago."
    );
  }

  return data as PreapprovalMercadoPago;
}

function obtenerEmpresaId(
  externalReference:
    | string
    | number
    | null
    | undefined
) {
  const referencia =
    String(
      externalReference ?? ""
    ).trim();

  const coincidencia =
    /^COMERSYS-EMPRESA-(\d+)$/i.exec(
      referencia
    );

  if (!coincidencia) {
    return null;
  }

  const empresaId =
    Number(coincidencia[1]);

  if (
    !Number.isInteger(empresaId) ||
    empresaId <= 0
  ) {
    return null;
  }

  return empresaId;
}

function convertirEstado(
  estadoMercadoPago: string
) {
  switch (estadoMercadoPago) {
    case "authorized":
      return {
        estadoComerSys: "activa",
        activa: true,
      };

    case "paused":
      return {
        estadoComerSys: "pausada",
        activa: false,
      };

    case "cancelled":
      return {
        estadoComerSys: "cancelada",
        activa: false,
      };

    case "pending":
      return {
        estadoComerSys:
          "pendiente_pago",
        activa: false,
      };

    default:
      return {
        estadoComerSys:
          estadoMercadoPago ||
          "pendiente_pago",
        activa: false,
      };
  }
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
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const tipo =
      request.nextUrl.searchParams.get(
        "type"
      ) ??
      body?.type ??
      "";

    const dataId =
      request.nextUrl.searchParams.get(
        "data.id"
      ) ??
      body?.data?.id ??
      "";

    console.log(
      "Webhook Mercado Pago recibido:",
      {
        tipo,
        dataId,
        action:
          body?.action ?? null,
        liveMode:
          body?.live_mode ?? null,
      }
    );

    const tiposSuscripcionPermitidos =
      new Set([
        "subscription_preapproval",
        "subscription_authorized_payment",
      ]);

    if (
      !tiposSuscripcionPermitidos.has(
        String(tipo)
      )
    ) {
      return NextResponse.json(
        {
          ok: true,
          ignorado: true,
          tipo,
        },
        {
          status: 200,
        }
      );
    }

    if (!dataId) {
      return NextResponse.json(
        {
          ok: true,
          ignorado: true,
          motivo:
            "La notificación no incluye data.id.",
        },
        {
          status: 200,
        }
      );
    }

    /*
     * Para ambos tópicos estamos usando data.id
     * como identificador de la suscripción/preapproval,
     * que es justamente lo que Mercado Pago envió
     * en nuestra prueba real.
     */
    const suscripcion =
      await obtenerSuscripcionMercadoPago(
        String(dataId)
      );

    const empresaId =
      obtenerEmpresaId(
        suscripcion.external_reference
      );

    if (!empresaId) {
      console.error(
        "Webhook sin empresa válida:",
        {
          tipo,
          suscripcionId:
            suscripcion.id ??
            dataId,
          externalReference:
            suscripcion.external_reference ??
            null,
        }
      );

      return NextResponse.json(
        {
          ok: true,
          procesado: false,
          motivo:
            "external_reference no identifica una empresa de ComerSys.",
        },
        {
          status: 200,
        }
      );
    }

    const {
      data: empresa,
      error: errorEmpresa,
    } = await supabaseAdmin
      .from("empresas")
      .select(
        "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id"
      )
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      throw new Error(
        `No se pudo buscar la empresa: ${errorEmpresa.message}`
      );
    }

    if (!empresa) {
      console.error(
        "Webhook Mercado Pago: empresa inexistente.",
        {
          empresaId,
          suscripcionId:
            suscripcion.id ??
            dataId,
        }
      );

      return NextResponse.json(
        {
          ok: true,
          procesado: false,
          motivo:
            "No existe la empresa indicada por external_reference.",
        },
        {
          status: 200,
        }
      );
    }

    const estadoMercadoPago =
      String(
        suscripcion.status ?? ""
      );

    const {
      estadoComerSys,
      activa,
    } = convertirEstado(
      estadoMercadoPago
    );

    const {
      data: empresaActualizada,
      error:
        errorActualizarEmpresa,
    } = await supabaseAdmin
      .from("empresas")
      .update({
        plan:
          activa
            ? "profesional"
            : empresa.plan,

        estado_suscripcion:
          estadoComerSys,

        suscripcion_activa:
          activa,

        mercado_pago_suscripcion_id:
          suscripcion.id ??
          String(dataId),

        proximo_pago:
          estadoMercadoPago === "cancelled"
            ? null
            : suscripcion.next_payment_date ?? null,
      })
      .eq("id", empresa.id)
      .select(
        "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id, proximo_pago"
      )
      .single();

    if (
      errorActualizarEmpresa
    ) {
      throw new Error(
        `No se pudo actualizar la suscripción de la empresa: ${errorActualizarEmpresa.message}`
      );
    }

    console.log(
      "Suscripción ComerSys actualizada por webhook:",
      {
        tipo,
        empresaId:
          empresa.id,
        empresa:
          empresa.nombre,
        externalReference:
          suscripcion.external_reference,
        suscripcionId:
          suscripcion.id ??
          dataId,
        estadoMercadoPago,
        estadoComerSys,
        suscripcionActiva:
          activa,
        proximoPago:
          estadoMercadoPago === "cancelled"
            ? null
            : suscripcion.next_payment_date ?? null,
      }
    );

    return NextResponse.json(
      {
        ok: true,
        procesado: true,
        tipo,
        empresa:
          empresaActualizada,
        estadoMercadoPago,
      },
      {
        status: 200,
      }
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
          error instanceof Error
            ? error.message
            : "No se pudo procesar el webhook.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    servicio:
      "Webhook Mercado Pago ComerSys",
  });
}