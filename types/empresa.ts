export interface Empresa {
  id: number;

  nombre: string;

  slug: string;

  descripcion?: string | null;

  rubro?: string | null;

  whatsapp?: string | null;

  email?: string | null;

  telefono?: string | null;

  sitio_web?: string | null;

  instagram?: string | null;

  facebook?: string | null;

  tiktok?: string | null;

  logo?: string | null;

  portada?: string | null;

  direccion?: string | null;

  ciudad?: string | null;

  provincia?: string | null;

  codigo_postal?: string | null;

  latitud?: number | null;

  longitud?: number | null;

  horarios_semana?: string | null;

  color_principal?: string | null;

  color_secundario?: string | null;

  catalogo_activo?: boolean;

  permitir_compras?: boolean;

  permitir_registro_clientes?: boolean;

  mostrar_precios?: boolean;

  mostrar_stock?: boolean;

  pedido_por_whatsapp?: boolean;

  qr_catalogo_url?: string | null;

  estado?: string | null;

  created_at?: string;

  updated_at?: string;

  auth_user_id?: string | null;
}