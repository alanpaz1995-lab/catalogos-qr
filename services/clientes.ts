import { supabase } from "@/lib/supabase";
import type { Cliente } from "@/types/cliente";

export type NuevoCliente = {
  empresa_id: number;
  nombre: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  activo?: boolean;
};

export async function crearCliente(
  datos: NuevoCliente
): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      empresa_id: datos.empresa_id,
      nombre: datos.nombre.trim(),
      telefono: datos.telefono.trim(),
      email: datos.email?.trim() || null,
      direccion: datos.direccion?.trim() || null,
      observaciones:
        datos.observaciones?.trim() || null,
      activo: datos.activo ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Cliente;
}