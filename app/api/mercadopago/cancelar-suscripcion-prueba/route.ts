import { NextResponse } from "next/server";

export async function POST() {
  try {
    const accessToken =
      process.env.MERCADOPAGO_TEST_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta MERCADOPAGO_TEST_ACCESS_TOKEN.",
        },
        { status: 500 }
      );
    }

    const preapprovalId =
      "7776324aa789476a883ee1f4f36156bf";

    const respuesta = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: "cancelled",
        }),
      }
    );

    const texto = await respuesta.text();

    let data: unknown;

    try {
      data = JSON.parse(texto);
    } catch {
      data = {
        raw: texto,
      };
    }

    if (!respuesta.ok) {
      console.error(
        "Mercado Pago rechazó la cancelación:",
        {
          statusHttp: respuesta.status,
          data,
        }
      );

      return NextResponse.json(
        {
          ok: false,
          statusHttp: respuesta.status,
          detalle: data,
        },
        {
          status: respuesta.status,
        }
      );
    }

    console.log(
      "Suscripción Mercado Pago cancelada:",
      data
    );

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error(
      "Error cancelando suscripción Mercado Pago:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido.",
      },
      { status: 500 }
    );
  }
}