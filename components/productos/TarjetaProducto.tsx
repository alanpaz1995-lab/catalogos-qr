"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ProductoListado,
  CampoBooleanoProducto,
  ListaPrecioCatalogo,
  PrecioProductoLista,
} from "@/components/productos/TablaProductos";

type Props = {
  producto: ProductoListado;
  listasPrecio: ListaPrecioCatalogo[];
  preciosLista: Record<number, PrecioProductoLista>;
  actualizando: boolean;
  eliminando: boolean;
  onActualizarCampo: (producto: ProductoListado, campo: CampoBooleanoProducto) => void;
  onCambiarEstado: (producto: ProductoListado) => void;
  onEliminar: (producto: ProductoListado) => void;
};

export default function TarjetaProducto({
  producto,
  listasPrecio,
  preciosLista,
  actualizando,
  eliminando,
  onActualizarCampo,
  onCambiarEstado,
  onEliminar,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const idOpciones = `opciones-producto-${producto.id}`;
  const stock = Number(producto.stock || 0);
  const minimo = Number(producto.stock_minimo || 0);
  const stockTexto = stock <= 0 ? "Sin stock" : stock <= minimo ? "Stock bajo" : "Stock correcto";
  const stockEstilo = stock <= 0
    ? "bg-red-100 text-red-700"
    : stock <= minimo
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700";

  const precios = [
    {
      id: "general",
      nombre: "Lista General",
      minorista: producto.precio,
      mayorista: producto.precio_mayorista ?? null,
    },
    ...listasPrecio.map((lista) => {
      const registro = preciosLista[lista.id];
      return {
        id: String(lista.id),
        nombre: lista.nombre,
        minorista: registro?.visible ? registro.precio_minorista : null,
        mayorista: registro?.visible ? registro.precio_mayorista : null,
      };
    }),
  ];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {producto.imaguen ? (
          <img
            src={producto.imaguen}
            alt={producto.nombre}
            className="h-full w-full object-cover"
          />
        ) : (
          <Link
            href={`/admin/productos/${producto.id}/multimedia`}
            className="flex h-full w-full flex-col items-center justify-center text-slate-500 transition hover:bg-blue-50"
          >
            <span className="text-5xl">📷</span>
            <span className="mt-3 text-sm font-semibold">Agregar imagen</span>
          </Link>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {producto.nuevo_ingreso && <Etiqueta texto="Nuevo" clases="bg-blue-600 text-white" />}
          {producto.oferta && <Etiqueta texto="Oferta" clases="bg-red-600 text-white" />}
          {producto.destacado && <Etiqueta texto="Destacado" clases="bg-violet-600 text-white" />}
        </div>
        {!producto.visible_catalogo && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            Oculto
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
          {producto.categoria || "Sin categoría"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-lg font-bold text-slate-900">
          {producto.nombre}
        </h3>
        {producto.descripcion && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {producto.descripcion}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Etiqueta texto={stockTexto} clases={stockEstilo} />
          <Etiqueta texto={`Stock: ${stock}`} clases="bg-slate-100 text-slate-600" />
          <Etiqueta
            texto={producto.estado}
            clases={producto.estado === "Activo" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}
          />
        </div>

        <div className="mt-4 flex-1 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Precios por catálogo
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {precios.map((precio) => (
              <div
                key={precio.id}
                className="min-w-[150px] flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="truncate text-sm font-bold text-slate-900" title={precio.nombre}>
                  {precio.nombre}
                </p>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-[11px] text-slate-500">Minorista</p>
                    <p className="text-sm font-bold text-slate-900">{dinero(precio.minorista)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Mayorista</p>
                    <p className="text-sm font-bold text-slate-900">{dinero(precio.mayorista)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            aria-label={abierto ? `Ocultar opciones de ${producto.nombre}` : `Mostrar opciones de ${producto.nombre}`}
            aria-expanded={abierto}
            aria-controls={idOpciones}
            title={abierto ? "Ocultar opciones" : "Mostrar opciones"}
            onClick={() => setAbierto((valor) => !valor)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 transition hover:bg-blue-100 hover:text-blue-700"
          >
            <span aria-hidden="true">{abierto ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {abierto && (
          <div id={idOpciones} className="mt-4 border-t border-slate-200 pt-4">
            <p className="mb-3 text-xs font-semibold text-slate-500">Stock mínimo: {minimo}</p>
            <div className="grid grid-cols-2 gap-2">
              <BotonEstado activo={producto.nuevo_ingreso} texto="🆕 Nuevo" disabled={actualizando} onClick={() => onActualizarCampo(producto, "nuevo_ingreso")} />
              <BotonEstado activo={producto.oferta} texto="🔥 Oferta" disabled={actualizando} onClick={() => onActualizarCampo(producto, "oferta")} />
              <BotonEstado activo={producto.destacado} texto="⭐ Destacado" disabled={actualizando} onClick={() => onActualizarCampo(producto, "destacado")} />
              <BotonEstado activo={producto.visible_catalogo} texto={producto.visible_catalogo ? "👁 Visible" : "🚫 Oculto"} disabled={actualizando} onClick={() => onActualizarCampo(producto, "visible_catalogo")} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/admin/productos/editar/${producto.id}`} className="rounded-xl bg-[#2563EB] px-3 py-2.5 text-center text-sm font-semibold text-white">Editar</Link>
              <Link href={`/admin/productos/${producto.id}/multimedia`} className="rounded-xl border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold">Multimedia</Link>
              <Link href={`/admin/productos/${producto.id}/ia`} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-center text-sm font-semibold text-violet-700">IA</Link>
              <Link href={`/admin/productos/${producto.id}/marketing`} className="rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-center text-sm font-semibold text-pink-700">Marketing</Link>
              <button type="button" disabled={actualizando} onClick={() => onCambiarEstado(producto)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold disabled:opacity-50">{producto.estado === "Activo" ? "Desactivar" : "Activar"}</button>
              <button type="button" disabled={eliminando} onClick={() => onEliminar(producto)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">{eliminando ? "Eliminando..." : "Eliminar"}</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function Etiqueta({ texto, clases }: { texto: string; clases: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${clases}`}>{texto}</span>;
}

function BotonEstado({ activo, texto, disabled, onClick }: {
  activo: boolean;
  texto: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${activo ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600"}`}
    >
      {texto}
    </button>
  );
}

function dinero(precio: number | null | undefined) {
  return precio == null || !Number.isFinite(Number(precio))
    ? "Sin precio"
    : new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
      }).format(Number(precio));
}
