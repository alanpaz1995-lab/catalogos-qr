import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const accessToken =
      process.env.MERCADOPAGO_TEST_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Falta MERCADOPAGO_TEST_ACCESS_TOKEN.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const payerEmail = String(
      body?.payerEmail ?? ""
    )
      .trim()
      .toLowerCase();

    const empresaId = Number(
      body?.empresaId ?? 3
    );

    if (!payerEmail || !payerEmail.includes("@")) {
      return NextResponse.json(
        {
          error: "payer_email inválido.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(empresaId) ||
      empresaId <= 0
    ) {
      return NextResponse.json(
        {
          error: "empresaId inválido.",
        },
        { status: 400 }
      );
    }

    const externalReference =
      `COMERSYS-EMPRESA-${empresaId}`;

    const payload = {
      reason:
        "Plan Profesional ComerSys PRUEBA",

      external_reference:
        externalReference,

      payer_email:
        payerEmail,

      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 17500,
        currency_id: "ARS",
      },

      back_url:
        "https://catalogos-qr-eight.vercel.app/admin",

      status: "pending",
    };

    console.log(
      "PAYLOAD enviado a Mercado Pago /preapproval:",
      JSON.stringify(payload, null, 2)
    );

    const respuesta = await fetch(
      "https://api.mercadopago.com/preapproval",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },

        body: JSON.stringify(payload),
      }
    );

    const timestamp =
      new Date().toISOString();

    const responseHeaders =
      Object.fromEntries(
        respuesta.headers.entries()
      );

    const texto =
      await respuesta.text();

    let data: unknown;

    try {
      data = JSON.parse(texto);
    } catch {
      data = {
        raw: texto,
      };
    }

    console.log(
      "TRACE Mercado Pago /preapproval PENDING:",
      {
        timestamp,
        status: respuesta.status,
        statusText:
          respuesta.statusText,
        headers:
          responseHeaders,
      }
    );

    if (!respuesta.ok) {
      console.error(
        "Mercado Pago rechazó /preapproval:",
        {
          timestamp,
          statusHttp:
            respuesta.status,
          statusText:
            respuesta.statusText,
          headers:
            responseHeaders,
          data,
        }
      );

      return NextResponse.json(
        {
          error:
            "Mercado Pago rechazó la suscripción de prueba.",
          statusHttp:
            respuesta.status,
          detalle:
            data,
        },
        {
          status:
            respuesta.status,
        }
      );
    }

    console.log(
      "Suscripción Mercado Pago creada correctamente:",
      {
        timestamp,
        empresaId,
        externalReference,
        data,
      }
    );

    return NextResponse.json({
      ok: true,
      empresaId,
      externalReference,
      data,
    });
  } catch (error) {
    console.error(
      "Error creando suscripción de prueba:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la suscripción de prueba.",
      },
      { status: 500 }
    );
  }
}