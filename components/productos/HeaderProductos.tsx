"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    function manejarAtajos(event: KeyboardEvent) {
      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.repeat) return;

      const tecla = event.key.toLowerCase();
      if (tecla !== "n" && tecla !== "e" && tecla !== "l") return;

      const objetivo = event.target;
      if (
        objetivo instanceof HTMLElement &&
        (objetivo.isContentEditable ||
          Boolean(objetivo.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')))
      ) return;

      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;

      event.preventDefault();
      if (tecla === "n") router.push("/admin/productos/nuevo");
      if (tecla === "e") router.push("/admin/categorias");
      if (tecla === "l") router.push("/admin/listas-catalogos");
    }

    window.addEventListener("keydown", manejarAtajos);
    return () => window.removeEventListener("keydown", manejarAtajos);
  }, [router]);

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
              Administrá stock, precios, catálogo, imágenes y ofertas desde un solo lugar.
            </p>

            <div className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              {totalProductos} producto(s) registrados
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:min-w-[420px]">
            <Link
              href="/admin/productos/nuevo"
              className="flex min-h-[76px] items-center justify-between gap-2 rounded-2xl bg-[#F97316] px-4 py-4 font-semibold text-white shadow-sm transition hover:bg-orange-600 sm:px-5"
            >
              <span>➕ Crear producto</span>
              <span className="shrink-0 text-xs font-medium text-white/85">Ctrl + N</span>
            </Link>

            <Link
              href="/admin/categorias"
              className="flex min-h-[76px] items-center justify-between gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-4 font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:px-5"
            >
              <span>🏷️ Categorías</span>
              <span className="shrink-0 text-xs font-medium text-white/80">Ctrl + E</span>
            </Link>

            <Link
              href="/admin/listas-catalogos"
              className="flex min-h-[76px] items-center justify-between gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-4 font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:px-5"
            >
              <span>📋 Listas de catálogos</span>
              <span className="shrink-0 text-xs font-medium text-white/80">Ctrl + L</span>
            </Link>

            <button
              type="button"
              disabled={cargando}
              onClick={onActualizar}
              className="flex min-h-[76px] items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-4 font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
            >
              {cargando ? "Actualizando..." : "↻ Actualizar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 text-sm sm:grid-cols-2 sm:px-8">
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
      <span className="text-2xl">{icono}</span>

      <div>
        <p className="font-bold text-slate-800">{titulo}</p>
        <p className="mt-1 leading-5 text-slate-500">{detalle}</p>
      </div>
    </div>
  );
}
