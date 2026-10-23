"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type CategoriaExterna = {
  id: number;
  catalogo_id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
};

type CatalogoExterno = {
  id: number;
  nombre: string;
};

export default function CategoriasExternasPage() {
  const params = useParams();
  const valorId = Array.isArray(params.id) ? params.id[0] : params.id;
  const catalogoId = Number(valorId);
  const idValido = Number.isSafeInteger(catalogoId) && catalogoId > 0;

  const [modoOscuro, setModoOscuro] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [catalogo, setCatalogo] = useState<CatalogoExterno | null>(null);
  const [categorias, setCategorias] = useState<CategoriaExterna[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditando, setNombreEditando] = useState("");
  const [descripcionEditando, setDescripcionEditando] = useState("");

  // Misma preferencia de tema que el panel principal de ComerSys.
  useEffect(() => {
    const aplicarTema = () => {
      setModoOscuro(window.localStorage.getItem("comersys-modo-oscuro") === "true");
    };
    aplicarTema();
    window.addEventListener("storage", aplicarTema);
    window.addEventListener("focus", aplicarTema);
    window.addEventListener("comersys-modo-oscuro-cambio", aplicarTema);
    return () => {
      window.removeEventListener("storage", aplicarTema);
      window.removeEventListener("focus", aplicarTema);
      window.removeEventListener("comersys-modo-oscuro-cambio", aplicarTema);
    };
  }, []);

  const cargarCategorias = useCallback(async () => {
    if (!idValido) return;
    const { data, error: errorConsulta } = await supabase
      .from("categorias_externas")
      .select("id, catalogo_id, nombre, descripcion, orden, activo")
      .eq("catalogo_id", catalogoId)
      .order("orden", { ascending: true })
      .order("id", { ascending: true });
    if (errorConsulta) throw new Error(errorConsulta.message);
    setCategorias((data || []) as CategoriaExterna[]);
  }, [catalogoId, idValido]);

  useEffect(() => {
    let vigente = true;
    async function iniciar() {
      setCargando(true);
      setError("");
      setAutorizado(false);
      setCatalogo(null);
      setCategorias([]);
      try {
        if (!idValido) throw new Error("El catálogo solicitado no es válido.");
        const { data: { user }, error: errorSesion } = await supabase.auth.getUser();
        if (errorSesion || !user) throw new Error("Iniciá sesión para continuar.");

        const [{ data: superadmin, error: errorSuperadmin }, { data: empresaPropia, error: errorEmpresa }] = await Promise.all([
          supabase.from("superadmins").select("id").eq("auth_user_id", user.id).eq("activo", true).maybeSingle(),
          supabase.from("empresas").select("id").eq("id", 1).eq("auth_user_id", user.id).maybeSingle(),
        ]);
        if (errorSuperadmin || errorEmpresa) throw new Error("No se pudo comprobar tu autorización.");
        if (!superadmin || !empresaPropia) throw new Error("Esta pantalla está reservada al propietario de ComerSys.");

        const { data: datosCatalogo, error: errorCatalogo } = await supabase
          .from("catalogos_externos")
          .select("id, nombre")
          .eq("id", catalogoId)
          .maybeSingle();
        if (errorCatalogo) throw new Error(errorCatalogo.message);
        if (!datosCatalogo) throw new Error("No se encontró el catálogo externo.");
        const { data: datosCategorias, error: errorCategorias } = await supabase
          .from("categorias_externas")
          .select("id, catalogo_id, nombre, descripcion, orden, activo")
          .eq("catalogo_id", catalogoId)
          .order("orden", { ascending: true })
          .order("id", { ascending: true });
        if (errorCategorias) throw new Error(errorCategorias.message);
        if (!vigente) return;
        setAutorizado(true);
        setCatalogo(datosCatalogo as CatalogoExterno);
        setCategorias((datosCategorias || []) as CategoriaExterna[]);
      } catch (desconocido) {
        if (vigente) setError(desconocido instanceof Error ? desconocido.message : "Ocurrió un error.");
      } finally {
        if (vigente) setCargando(false);
      }
    }
    void iniciar();
    return () => { vigente = false; };
  }, [catalogoId, idValido]);

  async function ejecutar(accion: () => Promise<void>) {
    if (!autorizado || ocupado) return;
    setOcupado(true);
    setError("");
    try {
      await accion();
    } catch (desconocido) {
      setError(desconocido instanceof Error ? desconocido.message : "No se pudo completar la operación.");
    } finally {
      setOcupado(false);
    }
  }

  function crear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ejecutar(async () => {
      const limpio = nombre.trim();
      if (!limpio) throw new Error("Ingresá un nombre para la categoría.");
      const siguienteOrden = categorias.reduce((mayor, item) => Math.max(mayor, Number(item.orden) || 0), 0) + 1;
      const { error: errorInsertar } = await supabase.from("categorias_externas").insert({
        catalogo_id: catalogoId,
        nombre: limpio,
        descripcion: descripcion.trim() || null,
        orden: siguienteOrden,
        activo: true,
      });
      if (errorInsertar) throw new Error(errorInsertar.code === "23505" ? "Ya existe una categoría con ese nombre." : errorInsertar.message);
      await cargarCategorias();
      setNombre("");
      setDescripcion("");
    });
  }

  function guardarEdicion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editandoId === null) return;
    void ejecutar(async () => {
      const limpio = nombreEditando.trim();
      if (!limpio) throw new Error("El nombre no puede estar vacío.");
      const { error: errorGuardar } = await supabase.from("categorias_externas")
        .update({ nombre: limpio, descripcion: descripcionEditando.trim() || null })
        .eq("catalogo_id", catalogoId).eq("id", editandoId);
      if (errorGuardar) throw new Error(errorGuardar.code === "23505" ? "Ya existe una categoría con ese nombre." : errorGuardar.message);
      await cargarCategorias();
      setEditandoId(null);
    });
  }

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= categorias.length) return;
    void ejecutar(async () => {
      const actual = categorias[indice];
      const vecina = categorias[destino];
      // Reasignamos dos órdenes distintos, incluso si los datos antiguos tenían empates.
      // Para evitar duplicados, primero usamos una posición temporal y luego fijamos ambas.
      const temporal = categorias.reduce((mayor, item) => Math.max(mayor, Number(item.orden) || 0), 0) + 1;
      const posicionActual = Number(actual.orden);
      const posicionDestino = Number(vecina.orden);
      // Si ambas tienen el mismo orden, la posición visual (id como desempate)
      // requiere una renumeración completa antes de intercambiar.
      if (posicionActual === posicionDestino) {
        for (let i = 0; i < categorias.length; i++) {
          const { error: errorNormalizar } = await supabase.from("categorias_externas")
            .update({ orden: i + 1 }).eq("catalogo_id", catalogoId).eq("id", categorias[i].id);
          if (errorNormalizar) throw new Error(errorNormalizar.message);
        }
      }
      const ordenA = posicionActual === posicionDestino ? indice + 1 : posicionActual;
      const ordenB = posicionActual === posicionDestino ? destino + 1 : posicionDestino;
      const paso = async (id: number, orden: number) => {
        const { error: errorMover } = await supabase.from("categorias_externas")
          .update({ orden }).eq("catalogo_id", catalogoId).eq("id", id);
        if (errorMover) throw new Error(errorMover.message);
      };
      try {
        await paso(actual.id, temporal);
        await paso(vecina.id, ordenA);
        await paso(actual.id, ordenB);
      } catch (errorMovimiento) {
        await cargarCategorias();
        throw errorMovimiento;
      }
      await cargarCategorias();
    });
  }

  function cambiarEstado(item: CategoriaExterna) {
    void ejecutar(async () => {
      const { error: errorEstado } = await supabase.from("categorias_externas")
        .update({ activo: !item.activo }).eq("catalogo_id", catalogoId).eq("id", item.id);
      if (errorEstado) throw new Error(errorEstado.message);
      await cargarCategorias();
    });
  }

  function eliminar(item: CategoriaExterna) {
    if (!window.confirm(`¿Eliminar definitivamente la categoría «${item.nombre}»? Los productos vinculados quedarán sin categoría.`)) return;
    void ejecutar(async () => {
      const { error: errorEliminar } = await supabase.from("categorias_externas")
        .delete().eq("catalogo_id", catalogoId).eq("id", item.id);
      if (errorEliminar) throw new Error(errorEliminar.message);
      await cargarCategorias();
      if (editandoId === item.id) setEditandoId(null);
    });
  }

  if (cargando) return <main className={`min-h-screen p-8 text-center ${modoOscuro ? "bg-slate-950 text-slate-300" : "bg-slate-50 text-slate-600"}`}>Comprobando acceso y cargando categorías...</main>;
  if (!autorizado || !catalogo) return (
    <main className={`min-h-screen p-6 ${modoOscuro ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}><div className={`mx-auto max-w-xl rounded-2xl border p-7 ${modoOscuro ? "border-slate-700 bg-slate-900" : "border-red-200 bg-white"}`}>
      <h1 className="text-xl font-bold text-red-700">No se puede acceder a las categorías</h1>
      <p className={`mt-3 ${modoOscuro ? "text-slate-300" : "text-slate-600"}`}>{error || "Acceso no autorizado."}</p>
      <Link href="/admin-comersys/catalogos-externos" className="mt-5 inline-block font-semibold text-blue-600">Volver a catálogos externos</Link>
    </div></main>
  );

  return (
    <main className={`categorias-externas-admin min-h-screen p-4 sm:p-8 ${modoOscuro ? "categorias-externas-oscuro bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      {modoOscuro && (
        <style jsx global>{`
          .categorias-externas-oscuro .bg-white { background-color: #0f172a !important; }
          .categorias-externas-oscuro .bg-slate-50,
          .categorias-externas-oscuro .bg-slate-100 { background-color: #1e293b !important; }
          .categorias-externas-oscuro .bg-slate-200 { background-color: #334155 !important; }
          .categorias-externas-oscuro .border-slate-100,
          .categorias-externas-oscuro .border-slate-200,
          .categorias-externas-oscuro .border-slate-300 { border-color: #334155 !important; }
          .categorias-externas-oscuro .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: #334155 !important; }
          .categorias-externas-oscuro .text-slate-800,
          .categorias-externas-oscuro .text-slate-700 { color: #f1f5f9 !important; }
          .categorias-externas-oscuro .text-slate-600 { color: #cbd5e1 !important; }
          .categorias-externas-oscuro .text-slate-500,
          .categorias-externas-oscuro .text-slate-400 { color: #94a3b8 !important; }
          .categorias-externas-oscuro input,
          .categorias-externas-oscuro textarea {
            background-color: #111827 !important;
            border-color: #475569 !important;
            color: #f8fafc !important;
          }
          .categorias-externas-oscuro input::placeholder,
          .categorias-externas-oscuro textarea::placeholder { color: #94a3b8 !important; }
          .categorias-externas-oscuro button:not(.bg-blue-600) {
            border-color: #475569;
          }
          .categorias-externas-oscuro .bg-green-100 { background-color: #064e3b !important; }
          .categorias-externas-oscuro .text-green-700 { color: #a7f3d0 !important; }
        `}</style>
      )}
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <Link href="/admin-comersys/catalogos-externos" className="text-sm font-bold text-blue-600">← Catálogos externos</Link>
          <h1 className="mt-3 text-3xl font-black">Categorías de {catalogo.nombre}</h1>
          <p className="mt-2 text-slate-500">Creá y ordená las categorías de este emprendimiento. El orden se guarda para el catálogo público.</p>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <form onSubmit={crear} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Nueva categoría</h2>
            <label className="block text-sm font-semibold">Nombre
              <input required maxLength={120} value={nombre} onChange={(event) => setNombre(event.target.value)} disabled={ocupado} placeholder="Ejemplo: Almacén" className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label className="block text-sm font-semibold">Descripción (opcional)
              <textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} disabled={ocupado} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <button disabled={ocupado} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">{ocupado ? "Guardando..." : "Crear categoría"}</button>
          </form>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold">Categorías creadas ({categorias.length})</h2></div>
            {categorias.length === 0 ? <p className="p-6 text-slate-500">Todavía no hay categorías para este catálogo.</p> : (
              <div className="divide-y divide-slate-100">
                {categorias.map((item, indice) => (
                  <div key={item.id} className="p-5">
                    {editandoId === item.id ? (
                      <form onSubmit={guardarEdicion} className="space-y-3">
                        <label className="block text-sm font-semibold">Nombre
                          <input required maxLength={120} value={nombreEditando} onChange={(event) => setNombreEditando(event.target.value)} disabled={ocupado} className="mt-1 w-full rounded-lg border p-2" />
                        </label>
                        <label className="block text-sm font-semibold">Descripción
                          <textarea value={descripcionEditando} onChange={(event) => setDescripcionEditando(event.target.value)} disabled={ocupado} rows={2} className="mt-1 w-full rounded-lg border p-2" />
                        </label>
                        <div className="flex gap-2">
                          <button disabled={ocupado} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Guardar cambios</button>
                          <button type="button" disabled={ocupado} onClick={() => setEditandoId(null)} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-400">{indice + 1}.</span>
                            <strong className="break-words">{item.nombre}</strong>
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.activo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{item.activo ? "Activa" : "Inactiva"}</span>
                          </div>
                          {item.descripcion && <p className="mt-1 text-sm text-slate-500">{item.descripcion}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" title="Subir" aria-label={`Subir ${item.nombre}`} disabled={ocupado || indice === 0} onClick={() => mover(indice, -1)} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-30">↑</button>
                          <button type="button" title="Bajar" aria-label={`Bajar ${item.nombre}`} disabled={ocupado || indice === categorias.length - 1} onClick={() => mover(indice, 1)} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-30">↓</button>
                          <button type="button" disabled={ocupado} onClick={() => { setEditandoId(item.id); setNombreEditando(item.nombre); setDescripcionEditando(item.descripcion || ""); }} className="rounded-lg border px-3 py-2 text-sm font-bold text-blue-600 disabled:opacity-50">Editar</button>
                          <button type="button" disabled={ocupado} onClick={() => cambiarEstado(item)} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50">{item.activo ? "Desactivar" : "Activar"}</button>
                          <button type="button" disabled={ocupado} onClick={() => eliminar(item)} className="rounded-lg border px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-50">Eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
