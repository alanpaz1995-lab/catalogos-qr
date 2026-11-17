import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401, headers });
  }

  try {
    // getUser comprueba el JWT con Supabase Auth; no confiamos en un ID del cliente.
    const { data: { user }, error: errorUsuario } = await supabaseAdmin.auth.getUser(token);
    if (errorUsuario || !user) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401, headers });
    }

    // Los dos requisitos deben cumplirse para la misma cuenta autenticada.
    const [superadmin, empresa] = await Promise.all([
      supabaseAdmin.from("superadmins")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("activo", true)
        .maybeSingle(),
      supabaseAdmin.from("empresas")
        .select("id")
        .eq("id", 1)
        .eq("auth_user_id", user.id)
        .maybeSingle(),
    ]);

    if (superadmin.error || empresa.error) {
      console.error("Error verificando acceso a catálogos externos", {
        superadmin: superadmin.error?.message,
        empresa: empresa.error?.message,
      });
      return NextResponse.json({ error: "No se pudo verificar el acceso." }, { status: 500, headers });
    }

    if (!superadmin.data || !empresa.data) {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403, headers });
    }

    return NextResponse.json({ autorizado: true }, { status: 200, headers });
  } catch (error) {
    console.error("Error inesperado verificando acceso a catálogos externos:", error);
    return NextResponse.json({ error: "No se pudo verificar el acceso." }, { status: 500, headers });
  }
}
