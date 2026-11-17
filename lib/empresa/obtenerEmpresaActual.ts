
import { supabase } from "@/lib/supabase";
import type { Empresa } from "@/types/empresa";

export async function obtenerEmpresaActual(): Promise<Empresa> {
  const {
    data: { session },
    error: errorSesion,
  } = await supabase.auth.getSession();

  if (errorSesion || !session?.access_token) {
    throw new Error(
      "Tu sesión no está activa. Iniciá sesión nuevamente."
    );
  }

  const respuesta = await fetch("/api/empresa/dashboard", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  });

  const resultado: {
    ok?: boolean;
    empresa?: Empresa;
    error?: string;
  } = await respuesta.json();

  if (!respuesta.ok || resultado.ok !== true || !resultado.empresa) {
    throw new Error(
      resultado.error || "No se pudo cargar la empresa."
    );
  }

  return resultado.empresa;
}
