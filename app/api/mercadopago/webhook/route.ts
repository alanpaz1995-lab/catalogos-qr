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

type ResultadoConsultaMercadoPago = {
  suscripcion: PreapprovalMercadoPago;
  entornoUsado: "produccion" | "prueba";
};

function validarFirmaWebhook(
  request: NextRequest,
  secret: string
) {
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

async function consultarSuscripcionConToken(
  suscripcionId: string,
  accessToken: string
): Promise<PreapprovalMercadoPago> {
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

    const mensaje =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String(
            (
              data as {
                message?: unknown;
              }
            ).message ?? ""
          )
        : "";

    const error =
      new Error(
        "No se pudo consultar la suscripción en Mercado Pago."
      );

    (
      error as Error & {
        mercadoPagoStatus?: number;
        mercadoPagoMessage?: string;
      }
    ).mercadoPagoStatus =
      respuesta.status;

    (
      error as Error & {
        mercadoPagoStatus?: number;
        mercadoPagoMessage?: string;
      }
    ).mercadoPagoMessage =
      mensaje;

    throw error;
  }

  return data as PreapprovalMercadoPago;
}

async function obtenerSuscripcionMercadoPago(
  suscripcionId: string,
  liveMode: boolean
): Promise<ResultadoConsultaMercadoPago> {
  const tokenProduccion =
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

  const tokenPrueba =
    process.env.MERCADOPAGO_TEST_ACCESS_TOKEN?.trim();

  if (!tokenProduccion && !tokenPrueba) {
    throw new Error(
      "No hay credenciales de Mercado Pago configuradas."
    );
  }

  /*
   * Primero usamos el token que corresponde al
   * live_mode enviado por Mercado Pago.
   */
  const intentos: Array<{
    entorno: "produccion" | "prueba";
    token: string;
  }> = [];

  if (liveMode && tokenProduccion) {
    intentos.push({
      entorno: "produccion",
      token: tokenProduccion,
    });

    if (tokenPrueba) {
      intentos.push({
        entorno: "prueba",
        token: tokenPrueba,
      });
    }
  } else if (!liveMode && tokenPrueba) {
    intentos.push({
      entorno: "prueba",
      token: tokenPrueba,
    });

    /*
     * IMPORTANTE:
     *
     * Mercado Pago está enviando actualmente
     * liveMode=false en la simulación, aunque
     * estamos probando una suscripción real.
     *
     * Por eso, si el token de prueba no puede
     * consultar el preapproval por callerId,
     * intentamos con el token de producción.
     */
    if (tokenProduccion) {
      intentos.push({
        entorno: "produccion",
        token: tokenProduccion,
      });
    }
  }

  let ultimoError: unknown = null;

  for (
    const intento of intentos
  ) {
    try {
      const suscripcion =
        await consultarSuscripcionConToken(
          suscripcionId,
          intento.token
        );

      console.log(
        "Suscripción Mercado Pago consultada correctamente:",
        {
          suscripcionId,
          entornoUsado:
            intento.entorno,
          estado:
            suscripcion.status ?? null,
          externalReference:
            suscripcion.external_reference ??
            null,
        }
      );

      return {
        suscripcion,
        entornoUsado:
          intento.entorno,
      };
    } catch (error) {
      ultimoError = error;

      const errorMercadoPago =
        error as Error & {
          mercadoPagoStatus?: number;
          mercadoPagoMessage?: string;
        };

      console.warn(
        "Falló consulta de suscripción con credencial:",
        {
          suscripcionId,
          entorno:
            intento.entorno,
          status:
            errorMercadoPago
              .mercadoPagoStatus ??
            null,
          message:
            errorMercadoPago
              .mercadoPagoMessage ??
            error instanceof Error
              ? error.message
              : String(error),
        }
      );

      /*
       * Si el primer token falla por callerId,
       * continuamos con el siguiente token.
       *
       * También permitimos continuar ante 404/400,
       * porque la simulación puede mezclar el
       * entorno de la notificación con el entorno
       * real del preapproval.
       */
      const puedeProbarOtroToken =
        errorMercadoPago.mercadoPagoStatus ===
          400 ||
        errorMercadoPago.mercadoPagoStatus ===
          404;

      if (!puedeProbarOtroToken) {
        throw error;
      }
    }
  }

  if (ultimoError instanceof Error) {
    throw ultimoError;
  }

  throw new Error(
    "No se pudo consultar la suscripción en Mercado Pago."
  );
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

async function enviarActualizacionASyS({
  tipo,
  empresa,
  suscripcion,
  empresaId,
  dataId,
}: {
  tipo: string;
  empresa: {
    id: number;
    nombre: string;
  };
  suscripcion: PreapprovalMercadoPago;
  empresaId: number;
  dataId: string;
}) {
  const url =
    process.env.SYS_SISTEMAS_ACTUALIZACION_URL?.trim() ||
    "https://sys-sistemas.vercel.app/api/integraciones/comersys/actualizacion";

  const secret =
    process.env.SYS_SISTEMAS_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.warn(
      "No se envió la actualización a SyS Sistemas: falta SYS_SISTEMAS_WEBHOOK_SECRET."
    );
    return;
  }

  const esPago =
    tipo === "subscription_authorized_payment";

  const payload = {
    sistema: "ComerSys",
    evento: tipo,
    empresa_id: empresaId,
    referencia_externa: String(
      suscripcion.external_reference ??
        empresaId
    ),
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
    },
    suscripcion: {
      id:
        suscripcion.id ??
        null,
      estado:
        suscripcion.status ??
        null,
      proximo_pago:
        suscripcion.next_payment_date ??
        null,
      importe:
        suscripcion.auto_recurring
          ?.transaction_amount ??
        null,
      moneda:
        suscripcion.auto_recurring
          ?.currency_id ??
        null,
      payer_email:
        suscripcion.payer_email ??
        null,
    },
    pago: esPago
      ? {
          referencia_pago:
            String(dataId),
          importe:
            suscripcion.summarized
              ?.last_charged_amount ??
            suscripcion.auto_recurring
              ?.transaction_amount ??
            null,
          moneda:
            suscripcion.auto_recurring
              ?.currency_id ??
            "ARS",
          fecha_pago:
            suscripcion.summarized
              ?.last_charged_date ??
            null,
          estado: "aprobado",
          proveedor:
            "mercadopago",
        }
      : null,
  };

  try {
    const respuesta =
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "x-sys-webhook-secret":
            secret,
        },
        body:
          JSON.stringify(
            payload
          ),
        signal:
          AbortSignal.timeout(
            5000
          ),
        cache: "no-store",
      });

    const texto =
      await respuesta.text();

    if (!respuesta.ok) {
      console.error(
        "SyS Sistemas rechazó la actualización enviada desde ComerSys:",
        {
          status:
            respuesta.status,
          respuesta:
            texto,
          tipo,
          empresaId,
        }
      );

      return;
    }

    console.log(
      "Actualización enviada correctamente a SyS Sistemas:",
      {
        tipo,
        empresaId,
        suscripcionId:
          suscripcion.id ??
          dataId,
        pago: esPago,
      }
    );
  } catch (error) {
    console.error(
      "No se pudo enviar la actualización a SyS Sistemas:",
      error
    );
  }
}

