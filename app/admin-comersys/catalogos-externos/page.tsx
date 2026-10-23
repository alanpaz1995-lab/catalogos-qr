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

  if (cargando) return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Cargando Catálogos Externos...</main>;
  if (!autorizado) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-3 text-slate-600">{error || "Este módulo es exclusivo del propietario de ComerSys."}</p>
        <Link href="/admin-comersys" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Volver</Link>
      </section>
    </main>
  );

  const camposImagen = [
    { campo: "logo_url", titulo: "Logo" },
    { campo: "foto_perfil_url", titulo: "Foto de perfil" },
    { campo: "portada_url", titulo: "Foto de portada" },
  ] as const;

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin-comersys" className="text-sm font-semibold text-blue-600 hover:underline">← SuperAdmin ComerSys</Link>
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
              Catálogo activo (visible al público una vez que construyamos la página pública)
            </label>
            <p className="text-sm text-slate-500">Por ahora se guarda la identidad del negocio. La administración de categorías, productos y la página pública se incorporarán en los siguientes pasos.</p>
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
                <article key={catalogo.id} className="flex gap-4 rounded-2xl border border-slate-200 p-4">
                  {catalogo.foto_perfil_url || catalogo.logo_url ? (
                    <img src={catalogo.foto_perfil_url || catalogo.logo_url || ""} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">🏪</div>}
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-black">{catalogo.nombre}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">/catalogo-externo/{catalogo.slug}</p>
                    <p className={`mt-2 text-xs font-bold ${catalogo.activo ? "text-green-700" : "text-amber-700"}`}>
                      {catalogo.activo ? "Activo" : "Desactivado"}
                    </p>
                    <button type="button" onClick={() => editar(catalogo)} className="mt-3 rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">Editar datos</button>
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
