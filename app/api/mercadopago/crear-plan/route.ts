import { NextResponse } from "next/server";

export async function POST() {
  try {
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Falta MERCADOPAGO_ACCESS_TOKEN en .env.local",
        },
        { status: 500 }
      );
    }

    const respuesta = await fetch(
      "https://api.mercadopago.com/preapproval_plan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: "Plan Profesional ComerSys",
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: 17500,
            currency_id: "ARS",
          },
          back_url: "https://catalogos-qr-eight.vercel.app/admin",
        }),
      }
    );

    const data = await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error Mercado Pago al crear plan:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Mercado Pago rechazó la creación del plan.",
          detalle: data,
        },
        { status: respuesta.status }
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      reason: data.reason,
      status: data.status,
      init_point: data.init_point,
    });
  } catch (error) {
    console.error(
      "Error al crear plan Mercado Pago:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo crear el plan de Mercado Pago.",
      },
      { status: 500 }
    );
  }
}