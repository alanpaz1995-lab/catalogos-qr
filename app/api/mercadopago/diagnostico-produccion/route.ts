import { NextResponse } from "next/server";

export async function GET() {
  try {
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta MERCADOPAGO_ACCESS_TOKEN.",
        },
        { status: 500 }
      );
    }

    const respuesta = await fetch(
      "https://api.mercadopago.com/users/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const texto = await respuesta.text();

    let data: any;

    try {
      data = JSON.parse(texto);
    } catch {
      data = { raw: texto };
    }

    if (!respuesta.ok) {
      return NextResponse.json(
        {
          ok: false,
          statusHttp: respuesta.status,
          detalle: data,
        },
        { status: respuesta.status }
      );
    }

    return NextResponse.json({
      ok: true,
      cuenta: {
        id: data?.id ?? null,
        nickname: data?.nickname ?? null,
        site_id: data?.site_id ?? null,
        country_id: data?.country_id ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error de diagnóstico.",
      },
      { status: 500 }
    );
  }
}