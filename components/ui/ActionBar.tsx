"use client";

import { Eye, Link2, MapPin, MessageCircle, Pencil, QrCode } from "lucide-react";
import ActionCard from "./ActionCard";

type ActionBarProps = {
  editarHref: string;
  catalogoHref?: string;
  whatsappHref?: string;
  comoLlegarHref?: string;
  onVerCatalogo?: () => void;
  onCopiar?: () => void;
  onDescargarQR?: () => void;
};

export default function ActionBar({
  editarHref,
  catalogoHref,
  whatsappHref,
  comoLlegarHref,
  onVerCatalogo,
  onCopiar,
  onDescargarQR,
}: ActionBarProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ActionCard titulo="Editar perfil" descripcion="Información e identidad" icono={Pencil} href={editarHref} />
      <ActionCard
        titulo="Ver catálogo"
        descripcion="Elegir catálogo para abrir"
        icono={Eye}
        {...(onVerCatalogo ? { onClick: onVerCatalogo } : { href: catalogoHref, target: "_blank" as const })}
        disabled={!catalogoHref}
      />
      <ActionCard titulo="WhatsApp" descripcion="Contactar el negocio" icono={MessageCircle} href={whatsappHref} target="_blank" disabled={!whatsappHref} />
      <ActionCard titulo="Descargar QR" descripcion="Elegir catálogo para imprimir" icono={QrCode} onClick={onDescargarQR} disabled={!catalogoHref} />
      <ActionCard titulo="Cómo llegar" descripcion="Abrir en Maps" icono={MapPin} href={comoLlegarHref} target="_blank" disabled={!comoLlegarHref} />
      <ActionCard titulo="Copiar enlace" descripcion="Elegir catálogo para compartir" icono={Link2} onClick={onCopiar} disabled={!catalogoHref} />
    </section>
  );
}
