import { supabase } from "@/lib/supabase";
import type { Empresa } from "@/types/empresa";

export async function obtenerEmpresaActual(): Promise<Empresa> {
  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario) {
    throw new Error(
      `No se pudo verificar la sesión: ${errorUsuario.message}`
    );
  }

  if (!user) {
    throw new Error(
      "Tu sesión no está activa. Iniciá sesión nuevamente."
    );
  }

  const {
    data: empresa,
    error: errorEmpresa,
  } = await supabase
    .from("empresas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (errorEmpresa) {
    throw new Error(
      `No se pudo cargar la empresa: ${errorEmpresa.message}`
    );
  }

  if (!empresa) {
    throw new Error(
      "No encontramos una empresa asociada a tu cuenta."
    );
  }

  return empresa as Empresa;
}