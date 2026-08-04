export interface Categoria {
  id: number;

  empresa_id: number;

  nombre: string;

  descripcion?: string | null;

  created_at?: string;
}