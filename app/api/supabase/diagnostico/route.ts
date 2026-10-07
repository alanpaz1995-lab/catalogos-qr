import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("empresas")
      .select(
        "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id, proximo_pago"
      )
      .order("id", { ascending: true });

    if (error) {
      console.error(
        "Error diagnóstico Supabase:",
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
      "DIAGNÓSTICO Supabase empresas:",
      data
    );

    return NextResponse.json({
      ok: true,
      empresas: data,
    });
  } catch (error) {
    console.error(
      "Error general diagnóstico Supabase:",
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