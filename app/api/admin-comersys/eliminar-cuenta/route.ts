import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type EmpresaEliminar = {
  id: number;
  nombre: string;
  auth_user_id?: string | null;
  mercado_pago_suscripcion_id?: string | null;
};

type ResultadoCancelacion = {
  ok: boolean;
  entorno?: "produccion" | "prueba";
  yaCancelada?: boolean;
  error?: string;
};

async function intentarCancelarConToken(
  suscripcionId: string,
  accessToken: string,
  entorno: "produccion" | "prueba"
): Promise<ResultadoCancelacion | null> {
  const consulta = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(
      suscripcionId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (consulta.status === 404) {
    return null;
  }

  const textoConsulta = await consulta.text();

  let suscripcion: any;

  try {
    suscripcion = JSON.parse(textoConsulta);
  } catch {
    suscripcion = { raw: textoConsulta };
  }

  if (!consulta.ok) {
    return {
      ok: false,
      entorno,
      error:
        suscripcion?.message ||
        `Mercado Pago respondió ${consulta.status} al consultar la suscripción.`,
    };
  }

  const estado = String(
    suscripcion?.status ?? ""
  ).toLowerCase();

  if (estado === "cancelled") {
    return {
      ok: true,
      entorno,
      yaCancelada: true,
    };
  }

  const cancelacion = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(
      suscripcionId
    )}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        status: "cancelled",
      }),
    }
  );

  const textoCancelacion =
    await cancelacion.text();

  let dataCancelacion: any;

  try {
    dataCancelacion =
      JSON.parse(textoCancelacion);
  } catch {
    dataCancelacion = {
      raw: textoCancelacion,
    };
  }

  if (!cancelacion.ok) {
    return {
      ok: false,
      entorno,
      error:
        dataCancelacion?.message ||
        `Mercado Pago respondió ${cancelacion.status} al cancelar la suscripción.`,
    };
  }

  return {
    ok: true,
    entorno,
  };
}

