import { supabase } from "@/lib/supabase";

export interface CrearPedidoInput {
  empresaId: number;
  nombre: string;
  telefono: string;
  direccion?: string;
  observaciones?: string;
  items: {
    producto_id: number;
    cantidad: number;
  }[];
}

export interface CrearPedidoResultado {
  pedido_id: number;
  numero_pedido: number;
  total_pedido: number;
}

export async function crearPedido(
  datos: CrearPedidoInput
): Promise<CrearPedidoResultado> {
  const { data, error } = await supabase.rpc(
    "crear_pedido_catalogo",
    {
      p_empresa_id: datos.empresaId,
      p_cliente_nombre: datos.nombre,
      p_cliente_telefono: datos.telefono,
      p_cliente_direccion: datos.direccion ?? "",
      p_observaciones: datos.observaciones ?? "",
      p_items: datos.items,
    }
  );

  if (error) {
    console.error("Error de Supabase al crear pedido:", error);
    throw new Error(error.message);
  }

  const resultado = Array.isArray(data) ? data[0] : data;

  if (!resultado) {
    throw new Error(
      "Supabase no devolvió los datos del pedido."
    );
  }

  return {
    pedido_id: Number(resultado.pedido_id),
    numero_pedido: Number(resultado.numero_pedido),
    total_pedido: Number(resultado.total_pedido),
  };
}