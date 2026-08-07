export interface Producto {
  id: number;
  empresa_id: number;

  nombre: string;
  categoria?: string | null;

  precio: number;
  precio_mayorista?: number | null;
  cantidad_minima_mayorista?: number | null;

  stock?: number | null;
  stock_minimo?: number | null;
  controlar_stock?: boolean | null;

  descripcion?: string | null;
  imaguen?: string | null;

  estado?: string | null;
  visible_catalogo?: boolean | null;
  nuevo_ingreso?: boolean | null;
  oferta?: boolean | null;
  destacado?: boolean | null;

  created_at?: string;
  updated_at?: string;
  actualizado_at?: string | null;
}