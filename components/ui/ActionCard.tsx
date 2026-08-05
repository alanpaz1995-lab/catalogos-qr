"use client";

import Link from "next/link";
import type {
  LucideIcon,
} from "lucide-react";

type ActionCardProps = {
  titulo: string;
  descripcion?: string;
  icono: LucideIcon;
  href?: string;
  onClick?: () => void;
  target?: "_blank" | "_self";
  disabled?: boolean;
};

export default function ActionCard({
  titulo,
  descripcion,
  icono: Icono,
  href,
  onClick,
  target = "_self",
  disabled = false,
}: ActionCardProps) {
  const contenido = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-700">
        <Icono className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span className="block font-black text-slate-800">
          {titulo}
        </span>

        {descripcion && (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {descripcion}
          </span>
        )}
      </span>
    </>
  );

  const clases =
    "group flex min-h-[92px] w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-left shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50";

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={
          target === "_blank"
            ? "noreferrer"
            : undefined
        }
        className={clases}
        aria-disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
          }
        }}
      >
        {contenido}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clases}
    >
      {contenido}
    </button>
  );
}