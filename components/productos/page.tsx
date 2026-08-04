"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { MultimediaProducto } from "@/components/productos/GaleriaMultimedia";

const EMPRESA_ID = 1;

type ProductoResumen = {
  id: number;
  nombre: string;
};

type MultimediaConProducto = MultimediaProducto & {
  producto_nombre: string;
};

export default function BibliotecaMultimediaPage() {
  const [multimedia, setMultimedia] = useState<
    MultimediaConProducto[]
  >([]);

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarBiblioteca = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const {
        data: multimediaData,
        error: multimediaError,
      } = await supabase
        .from("producto_multimedia")
        .select("*")
        .eq("empresa_id", EMPRESA_ID)
        .eq("activo", true)
        .order("created_at", {
          ascending: false,
        });

      if (multimediaError) {
        throw new Error(multimediaError.message);
      }

      const registros =
        (multimediaData as MultimediaProducto[]) || [];

      const productosIds = Array.from(
        new Set(
          registros.map((item) => item.producto_id)
        )
      );

      let productos: ProductoResumen[] = [];

      if (productosIds.length > 0) {
        const {
          data: productosData,
          error: productosError,
        } = await supabase
          .from("productos")
          .select("id, nombre")
          .eq("empresa_id", EMPRESA_ID)
          .in("id", productosIds);

        if (productosError) {
          throw new Error(productosError.message);
        }

        productos =
          (productosData as ProductoResumen[]) || [];
      }

      const nombresProductos = new Map(
        productos.map((producto) => [
          producto.id,
          producto.nombre,
        ])
      );

      const registrosCompletos = registros.map(
        (item) => ({
          ...item,
          producto_nombre:
            nombresProductos.get(item.producto_id) ||
            "Producto no encontrado",
        })
      );

      setMultimedia(registrosCompletos);
    } catch (errorDesconocido) {
      console.error(
        "Error al cargar la biblioteca multimedia:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo cargar la biblioteca multimedia."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarBiblioteca();
  }, [cargarBiblioteca]);

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return multimedia;
    }

    return multimedia.filter((item) => {
      const nombreArchivo =
        item.nombre_archivo?.toLowerCase() || "";

      const producto =
        item.producto_nombre.toLowerCase();

      const descripcion =
        item.descripcion?.toLowerCase() || "";

      return (
        nombreArchivo.includes(texto) ||
        producto.includes(texto) ||
        descripcion.includes(texto)
      );
    });
  }, [busqueda, multimedia]);

  const cantidadPrincipales = useMemo(
    () =>
      multimedia.filter((item) => item.es_principal)
        .length,
    [multimedia]
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/productos"
              className="font-semibold text-[#2563EB]"
            >
              ← Volver a productos
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-violet-600">
              Multimedia PRO
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Biblioteca multimedia
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Consultá todas las imágenes cargadas en los
              productos de tu catálogo.
            </p>
          </div>

          <button
            type="button"
            disabled={cargando}
            onClick={cargarBiblioteca}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cargando
              ? "Actualizando..."
              : "Actualizar biblioteca"}
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Resumen
            titulo="Imágenes activas"
            valor={String(multimedia.length)}
            detalle="Total disponible"
          />

          <Resumen
            titulo="Imágenes principales"
            valor={String(cantidadPrincipales)}
            detalle="Una por producto"
          />

          <Resumen
            titulo="Resultados visibles"
            valor={String(resultados.length)}
            detalle={
              busqueda
                ? "Según la búsqueda"
                : "Sin filtros aplicados"
            }
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="buscar-multimedia"
            className="text-sm font-semibold"
          >
            Buscar imágenes
          </label>

          <input
            id="buscar-multimedia"
            type="search"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
            placeholder="Buscar por archivo, producto o descripción..."
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold">
              Todas las imágenes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {resultados.length} imagen(es) encontrada(s)
            </p>
          </div>

          {cargando ? (
            <EstadoCarga />
          ) : resultados.length === 0 ? (
            <EstadoVacio tieneBusqueda={Boolean(busqueda)} />
          ) : (
            <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {resultados.map((item) => (
                <TarjetaBiblioteca
                  key={item.id}
                  item={item}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Resumen({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {valor}
      </p>

      <p className="mt-2 text-sm text-slate-400">
        {detalle}
      </p>
    </article>
  );
}

function TarjetaBiblioteca({
  item,
}: {
  item: MultimediaConProducto;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
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
          className="truncate font-bold"
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
          <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">
            {item.descripcion}
          </p>
        )}

        <Link
          href={`/admin/productos/${item.producto_id}/multimedia`}
          className="mt-5 block rounded-xl bg-[#2563EB] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Abrir galería del producto
        </Link>
      </div>
    </article>
  );
}

function EstadoCarga() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

      <p className="mt-4 text-slate-500">
        Cargando biblioteca multimedia...
      </p>
    </div>
  );
}

function EstadoVacio({
  tieneBusqueda,
}: {
  tieneBusqueda: boolean;
}) {
  return (
    <div className="p-12 text-center">
      <span className="text-6xl">🖼️</span>

      <p className="mt-5 font-semibold text-slate-700">
        {tieneBusqueda
          ? "No encontramos resultados"
          : "La biblioteca está vacía"}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {tieneBusqueda
          ? "Probá con otra palabra o borrá la búsqueda."
          : "Subí imágenes desde la galería de un producto."}
      </p>

      {!tieneBusqueda && (
        <Link
          href="/admin/productos"
          className="mt-5 inline-flex rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
        >
          Ver productos
        </Link>
      )}
    </div>
  );
}