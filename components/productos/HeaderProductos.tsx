"use client";

import Link from "next/link";

type HeaderProductosProps = {
  totalProductos: number;
  cargando?: boolean;
  onActualizar: () => void;
};

export default function HeaderProductos({
  totalProductos,
  cargando = false,
  onActualizar,
}: HeaderProductosProps) {
  return (
    <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-violet-700 px-6 py-8 text-white sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">
              Productos PRO
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Centro de productos
            </h1>

            <p className="mt-3 max-w-2xl text-blue-100">
              Administrá stock, precios, catálogo, imágenes,
              ofertas y herramientas de IA desde un solo lugar.
            </p>

            <div className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              {totalProductos} producto(s) registrados
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <Link
              href="/admin/productos/nuevo"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-center font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              ➕ Nuevo producto
            </Link>

            <Link
              href="/admin/productos/nuevo/ia"
              className="rounded-xl bg-[#F97316] px-5 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
            >
              🤖 Crear con IA
            </Link>

            <Link
              href="/admin/categorias"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-center font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              🏷️ Categorías
            </Link>

            <button
              type="button"
              disabled={cargando}
              onClick={onActualizar}
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando
                ? "Actualizando..."
                : "↻ Actualizar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 text-sm sm:grid-cols-3 sm:px-8">
        <DatoRapido
          icono="📦"
          titulo="Catálogo"
          detalle="Controlá visibilidad, ofertas y destacados."
        />

        <DatoRapido
          icono="📊"
          titulo="Stock"
          detalle="Detectá productos con stock bajo o agotado."
        />

        <DatoRapido
          icono="✨"
          titulo="IA Comercial"
          detalle="Mejorá títulos, descripciones y publicaciones."
        />
      </div>
    </header>
  );
}

function DatoRapido({
  icono,
  titulo,
  detalle,
}: {
  icono: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <span className="text-2xl">
        {icono}
      </span>

      <div>
        <p className="font-bold text-slate-800">
          {titulo}
        </p>

        <p className="mt-1 leading-5 text-slate-500">
          {detalle}
        </p>
      </div>
    </div>
  );
}