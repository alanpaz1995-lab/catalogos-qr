import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const accessToken = request.headers.get("authorization");

    if (!accessToken || !accessToken.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const usuarioAccessToken = accessToken.replace("Bearer ", "").trim();

    if (!usuarioAccessToken) {
      return NextResponse.json(
        { error: "Token de usuario no válido." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Faltan las variables de Supabase." },
        { status: 500 }
      );
    }

    if (!mercadoPagoAccessToken) {
      return NextResponse.json(
        { error: "Falta MERCADOPAGO_ACCESS_TOKEN." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(usuarioAccessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Sesión de usuario no válida." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const empresaId = body?.empresaId;
    const payerEmail = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!empresaId) {
      return NextResponse.json(
        { error: "Falta empresaId." },
        { status: 400 }
      );
    }

    if (!payerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      return NextResponse.json(
        { error: "El correo de Mercado Pago no es válido." },
        { status: 400 }
      );
    }

    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from("empresas")
      .select(
        "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id"
      )
      .eq("id", empresaId)
      .eq("auth_user_id", user.id)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: "No se encontró la empresa." },
        { status: 404 }
      );
    }

    if (empresa.suscripcion_activa) {
      return NextResponse.json(
        { error: "La empresa ya tiene una suscripción activa." },
        { status: 400 }
      );
    }

    const externalReference =
      "COMERSYS-EMPRESA-" + String(empresaId);

    const backUrl =
      "https://catalogos-qr-eight.vercel.app/admin";

    const mercadoPagoResponse = await fetch(
      "https://api.mercadopago.com/preapproval",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " + mercadoPagoAccessToken,
        },
        body: JSON.stringify({
          reason: "Plan Profesional ComerSys",
          external_reference: externalReference,
          payer_email: payerEmail,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: 17500,
            currency_id: "ARS",
          },
          back_url: backUrl,
          status: "pending",
        }),
      }
    );

    const mercadoPagoData = await mercadoPagoResponse.json();

    if (!mercadoPagoResponse.ok) {
      console.error(
        "Error Mercado Pago:",
        mercadoPagoData
      );

      return NextResponse.json(
        {
          error:
            mercadoPagoData?.message ||
            "Mercado Pago rechazó la creación de la suscripción.",
          detalle: mercadoPagoData,
        },
        { status: mercadoPagoResponse.status }
      );
    }

    const subscriptionId = mercadoPagoData.id;
    const initPoint = mercadoPagoData.init_point;

    if (!subscriptionId || !initPoint) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago no devolvió los datos necesarios para continuar.",
        },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("empresas")
      .update({
        mercado_pago_suscripcion_id: String(subscriptionId),
        estado_suscripcion: "pendiente_pago",
        suscripcion_activa: false,
      })
      .eq("id", empresaId)
      .eq("auth_user_id", user.id);

    if (updateError) {
      console.error(
        "Error actualizando empresa:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "La suscripción fue creada en Mercado Pago, pero no se pudo actualizar la empresa.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      initPoint,
      subscriptionId: String(subscriptionId),
    });
  } catch (error) {
    console.error(
      "Error crear suscripción:",
      error
    );

    return NextResponse.json(
      {
        error: "Error interno al crear la suscripción.",
      },
      { status: 500 }
    );
  }
}