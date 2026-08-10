"use client";

import Link from "next/link";
import LogoComerSys from "@/components/brand/LogoComerSys";

const enlaces = [
  { texto: "Beneficios", href: "#beneficios", icono: "☆" },
  { texto: "Funciones", href: "#funciones", icono: "▦" },
  { texto: "Contacto", href: "#contacto", icono: "✉" },
  { texto: "Planes", href: "#planes", icono: "◇" },
  { texto: "Cómo funciona", href: "#como-funciona", icono: "?" },
];

export default function HeaderPublico() {
  return (
    <header className="bg-white px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col bg-gradient-to-r from-[#0868F7] via-[#4C49F4] to-[#7412F4] md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4 px-5 py-4 sm:px-8">
            <div className="shrink-0 overflow-hidden rounded-[18px] bg-black">
              <LogoComerSys
                variante="icono"
                ancho={86}
                alto={86}
                conLink={false}
              />
            </div>

            <Link
              href="/"
              aria-label="Ir al inicio de ComerSys"
              className="min-w-0"
            >
              <p className="whitespace-nowrap text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
                ComerSys
              </p>

              <p className="mt-2 whitespace-nowrap text-sm font-bold text-white sm:text-xl">
                Gestión Comercial Inteligente
              </p>
            </Link>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/20 px-5 py-5 md:border-l md:border-t-0 md:px-7">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-slate-100 sm:text-base"
            >
              ↪ Iniciar sesión
            </Link>

            <Link
              href="/registro"
              className="rounded-2xl bg-[#0B8AFB] px-6 py-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-500 sm:text-base"
            >
              🚀 Probar 7 días gratis
            </Link>
          </div>
        </div>

        <nav
          aria-label="Navegación principal"
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 sm:gap-x-14"
        >
          {enlaces.map((enlace) => (
            <a
              key={enlace.href}
              href={enlace.href}
              className="inline-flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-900 transition hover:bg-blue-50 hover:text-[#2563EB] sm:text-base"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xl font-black text-slate-900">
                {enlace.icono}
              </span>
              {enlace.texto}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}