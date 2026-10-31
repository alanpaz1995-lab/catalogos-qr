"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ProductoListado = {
  id: number;
  empresa_id: number;
  nombre: string;
  colores?: string[] | null;
  codigo?: string | null;
  categoria?: string | null;
  precio: number;
  precio_mayorista?: number | null;
  stock: number;
  stock_minimo: number;
  descripcion?: string | null;
  imaguen?: string | null;
  estado: string;
  destacado: boolean;
  nuevo_ingreso: boolean;
  oferta: boolean;
  visible_catalogo: boolean;
  created_at: string;
  actualizado_at?: string | null;
};
export type CampoBooleanoProducto = "destacado" | "nuevo_ingreso" | "oferta" | "visible_catalogo";
export type ListaPrecioCatalogo = { id: number; nombre: string };
export type PrecioProductoLista = {
  precio_minorista: number | null;
  precio_mayorista: number | null;
  visible: boolean;
};

type Props = {
  productos: ProductoListado[];
  listasPrecio: ListaPrecioCatalogo[];
  preciosPorProducto: Record<number, Record<number, PrecioProductoLista>>;
  cargando: boolean;
  actualizandoId: number | null;
  eliminandoId: number | null;
  onActualizarCampo: (producto: ProductoListado, campo: CampoBooleanoProducto) => void;
  onCambiarEstado: (producto: ProductoListado) => void;
  onEliminar: (producto: ProductoListado) => void;
};

export default function TablaProductos({
  productos, listasPrecio, preciosPorProducto, cargando, actualizandoId,
  eliminandoId, onActualizarCampo, onCambiarEstado, onEliminar,
}: Props) {
  // Un único listado de colores por empresa, incluidos los colores personalizados.
  const empresaId = productos[0]?.empresa_id;
  const [hexPorNombre, setHexPorNombre] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!empresaId) {
      return;
    }
    let vigente = true;
    // Vaciar el mapa anterior para no mostrar colores de otra empresa.
    setHexPorNombre({});
    void (async () => {
      const { data, error } = await supabase
        .from("colores_empresa")
        .select("nombre, codigo_hex")
        .eq("empresa_id", empresaId);
      if (!vigente) return;
      if (error) {
        console.error("No se pudieron consultar los colores de la empresa:", error);
        return;
      }
      const mapa: Record<string, string> = {};
      for (const fila of data || []) {
        if (typeof fila.nombre !== "string" || typeof fila.codigo_hex !== "string") continue;
        if (!/^#[0-9a-fA-F]{6}$/.test(fila.codigo_hex)) continue;
        mapa[normalizarNombreColor(fila.nombre)] = fila.codigo_hex;
      }
      setHexPorNombre(mapa);
    })();
    return () => { vigente = false; };
  }, [empresaId]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Lista de productos</h2>
          <p className="mt-1 text-sm text-slate-500">{productos.length} producto(s) encontrados</p>
        </div>
        <Link href="/admin/productos/multimedia" className="text-sm font-semibold text-[#2563EB]">Abrir biblioteca multimedia →</Link>
      </div>
      {cargando ? <div className="p-12 text-center text-slate-500">Cargando productos y precios...</div>
        : productos.length === 0 ? <div className="p-12 text-center text-slate-500">No se encontraron productos. Probá con otra búsqueda o filtro.</div>
        : <div className="divide-y divide-slate-100">
            {productos.map((producto) => (
              <FilaProducto key={producto.id} producto={producto} hexPorNombre={hexPorNombre} listasPrecio={listasPrecio}
                preciosLista={preciosPorProducto[producto.id] || {}}
                actualizando={actualizandoId === producto.id}
                eliminando={eliminandoId === producto.id}
                onActualizarCampo={onActualizarCampo}
                onCambiarEstado={onCambiarEstado}
                onEliminar={onEliminar} />
            ))}
          </div>}
    </section>
  );
}

