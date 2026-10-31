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

type MultimediaExterna = {
  id: number;
  producto_id: number;
  tipo: string;
  url: string;
  orden: number;
  activo: boolean;
};

type MedioVisible = { tipo: "imagen" | "video"; url: string };

type VistaAmpliada = { nombre: string; medios: MedioVisible[]; indice: number };

type ItemCalculoExterno = { productoId: number; cantidad: number };

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
  const [multimedia, setMultimedia] = useState<MultimediaExterna[]>([]);
  const [categoriaActual, setCategoriaActual] = useState<number | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [imagenAmpliada, setImagenAmpliada] = useState<VistaAmpliada | null>(null);
  const [calculo, setCalculo] = useState<ItemCalculoExterno[]>([]);
  const [calculoAbierto, setCalculoAbierto] = useState(false);
  const [calculoIniciado, setCalculoIniciado] = useState(false);
  const [calculoCargadoId, setCalculoCargadoId] = useState<number | null>(null);
  const [avisoCalculo, setAvisoCalculo] = useState("");

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError("");
      setCatalogo(null);
      setCategorias([]);
      setProductos([]);
      setMultimedia([]);
      setCategoriaActual("todos");
      setCalculoAbierto(false);
      setCalculoCargadoId(null);
      setCalculo([]);
      setCalculoIniciado(false);

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

        const {data: multimediaData, error: errorMultimedia} = await supabase
          .from("producto_multimedia_externo")
          .select("id,producto_id,tipo,url,orden,activo")
          .eq("catalogo_id",catalogoData.id)
          .eq("activo",true)
          .order("orden",{ascending:true})
          .order("id",{ascending:true});
        if (errorMultimedia) throw errorMultimedia;
        if (!vigente) return;
        setMultimedia((multimediaData || []) as MultimediaExterna[]);

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

    function manejarTecladoGaleria(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setImagenAmpliada(null);
        return;
      }

      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const objetivo = event.target;
      if (objetivo instanceof HTMLElement &&
          (objetivo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(objetivo.tagName))) return;

      event.preventDefault();
      const desplazamiento = event.key === "ArrowRight" ? 1 : -1;
      setImagenAmpliada((actual) => {
        if (!actual || actual.medios.length <= 1) return actual;
        return {
          ...actual,
          indice: (actual.indice + desplazamiento + actual.medios.length) % actual.medios.length,
        };
      });
    }

    window.addEventListener("keydown", manejarTecladoGaleria);
    return () => window.removeEventListener("keydown", manejarTecladoGaleria);
  }, [imagenAmpliada]);

  // Cada catálogo externo conserva únicamente su propio cálculo en este navegador.
  useEffect(() => {
    if (!catalogo || cargando || calculoCargadoId === catalogo.id) return;
    try {
      const guardado = window.localStorage.getItem(`comersys_calculo_externo_${catalogo.id}`);
      const valores: unknown = guardado ? JSON.parse(guardado) : [];
      const recuperados: ItemCalculoExterno[] = Array.isArray(valores)
        ? valores.flatMap((valor: unknown) => {
            if (!valor || typeof valor !== "object") return [];
            const dato = valor as Record<string, unknown>;
            const productoId = Number(dato.productoId);
            const cantidad = Math.floor(Number(dato.cantidad));
            const producto = productos.find((p) => p.id === productoId);
            return producto && Number.isFinite(cantidad) && cantidad > 0
              ? [{ productoId, cantidad }] : [];
          })
        : [];
      setCalculo(recuperados);
      setCalculoIniciado(recuperados.length > 0);
    } catch (fallo) {
      console.warn("No se pudo recuperar el cálculo del catálogo externo:", fallo);
      setCalculo([]);
    }
    setCalculoCargadoId(catalogo.id);
  }, [catalogo, cargando, productos, calculoCargadoId]);

  useEffect(() => {
    if (!catalogo || calculoCargadoId !== catalogo.id) return;
    try {
      window.localStorage.setItem(`comersys_calculo_externo_${catalogo.id}`, JSON.stringify(calculo));
    } catch (fallo) {
      console.warn("No se pudo guardar el cálculo:", fallo);
    }
  }, [catalogo, calculo, calculoCargadoId]);

  function minimoMayorista(producto: ProductoExterno) {
    const minimo = Number(producto.cantidad_minima_mayorista ?? 10);
    return Number.isFinite(minimo) && minimo > 0 ? minimo : 10;
  }

  function precioAplicado(producto: ProductoExterno, cantidad: number) {
    return producto.precio_mayorista != null &&
      Number.isFinite(Number(producto.precio_mayorista)) &&
      cantidad >= minimoMayorista(producto)
      ? Number(producto.precio_mayorista)
      : Number(producto.precio);
  }

  function agregarAlCalculo(producto: ProductoExterno) {
    const sinStock = producto.controlar_stock && producto.stock != null && Number(producto.stock) <= 0;
    if (sinStock) {
      setAvisoCalculo("Este producto no está disponible.");
      return;
    }
    setCalculoIniciado(true);
    setAvisoCalculo("");
    setCalculo((actual) => {
      const existente = actual.find((item) => item.productoId === producto.id);
      const siguiente = (existente?.cantidad ?? 0) + 1;
      if (producto.controlar_stock && producto.stock != null && siguiente > Number(producto.stock)) {
        setAvisoCalculo("No hay unidades suficientes de este producto.");
        return actual;
      }
      return existente
        ? actual.map((item) => item.productoId === producto.id ? { ...item, cantidad: siguiente } : item)
        : [...actual, { productoId: producto.id, cantidad: 1 }];
    });
  }

  function cambiarCantidadCalculo(productoId: number, cambio: number) {
    setAvisoCalculo("");
    setCalculo((actual) => actual.flatMap((item) => {
      if (item.productoId !== productoId) return [item];
      const cantidad = item.cantidad + cambio;
      if (cantidad <= 0) return [];
      const producto = productos.find((p) => p.id === productoId);
      if (!producto) return [];
      if (producto.controlar_stock && producto.stock != null && cantidad > Number(producto.stock)) {
        setAvisoCalculo("No hay unidades suficientes de este producto.");
        return [item];
      }
      return [{ ...item, cantidad }];
    }));
  }

  function imprimirCalculo() {
    if (!catalogo || calculo.length === 0) return;
    const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
    const filas = calculo.flatMap(({ productoId, cantidad }) => {
      const producto = productos.find((p) => p.id === productoId);
      if (!producto) return [];
      const unitario = precioAplicado(producto, cantidad);
      return [`<tr><td>${escapar(producto.codigo)}</td><td>${escapar(producto.nombre)}</td><td class="num">${cantidad}</td><td class="num">${escapar(precioARS(unitario))}</td><td class="num">${escapar(precioARS(unitario * cantidad))}</td></tr>`];
    }).join("");
    const total = calculo.reduce((suma, item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      return producto ? suma + precioAplicado(producto, item.cantidad) * item.cantidad : suma;
    }, 0);
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
      <title>Cálculo de compra - ${escapar(catalogo.nombre)}</title><style>
      body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:12px}
      h1{font-size:23px;margin:6px 0} h2{font-size:17px;margin:0}
      .muted{color:#64748b}.cabecera{border-bottom:2px solid #334155;padding-bottom:18px;margin-bottom:22px}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      th,td{padding:10px 7px;border-bottom:1px solid #cbd5e1;text-align:left;vertical-align:top}
      th{background:#f1f5f9}.num{text-align:right;white-space:nowrap}
      .total{font-size:21px;text-align:right;margin-top:22px;font-weight:700}
      .nota{margin-top:24px;color:#64748b;font-size:11px}
      @page{size:A4;margin:14mm} @media print{body{padding:0}}
      </style></head><body><div class="cabecera"><h2>${escapar(catalogo.nombre)}</h2>
      <h1>Mi cálculo de compra</h1><div class="muted">Fecha: ${new Date().toLocaleDateString("es-AR")} · Documento informativo</div>
      ${catalogo.whatsapp ? `<p>Contacto del negocio: ${escapar(catalogo.whatsapp)}</p>` : ""}
      </div><table><thead><tr><th>Código</th><th>Producto</th><th class="num">Cantidad</th><th class="num">Precio unitario</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${filas}</tbody></table><div class="total">Total estimado: ${escapar(precioARS(total))}</div>
      <p class="nota">Cálculo informativo, no constituye un pedido confirmado. Precios y disponibilidad sujetos a confirmación del negocio.</p>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      setAvisoCalculo("El navegador bloqueó la ventana emergente. Permitila para guardar el PDF.");
      return;
    }
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.setTimeout(() => ventana.print(), 450);
  }

  function mediosProducto(producto: ProductoExterno): MedioVisible[] {
    const medios: MedioVisible[] = [];
    if (producto.imagen_url) medios.push({tipo:"imagen",url:producto.imagen_url});
    for (const item of multimedia) {
      if (item.producto_id !== producto.id || !item.activo) continue;
      if (item.tipo.toLowerCase() === "video") medios.push({tipo:"video",url:item.url});
      else if (item.tipo.toLowerCase() === "imagen" || item.tipo.toLowerCase() === "foto") medios.push({tipo:"imagen",url:item.url});
    }
    return medios;
  }

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

  const itemsCalculo = calculo.flatMap(({ productoId, cantidad }) => {
    const producto = productos.find((p) => p.id === productoId);
    return producto ? [{ producto, cantidad }] : [];
  });
  const cantidadCalculo = itemsCalculo.reduce((suma, item) => suma + item.cantidad, 0);
  const totalCalculo = itemsCalculo.reduce((suma, item) =>
    suma + precioAplicado(item.producto, item.cantidad) * item.cantidad, 0);

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
      {/* Portada integrada, con el estilo visual del panel ComerSys. */}
      <header className="px-4 pt-5 sm:px-8 sm:pt-8">
        <div
          className="relative mx-auto flex min-h-[340px] max-w-7xl items-end overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 shadow-2xl sm:min-h-[420px] sm:rounded-[36px]"
          style={{ backgroundColor: principal }}
        >
          {catalogo.portada_url && (
            <img
              src={catalogo.portada_url}
              alt={`Portada de ${catalogo.nombre}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* El degradado permite leer el nombre incluso sobre fotografías claras. */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/25" />
          <div
            className="absolute bottom-0 left-0 right-0 h-1.5"
            style={{ background: `linear-gradient(90deg, ${principal}, ${secundario})` }}
          />

          <div className="relative z-10 w-full p-6 sm:p-9 lg:p-11">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              Catálogo oficial
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-7">
              {fotoPerfil ? (
                <img
                  src={fotoPerfil}
                  alt={`Logo de ${catalogo.nombre}`}
                  className="h-24 w-24 shrink-0 rounded-3xl border-4 border-white object-cover shadow-xl sm:h-36 sm:w-36"
                />
              ) : (
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-white/80 text-4xl font-black text-white shadow-xl sm:h-36 sm:w-36 sm:text-6xl"
                  style={{ backgroundColor: principal }}
                  aria-hidden="true"
                >
                  {catalogo.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                  Bienvenidos a nuestro catálogo
                </p>
                <h1 className="break-words text-4xl font-black leading-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                  {catalogo.nombre}
                </h1>
                {catalogo.descripcion && (
                  <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/90 sm:text-base">
                    {catalogo.descripcion}
                  </p>
                )}
              </div>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl px-5 py-3.5 text-center text-sm font-extrabold text-white shadow-lg transition hover:brightness-110"
                  style={{ backgroundColor: secundario }}
                >
                  Contactar por WhatsApp ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {cantidadCalculo > 0 && !calculoAbierto && (
        <button type="button" onClick={() => setCalculoAbierto(true)}
          className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2rem)] rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-xl">
          🧮 Mi cálculo ({cantidadCalculo}) · {precioARS(totalCalculo)}
        </button>
      )}
      {calculoAbierto && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-label="Mi cálculo de compra"
            className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white p-5 text-slate-800 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold">Mi cálculo de compra</h2>
                <p className="text-xs text-slate-500">{catalogo.nombre} · Sin compromiso de compra</p>
              </div>
              <button type="button" onClick={() => setCalculoAbierto(false)}
                className="rounded-lg bg-slate-100 px-3 py-2 font-semibold">Cerrar ✕</button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {itemsCalculo.length === 0 ? (
                <p className="py-8 text-center text-slate-500">El cálculo está vacío. Agregá productos del catálogo.</p>
              ) : itemsCalculo.map(({ producto, cantidad }) => {
                const precio = precioAplicado(producto, cantidad);
                const mayorista = producto.precio_mayorista != null && cantidad >= minimoMayorista(producto);
                return (
                  <div key={producto.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{producto.nombre}</p>
                        {producto.codigo?.trim() && <p className="text-xs text-slate-500">Código: {producto.codigo}</p>}
                        <p className="mt-1 text-sm">{precioARS(precio)} por unidad {producto.precio_mayorista != null ? `· ${mayorista ? "Mayorista" : "Minorista"}` : ""}</p>
                        {!mayorista && producto.precio_mayorista != null && (
                          <p className="text-xs text-emerald-700">Mayorista desde {minimoMayorista(producto)} unidades</p>
                        )}
                      </div>
                      <p className="shrink-0 font-bold">{precioARS(precio * cantidad)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-2 py-1">
                        <button type="button" onClick={() => cambiarCantidadCalculo(producto.id, -1)}
                          className="px-2 py-1 font-bold" aria-label="Disminuir cantidad">−</button>
                        <span className="min-w-6 text-center font-semibold">{cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidadCalculo(producto.id, 1)}
                          className="px-2 py-1 font-bold" aria-label="Aumentar cantidad">+</button>
                      </div>
                      <button type="button" onClick={() => setCalculo((actual) => actual.filter((item) => item.productoId !== producto.id))}
                        className="text-sm font-semibold text-red-600">Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              {avisoCalculo && <p role="alert" className="mb-3 text-sm font-semibold text-red-600">{avisoCalculo}</p>}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total estimado</span><span>{precioARS(totalCalculo)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{cantidadCalculo} unidades · Los precios pueden cambiar.</p>
              <button type="button" onClick={imprimirCalculo} disabled={itemsCalculo.length === 0}
                className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">
                📄 Descargar cálculo en PDF
              </button>
              <p className="mt-1 text-center text-xs text-slate-500">En la ventana de impresión elegí «Guardar como PDF».</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => { setCalculo([]); setAvisoCalculo(""); }} disabled={itemsCalculo.length === 0}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40">Vaciar cálculo</button>
                <button type="button" onClick={() => setCalculoAbierto(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold">Seguir viendo productos</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productosVisibles.map((producto) => {
              const nombreCategoria = categorias.find((cat) => cat.id === producto.categoria_id)?.nombre || "Sin categoría";
              const medios = mediosProducto(producto);
              const sinStock = producto.controlar_stock && producto.stock != null && producto.stock <= 0;
              return (
                <article key={producto.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                   {medios.length > 0 ? (
                     <div>
                       <button type="button" onClick={() => setImagenAmpliada({ medios, indice:0, nombre:producto.nombre })} aria-label={`Ver galería de ${producto.nombre}`} className="relative h-56 w-full overflow-hidden bg-slate-100">
                         {medios[0].tipo === "video" ? <video src={medios[0].url} muted preload="metadata" className="h-full w-full object-cover" /> : <img src={medios[0].url} alt={producto.nombre} className="h-full w-full object-cover" />}
                         {medios[0].tipo === "video" && <span className="absolute inset-0 flex items-center justify-center text-5xl text-white drop-shadow-lg">▶</span>}
                         {medios.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white">{medios.length} archivos</span>}
                       </button>
                       {medios.length > 1 && <div className="flex gap-2 overflow-x-auto px-2 py-1.5">{medios.map((medio,i)=><button key={`${medio.url}-${i}`} type="button" onClick={()=>setImagenAmpliada({medios,indice:i,nombre:producto.nombre})} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100" aria-label={`Abrir archivo ${i+1}`}>
                         {medio.tipo === "video" ? <span className="flex h-full items-center justify-center bg-slate-900 text-xl text-white">▶</span> : <img src={medio.url} alt="" className="h-full w-full object-cover" />}
                       </button>)}</div>}
                     </div>
                  ) : (
                     <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">Sin imagen</div>
                  )}
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="text-xs font-semibold" style={{ color: principal }}>{nombreCategoria}</p>
                    <h3 className="mt-1 text-lg font-bold leading-snug">{producto.nombre}</h3>
                    {producto.descripcion && <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-5 text-slate-600">{producto.descripcion}</p>}
                    {producto.codigo?.trim() && <p className="mt-1 break-words text-xs text-slate-500">Código: <strong>{producto.codigo}</strong></p>}
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase text-slate-400">{producto.precio_mayorista != null ? "Precio minorista" : "Precio"}</p>
                      <p className="mt-0.5 text-xl font-bold">{precioARS(Number(producto.precio))}</p>
                      {producto.precio_mayorista != null && (
                        <div className="mt-2 rounded-lg bg-emerald-50 p-2.5">
                          <p className="text-xs font-semibold text-emerald-700">Precio mayorista</p>
                          <p className="mt-0.5 text-lg font-bold text-emerald-800">{precioARS(Number(producto.precio_mayorista))}</p>
                          <p className="mt-0.5 text-xs text-emerald-700">Desde {Math.max(1, Number(producto.cantidad_minima_mayorista || 10))} unidades</p>
                        </div>
                      )}
                      {sinStock && <p className="mt-2 text-xs font-semibold text-slate-500">Sin stock</p>}
                    </div>
                    <div className="mt-3 flex flex-1 flex-col justify-end gap-2">
                      <button type="button" onClick={() => agregarAlCalculo(producto)} disabled={sinStock}
                        className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 text-center text-[13px] font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                        🧮 {calculoIniciado ? "Agregar al cálculo" : "Calcular mi compra"}
                      </button>
                      <a href={linkConsulta(producto)} target="_blank" rel="noopener noreferrer"
                        className="block w-full rounded-lg px-3 py-2.5 text-center text-[13px] font-semibold text-white transition hover:brightness-95"
                        style={{ backgroundColor: secundario }}>Consultar por WhatsApp</a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

       {imagenAmpliada && (
         <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/95 p-5" role="dialog" aria-modal="true" aria-label={`Galería de ${imagenAmpliada.nombre}`} onClick={() => setImagenAmpliada(null)}>
           <button type="button" onClick={() => setImagenAmpliada(null)} className="absolute right-5 top-5 z-10 rounded-full bg-white px-4 py-2 font-bold text-slate-900">Cerrar ×</button>
           <div className="flex w-full max-w-5xl items-center justify-center gap-3" onClick={e=>e.stopPropagation()}>
             {imagenAmpliada.medios.length>1 && <button type="button" aria-label="Anterior" className="rounded-full bg-white p-3 font-bold" onClick={()=>setImagenAmpliada(v=>v?{...v,indice:(v.indice-1+v.medios.length)%v.medios.length}:null)}>‹</button>}
             <div className="flex min-w-0 flex-1 justify-center">
               {imagenAmpliada.medios[imagenAmpliada.indice].tipo === "video" ?
                 <video key={imagenAmpliada.medios[imagenAmpliada.indice].url} src={imagenAmpliada.medios[imagenAmpliada.indice].url} controls playsInline preload="metadata" className="max-h-[80vh] max-w-full" /> :
                 <img src={imagenAmpliada.medios[imagenAmpliada.indice].url} alt={imagenAmpliada.nombre} className="max-h-[80vh] max-w-full object-contain" />}
             </div>
             {imagenAmpliada.medios.length>1 && <button type="button" aria-label="Siguiente" className="rounded-full bg-white p-3 font-bold" onClick={()=>setImagenAmpliada(v=>v?{...v,indice:(v.indice+1)%v.medios.length}:null)}>›</button>}
           </div>
           <p className="text-sm text-white">{imagenAmpliada.indice+1} de {imagenAmpliada.medios.length}</p>
         </div>
      )}
      <footer className="mt-8 border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">Catálogo creado con ComerSys</footer>
    </main>
  );
}
