import { NextResponse } from "next/server";

export async function GET() {
  try {
    const accessToken =
      process.env.MERCADOPAGO_TEST_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta MERCADOPAGO_TEST_ACCESS_TOKEN.",
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

    let data: unknown;

    try {
      data = JSON.parse(texto);
    } catch {
      data = {
        raw: texto,
      };
    }

    const responseHeaders =
      Object.fromEntries(
        respuesta.headers.entries()
      );

    console.log(
      "DIAGNÓSTICO Mercado Pago /users/me:",
      {
        status: respuesta.status,
        statusText: respuesta.statusText,
        headers: responseHeaders,
        data,
      }
    );

    return NextResponse.json(
      {
        ok: respuesta.ok,
        statusHttp: respuesta.status,
        data,
      },
      {
        status: respuesta.status,
      }
    );
  } catch (error) {
    console.error(
      "Error en diagnóstico Mercado Pago:",
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