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

function AccesoConTecla({
  tecla,
  children,
}: {
  tecla: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      {children}
      <span
        aria-label={`Atajo de teclado ${tecla}`}
        title={`Atajo: ${tecla}`}
        className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-slate-300/70 bg-white/75 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-slate-500 opacity-80 shadow-sm backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-300"
      >
        {tecla}
      </span>
    </div>
  );
}

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
      <AccesoConTecla tecla="F2">
        <ActionCard titulo="Editar perfil" descripcion="Información e identidad" icono={Pencil} href={editarHref} />
      </AccesoConTecla>
      <AccesoConTecla tecla="F3">
        <ActionCard
          titulo="Ver catálogo"
          descripcion="Elegir catálogo para abrir"
          icono={Eye}
          {...(onVerCatalogo ? { onClick: onVerCatalogo } : { href: catalogoHref, target: "_blank" as const })}
          disabled={!catalogoHref}
        />
      </AccesoConTecla>
      <ActionCard titulo="WhatsApp" descripcion="Contactar el negocio" icono={MessageCircle} href={whatsappHref} target="_blank" disabled={!whatsappHref} />
      <ActionCard titulo="Descargar QR" descripcion="Elegir catálogo para imprimir" icono={QrCode} onClick={onDescargarQR} disabled={!catalogoHref} />
      <ActionCard titulo="Cómo llegar" descripcion="Abrir en Maps" icono={MapPin} href={comoLlegarHref} target="_blank" disabled={!comoLlegarHref} />
      <AccesoConTecla tecla="F4">
        <ActionCard titulo="Copiar enlace" descripcion="Elegir catálogo para compartir" icono={Link2} onClick={onCopiar} disabled={!catalogoHref} />
      </AccesoConTecla>
    </section>
  );
}
