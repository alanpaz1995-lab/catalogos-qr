"use client";

import Link from "next/link";
import LogoComerSys from "@/components/brand/LogoComerSys";

const enlaces = [
  { texto: "Inicio", href: "#inicio", icono: "⌂" },
  { texto: "Beneficios", href: "#beneficios", icono: "☆" },
  { texto: "Funciones", href: "#funciones", icono: "▦" },
  { texto: "Planes", href: "#planes", icono: "◇" },
  { texto: "Cómo funciona", href: "#como-funciona", icono: "?" },
  { texto: "Contacto", href: "#contacto", icono: "✉" },
];

const accesos = [
  {
    icono: "🛒",
    titulo: "Administrá productos",
    texto: "Stock, precios y categorías",
  },
  {
    icono: "👥",
    titulo: "Gestioná clientes",
    texto: "Historial y cuentas corrientes",
  },
  {
    icono: "📋",
    titulo: "Controlá pedidos",
    texto: "Estados y seguimiento",
  },
  {
    icono: "📊",
    titulo: "Control de caja",
    texto: "Ingresos, egresos y ganancias",
  },
  {
    icono: "▦",
    titulo: "Tu catálogo online",
    texto: "Compartilo con código QR",
  },
];

export default function HeaderPublico() {
  return (
    <header
      id="inicio"
      className="bg-[#F8FAFC] px-4 pt-4 sm:px-6"
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="relative overflow-hidden rounded-t-[26px] border border-slate-800 bg-[#020817] shadow-[0_20px_55px_rgba(15,23,42,0.18)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(124,58,237,0.30),transparent_32%)]" />

          <div className="pointer-events-none absolute -bottom-10 left-[5%] h-20 w-[90%] rounded-[50%] border-t-2 border-cyan-400/70 shadow-[0_-5px_22px_rgba(14,165,233,0.8)]" />

          <div className="relative flex flex-col gap-5 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <Link
              href="/"
              aria-label="Ir al inicio de ComerSyS"
              className="flex shrink-0 items-center gap-4"
            >
              <div className="overflow-hidden rounded-[18px] border border-white/30 bg-black shadow-[0_0_24px_rgba(14,165,233,0.22)]">
                <LogoComerSys
                  variante="icono"
                  ancho={72}
                  alto={72}
                  conLink={false}
                />
              </div>

              <div>
                <p className="whitespace-nowrap text-3xl font-black leading-none tracking-tight text-white sm:text-4xl">
                  Comer<span className="text-sky-400">SyS</span>
                </p>

                <p className="mt-2 whitespace-nowrap text-xs font-semibold text-slate-300 sm:text-sm">
                  Gestión Comercial Inteligente
                </p>
              </div>
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-5 xl:flex-row xl:items-center xl:justify-end">
              <nav
                aria-label="Navegación principal"
                className="flex flex-wrap items-center justify-center gap-1"
              >
                {enlaces.map((enlace) => (
                  <a
                    key={enlace.href}
                    href={enlace.href}
                    className="group flex min-w-[76px] flex-col items-center justify-center rounded-xl px-3 py-2 text-center text-[11px] font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <span className="mb-1 text-lg text-white transition group-hover:text-sky-400">
                      {enlace.icono}
                    </span>
                    {enlace.texto}
                  </a>
                ))}
              </nav>

              <div className="flex shrink-0 items-center justify-center gap-3 border-white/10 xl:border-l xl:pl-5">
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/40 bg-white/5 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  ↪ Iniciar sesión
                </Link>

                <Link
                  href="/registro"
                  className="rounded-2xl bg-gradient-to-r from-[#008CFF] to-[#7412F4] px-5 py-3 text-sm font-black text-white shadow-[0_8px_28px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5"
                >
                  🚀 Probar 7 días gratis
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-b-[26px] border-x border-b border-slate-200 bg-white px-3 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:grid-cols-2 lg:grid-cols-5">
          {accesos.map((acceso, index) => (
            <div
              key={acceso.titulo}
              className={`flex items-center gap-3 px-4 py-3 ${
                index !== accesos.length - 1
                  ? "lg:border-r lg:border-slate-200"
                  : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl text-blue-600">
                {acceso.icono}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-slate-950">
                  {acceso.titulo}
                </p>

                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  {acceso.texto}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}