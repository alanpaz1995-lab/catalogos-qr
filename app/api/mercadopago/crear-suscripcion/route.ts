import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SuscripcionMP = {
  id?: string;
  status?: string;
  init_point?: string;
  external_reference?: string | null;
  payer_email?: string | null;
};

const MP_API = "https://api.mercadopago.com/preapproval";
const BACK_URL = "https://www.comersysapp.com/admin";

export async function POST(request: Request) {
  try {
    const autorizacion = request.headers.get("authorization");
    if (!autorizacion?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const usuarioAccessToken = autorizacion.slice("Bearer ".length).trim();
    if (!usuarioAccessToken) {
      return NextResponse.json({ error: "Token de usuario no válido." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: "Faltan las variables de Supabase." }, { status: 500 });
    }
    if (!mercadoPagoAccessToken) {
      return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN." }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user }, error: userError } =
      await supabaseAdmin.auth.getUser(usuarioAccessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Sesión de usuario no válida." }, { status: 401 });
    }

    let body: { empresaId?: unknown; email?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
    }

    const empresaId = Number(body?.empresaId);
    const payerEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
      return NextResponse.json({ error: "empresaId no es válido." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      return NextResponse.json({ error: "El correo de Mercado Pago no es válido." }, { status: 400 });
    }

    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from("empresas")
      .select("id, nombre, plan, estado_suscripcion, suscripcion_activa, mercado_pago_suscripcion_id")
      .eq("id", empresaId)
      .eq("auth_user_id", user.id)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json({ error: "No se encontró la empresa." }, { status: 404 });
    }
    if (empresa.suscripcion_activa) {
      return NextResponse.json({ error: "La empresa ya tiene una suscripción activa." }, { status: 409 });
    }

    const externalReference = `COMERSYS-EMPRESA-${empresaId}`;
    const suscripcionExistenteId = String(empresa.mercado_pago_suscripcion_id ?? "").trim();

    // Nunca generamos una segunda suscripción mientras exista una asociada.
    // Primero verificamos su estado real en Mercado Pago.
    if (suscripcionExistenteId) {
      let respuestaConsulta: Response;
      try {
        respuestaConsulta = await fetch(
          `${MP_API}/${encodeURIComponent(suscripcionExistenteId)}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${mercadoPagoAccessToken}` },
            cache: "no-store",
          }
        );
      } catch (error) {
        console.error("Error consultando suscripción existente:", error);
        return NextResponse.json(
          { error: "No se pudo verificar la suscripción existente. No se creó otra para evitar duplicados." },
          { status: 502 }
        );
      }

      if (!respuestaConsulta.ok) {
        console.error("Mercado Pago no pudo verificar la suscripción existente:", {
          status: respuestaConsulta.status,
          subscriptionId: suscripcionExistenteId,
        });
        return NextResponse.json(
          { error: "La empresa ya tiene una suscripción registrada, pero Mercado Pago no permitió verificarla. No se creó otra.", subscriptionId: suscripcionExistenteId },
          { status: 409 }
        );
      }

      let suscripcionExistente: SuscripcionMP;
      try {
        suscripcionExistente = (await respuestaConsulta.json()) as SuscripcionMP;
      } catch {
        return NextResponse.json(
          { error: "Mercado Pago devolvió datos inválidos de la suscripción existente. No se creó otra." },
          { status: 502 }
        );
      }

      if (String(suscripcionExistente.external_reference ?? "") !== externalReference) {
        return NextResponse.json(
          { error: "La suscripción existente no corresponde a esta empresa. Revisala antes de continuar." },
          { status: 409 }
        );
      }

      const estado = String(suscripcionExistente.status ?? "").toLowerCase();
      if (estado === "pending") {
        const initPoint = String(suscripcionExistente.init_point ?? "").trim();
        if (initPoint) {
          return NextResponse.json({
            ok: true,
            initPoint,
            subscriptionId: suscripcionExistenteId,
            reutilizada: true,
          });
        }
        return NextResponse.json(
          {
            error: "Ya existe una suscripción pendiente, pero Mercado Pago no devolvió el enlace para continuar. No se creó otra.",
            subscriptionId: suscripcionExistenteId,
          },
          { status: 409 }
        );
      }

      // Ante authorized, paused, cancelled o estado desconocido, no duplicamos
      // automáticamente: se debe reconciliar primero el estado de la empresa.
      return NextResponse.json(
        {
          error: `La empresa ya tiene una suscripción en Mercado Pago (estado: ${estado || "desconocido"}). Revisala antes de iniciar otra.`,
          subscriptionId: suscripcionExistenteId,
        },
        { status: 409 }
      );
    }

    const mercadoPagoResponse = await fetch(MP_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
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
        back_url: BACK_URL,
        status: "pending",
      }),
    });

    const mercadoPagoData = await mercadoPagoResponse.json();
    if (!mercadoPagoResponse.ok) {
      console.error("Error Mercado Pago al crear suscripción:", mercadoPagoData);
      return NextResponse.json(
        {
          error: mercadoPagoData?.message || "Mercado Pago rechazó la creación de la suscripción.",
          detalle: mercadoPagoData,
        },
        { status: mercadoPagoResponse.status }
      );
    }

    const subscriptionId = String(mercadoPagoData?.id ?? "").trim();
    const initPoint = String(mercadoPagoData?.init_point ?? "").trim();
    if (!subscriptionId || !initPoint) {
      console.error("Mercado Pago creó/devolvió respuesta incompleta:", mercadoPagoData);
      return NextResponse.json(
        { error: "Mercado Pago no devolvió los datos necesarios para continuar. Revisá la suscripción antes de reintentar." },
        { status: 500 }
      );
    }

    // Filtro adicional: evita pisar un ID que otra solicitud ya haya guardado.
    const { data: actualizada, error: updateError } = await supabaseAdmin
      .from("empresas")
      .update({
        mercado_pago_suscripcion_id: subscriptionId,
        estado_suscripcion: "pendiente_pago",
        suscripcion_activa: false,
      })
      .eq("id", empresaId)
      .eq("auth_user_id", user.id)
      .is("mercado_pago_suscripcion_id", null)
      .eq("suscripcion_activa", false)
      .select("id")
      .maybeSingle();

    if (updateError || !actualizada) {
      console.error("Suscripción creada pero sin guardar en empresa:", {
        subscriptionId,
        error: updateError,
      });
      return NextResponse.json(
        {
          error: "Se creó una suscripción en Mercado Pago, pero no se pudo vincular de forma segura con la empresa. No reintentes: revisá el ID informado.",
          subscriptionId,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, initPoint, subscriptionId, reutilizada: false });
  } catch (error) {
    console.error("Error crear suscripción:", error);
    return NextResponse.json({ error: "Error interno al crear la suscripción." }, { status: 500 });
  }
}
