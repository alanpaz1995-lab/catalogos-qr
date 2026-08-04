"use client";

import Link from "next/link";
import type { MultimediaProducto } from "./GaleriaMultimedia";

type TarjetaBibliotecaMultimediaProps = {
  item: MultimediaProducto & {
    producto_nombre: string;
  };
};

export default function TarjetaBibliotecaMultimedia({
  item,
}: TarjetaBibliotecaMultimediaProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative bg-slate-100">
        <img
          src={item.url}
          alt={
            item.descripcion ||
            item.nombre_archivo ||
            item.producto_nombre
          }
          className="h-56 w-full object-contain"
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {item.es_principal && (
            <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow">
              ⭐ Principal
            </span>
          )}

          <span className="rounded-full bg-slate-900/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {item.tipo}
          </span>
        </div>
      </div>

      <div className="p-5">
        <p
          className="truncate text-lg font-bold"
          title={item.producto_nombre}
        >
          {item.producto_nombre}
        </p>

        <p
          className="mt-2 truncate text-sm text-slate-500"
          title={
            item.nombre_archivo ||
            "Imagen del producto"
          }
        >
          {item.nombre_archivo ||
            "Imagen del producto"}
        </p>

        {item.descripcion && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
            {item.descripcion}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <Link
            href={`/admin/productos/${item.producto_id}/multimedia`}
            className="flex-1 rounded-xl bg-[#2563EB] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Abrir galería
          </Link>

          <Link
            href={`/admin/productos/editar/${item.producto_id}`}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold transition hover:bg-slate-100"
          >
            Editar
          </Link>
        </div>
      </div>
    </article>
  );
}