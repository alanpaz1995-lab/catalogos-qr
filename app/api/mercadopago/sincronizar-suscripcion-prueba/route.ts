import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

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

    const empresaId = 3;

    const preapprovalId =
      "9010dbf113314d2c8f2c8f33ee798374";

    const respuesta = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const texto = await respuesta.text();

    let suscripcion: any;

    try {
      suscripcion = JSON.parse(texto);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Mercado Pago devolvió una respuesta inválida.",
          raw: texto,
        },
        { status: 500 }
      );
    }

    if (!respuesta.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo consultar la suscripción en Mercado Pago.",
          statusHttp: respuesta.status,
          detalle: suscripcion,
        },
        { status: respuesta.status }
      );
    }

    const estaAutorizada =
      suscripcion?.status === "authorized";

    const proximoPago =
      suscripcion?.next_payment_date ?? null;

    const { data, error } = await supabaseAdmin
      .from("empresas")
      .update({
        mercado_pago_suscripcion_id:
          suscripcion.id,

        estado_suscripcion:
          estaAutorizada ? "activa" : suscripcion.status,

        suscripcion_activa:
          estaAutorizada,

        proximo_pago:
          proximoPago,
      })
      .eq("id", empresaId)
      .select(
        "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id, proximo_pago"
      )
      .single();

    if (error) {
      console.error(
        "Error actualizando empresa en Supabase:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "Suscripción sincronizada con Supabase:",
      {
        empresaId,
        preapprovalId,
        statusMercadoPago: suscripcion.status,
        empresa: data,
      }
    );

    return NextResponse.json({
      ok: true,
      statusMercadoPago: suscripcion.status,
      empresa: data,
    });
  } catch (error) {
    console.error(
      "Error sincronizando suscripción:",
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