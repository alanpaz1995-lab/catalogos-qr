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
      <span
        className="flex h-11 w-11 items-center justify-center rounded-2xl border transition group-hover:border-slate-300"
        style={{
          backgroundColor: "#f8fafc",
          borderColor: "#e2e8f0",
          color: "#475569",
        }}
      >
        <Icono className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span
          className="block font-black"
          style={{ color: "#020617" }}
        >
          {titulo}
        </span>

        {descripcion && (
          <span
            className="mt-1 block text-xs font-medium leading-5"
            style={{ color: "#334155" }}
          >
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
        style={{ backgroundColor: "#ffffff" }}
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
      style={{ backgroundColor: "#ffffff" }}
    >
      {contenido}
    </button>
  );
}