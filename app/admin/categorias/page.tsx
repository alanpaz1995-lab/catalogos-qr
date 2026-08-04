"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Categoria = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  estado?: string | null;
  empresa_id: number;
};

const EMPRESA_ID = 1;

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarCategorias();
  }, []);

  async function cargarCategorias() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("empresa_id", EMPRESA_ID)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar categorías:", error);
      setError(`No se pudieron cargar las categorías: ${error.message}`);
      setCargando(false);
      return;
    }

    setCategorias((data as Categoria[]) || []);
    setCargando(false);
  }

  async function crearCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("Ingresá el nombre de la categoría.");
      return;
    }

    setGuardando(true);
    setError("");

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        nombre: nombreLimpio,
        descripcion: descripcion.trim() || null,
        estado: "Activo",
        empresa_id: EMPRESA_ID,
      })
      .select()
      .single();

    if (error) {
      console.error("Error al crear categoría:", error);

      if (error.code === "23505") {
        setError("Ya existe una categoría con ese nombre.");
      } else {
        setError(`No se pudo crear la categoría: ${error.message}`);
      }

      setGuardando(false);
      return;
    }

    setCategorias((categoriasActuales) =>
      [...categoriasActuales, data as Categoria].sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      )
    );

    setNombre("");
    setDescripcion("");
    setGuardando(false);
  }

  async function cambiarEstado(categoria: Categoria) {
    const nuevoEstado =
      categoria.estado === "Activo" ? "Inactivo" : "Activo";

    const { error } = await supabase
      .from("categorias")
      .update({ estado: nuevoEstado })
      .eq("id", categoria.id)
      .eq("empresa_id", EMPRESA_ID);

    if (error) {
      alert(`No se pudo cambiar el estado: ${error.message}`);
      return;
    }

    setCategorias((categoriasActuales) =>
      categoriasActuales.map((item) =>
        item.id === categoria.id
          ? { ...item, estado: nuevoEstado }
          : item
      )
    );
  }

  async function eliminarCategoria(categoria: Categoria) {
    const confirmar = window.confirm(
      `¿Seguro que querés eliminar la categoría "${categoria.nombre}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("categorias")
      .delete()
      .eq("id", categoria.id)
      .eq("empresa_id", EMPRESA_ID);

    if (error) {
      alert(`No se pudo eliminar la categoría: ${error.message}`);
      return;
    }

    setCategorias((categoriasActuales) =>
      categoriasActuales.filter((item) => item.id !== categoria.id)
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-8 text-[#1E293B]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#2563EB]">
            Administración
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Categorías
          </h1>

          <p className="mt-2 text-slate-500">
            Creá y administrá las categorías de tus productos.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={crearCategoria}
            className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">
              Nueva categoría
            </h2>

            <div className="mt-5">
              <label
                htmlFor="nombre"
                className="mb-2 block font-semibold"
              >
                Nombre
              </label>

              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ejemplo: Mates"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="descripcion"
                className="mb-2 block font-semibold"
              >
                Descripción
              </label>

              <textarea
                id="descripcion"
                rows={4}
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Descripción opcional..."
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="mt-6 w-full rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Crear categoría"}
            </button>
          </form>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold">
                Categorías creadas
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total: {categorias.length}
              </p>
            </div>

            {cargando ? (
              <div className="p-10 text-center text-slate-500">
                Cargando categorías...
              </div>
            ) : categorias.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                Todavía no hay categorías.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {categorias.map((categoria) => {
                  const activa = categoria.estado !== "Inactivo";

                  return (
                    <article
                      key={categoria.id}
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold">
                            {categoria.nombre}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              activa
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {activa ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {categoria.descripcion ||
                            "Sin descripción"}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => cambiarEstado(categoria)}
                          className="font-semibold text-[#2563EB]"
                        >
                          {activa ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarCategoria(categoria)}
                          className="font-semibold text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}