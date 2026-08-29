import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const authUserId = body.auth_user_id as string | undefined;

    if (!authUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta auth_user_id.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Buscamos la empresa creada para este usuario.
    const { data: empresa, error: empresaError } =
      await supabaseAdmin
        .from("empresas")
        .select("*")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

    if (empresaError) {
      console.error(
        "Error buscando empresa:",
        empresaError
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo buscar la empresa.",
        },
        { status: 500 }
      );
    }

    if (!empresa) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La empresa todavía no está creada en ComerSys.",
        },
        { status: 404 }
      );
    }

    const urlSyS = process.env.SYS_SISTEMAS_URL;
    const secret = process.env.SYS_SISTEMAS_WEBHOOK_SECRET;

    if (!urlSyS || !secret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan las variables de integración con SyS Sistemas.",
        },
        { status: 500 }
      );
    }

    const respuesta = await fetch(
      `${urlSyS}/api/integraciones/comersys/registro`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sys-webhook-secret": secret,
        },
        body: JSON.stringify({
          record: empresa,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.ok) {
      console.error(
        "Error recibido desde SyS Sistemas:",
        resultado
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            resultado.error ||
            "SyS Sistemas rechazó la sincronización.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        "Empresa sincronizada correctamente con SyS Sistemas.",
      empresa_id: empresa.id,
      sys_sistemas: resultado,
    });
  } catch (error) {
    console.error(
      "Error en integración con SyS Sistemas:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Ocurrió un error inesperado.",
      },
      { status: 500 }
    );
  }
}