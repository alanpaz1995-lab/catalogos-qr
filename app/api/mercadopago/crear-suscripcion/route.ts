import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta MERCADOPAGO_ACCESS_TOKEN.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const empresaId =
      Number(body?.empresaId);

    const payerEmail =
      String(body?.email ?? "")
        .trim()
        .toLowerCase();

    if (
      !Number.isInteger(empresaId) ||
      empresaId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "empresaId inválido.",
        },
        { status: 400 }
      );
    }

    if (
      !payerEmail ||
      !payerEmail.includes("@")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email inválido.",
        },
        { status: 400 }
      );
    }

    /*
     * Comprobamos que la empresa exista.
     */
    const {
      data: empresa,
      error: errorEmpresa,
    } = await supabaseAdmin
      .from("empresas")
      .select(
        "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id"
      )
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      console.error(
        "Error buscando empresa:",
        errorEmpresa
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo verificar la empresa.",
        },
        { status: 500 }
      );
    }

    if (!empresa) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La empresa indicada no existe.",
        },
        { status: 404 }
      );
    }

    /*
     * Evitamos generar otra suscripción si
     * ComerSys ya tiene una activa.
     */
    if (
      empresa.suscripcion_activa &&
      empresa.mercado_pago_suscripcion_id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La empresa ya tiene una suscripción activa.",
          suscripcionId:
            empresa.mercado_pago_suscripcion_id,
        },
        { status: 409 }
      );
    }

    const externalReference =
      `COMERSYS-EMPRESA-${empresaId}`;

    /*
     * Este es el mismo flujo que ya probamos
     * correctamente con las cuentas de prueba,
     * pero utilizando las credenciales reales.
     */
    const payload = {
      reason:
        "Plan Profesional ComerSys",

      external_reference:
        externalReference,

      payer_email:
        payerEmail,

      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 17500,
        currency_id: "ARS",
      },

      back_url:
        "https://catalogos-qr-eight.vercel.app/admin",

      status:
        "pending",
    };

    console.log(
      "Creando suscripción Mercado Pago:",
      {
        empresaId,
        externalReference,
        payerEmail,
      }
    );

    const respuesta =
      await fetch(
        "https://api.mercadopago.com/preapproval",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body:
            JSON.stringify(payload),
        }
      );

    const texto =
      await respuesta.text();

    let data: any;

    try {
      data =
        JSON.parse(texto);
    } catch {
      data = {
        raw: texto,
      };
    }

    if (!respuesta.ok) {
      console.error(
        "Mercado Pago rechazó la creación de la suscripción:",
        {
          statusHttp:
            respuesta.status,
          data,
        }
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Mercado Pago no pudo crear la suscripción.",
          statusHttp:
            respuesta.status,
          detalle:
            data,
        },
        {
          status:
            respuesta.status,
        }
      );
    }

    const suscripcionId =
      String(data?.id ?? "");

    const initPoint =
      String(data?.init_point ?? "");

    if (
      !suscripcionId ||
      !initPoint
    ) {
      console.error(
        "Respuesta incompleta de Mercado Pago:",
        data
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Mercado Pago creó una respuesta incompleta.",
        },
        { status: 500 }
      );
    }

    /*
     * Guardamos inmediatamente que la empresa
     * inició el proceso.
     *
     * Todavía NO la activamos.
     * El webhook será quien la active cuando
     * Mercado Pago informe "authorized".
     */
    const {
      data: empresaActualizada,
      error: errorActualizar,
    } = await supabaseAdmin
      .from("empresas")
      .update({
        mercado_pago_suscripcion_id:
          suscripcionId,

        estado_suscripcion:
          "pendiente_pago",

        suscripcion_activa:
          false,

        proximo_pago:
          data?.next_payment_date ??
          null,
      })
      .eq("id", empresaId)
      .select(
        "id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id, proximo_pago"
      )
      .single();

    if (errorActualizar) {
      console.error(
        "La suscripción se creó en Mercado Pago pero no pudo guardarse en Supabase:",
        errorActualizar
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "La suscripción fue creada en Mercado Pago, pero ComerSys no pudo registrarla.",
          suscripcionId,
        },
        { status: 500 }
      );
    }

    console.log(
      "Suscripción Mercado Pago creada:",
      {
        empresaId,
        suscripcionId,
        externalReference,
        status:
          data?.status ?? null,
      }
    );

    return NextResponse.json({
      ok: true,

      empresaId,

      externalReference,

      suscripcionId,

      status:
        data?.status ?? "pending",

      initPoint,

      empresa:
        empresaActualizada,
    });
  } catch (error) {
    console.error(
      "Error creando suscripción Mercado Pago:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la suscripción.",
      },
      { status: 500 }
    );
  }
}