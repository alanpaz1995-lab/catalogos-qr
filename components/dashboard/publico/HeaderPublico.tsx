"use client";

import Link from "next/link";

export default function HeaderPublico() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-2xl font-bold text-white shadow-lg">
            C
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              ComerSys
            </h1>

            <p className="text-xs text-slate-500">
              Gestión Comercial Inteligente
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#beneficios"
            className="text-sm font-medium text-slate-600 transition hover:text-[#2563EB]"
          >
            Beneficios
          </a>

          <a
            href="#funciones"
            className="text-sm font-medium text-slate-600 transition hover:text-[#2563EB]"
          >
            Funciones
          </a>

          <a
            href="#planes"
            className="text-sm font-medium text-slate-600 transition hover:text-[#2563EB]"
          >
            Planes
          </a>

          <a
            href="#contacto"
            className="text-sm font-medium text-slate-600 transition hover:text-[#2563EB]"
          >
            Contacto
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/registro"
            className="rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}