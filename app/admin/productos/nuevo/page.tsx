"use client";

import Link from "next/link";

export default function NuevoProductoPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
            Productos PRO
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-800">
            Nuevo Producto
          </h1>

          <p className="mt-3 text-slate-500">
            Elegí cómo querés crear el nuevo producto.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">

          {/* MANUAL */}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

            <div className="text-6xl">
              📝
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Crear manualmente
            </h2>

            <p className="mt-4 text-slate-500 leading-7">
              Completá todos los datos del producto manualmente.
            </p>

            <Link
              href="/admin/productos/nuevo/manual"
              className="mt-8 inline-flex rounded-xl bg-[#2563EB] px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Continuar
            </Link>

          </div>

          {/* IA */}

          <div className="rounded-3xl border-2 border-[#F97316] bg-gradient-to-br from-orange-50 to-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

            <div className="text-6xl">
              🤖
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Crear con IA
            </h2>

            <p className="mt-4 text-slate-500 leading-7">
              Sacá una foto o subí una imagen y ComerSys preparará
              automáticamente el producto.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-slate-600">

              <li>✅ Detecta el producto</li>

              <li>✅ Sugiere nombre</li>

              <li>✅ Sugiere categoría</li>

              <li>✅ Genera descripción</li>

              <li>✅ Prepara imágenes para catálogo</li>

            </ul>

            <Link
              href="/admin/productos/nuevo/ia"
              className="mt-8 inline-flex rounded-xl bg-[#F97316] px-6 py-3 font-semibold text-white hover:bg-orange-600"
            >
              Comenzar con IA
            </Link>

          </div>

        </div>

      </div>
    </main>
  );
}