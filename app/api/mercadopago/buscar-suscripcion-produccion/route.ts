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

    const externalReference =
      "COMERSYS-EMPRESA-3";

    const respuesta = await fetch(
      "https://api.mercadopago.com/preapproval/search",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const texto = await respuesta.text();

    let data: any;

    try {
      data = JSON.parse(texto);
    } catch {
      data = {
        raw: texto,
      };
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

    const resultados =
      Array.isArray(data?.results)
        ? data.results
        : [];

    const coincidencias =
      resultados
        .filter(
          (item: any) =>
            String(
              item?.external_reference ?? ""
            ).trim() === externalReference
        )
        .map((item: any) => ({
          id: item?.id ?? null,
          status: item?.status ?? null,
          external_reference:
            item?.external_reference ?? null,
          payer_email:
            item?.payer_email ?? null,
          date_created:
            item?.date_created ?? null,
          next_payment_date:
            item?.next_payment_date ?? null,
        }));

    return NextResponse.json({
      ok: true,
      externalReference,
      totalEncontradas:
        coincidencias.length,
      suscripciones:
        coincidencias,
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