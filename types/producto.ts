export interface Producto {
  id: number;
  empresa_id: number;

  nombre: string;
  categoria?: string | null;

  precio: number;
  stock?: number | null;

  descripcion?: string | null;
  imaguen?: string | null;

  estado?: string | null;

  created_at?: string;
  updated_at?: string;
}