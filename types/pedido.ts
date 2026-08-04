import { Producto } from "./producto";

export interface ItemPedido {
  producto: Producto;
  cantidad: number;
}

export interface Pedido {
  id: number;
  empresa_id: number;

  cliente_id?: number | null;

  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion?: string | null;
  observaciones?: string | null;

  subtotal: number;
  costo_envio?: number;
  descuento?: number;
  total: number;

  estado: string;
  estado_pago: string;
  metodo_pago?: string | null;
  metodo_entrega?: string | null;
  origen: string;

  numero?: number;
  created_at?: string;
  updated_at?: string;
}