function FilaProducto({ producto, hexPorNombre, listasPrecio, preciosLista, actualizando, eliminando,
  onActualizarCampo, onCambiarEstado, onEliminar,
}: {
  producto: ProductoListado;
  hexPorNombre: Record<string, string>;
  listasPrecio: ListaPrecioCatalogo[];
  preciosLista: Record<number, PrecioProductoLista>;
  actualizando: boolean;
  eliminando: boolean;
  onActualizarCampo: Props["onActualizarCampo"];
  onCambiarEstado: Props["onCambiarEstado"];
  onEliminar: Props["onEliminar"];
}) {
  const [abierto, setAbierto] = useState(false);
  const idOpciones = `opciones-producto-${producto.id}`;
  const colores = Array.isArray(producto.colores)
    ? producto.colores.filter((color): color is string => typeof color === "string" && color.trim().length > 0)
    : [];
  const stock = Number(producto.stock || 0);
  const minimo = Number(producto.stock_minimo || 0);
  const stockTexto = stock <= 0 ? "Sin stock" : stock <= minimo ? "Stock bajo" : "Stock correcto";
  const stockEstilo = stock <= 0 ? "bg-red-100 text-red-700" : stock <= minimo ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

  const precios = [
    { id: "general", nombre: "Lista General", minorista: producto.precio, mayorista: producto.precio_mayorista ?? null, visible: true },
    ...listasPrecio.map((lista) => {
      const registro = preciosLista[lista.id];
      return {
        id: String(lista.id), nombre: lista.nombre,
        minorista: registro?.visible ? registro.precio_minorista : null,
        mayorista: registro?.visible ? registro.precio_mayorista : null,
        visible: registro?.visible === true,
      };
    }),
  ];

  return (
    <article className="px-4 py-3 transition hover:bg-slate-50 sm:px-5">
      <div
        className="flex cursor-pointer flex-col gap-3 xl:flex-row xl:items-center"
        title={abierto ? "Hacé clic para ocultar las opciones" : "Hacé clic para mostrar las opciones"}
        onClick={(event) => {
          // Los enlaces y controles conservan su propio comportamiento.
          // La flecha de desplegar no debe abrir y cerrar dos veces.
          const objetivo = event.target;
          if (objetivo instanceof Element && objetivo.closest("a, button, input, select, textarea, [role='button']")) {
            return;
          }
          setAbierto((valor) => !valor);
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 xl:basis-[47%]">
          {producto.imaguen ? (
            <img src={producto.imaguen} alt={producto.nombre} className="h-20 w-20 shrink-0 rounded-2xl border border-slate-200 object-cover sm:h-24 sm:w-24" />
          ) : (
            <Link href={`/admin/productos/${producto.id}/multimedia`} className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 text-center text-xs text-slate-500 sm:h-24 sm:w-24">📷<span>Agregar imagen</span></Link>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">{producto.nombre}</h3>
              {producto.nuevo_ingreso && <Etiqueta texto="Nuevo" clases="bg-blue-100 text-blue-700" />}
              {producto.oferta && <Etiqueta texto="Oferta" clases="bg-red-100 text-red-700" />}
              {producto.destacado && <Etiqueta texto="Destacado" clases="bg-violet-100 text-violet-700" />}
              {!producto.visible_catalogo && <Etiqueta texto="Oculto" clases="bg-slate-200 text-slate-600" />}
            </div>
            {colores.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="Colores disponibles">
                <span className="mr-1 text-xs font-semibold text-slate-600">Colores:</span>
                {colores.map((color, indice) => {
                  const hex = hexPorNombre[normalizarNombreColor(color)];
                  return (
                    <span
                      key={`${color}-${indice}`}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", color: "#0F172A" }}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border"
                        style={{ backgroundColor: hex || "#E2E8F0", borderColor: "#94A3B8" }}
                        aria-hidden="true"
                      />
                      <span style={{ color: "#0F172A", opacity: 1 }}>{color}</span>
                    </span>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-xs font-semibold text-[#2563EB]">{producto.categoria || "Sin categoría"}</p>
            {producto.codigo?.trim() && (
              <p className="mt-1 break-all text-xs font-semibold text-slate-600">
                Código: <span className="text-slate-900">{producto.codigo}</span>
              </p>
            )}
            {producto.descripcion && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{producto.descripcion}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Etiqueta texto={stockTexto} clases={stockEstilo} />
              <Etiqueta texto={`Stock: ${stock}`} clases="bg-slate-100 text-slate-600" />
              <Etiqueta texto={producto.estado} clases={producto.estado === "Activo" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"} />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 xl:basis-[53%]">
          <div className="flex min-w-0 flex-1 gap-0 overflow-x-auto pb-1">
            {precios.map((precio) => (
              <div key={precio.id} className="min-w-[145px] flex-1 border-l border-slate-200 px-3 sm:min-w-[160px]">
                <p className="truncate text-sm font-bold text-slate-900" title={precio.nombre}>{precio.nombre}</p>
                <DetallePrecios minorista={precio.minorista} mayorista={precio.mayorista} />
              </div>
            ))}
          </div>
          <button type="button" aria-label={abierto ? `Ocultar opciones de ${producto.nombre}` : `Mostrar opciones de ${producto.nombre}`}
            aria-expanded={abierto} aria-controls={idOpciones} title={abierto ? "Ocultar opciones" : "Mostrar opciones"}
            onClick={() => setAbierto((valor) => !valor)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 transition hover:bg-blue-100 hover:text-blue-700">
            <span aria-hidden="true">{abierto ? "⌃" : "⌄"}</span>
          </button>
        </div>
      </div>
      {abierto && (
        <div id={idOpciones} className="mt-4 border-t border-slate-200 pt-4">
          <p className="mb-3 text-xs font-semibold text-slate-500">Stock mínimo: {minimo}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BotonEstado activo={producto.nuevo_ingreso} texto="🆕 Nuevo" disabled={actualizando} onClick={() => onActualizarCampo(producto, "nuevo_ingreso")} />
            <BotonEstado activo={producto.oferta} texto="🔥 Oferta" disabled={actualizando} onClick={() => onActualizarCampo(producto, "oferta")} />
            <BotonEstado activo={producto.destacado} texto="⭐ Destacado" disabled={actualizando} onClick={() => onActualizarCampo(producto, "destacado")} />
            <BotonEstado activo={producto.visible_catalogo} texto={producto.visible_catalogo ? "👁 Visible" : "🚫 Oculto"} disabled={actualizando} onClick={() => onActualizarCampo(producto, "visible_catalogo")} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Link href={`/admin/productos/editar/${producto.id}`} className="rounded-xl bg-[#2563EB] px-4 py-3 text-center text-sm font-semibold text-white">Editar</Link>
            <Link href={`/admin/productos/${producto.id}/multimedia`} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold">Multimedia</Link>
            <Link href={`/admin/productos/${producto.id}/ia`} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-semibold text-violet-700">IA</Link>
            <Link href={`/admin/productos/${producto.id}/marketing`} className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-center text-sm font-semibold text-pink-700">Marketing</Link>
            <button type="button" disabled={actualizando} onClick={() => onCambiarEstado(producto)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50">{producto.estado === "Activo" ? "Desactivar" : "Activar"}</button>
            <button type="button" disabled={eliminando} onClick={() => onEliminar(producto)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-50">{eliminando ? "Eliminando..." : "Eliminar"}</button>
          </div>
        </div>
      )}
    </article>
  );
}


function DetallePrecios({ minorista, mayorista }: {
  minorista: number | null | undefined;
  mayorista: number | null | undefined;
}) {
  const tieneMinorista = minorista != null && Number.isFinite(Number(minorista));
  const tieneMayorista = mayorista != null && Number.isFinite(Number(mayorista));

  if (!tieneMinorista && !tieneMayorista) {
    return <p className="mt-2 text-xs text-slate-500">Sin precio</p>;
  }

  if (!tieneMinorista || !tieneMayorista) {
    return (
      <p className="mt-2 flex justify-between gap-2 text-xs">
        <span className="text-slate-500">Precio</span>
        <strong className="text-slate-900">{dinero(tieneMinorista ? minorista : mayorista)}</strong>
      </p>
    );
  }

  return (
    <>
      <p className="mt-2 flex justify-between gap-2 text-xs">
        <span className="text-slate-500">Minorista</span>
        <strong className="text-slate-900">{dinero(minorista)}</strong>
      </p>
      <p className="mt-2 flex justify-between gap-2 text-xs">
        <span className="text-slate-500">Mayorista</span>
        <strong className="text-slate-900">{dinero(mayorista)}</strong>
      </p>
    </>
  );
}

function Etiqueta({ texto, clases }: { texto: string; clases: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${clases}`}>{texto}</span>;
}
function BotonEstado({ activo, texto, disabled, onClick }: {
  activo: boolean; texto: string; disabled: boolean; onClick: () => void;
}) {
  return <button type="button" disabled={disabled} onClick={onClick}
    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:opacity-50 ${activo ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600"}`}>
    {texto}
  </button>;
}
function dinero(precio: number | null | undefined) {
  return precio == null || !Number.isFinite(Number(precio))
    ? "Sin precio" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(Number(precio));
}

function normalizarNombreColor(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}
