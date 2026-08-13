import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    const planId =
      process.env.MERCADOPAGO_PLAN_PROFESIONAL_ID;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Falta MERCADOPAGO_ACCESS_TOKEN en .env.local",
        },
        { status: 500 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        {
          error:
            "Falta MERCADOPAGO_PLAN_PROFESIONAL_ID en .env.local",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const empresaId = Number(body?.empresaId);
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!Number.isFinite(empresaId) || empresaId <= 0) {
      return NextResponse.json(
        {
          error: "empresaId inválido.",
        },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          error: "Email inválido.",
        },
        { status: 400 }
      );
    }

    /*
     * Para una suscripción asociada a un plan, no creamos aquí
     * /preapproval porque eso puede requerir card_token_id.
     *
     * En cambio, obtenemos el plan ya creado y usamos su init_point.
     * Mercado Pago se encarga del checkout y de solicitar el medio
     * de pago al cliente.
     */
    const respuesta = await fetch(
      `https://api.mercadopago.com/preapproval_plan/${encodeURIComponent(
        planId
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const data = await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error Mercado Pago al obtener el plan:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Mercado Pago no pudo obtener el Plan Profesional.",
          detalle: data,
        },
        { status: respuesta.status }
      );
    }

    if (!data?.init_point) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago no devolvió el enlace de suscripción del plan.",
        },
        { status: 500 }
      );
    }

    if (data.status && data.status !== "active") {
      return NextResponse.json(
        {
          error:
            "El Plan Profesional de Mercado Pago no está activo.",
          estado: data.status,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      planId: data.id,
      status: data.status,
      initPoint: data.init_point,

      // Los conservamos para el flujo de ComerSys.
      empresaId,
      email,
    });
  } catch (error) {
    console.error(
      "Error al preparar checkout de Mercado Pago:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo preparar el checkout de Mercado Pago.",
      },
      { status: 500 }
    );
  }
}