async function cancelarSuscripcionMercadoPago(
  suscripcionId: string
): Promise<ResultadoCancelacion> {
  const credenciales = [
    {
      entorno: "produccion" as const,
      token:
        process.env.MERCADOPAGO_ACCESS_TOKEN?.trim(),
    },
    {
      entorno: "prueba" as const,
      token:
        process.env.MERCADOPAGO_TEST_ACCESS_TOKEN?.trim(),
    },
  ].filter(
    (
      item
    ): item is {
      entorno: "produccion" | "prueba";
      token: string;
    } => Boolean(item.token)
  );

  if (credenciales.length === 0) {
    return {
      ok: false,
      error:
        "No hay credenciales de Mercado Pago disponibles para cancelar la suscripción.",
    };
  }

  let ultimoError = "";

  for (const credencial of credenciales) {
    const resultado =
      await intentarCancelarConToken(
        suscripcionId,
        credencial.token,
        credencial.entorno
      );

    if (resultado === null) {
      continue;
    }

    if (resultado.ok) {
      return resultado;
    }

    ultimoError =
      resultado.error || ultimoError;
  }

  return {
    ok: false,
    error:
      ultimoError ||
      "No se encontró la suscripción en las cuentas de Mercado Pago configuradas.",
  };
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization") ??
      "";

    const accessTokenUsuario =
      authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    if (!accessTokenUsuario) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: errorUsuario,
    } = await supabaseAdmin.auth.getUser(
      accessTokenUsuario
    );

    if (errorUsuario || !user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo verificar la sesión.",
        },
        { status: 401 }
      );
    }

    const {
      data: superadmin,
      error: errorSuperadmin,
    } = await supabaseAdmin
      .from("superadmins")
      .select("id, activo")
      .eq("auth_user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorSuperadmin) {
      throw new Error(
        `No se pudo verificar el SuperAdmin: ${errorSuperadmin.message}`
      );
    }

    if (!superadmin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Esta acción requiere permisos de SuperAdmin.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const empresaId =
      Number(body?.empresaId);

    const nombreConfirmacion =
      String(
        body?.nombreConfirmacion ?? ""
      ).trim();

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

    const {
      data: empresa,
      error: errorEmpresa,
    } = await supabaseAdmin
      .from("empresas")
      .select(
        "id, nombre, auth_user_id, mercado_pago_suscripcion_id"
      )
      .eq("id", empresaId)
      .maybeSingle<EmpresaEliminar>();

    if (errorEmpresa) {
      throw new Error(
        `No se pudo buscar la empresa: ${errorEmpresa.message}`
      );
    }

    if (!empresa) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La empresa ya no existe.",
        },
        { status: 404 }
      );
    }

    const normalizarNombre = (
      valor: string
    ) =>
      valor
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("es");

    if (
      normalizarNombre(nombreConfirmacion) !==
      normalizarNombre(empresa.nombre)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La confirmación no coincide con el nombre de la empresa.",
        },
        { status: 400 }
      );
    }

    if (
      empresa.auth_user_id &&
      empresa.auth_user_id === user.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No podés eliminar desde aquí la cuenta asociada a tu propio usuario SuperAdmin.",
        },
        { status: 409 }
      );
    }

    let cancelacionMercadoPago:
      | ResultadoCancelacion
      | null = null;

    if (
      empresa.mercado_pago_suscripcion_id
    ) {
      cancelacionMercadoPago =
        await cancelarSuscripcionMercadoPago(
          empresa.mercado_pago_suscripcion_id
        );

      if (!cancelacionMercadoPago.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se eliminó la cuenta porque no se pudo cancelar primero la suscripción de Mercado Pago.",
            detalle:
              cancelacionMercadoPago.error,
          },
          { status: 409 }
        );
      }
    }

    const { error: errorEliminarEmpresa } =
      await supabaseAdmin
        .from("empresas")
        .delete()
        .eq("id", empresa.id);

    if (errorEliminarEmpresa) {
      throw new Error(
        `No se pudo eliminar la empresa: ${errorEliminarEmpresa.message}`
      );
    }

    const { error: errorProductos } =
      await supabaseAdmin
        .from("productos")
        .delete()
        .eq("empresa_id", empresa.id);

    if (errorProductos) {
      console.error(
        "La empresa se eliminó, pero quedaron productos por limpiar:",
        errorProductos
      );

      return NextResponse.json(
        {
          ok: false,
          eliminacionParcial: true,
          error:
            "La empresa fue eliminada, pero no se pudieron limpiar todos sus productos.",
          detalle:
            errorProductos.message,
        },
        { status: 500 }
      );
    }

    if (empresa.auth_user_id) {
      const {
        error: errorEliminarUsuario,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          empresa.auth_user_id
        );

      if (errorEliminarUsuario) {
        console.error(
          "Datos eliminados, pero no se pudo eliminar el usuario Auth:",
          errorEliminarUsuario
        );

        return NextResponse.json(
          {
            ok: false,
            eliminacionParcial: true,
            error:
              "Los datos de la empresa fueron eliminados, pero quedó pendiente eliminar su usuario de acceso.",
            detalle:
              errorEliminarUsuario.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      empresaId: empresa.id,
      empresa: empresa.nombre,
      mercadoPago:
        cancelacionMercadoPago
          ? {
              cancelada: true,
              entorno:
                cancelacionMercadoPago.entorno ??
                null,
              yaCancelada:
                cancelacionMercadoPago.yaCancelada ??
                false,
            }
          : {
              cancelada: false,
              motivo:
                "La empresa no tenía suscripción vinculada.",
            },
      usuarioAuthEliminado:
        Boolean(empresa.auth_user_id),
    });
  } catch (error) {
    console.error(
      "Error eliminando cuenta ComerSys:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la cuenta.",
      },
      { status: 500 }
    );
  }
}