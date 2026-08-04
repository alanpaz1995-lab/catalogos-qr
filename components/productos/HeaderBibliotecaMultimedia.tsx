"use client";

import Link from "next/link";

type HeaderBibliotecaMultimediaProps = {
  totalImagenes: number;
};

export default function HeaderBibliotecaMultimedia({
  totalImagenes,
}: HeaderBibliotecaMultimediaProps) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Link
          href="/admin/productos"
          className="font-semibold text-[#2563EB]"
        >
          ← Volver a Productos
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
          Multimedia PRO
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          Biblioteca Multimedia
        </h1>

        <p className="mt-3 max-w-2xl text-slate-500 leading-7">
          Administrá todas las imágenes de tus productos
          desde un único lugar. Buscá archivos, revisá qué
          producto las utiliza y accedé rápidamente a su
          galería.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">
          Imágenes almacenadas
        </p>

        <p className="mt-2 text-4xl font-bold text-[#2563EB]">
          {totalImagenes}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Biblioteca general
        </p>
      </div>
    </header>
  );
}