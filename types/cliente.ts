export interface Cliente {
  id: number;

  empresa_id: number;

  nombre: string;

  telefono: string;

  email?: string | null;

  direccion?: string | null;

  observaciones?: string | null;

  activo: boolean;

  created_at?: string;

  updated_at?: string;
}