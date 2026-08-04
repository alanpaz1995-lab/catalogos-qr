"use client";

import Link from "next/link";

export type ProductoListado = {
  id: number;
  empresa_id: number;
  nombre: string;
  categoria?: string | null;
  precio: number;
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

export type CampoBooleanoProducto =
  | "destacado"
  | "nuevo_ingreso"
  | "oferta"
  | "visible_catalogo";

type TablaProductosProps = {
  productos: ProductoListado[];
  cargando: boolean;
  actualizandoId: number | null;
  eliminandoId: number | null;
  onActualizarCampo: (
    producto: ProductoListado,
    campo: CampoBooleanoProducto
  ) => void;
  onCambiarEstado: (
    producto: ProductoListado
  ) => void;
  onEliminar: (
    producto: ProductoListado
  ) => void;
};

export default function TablaProductos({
  productos,
  cargando,
  actualizandoId,
  eliminandoId,
  onActualizarCampo,
  onCambiarEstado,
  onEliminar,
}: TablaProductosProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Lista de productos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {productos.length} producto(s) encontrados
          </p>
        </div>

        <Link
          href="/admin/productos/multimedia"
          className="text-sm font-semibold text-[#2563EB]"
        >
          Abrir biblioteca multimedia →
        </Link>
      </div>

      {cargando ? (
        <EstadoCarga />
      ) : productos.length === 0 ? (
        <EstadoVacio />
      ) : (
        <div className="divide-y divide-slate-100">
          {productos.map((producto) => (
            <FilaProducto
              key={producto.id}
              producto={producto}
              actualizando={
                actualizandoId === producto.id
              }
              eliminando={
                eliminandoId === producto.id
              }
              onActualizarCampo={
                onActualizarCampo
              }
              onCambiarEstado={
                onCambiarEstado
              }
              onEliminar={onEliminar}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FilaProducto({
  producto,
  actualizando,
  eliminando,
  onActualizarCampo,
  onCambiarEstado,
  onEliminar,
}: {
  producto: ProductoListado;
  actualizando: boolean;
  eliminando: boolean;
  onActualizarCampo: (
    producto: ProductoListado,
    campo: CampoBooleanoProducto
  ) => void;
  onCambiarEstado: (
    producto: ProductoListado
  ) => void;
  onEliminar: (
    producto: ProductoListado
  ) => void;
}) {
  const stock = obtenerEstadoStock(producto);
  const stockActual = Number(
    producto.stock || 0
  );

  return (
    <article className="p-6 transition hover:bg-slate-50">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5 sm:flex-row">
          <ImagenProducto producto={producto} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold">
                {producto.nombre}
              </h3>

              {producto.nuevo_ingreso && (
                <Etiqueta
                  texto="Nuevo"
                  clases="bg-blue-100 text-blue-700"
                />
              )}

              {producto.oferta && (
                <Etiqueta
                  texto="Oferta"
                  clases="bg-red-100 text-red-700"
                />
              )}

              {producto.destacado && (
                <Etiqueta
                  texto="Destacado"
                  clases="bg-violet-100 text-violet-700"
                />
              )}

              {!producto.visible_catalogo && (
                <Etiqueta
                  texto="Oculto"
                  clases="bg-slate-100 text-slate-600"
                />
              )}
            </div>

            <p className="mt-2 text-sm font-semibold text-[#2563EB]">
              {producto.categoria ||
                "Sin categoría"}
            </p>

            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
              {producto.descripcion ||
                "Sin descripción cargada."}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${stock.clases}`}
              >
                {stock.texto}
              </span>

              <Etiqueta
                texto={`Stock: ${stockActual}`}
                clases="bg-slate-100 text-slate-600"
              />

              <Etiqueta
                texto={`Mínimo: ${Number(
                  producto.stock_minimo
                )}`}
                clases="bg-slate-100 text-slate-600"
              />

              <Etiqueta
                texto={producto.estado}
                clases={
                  producto.estado === "Activo"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }
              />
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Precio
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatearPrecio(
                Number(producto.precio)
              )}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <BotonEstado
              activo={producto.nuevo_ingreso}
              texto="🆕 Nuevo"
              disabled={actualizando}
              onClick={() =>
                onActualizarCampo(
                  producto,
                  "nuevo_ingreso"
                )
              }
            />

            <BotonEstado
              activo={producto.oferta}
              texto="🔥 Oferta"
              disabled={actualizando}
              onClick={() =>
                onActualizarCampo(
                  producto,
                  "oferta"
                )
              }
            />

            <BotonEstado
              activo={producto.destacado}
              texto="⭐ Destacado"
              disabled={actualizando}
              onClick={() =>
                onActualizarCampo(
                  producto,
                  "destacado"
                )
              }
            />

            <BotonEstado
              activo={
                producto.visible_catalogo
              }
              texto={
                producto.visible_catalogo
                  ? "👁 Visible"
                  : "🚫 Oculto"
              }
              disabled={actualizando}
              onClick={() =>
                onActualizarCampo(
                  producto,
                  "visible_catalogo"
                )
              }
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/admin/productos/editar/${producto.id}`}
              className="rounded-xl bg-[#2563EB] px-4 py-3 text-center font-semibold text-white"
            >
              Editar
            </Link>

            <Link
              href={`/admin/productos/${producto.id}/multimedia`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-semibold"
            >
              Multimedia
            </Link>

            <Link
              href={`/admin/productos/${producto.id}/ia`}
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-center font-semibold text-violet-700"
            >
              IA
            </Link>

            <Link
              href={`/admin/productos/${producto.id}/marketing`}
              className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-center font-semibold text-pink-700"
            >
              Marketing
            </Link>

            <button
              type="button"
              disabled={actualizando}
              onClick={() =>
                onCambiarEstado(producto)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold disabled:opacity-50"
            >
              {producto.estado === "Activo"
                ? "Desactivar"
                : "Activar"}
            </button>

            <button
              type="button"
              disabled={eliminando}
              onClick={() =>
                onEliminar(producto)
              }
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 disabled:opacity-50"
            >
              {eliminando
                ? "Eliminando..."
                : "Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ImagenProducto({
  producto,
}: {
  producto: ProductoListado;
}) {
  if (producto.imaguen) {
    return (
      <img
        src={producto.imaguen}
        alt={producto.nombre}
        className="h-32 w-32 shrink-0 rounded-2xl border border-slate-200 object-cover"
      />
    );
  }

  return (
    <Link
      href={`/admin/productos/${producto.id}/multimedia`}
      className="flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500 transition hover:border-blue-400 hover:bg-blue-50"
    >
      <span className="text-2xl">
        📷
      </span>

      <span className="mt-2 font-semibold">
        Agregar imagen
      </span>
    </Link>
  );
}

function EstadoCarga() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

      <p className="mt-4 text-slate-500">
        Cargando productos...
      </p>
    </div>
  );
}

function EstadoVacio() {
  return (
    <div className="p-12 text-center">
      <p className="font-semibold text-slate-700">
        No se encontraron productos
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Probá con otra búsqueda o cambiá el filtro.
      </p>
    </div>
  );
}

function Etiqueta({
  texto,
  clases,
}: {
  texto: string;
  clases: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${clases}`}
    >
      {texto}
    </span>
  );
}

function BotonEstado({
  activo,
  texto,
  disabled,
  onClick,
}: {
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
      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:opacity-50 ${
        activo
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-300 bg-white text-slate-600"
      }`}
    >
      {texto}
    </button>
  );
}

function obtenerEstadoStock(
  producto: ProductoListado
) {
  const stock = Number(producto.stock);
  const minimo = Number(
    producto.stock_minimo
  );

  if (stock <= 0) {
    return {
      texto: "Sin stock",
      clases:
        "bg-red-100 text-red-700",
    };
  }

  if (stock <= minimo) {
    return {
      texto: "Stock bajo",
      clases:
        "bg-amber-100 text-amber-700",
    };
  }

  return {
    texto: "Stock correcto",
    clases:
      "bg-green-100 text-green-700",
  };
}

function formatearPrecio(
  precio: number
) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(precio);
}