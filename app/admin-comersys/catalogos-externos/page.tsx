"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CatalogoExterno = {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  logo_url: string | null;
  foto_perfil_url: string | null;
  portada_url: string | null;
  whatsapp: string | null;
  color_principal: string | null;
  color_secundario: string | null;
  activo: boolean;
};

type Formulario = {
  nombre: string;
  slug: string;
  descripcion: string;
  whatsapp: string;
  color_principal: string;
  color_secundario: string;
  logo_url: string;
  foto_perfil_url: string;
  portada_url: string;
  activo: boolean;
};

const inicial: Formulario = {
  nombre: "",
  slug: "",
  descripcion: "",
  whatsapp: "",
  color_principal: "#2563EB",
  color_secundario: "#F97316",
  logo_url: "",
  foto_perfil_url: "",
  portada_url: "",
  activo: false,
};

function crearSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function aFormulario(catalogo: CatalogoExterno): Formulario {
  return {
    nombre: catalogo.nombre,
    slug: catalogo.slug,
    descripcion: catalogo.descripcion || "",
    whatsapp: catalogo.whatsapp || "",
    color_principal: catalogo.color_principal || "#2563EB",
    color_secundario: catalogo.color_secundario || "#F97316",
    logo_url: catalogo.logo_url || "",
    foto_perfil_url: catalogo.foto_perfil_url || "",
    portada_url: catalogo.portada_url || "",
    activo: catalogo.activo,
  };
}