function convertirEstado(
  estadoMercadoPago: string
) {
  switch (
    estadoMercadoPago
  ) {
    case "authorized":
      return {
        estadoComerSys:
          "activa",
        activa: true,
      };

    case "paused":
      return {
        estadoComerSys:
          "pausada",
        activa: false,
      };

    case "cancelled":
      return {
        estadoComerSys:
          "cancelada",
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
    const body =
      await request.json();

    const liveMode =
      body?.live_mode === true;

    const webhookSecret =
      (
        liveMode
          ? process.env
              .MERCADOPAGO_WEBHOOK_SECRET_PROD
          : process.env
              .MERCADOPAGO_WEBHOOK_SECRET
      )?.trim();

    if (!webhookSecret) {
      throw new Error(
        liveMode
          ? "Falta MERCADOPAGO_WEBHOOK_SECRET_PROD."
          : "Falta MERCADOPAGO_WEBHOOK_SECRET."
      );
    }

    const firmaValida =
      validarFirmaWebhook(
        request,
        webhookSecret
      );

    if (!firmaValida) {
      console.warn(
        "Webhook Mercado Pago rechazado: firma inválida.",
        {
          liveMode,
        }
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Firma inválida.",
        },
        {
          status: 401,
        }
      );
    }

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
          body?.action ??
          null,
        liveMode,
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
     * Consultamos la suscripción.
     *
     * Si la simulación llega con liveMode=false
     * pero el preapproval pertenece a producción,
     * la función puede probar el Access Token de
     * producción como respaldo.
     */
    const {
      suscripcion,
      entornoUsado,
    } =
      await obtenerSuscripcionMercadoPago(
        String(dataId),
        liveMode
      );

    console.log(
      "Entorno utilizado para consultar Mercado Pago:",
      {
        entornoUsado,
        suscripcionId:
          suscripcion.id ??
          String(dataId),
      }
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
      error:
        errorEmpresa,
    } =
      await supabaseAdmin
        .from("empresas")
        .select(
          "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id"
        )
        .eq(
          "id",
          empresaId
        )
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
        suscripcion.status ??
          ""
      );

    const {
      estadoComerSys,
      activa,
    } =
      convertirEstado(
        estadoMercadoPago
      );

    const {
      data:
        empresaActualizada,
      error:
        errorActualizarEmpresa,
    } =
      await supabaseAdmin
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
            estadoMercadoPago ===
            "cancelled"
              ? null
              : suscripcion
                  .next_payment_date ??
                null,
        })
        .eq(
          "id",
          empresa.id
        )
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
          estadoMercadoPago ===
          "cancelled"
            ? null
            : suscripcion
                .next_payment_date ??
              null,
      }
    );

    await enviarActualizacionASyS({
      tipo: String(tipo),
      empresa,
      suscripcion,
      empresaId:
        empresa.id,
      dataId:
        String(dataId),
    });

    return NextResponse.json(
      {
        ok: true,
        procesado: true,
        tipo,
        empresa:
          empresaActualizada,
        estadoMercadoPago,
        entornoUsado,
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