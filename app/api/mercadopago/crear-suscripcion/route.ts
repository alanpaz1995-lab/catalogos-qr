```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // 1. TOKEN DE MERCADO PAGO
    // ============================================================

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

    // ============================================================
    // 2. VERIFICAR USUARIO DE SUPABASE
    // ============================================================

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sesión no autorizada.",
        },
        { status: 401 }
      );
    }

    const usuarioAccessToken =
      authorization.replace("Bearer ", "").trim();

    if (!usuarioAccessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Token de sesión inválido.",
        },
        { status: 401 }
      );
    }

    const {
      data: {
        user,
      },
      error: errorUsuario,
    } = await supabaseAdmin.auth.getUser(
      usuarioAccessToken
    );

    if (errorUsuario || !user) {
      console.error(
        "Error verificando usuario de Supabase:",
        errorUsuario
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Tu sesión no es válida o expiró. Iniciá sesión nuevamente.",
        },
        { status: 401 }
      );
    }

    // ============================================================
    // 3. LEER DATOS RECIBIDOS
    // ============================================================

    const body = await request.json();

    const empresaId =
      Number(body?.empresaId);

    const payerEmail =
      String(body?.email ?? "")
        .trim()
        .toLowerCase();

    // ============================================================
    // 4. VALIDAR EMPRESA ID
    // ============================================================

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

    // ============================================================
    // 5. VALIDAR CORREO DE MERCADO PAGO
    // ============================================================

    if (!payerEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ingresá el correo de Mercado Pago.",
        },
        { status: 400 }
      );
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        payerEmail
      );

    if (!emailValido) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El correo de Mercado Pago no es válido.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 6. BUSCAR LA EMPRESA DEL USUARIO
    //
    // MUY IMPORTANTE:
    // También filtramos por auth_user_id.
    //
    // De esta forma, aunque alguien intentara mandar otro
    // empresaId manualmente, no podría crear una suscripción
    // para una empresa que no le pertenece.
    // ============================================================

    const {
      data: empresa,
      error: errorEmpresa,
    } = await supabaseAdmin
      .from("empresas")
      .select(
        `
          id,
          nombre,
          plan,
          estado_suscripcion,
          suscripcion_activa,
          mercado_pago_suscripcion_id,
          auth_user_id
        `
      )
      .eq("id", empresaId)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (errorEmpresa) {
      console.error(
        "Error buscando empresa del usuario:",
        errorEmpresa
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo verificar la empresa asociada a tu cuenta.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 7. EMPRESA NO ENCONTRADA
    // ============================================================

    if (!empresa) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La empresa indicada no existe o no pertenece a tu cuenta.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // 8. EVITAR DUPLICAR UNA SUSCRIPCIÓN ACTIVA
    // ============================================================

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

    // ============================================================
    // 9. REFERENCIA EXTERNA
    // ============================================================

    const externalReference =
      `COMERSYS-EMPRESA-${empresaId}`;

    // ============================================================
    // 10. DATOS QUE ENVIAMOS A MERCADO PAGO
    // ============================================================

    const payload = {
      reason:
        "Plan Profesional ComerSys",

      external_reference:
        externalReference,

      // ESTE ES EL CORREO QUE EL USUARIO ESCRIBIÓ
      // EN EL MODAL DE MERCADO PAGO.
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
        usuarioId: user.id,
        externalReference,
        payerEmail,
      }
    );

    // ============================================================
    // 11. CREAR SUSCRIPCIÓN EN MERCADO PAGO
    // ============================================================

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

    // Mercado Pago puede devolver JSON o texto.
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

    // ============================================================
    // 12. ERROR DE MERCADO PAGO
    // ============================================================

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

    // ============================================================
    // 13. OBTENER ID Y LINK DE MERCADO PAGO
    // ============================================================

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

    // ============================================================
    // 14. GUARDAR SUSCRIPCIÓN EN SUPABASE
    //
    // IMPORTANTE:
    // Todavía NO activamos la cuenta.
    //
    // El webhook de Mercado Pago será quien confirme
    // posteriormente que la suscripción fue autorizada.
    // ============================================================

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
      .eq("auth_user_id", user.id)
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

    // ============================================================
    // 15. RESPUESTA FINAL
    // ============================================================

    console.log(
      "Suscripción Mercado Pago creada correctamente:",
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
    // ============================================================
    // ERROR GENERAL
    // ============================================================

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
```