export default function CatalogosExternosAdminPage() {
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [catalogos, setCatalogos] = useState<CatalogoExterno[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(null);

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

  useEffect(() => {
    let vigente = true;
    async function iniciar() {
      const { data: { user }, error: sesionError } = await supabase.auth.getUser();
      if (!vigente) return;
      if (sesionError || !user) {
        setError("Iniciá sesión para acceder a este módulo.");
        setCargando(false);
        return;
      }
      const [respuestaSuperadmin, respuestaEmpresa] = await Promise.all([
        supabase.from("superadmins").select("id").eq("auth_user_id", user.id).eq("activo", true).maybeSingle(),
        supabase.from("empresas").select("id").eq("auth_user_id", user.id).eq("id", 1).maybeSingle(),
      ]);
      if (!vigente) return;
      if (respuestaSuperadmin.error || respuestaEmpresa.error || !respuestaSuperadmin.data || !respuestaEmpresa.data) {
        setError("Acceso restringido al propietario de ComerSys (empresa ID 1).");
        setCargando(false);
        return;
      }
      setAutorizado(true);
      const { data, error: consultaError } = await supabase
        .from("catalogos_externos")
        .select("id, nombre, slug, descripcion, logo_url, foto_perfil_url, portada_url, whatsapp, color_principal, color_secundario, activo")
        .order("id", { ascending: false });
      if (!vigente) return;
      if (consultaError) setError(consultaError.message);
      else setCatalogos((data || []) as CatalogoExterno[]);
      setCargando(false);
    }
    void iniciar();
    return () => { vigente = false; };
  }, []);

  async function actualizarLista() {
    const { data, error: consultaError } = await supabase
      .from("catalogos_externos")
      .select("id, nombre, slug, descripcion, logo_url, foto_perfil_url, portada_url, whatsapp, color_principal, color_secundario, activo")
      .order("id", { ascending: false });
    if (consultaError) throw consultaError;
    setCatalogos((data || []) as CatalogoExterno[]);
  }

  function nuevo() {
    setEditandoId(null);
    setFormulario({ ...inicial });
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editar(catalogo: CatalogoExterno) {
    setEditandoId(catalogo.id);
    setFormulario(aFormulario(catalogo));
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cambiar(campo: keyof Formulario, valor: string | boolean) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function subirImagen(campo: "logo_url" | "foto_perfil_url" | "portada_url", evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setError("Usá imágenes JPG, PNG o WebP.");
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 10 MB.");
      return;
    }
    setError("");
    setSubiendo(campo);
    try {
      const extension = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
      const ruta = `identidad/${crypto.randomUUID()}.${extension}`;
      const { error: errorSubida } = await supabase.storage.from("catalogos-externos").upload(ruta, archivo, {
        contentType: archivo.type,
        upsert: false,
      });
      if (errorSubida) throw errorSubida;
      const { data } = supabase.storage.from("catalogos-externos").getPublicUrl(ruta);
      cambiar(campo, data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(null);
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!autorizado || guardando) return;
    const nombre = formulario.nombre.trim();
    const slug = crearSlug(formulario.slug);
    if (!nombre || !slug) {
      setError("Completá el nombre del negocio y su enlace.");
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    const datos = {
      nombre,
      slug,
      descripcion: formulario.descripcion.trim() || null,
      whatsapp: formulario.whatsapp.replace(/\D/g, "") || null,
      color_principal: formulario.color_principal,
      color_secundario: formulario.color_secundario,
      logo_url: formulario.logo_url || null,
      foto_perfil_url: formulario.foto_perfil_url || null,
      portada_url: formulario.portada_url || null,
      activo: formulario.activo,
      actualizado_en: new Date().toISOString(),
    };
    try {
      const respuesta = editandoId === null
        ? await supabase.from("catalogos_externos").insert(datos)
        : await supabase.from("catalogos_externos").update(datos).eq("id", editandoId);
      if (respuesta.error) throw respuesta.error;
      await actualizarLista();
      setMostrarFormulario(false);
      setEditandoId(null);
      setFormulario({ ...inicial });
      setMensaje("Catálogo guardado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el catálogo.");
    } finally {
      setGuardando(false);
    }
  }

  async function copiarEnlace(catalogo: CatalogoExterno) {
    setError("");
    setMensaje("");
    const enlace = `${window.location.origin}/catalogo-externo/${encodeURIComponent(catalogo.slug)}`;
    try {
      await navigator.clipboard.writeText(enlace);
      setMensaje(`Enlace de «${catalogo.nombre}» copiado. Ya podés enviárselo al dueño del emprendimiento.`);
    } catch {
      setError("No se pudo copiar automáticamente el enlace. Comprobá los permisos del navegador.");
    }
  }

  async function cambiarEstadoCatalogo(catalogo: CatalogoExterno) {
    if (!autorizado || cambiandoEstadoId !== null || guardando) return;
    const siguienteEstado = !catalogo.activo;
    if (!siguienteEstado && !window.confirm(
      `¿Pausar el catálogo «${catalogo.nombre}»?\n\nEl enlace público dejará de mostrar el catálogo, pero los productos, categorías, precios e imágenes seguirán guardados. Podrás reactivarlo cuando quieras.`
    )) return;

    setError("");
    setMensaje("");
    setCambiandoEstadoId(catalogo.id);
    try {
      const { error: errorCambio } = await supabase
        .from("catalogos_externos")
        .update({ activo: siguienteEstado, actualizado_en: new Date().toISOString() })
        .eq("id", catalogo.id);
      if (errorCambio) throw errorCambio;
      await actualizarLista();
      if (editandoId === catalogo.id) {
        setFormulario((actual) => ({ ...actual, activo: siguienteEstado }));
      }
      setMensaje(siguienteEstado
        ? `Catálogo «${catalogo.nombre}» reactivado correctamente.`
        : `Catálogo «${catalogo.nombre}» pausado. Sus datos siguen guardados.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado del catálogo.");
    } finally {
      setCambiandoEstadoId(null);
    }
  }

  if (cargando) return (
    <main className={`min-h-screen p-8 ${modoOscuro ? "bg-black text-slate-300" : "bg-slate-50 text-slate-600"}`}>
      Cargando Catálogos Externos...
    </main>
  );
  if (!autorizado) return (
    <main className={`flex min-h-screen items-center justify-center p-6 ${modoOscuro ? "bg-black text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      <section className={`max-w-lg rounded-3xl p-8 text-center shadow-sm ${modoOscuro ? "border border-neutral-700 bg-[#171717]" : "bg-white"}`}>
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className={`mt-3 ${modoOscuro ? "text-slate-300" : "text-slate-600"}`}>
          {error || "Este módulo es exclusivo del propietario de ComerSys."}
        </p>
        <Link href="/admin" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Volver</Link>
      </section>
    </main>
  );

  const camposImagen = [
    { campo: "logo_url", titulo: "Logo" },
    { campo: "foto_perfil_url", titulo: "Foto de perfil" },
    { campo: "portada_url", titulo: "Foto de portada" },
  ] as const;

  return (
    <main className={`catalogos-externos-admin min-h-screen p-5 sm:p-8 ${modoOscuro ? "catalogos-externos-admin-dark bg-black text-slate-100" : "bg-[#F8FAFC] text-slate-800"}`}>
      {modoOscuro && (
        <style jsx global>{`
          /* Mismo negro y gris carbón del panel principal de ComerSys. */
          .catalogos-externos-admin-dark .bg-white { background-color: #171717 !important; }
          .catalogos-externos-admin-dark .bg-slate-50,
          .catalogos-externos-admin-dark .bg-slate-100 { background-color: #242424 !important; }
          .catalogos-externos-admin-dark .border-slate-200,
          .catalogos-externos-admin-dark .border-slate-300,
          .catalogos-externos-admin-dark .border-blue-200 { border-color: #404040 !important; }
          .catalogos-externos-admin-dark .text-slate-800,
          .catalogos-externos-admin-dark .text-slate-700 { color: #f1f5f9 !important; }
          .catalogos-externos-admin-dark .text-slate-600 { color: #cbd5e1 !important; }
          .catalogos-externos-admin-dark .text-slate-500,
          .catalogos-externos-admin-dark .text-slate-400 { color: #94a3b8 !important; }
          .catalogos-externos-admin-dark input:not([type="color"]):not([type="checkbox"]):not([type="file"]) {
            background-color: #242424 !important;
            border-color: #525252 !important;
            color: #f8fafc !important;
          }
          .catalogos-externos-admin-dark input::placeholder { color: #94a3b8 !important; }
          .catalogos-externos-admin-dark input[type="color"] { background-color: #242424; border-color: #525252; }
          .catalogos-externos-admin-dark input[type="file"] { color: #cbd5e1; }
          .catalogos-externos-admin-dark input[type="file"]::file-selector-button {
            background-color: #404040; color: #f8fafc; border: 0; border-radius: 0.5rem;
            padding: 0.4rem 0.65rem; margin-right: 0.75rem;
          }
          .catalogos-externos-admin-dark button.border { border-color: #525252; color: #f8fafc; }
          .catalogos-externos-admin-dark button.border:hover { background-color: #303030; }
          .catalogos-externos-admin-dark .text-green-700 { color: #86efac !important; }
          .catalogos-externos-admin-dark .text-amber-700 { color: #fcd34d !important; }
          .catalogos-externos-admin-dark .text-blue-700 { color: #93c5fd !important; }
          .catalogos-externos-admin-dark button.border-blue-200:hover { background-color: #303030 !important; }
          .catalogos-externos-admin-dark .bg-red-50 { background-color: #450a0a !important; }
          .catalogos-externos-admin-dark .bg-green-50 { background-color: #052e16 !important; }
          .catalogos-externos-admin-dark .text-red-700 { color: #fca5a5 !important; }
          .catalogos-externos-admin-dark .text-green-800 { color: #86efac !important; }
          .catalogos-externos-admin-dark .border-red-200 { border-color: #991b1b !important; }
          .catalogos-externos-admin-dark .border-green-200 { border-color: #166534 !important; }
        `}</style>
      )}
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-blue-600 hover:underline">← Panel principal</Link>
            <h1 className="mt-2 text-3xl font-black">Catálogos Externos</h1>
            <p className="mt-2 text-slate-500">Emprendimientos independientes, administrados únicamente desde ComerSys.</p>
          </div>
          <button type="button" onClick={nuevo} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700">
            + Nuevo emprendimiento
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
        {mensaje && <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">{mensaje}</p>}

        {mostrarFormulario && (
          <form onSubmit={guardar} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{editandoId === null ? "Crear emprendimiento" : "Editar emprendimiento"}</h2>
              <button type="button" onClick={() => setMostrarFormulario(false)} className="rounded-lg border px-3 py-2 font-semibold">Cerrar</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block font-semibold">Nombre del negocio *
                <input required value={formulario.nombre} onChange={(e) => {
                  const nombre = e.target.value;
                  setFormulario((actual) => ({
                    ...actual,
                    nombre,
                    slug: editandoId === null && (!actual.slug || actual.slug === crearSlug(actual.nombre)) ? crearSlug(nombre) : actual.slug,
                  }));
                }} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Almacén Don Pedro" />
              </label>
              <label className="block font-semibold">Identificador del enlace *
                <input required value={formulario.slug} onChange={(e) => cambiar("slug", crearSlug(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="almacen-don-pedro" />
              </label>
              <label className="block font-semibold">WhatsApp del negocio
                <input value={formulario.whatsapp} onChange={(e) => cambiar("whatsapp", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="5491123456789" />
              </label>
              <label className="block font-semibold">Descripción
                <input value={formulario.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Productos y novedades" />
              </label>
              <label className="block font-semibold">Color principal
                <input type="color" value={formulario.color_principal} onChange={(e) => cambiar("color_principal", e.target.value)} className="mt-2 block h-12 w-full rounded-lg border border-slate-300 p-1" />
              </label>
              <label className="block font-semibold">Color secundario
                <input type="color" value={formulario.color_secundario} onChange={(e) => cambiar("color_secundario", e.target.value)} className="mt-2 block h-12 w-full rounded-lg border border-slate-300 p-1" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {camposImagen.map(({ campo, titulo }) => (
                <label key={campo} className="block rounded-2xl border border-slate-200 p-4 font-semibold">
                  {titulo}
                  {formulario[campo] ? (
                    <img src={formulario[campo]} alt={titulo} className="mt-3 h-28 w-full rounded-lg bg-slate-100 object-contain" />
                  ) : (
                    <div className="mt-3 flex h-28 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">Sin imagen</div>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" disabled={subiendo !== null} onChange={(e) => void subirImagen(campo, e)} className="mt-3 block w-full text-xs" />
                  {subiendo === campo && <span className="mt-2 block text-xs text-blue-600">Subiendo...</span>}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-3 font-semibold">
              <input type="checkbox" checked={formulario.activo} onChange={(e) => cambiar("activo", e.target.checked)} className="h-5 w-5" />
              Catálogo activo (visible al público)
            </label>
            <p className="text-sm text-slate-500">Los productos y categorías se administran desde los accesos de cada emprendimiento, en la lista de abajo.</p>
            <button disabled={guardando || subiendo !== null} type="submit" className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50">
              {guardando ? "Guardando..." : "Guardar emprendimiento"}
            </button>
          </form>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Emprendimientos creados ({catalogos.length})</h2>
          {catalogos.length === 0 ? (
            <p className="mt-5 text-slate-500">Todavía no creaste catálogos externos. Comenzá con «Nuevo emprendimiento».</p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {catalogos.map((catalogo) => (
                <article key={catalogo.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row">
                  {catalogo.foto_perfil_url || catalogo.logo_url ? (
                    <img src={catalogo.foto_perfil_url || catalogo.logo_url || ""} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">🏪</div>}
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-black">{catalogo.nombre}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">/catalogo-externo/{catalogo.slug}</p>
                    <p className={`mt-2 text-xs font-bold ${catalogo.activo ? "text-green-700" : "text-amber-700"}`}>
                      {catalogo.activo ? "Activo" : "Desactivado"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => editar(catalogo)} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">Editar datos</button>
                      <Link href={`/admin-comersys/catalogos-externos/${catalogo.id}/productos`} className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
                        Administrar productos
                      </Link>
                      <Link href={`/admin-comersys/catalogos-externos/${catalogo.id}/categorias`} className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
                        Categorías
                      </Link>
                      {catalogo.activo && (
                        <a href={`/catalogo-externo/${encodeURIComponent(catalogo.slug)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50">
                          Ver catálogo público ↗
                        </a>
                      )}
                      <button type="button" onClick={() => void copiarEnlace(catalogo)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50">
                        Copiar enlace
                      </button>
                      <button
                        type="button"
                        disabled={cambiandoEstadoId !== null || guardando}
                        onClick={() => void cambiarEstadoCatalogo(catalogo)}
                        className={`rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50 ${catalogo.activo ? "border-amber-400 text-amber-700" : "border-green-400 text-green-700"}`}
                      >
                        {cambiandoEstadoId === catalogo.id ? "Procesando..." : catalogo.activo ? "Pausar catálogo" : "Reactivar catálogo"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
