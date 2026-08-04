"use client";

import Link from "next/link";
import LogoComerSys from "@/components/brand/LogoComerSys";

const enlaces = [
  { texto: "Beneficios", href: "#beneficios" },
  { texto: "Funciones", href: "#funciones" },
  { texto: "Contacto", href: "#contacto" },
  { texto: "Planes", href: "#planes" },
  { texto: "Cómo funciona", href: "#como-funciona" },
];

export default function HeaderPublico() {
  return (
    <header className="bg-white px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#2563EB] to-violet-600 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 sm:gap-6 sm:px-7">
              <div className="shrink-0 overflow-hidden rounded-[1.5rem]">
                <LogoComerSys
                  variante="icono"
                  ancho={112}
                  alto={112}
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

                <p className="mt-3 whitespace-nowrap text-sm font-black text-slate-950 sm:text-xl">
                  Gestión Comercial Inteligente
                </p>
              </Link>
            </div>

            <div className="flex shrink-0 items-center justify-center gap-4 border-t border-white/20 px-5 py-5 md:border-l md:border-t-0 md:px-7">
              <Link
                href="/login"
                className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-slate-100 sm:text-base"
              >
                Iniciar sesión
              </Link>

              <Link
                href="/registro"
                className="rounded-2xl bg-blue-500 px-6 py-4 text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-blue-400 sm:text-base"
              >
                Probar 7 días
              </Link>
            </div>
          </div>
        </div>

        <nav
          aria-label="Navegación principal"
          className="mt-6 flex flex-wrap justify-center gap-4"
        >
          {enlaces.map((enlace) => (
            <a
              key={enlace.href}
              href={enlace.href}
              className="min-w-32 rounded-xl border-2 border-slate-900 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563EB] hover:bg-blue-50 hover:text-[#2563EB]"
            >
              {enlace.texto}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}