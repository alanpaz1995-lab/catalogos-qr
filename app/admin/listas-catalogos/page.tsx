"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

type ListaCatalogo = {
  id: number;
  empresa_id: number;
  nombre: string;
  slug: string;
  activa: boolean;
  created_at: string;
};

function generarSlug(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ListasCatalogosPage() {
  const { empresa, cargandoEmpresa, errorEmpresa } = useEmpresa();

  const [listas, setListas] = useState<ListaCatalogo[]>([]);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!empresa?.id) {
      setListas([]);
      setCargando(false);
      return;
    }

    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError("");

      const { data, error: errorConsulta } = await supabase
        .from("listas_catalogos")
        .select("*")
        .eq("empresa_id", empresa!.id)
        .order("created_at", { ascending: true });

      if (cancelado) return;

      if (errorConsulta) {
        setError(
          `No se pudieron cargar las listas: ${errorConsulta.message}`
        );
      } else {
        setListas((data || []) as ListaCatalogo[]);
      }

      setCargando(false);
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [empresa?.id]);

  async function crearLista(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!empresa?.id || guardando) return;

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("Ingresá un nombre para la lista.");
      return;
    }

    const slugBase = generarSlug(nombreLimpio);

    if (!slugBase) {
      setError("El nombre debe contener letras o números.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    // Identificador estable: no cambia al editar el nombre.
    const identificador = crypto.randomUUID().slice(0, 8);
    const slug = `${slugBase}-${identificador}`;

    const { data, error: errorCreacion } = await supabase
      .from("listas_catalogos")
      .insert({
        empresa_id: empresa.id,
        nombre: nombreLimpio,
        slug,
        activa: true,
      })
      .select()
      .single();

    if (errorCreacion) {
      setError(`No se pudo crear la lista: ${errorCreacion.message}`);
    } else {
      setListas((actuales) => [
        ...actuales,
        data as ListaCatalogo,
      ]);
      setNombre("");
      setMensaje(`Se creó la lista "${nombreLimpio}".`);
    }

    setGuardando(false);
  }

  function comenzarEdicion(lista: ListaCatalogo) {
    setEditandoId(lista.id);
    setNombreEditado(lista.nombre);
    setError("");
    setMensaje("");
  }

  async function guardarNombre(lista: ListaCatalogo) {
    if (!empresa?.id || procesandoId !== null) return;

    const nuevoNombre = nombreEditado.trim();

    if (!nuevoNombre) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    if (nuevoNombre === lista.nombre) {
      setEditandoId(null);
      return;
    }

    setProcesandoId(lista.id);
    setError("");
    setMensaje("");

    const { data, error: errorActualizacion } = await supabase
      .from("listas_catalogos")
      .update({ nombre: nuevoNombre })
      .eq("id", lista.id)
      .eq("empresa_id", empresa.id)
      .select()
      .single();

    if (errorActualizacion) {
      setError(
        `No se pudo cambiar el nombre: ${errorActualizacion.message}`
      );
    } else {
      setListas((actuales) =>
        actuales.map((item) =>
          item.id === lista.id ? (data as ListaCatalogo) : item
        )
      );
      setEditandoId(null);
      setMensaje("Nombre actualizado correctamente.");
    }

    setProcesandoId(null);
  }

  async function cambiarEstado(lista: ListaCatalogo) {
    if (!empresa?.id || procesandoId !== null) return;

    const nuevoEstado = !lista.activa;

    setProcesandoId(lista.id);
    setError("");
    setMensaje("");

    const { data, error: errorActualizacion } = await supabase
      .from("listas_catalogos")
      .update({ activa: nuevoEstado })
      .eq("id", lista.id)
      .eq("empresa_id", empresa.id)
      .select()
      .single();

    if (errorActualizacion) {
      setError(
        `No se pudo cambiar el estado: ${errorActualizacion.message}`
      );
    } else {
      setListas((actuales) =>
        actuales.map((item) =>
          item.id === lista.id ? (data as ListaCatalogo) : item
        )
      );
      setMensaje(
        nuevoEstado
          ? "Lista activada correctamente."
          : "Lista desactivada correctamente."
      );
    }

    setProcesandoId(null);
  }

  if (cargandoEmpresa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <p className="text-slate-500">Cargando empresa...</p>
      </main>
    );
  }

  if (errorEmpresa || !empresa?.id) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8">
          <h1 className="text-2xl font-bold">
            No se pudo cargar la empresa
          </h1>
          <p className="mt-3 text-red-600">
            {errorEmpresa ||
              "No encontramos la empresa asociada a tu cuenta."}
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-block text-blue-600"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/admin/productos"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Volver a Productos
          </Link>

          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Administración
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Listas de catálogos
          </h1>

          <p className="mt-2 text-slate-500">
            Creá diferentes listas para tu empresa, elegí sus
            nombres y administrá cuáles están activas.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={crearLista}
            className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">
              Nueva lista
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Podés crear una lista con cualquier nombre.
            </p>

            <label
              htmlFor="nombreLista"
              className="mb-2 mt-5 block font-semibold"
            >
              Nombre de la lista
            </label>

            <input
              id="nombreLista"
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ejemplo: Regional"
              maxLength={100}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              disabled={guardando}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Crear lista"}
            </button>
          </form>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold">
                Listas creadas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Total: {listas.length}
              </p>
            </div>

            {cargando ? (
              <div className="p-10 text-center text-slate-500">
                Cargando listas...
              </div>
            ) : listas.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                Todavía no creaste ninguna lista.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {listas.map((lista) => (
                  <article
                    key={lista.id}
                    className="flex flex-col gap-4 px-6 py-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {editandoId === lista.id ? (
                        <input
                          type="text"
                          value={nombreEditado}
                          onChange={(event) =>
                            setNombreEditado(event.target.value)
                          }
                          maxLength={100}
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2"
                        />
                      ) : (
                        <h3 className="text-lg font-bold">
                          {lista.nombre}
                        </h3>
                      )}

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          lista.activa
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {lista.activa ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <p className="break-all text-xs text-slate-400">
                      Identificador: {lista.slug}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {editandoId === lista.id ? (
                        <>
                          <button
                            type="button"
                            disabled={procesandoId !== null}
                            onClick={() => guardarNombre(lista)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Guardar nombre
                          </button>

                          <button
                            type="button"
                            disabled={procesandoId !== null}
                            onClick={() => setEditandoId(null)}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => comenzarEdicion(lista)}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Editar nombre
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={procesandoId !== null}
                        onClick={() => cambiarEstado(lista)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                          lista.activa
                            ? "bg-slate-100 text-slate-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {lista.activa ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700"
          >
            {error}
          </div>
        )}

        {mensaje && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700"
          >
            {mensaje}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
          <strong>Próximamente:</strong> vamos a conectar
          los productos, precios minoristas y mayoristas,
          enlaces públicos y códigos QR de cada lista.
          Por ahora, esta pantalla administra las listas
          y sus nombres.
        </div>
      </div>
    </main>
  );
}
