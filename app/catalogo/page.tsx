"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Producto = {
  id: number;
  nombre: string;
  categoria?: string;
  precio: number;
  stock?: number;
  descripcion?: string;
  estado?: string;
  imaguen?: string;
};

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarProductos() {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("estado", "Activo")
        .order("id", { ascending: false });

      if (error) {
        console.error(error);
        setError(`No se pudo cargar el catálogo: ${error.message}`);
        setCargando(false);
        return;
      }

      setProductos((data as Producto[]) || []);
      setCargando(false);
    }

    cargarProductos();
  }, []);

  const productosFiltrados = productos.filter((producto) => {
    const texto = busqueda.toLowerCase();

    return (
      producto.nombre?.toLowerCase().includes(texto) ||
      producto.categoria?.toLowerCase().includes(texto)
    );
  });

  function formatearPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(precio);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      <header className="bg-[#2563EB] text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-sm font-medium text-blue-100">
            Catálogo digital
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            ComerSys
          </h1>

          <p className="mt-3 max-w-2xl text-blue-100">
            Conocé nuestros productos y consultanos directamente.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <input
            type="text"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar productos..."
            className="w-full max-w-xl rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="py-12 text-center text-slate-500">
            Cargando catálogo...
          </p>
        ) : productosFiltrados.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="font-semibold">
              No se encontraron productos.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productosFiltrados.map((producto) => (
              <article
                key={producto.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {producto.imaguen ? (
                  <img
                    src={producto.imaguen}
                    alt={producto.nombre}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">
                    Sin imagen
                  </div>
                )}

                <div className="p-5">
                  <p className="text-sm font-semibold text-[#2563EB]">
                    {producto.categoria || "Sin categoría"}
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    {producto.nombre}
                  </h2>

                  {producto.descripcion && (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                      {producto.descripcion}
                    </p>
                  )}

                  <p className="mt-5 text-2xl font-bold">
                    {formatearPrecio(Number(producto.precio))}
                  </p>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hola, quiero consultar por ${producto.nombre}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 block rounded-xl bg-[#F97316] px-4 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}