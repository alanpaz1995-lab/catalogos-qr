"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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

type CategoriaExterna = {
  id: number;
  catalogo_id: number;
  nombre: string;
  orden: number | null;
  activo: boolean;
};

type ProductoExterno = {
  id: number;
  catalogo_id: number;
  categoria_id: number | null;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  precio: number;
  precio_mayorista: number | null;
  cantidad_minima_mayorista: number | null;
  stock: number | null;
  controlar_stock: boolean;
  imagen_url: string | null;
  activo: boolean;
  visible: boolean;
};

function precioARS(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(valor);
}

function colorSeguro(valor: string | null | undefined, respaldo: string) {
  return valor && /^#[0-9a-fA-F]{6}$/.test(valor.trim())
    ? valor.trim()
    : respaldo;
}

export default function CatalogoExternoPublicoPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [catalogo, setCatalogo] = useState<CatalogoExterno | null>(null);
  const [categorias, setCategorias] = useState<CategoriaExterna[]>([]);
  const [productos, setProductos] = useState<ProductoExterno[]>([]);
  const [categoriaActual, setCategoriaActual] = useState<number | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [imagenAmpliada, setImagenAmpliada] = useState<{ url: string; nombre: string } | null>(null);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError("");
      setCatalogo(null);
      setCategorias([]);
      setProductos([]);
      setCategoriaActual("todos");

      if (!slug) {
        setError("El enlace del catálogo no es válido.");
        setCargando(false);
        return;
      }

      try {
        const { data: catalogoData, error: errorCatalogo } = await supabase
          .from("catalogos_externos")
          .select("id, nombre, slug, descripcion, logo_url, foto_perfil_url, portada_url, whatsapp, color_principal, color_secundario, activo")
          .eq("slug", slug)
          .eq("activo", true)
          .maybeSingle();

        if (errorCatalogo) throw errorCatalogo;
        if (!catalogoData) {
          if (vigente) setError("No encontramos este catálogo o todavía no está publicado.");
          return;
        }

        const { data: categoriasData, error: errorCategorias } = await supabase
          .from("categorias_externas")
          .select("id, catalogo_id, nombre, orden, activo")
          .eq("catalogo_id", catalogoData.id)
          .eq("activo", true)
          .order("orden", { ascending: true })
          .order("nombre", { ascending: true });

        if (errorCategorias) throw errorCategorias;

        const { data: productosData, error: errorProductos } = await supabase
          .from("productos_externos")
          .select("id, catalogo_id, categoria_id, nombre, codigo, descripcion, precio, precio_mayorista, cantidad_minima_mayorista, stock, controlar_stock, imagen_url, activo, visible")
          .eq("catalogo_id", catalogoData.id)
          .eq("activo", true)
          .eq("visible", true);

        if (errorProductos) throw errorProductos;
        if (!vigente) return;

        setCatalogo(catalogoData as CatalogoExterno);
        setCategorias((categoriasData || []) as CategoriaExterna[]);
        setProductos((productosData || []) as ProductoExterno[]);
      } catch (fallo) {
        if (vigente) {
          console.error("Error al cargar catálogo externo:", fallo);
          setError("No pudimos cargar el catálogo. Intentá nuevamente más tarde.");
        }
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void cargar();
    return () => { vigente = false; };
  }, [slug]);

  useEffect(() => {
    if (!imagenAmpliada) return;
    function cerrar(event: KeyboardEvent) {
      if (event.key === "Escape") setImagenAmpliada(null);
    }
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [imagenAmpliada]);

  const categoriasVisibles = useMemo(() => {
    const existentes = new Set(productos.map((p) => p.categoria_id));
    return categorias.filter((c) => existentes.has(c.id));
  }, [categorias, productos]);

  const productosVisibles = useMemo(() => {
    const posiciones = new Map(categorias.map((cat, index) => [cat.id, index]));
    const term = busqueda.trim().toLocaleLowerCase("es");
    return productos
      .filter((p) => {
        if (categoriaActual !== "todos" && p.categoria_id !== categoriaActual) return false;
        if (!term) return true;
        const nombreCategoria = categorias.find((c) => c.id === p.categoria_id)?.nombre || "";
        return [p.nombre, p.codigo, p.descripcion, nombreCategoria].some((campo) =>
          (campo || "").toLocaleLowerCase("es").includes(term)
        );
      })
      .sort((a, b) => {
        const posA = posiciones.get(a.categoria_id ?? -1) ?? Number.MAX_SAFE_INTEGER;
        const posB = posiciones.get(b.categoria_id ?? -1) ?? Number.MAX_SAFE_INTEGER;
        if (posA !== posB) return posA - posB;
        return b.id - a.id;
      });
  }, [productos, categorias, busqueda, categoriaActual]);

  if (cargando) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8 text-slate-600">Cargando catálogo...</main>;
  }

  if (error || !catalogo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">Catálogo no disponible</h1>
          <p className="mt-3 text-slate-600">{error || "No se pudo cargar este catálogo."}</p>
        </div>
      </main>
    );
  }

  const principal = colorSeguro(catalogo.color_principal, "#2563EB");
  const secundario = colorSeguro(catalogo.color_secundario, "#16A34A");
  const whatsapp = (catalogo.whatsapp || "").replace(/\D/g, "");
  const fotoPerfil = catalogo.foto_perfil_url || catalogo.logo_url;

  function linkConsulta(producto: ProductoExterno) {
    const codigo = producto.codigo?.trim() ? ` (código ${producto.codigo.trim()})` : "";
    const mensaje = encodeURIComponent(`Hola, quería consultar por ${producto.nombre}${codigo} del catálogo de ${catalogo!.nombre}.`);
    return whatsapp ? `https://wa.me/${whatsapp}?text=${mensaje}` : `https://wa.me/?text=${mensaje}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white shadow-sm">
        {catalogo.portada_url ? (
          <div className="relative h-48 overflow-hidden bg-slate-100 sm:h-72">
            <img src={catalogo.portada_url} alt={`Portada de ${catalogo.nombre}`} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-24 sm:h-32" style={{ backgroundColor: principal }} />
        )}
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-8">
          {fotoPerfil && (
            <img src={fotoPerfil} alt={`Perfil de ${catalogo.nombre}`} className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold sm:text-4xl">{catalogo.nombre}</h1>
            {catalogo.descripcion && <p className="mt-2 whitespace-pre-line text-slate-600">{catalogo.descripcion}</p>}
          </div>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="rounded-xl px-5 py-3 text-center font-semibold text-white" style={{ backgroundColor: secundario }}>
              Contactar por WhatsApp
            </a>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Nuestros productos</h2>
            <p className="mt-1 text-sm text-slate-500">Explorá el catálogo y consultá directamente al negocio.</p>
          </div>
          <input type="search" aria-label="Buscar productos" placeholder="Buscar por nombre, categoría o código..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 sm:max-w-md" style={{ outlineColor: principal }} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategoriaActual("todos")} className="rounded-full px-4 py-2 text-sm font-semibold" style={categoriaActual === "todos" ? { backgroundColor: principal, color: "white" } : { backgroundColor: "#e2e8f0" }}>Todos</button>
          {categoriasVisibles.map((cat) => (
            <button type="button" key={cat.id} onClick={() => setCategoriaActual(cat.id)} className="rounded-full px-4 py-2 text-sm font-semibold" style={categoriaActual === cat.id ? { backgroundColor: principal, color: "white" } : { backgroundColor: "#e2e8f0" }}>{cat.nombre}</button>
          ))}
        </div>

        {productosVisibles.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center text-slate-500">No se encontraron productos.</div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productosVisibles.map((producto) => {
              const nombreCategoria = categorias.find((cat) => cat.id === producto.categoria_id)?.nombre || "Sin categoría";
              const sinStock = producto.controlar_stock && producto.stock != null && producto.stock <= 0;
              return (
                <article key={producto.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {producto.imagen_url ? (
                    <button type="button" onClick={() => setImagenAmpliada({ url: producto.imagen_url!, nombre: producto.nombre })} aria-label={`Ampliar imagen de ${producto.nombre}`} className="h-56 w-full overflow-hidden bg-slate-100">
                      <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">Sin imagen</div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-sm font-semibold" style={{ color: principal }}>{nombreCategoria}</p>
                    <h3 className="mt-2 text-xl font-bold">{producto.nombre}</h3>
                    {producto.descripcion && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{producto.descripcion}</p>}
                    {producto.codigo?.trim() && <p className="mt-2 break-words text-sm text-slate-500">Código: <strong>{producto.codigo}</strong></p>}
                    <div className="mt-auto pt-5">
                      <p className="text-xs font-semibold uppercase text-slate-400">{producto.precio_mayorista != null ? "Precio minorista" : "Precio"}</p>
                      <p className="mt-1 text-2xl font-bold">{precioARS(Number(producto.precio))}</p>
                      {producto.precio_mayorista != null && (
                        <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                          <p className="text-xs font-semibold text-emerald-700">Precio mayorista</p>
                          <p className="mt-1 text-xl font-bold text-emerald-800">{precioARS(Number(producto.precio_mayorista))}</p>
                          <p className="mt-1 text-xs text-emerald-700">Desde {Math.max(1, Number(producto.cantidad_minima_mayorista || 10))} unidades</p>
                        </div>
                      )}
                      {sinStock && <p className="mt-3 text-sm font-semibold text-slate-500">Sin stock</p>}
                      <a href={linkConsulta(producto)} target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-xl px-4 py-3 text-center font-semibold text-white hover:brightness-95" style={{ backgroundColor: secundario }}>Consultar por WhatsApp</a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {imagenAmpliada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5" role="dialog" aria-modal="true" aria-label={`Imagen de ${imagenAmpliada.nombre}`} onClick={() => setImagenAmpliada(null)}>
          <button type="button" onClick={() => setImagenAmpliada(null)} className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 font-bold text-slate-900">Cerrar ×</button>
          <img src={imagenAmpliada.url} alt={imagenAmpliada.nombre} className="max-h-[85vh] max-w-[95vw] object-contain" />
        </div>
      )}
      <footer className="mt-8 border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">Catálogo creado con ComerSys</footer>
    </main>
  );
}
