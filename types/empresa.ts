export interface Empresa {
  id: number;

  nombre: string;

  slug: string;

  descripcion?: string | null;

  whatsapp?: string | null;

  logo?: string | null;

  estado?: string | null;

  created_at?: string;
}