"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type CategoriaExterna = {
  id: number;
  catalogo_id: number;
  nombre: string;
  orden: number;
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
  costo: number | null;
  stock_minimo: number | null;
  nuevo_ingreso: boolean;
  en_oferta: boolean;
  destacado: boolean;
  precio_mayorista: number | null;
  cantidad_minima_mayorista: number | null;
  stock: number | null;
  controlar_stock: boolean;
  imagen_url: string | null;
  activo: boolean;
  visible: boolean;
  creado_en?: string;
};

type CatalogoExterno = { id: number; nombre: string; slug: string };

type FormProducto = {
  nombre: string;
  codigo: string;
  categoria_id: string;
  descripcion: string;
  precio: string;
  costo: string;
  stock_minimo: string;
  nuevo_ingreso: boolean;
  en_oferta: boolean;
  destacado: boolean;
  precio_mayorista: string;
  cantidad_minima_mayorista: string;
  stock: string;
  controlar_stock: boolean;
  imagen_url: string;
  activo: boolean;
  visible: boolean;
};

const FORM_VACIO: FormProducto = {
  nombre: "",
  codigo: "",
  categoria_id: "",
  descripcion: "",
  precio: "",
  costo: "",
  stock_minimo: "0",
  nuevo_ingreso: true,
  en_oferta: false,
  destacado: false,
  precio_mayorista: "",
  cantidad_minima_mayorista: "10",
  stock: "",
  controlar_stock: false,
  imagen_url: "",
  activo: true,
  visible: true,
};

const dinero = (valor: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(valor);

export default function ProductosCatalogoExternoPage() {
  const archivoImagenRef = useRef<HTMLInputElement>(null);
  const params = useParams();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const catalogoId = Number(idParam);
  const idValido = Number.isSafeInteger(catalogoId) && catalogoId > 0;

  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [catalogo, setCatalogo] = useState<CatalogoExterno | null>(null);
  const [categorias, setCategorias] = useState<CategoriaExterna[]>([]);
  const [productos, setProductos] = useState<ProductoExterno[]>([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState<FormProducto>({ ...FORM_VACIO });
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [modoOscuro, setModoOscuro] = useState(false);

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

  const temaPagina = modoOscuro
    ? "bg-slate-950 text-slate-100"
    : "bg-[#F8FAFC] text-slate-800";
  const temaTarjeta = modoOscuro
    ? "border-slate-700 bg-slate-900"
    : "border-slate-200 bg-white";
  const temaCampo = modoOscuro
    ? "border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400"
    : "border-slate-300 bg-white text-slate-800";
  const temaSecundario = modoOscuro ? "text-slate-300" : "text-slate-600";
  const temaAyuda = modoOscuro ? "text-slate-400" : "text-slate-500";
  const temaLink = modoOscuro ? "text-blue-400" : "text-blue-700";
  const temaBordeBoton = modoOscuro
    ? "border-slate-600 text-slate-100 hover:bg-slate-800"
    : "border-slate-300 hover:bg-slate-50";


  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    setAutorizado(false);

    if (!idValido) {
      setError("El identificador del catálogo no es válido.");
      setCargando(false);
      return;
    }

    try {
      const { data: usuario, error: errorAuth } = await supabase.auth.getUser();
      if (errorAuth || !usuario.user) throw new Error("Iniciá sesión para continuar.");

      const [respuestaSuperadmin, respuestaEmpresa] = await Promise.all([
        supabase.from("superadmins").select("id").eq("auth_user_id", usuario.user.id).eq("activo", true).maybeSingle(),
        supabase.from("empresas").select("id").eq("id", 1).eq("auth_user_id", usuario.user.id).maybeSingle(),
      ]);
      if (respuestaSuperadmin.error) throw respuestaSuperadmin.error;
      if (respuestaEmpresa.error) throw respuestaEmpresa.error;
      if (!respuestaSuperadmin.data || !respuestaEmpresa.data) {
        throw new Error("Acceso restringido al propietario de ComerSys (empresa ID 1).");
      }
      setAutorizado(true);

      const [respuestaCatalogo, respuestaCategorias, respuestaProductos] = await Promise.all([
        supabase.from("catalogos_externos").select("id, nombre, slug").eq("id", catalogoId).maybeSingle(),
        supabase.from("categorias_externas").select("id, catalogo_id, nombre, orden, activo").eq("catalogo_id", catalogoId).order("orden", { ascending: true }).order("nombre", { ascending: true }),
        supabase.from("productos_externos").select("*").eq("catalogo_id", catalogoId).order("id", { ascending: false }),
      ]);
      if (respuestaCatalogo.error) throw respuestaCatalogo.error;
      if (respuestaCategorias.error) throw respuestaCategorias.error;
      if (respuestaProductos.error) throw respuestaProductos.error;
      if (!respuestaCatalogo.data) throw new Error("No se encontró este catálogo externo.");

      setCatalogo(respuestaCatalogo.data as CatalogoExterno);
      setCategorias((respuestaCategorias.data || []) as CategoriaExterna[]);
      setProductos((respuestaProductos.data || []) as ProductoExterno[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los productos.");
    } finally {
      setCargando(false);
    }
  }, [catalogoId, idValido]);

  useEffect(() => { void cargar(); }, [cargar]);

  function editarCampo<K extends keyof FormProducto>(campo: K, valor: FormProducto[K]) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function nuevoProducto() {
    setEditando(null);
    setForm({ ...FORM_VACIO });
    setError("");
    setAviso("");
  }

  function seleccionarProducto(producto: ProductoExterno) {
    setEditando(producto.id);
    setForm({
      nombre: producto.nombre,
      codigo: producto.codigo || "",
      categoria_id: producto.categoria_id == null ? "" : String(producto.categoria_id),
      descripcion: producto.descripcion || "",
      precio: String(producto.precio),
      costo: producto.costo == null ? "" : String(producto.costo),
      stock_minimo: String(producto.stock_minimo ?? 0),
      nuevo_ingreso: Boolean(producto.nuevo_ingreso),
      en_oferta: Boolean(producto.en_oferta),
      destacado: Boolean(producto.destacado),
      precio_mayorista: producto.precio_mayorista == null ? "" : String(producto.precio_mayorista),
      cantidad_minima_mayorista: String(producto.cantidad_minima_mayorista ?? 10),
      stock: producto.stock == null ? "" : String(producto.stock),
      controlar_stock: producto.controlar_stock,
      imagen_url: producto.imagen_url || "",
      activo: producto.activo,
      visible: producto.visible,
    });
    setError("");
    setAviso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function subirImagen(archivo?: File) {
    if (!archivo || !autorizado || !idValido) return;
    const extensiones: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    };
    const extension = extensiones[archivo.type];
    if (!extension) { setError("Usá una imagen JPG, PNG o WebP."); return; }
    if (archivo.size > 10 * 1024 * 1024) { setError("La imagen no puede superar los 10 MB."); return; }

    setSubiendoImagen(true);
    setError("");
    try {
      const nombre = `${catalogoId}/productos/${crypto.randomUUID()}.${extension}`;
      const { error: errorSubida } = await supabase.storage
        .from("catalogos-externos")
        .upload(nombre, archivo, { contentType: archivo.type, upsert: false });
      if (errorSubida) throw errorSubida;
      const { data } = supabase.storage.from("catalogos-externos").getPublicUrl(nombre);
      editarCampo("imagen_url", data.publicUrl);
      setAviso("Imagen subida. Guardá el producto para confirmar el cambio.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!autorizado || !catalogo || guardando || subiendoImagen) return;
    setError("");
    setAviso("");
    const nombre = form.nombre.trim();
    const precio = Number(form.precio);
    const costo = form.costo.trim() === "" ? 0 : Number(form.costo);
    const stockMinimo = Number(form.stock_minimo);
    const precioMayorista = form.precio_mayorista.trim() === "" ? null : Number(form.precio_mayorista);
    const minimo = Number(form.cantidad_minima_mayorista);
    const stock = form.stock.trim() === "" ? null : Number(form.stock);
    const categoriaId = form.categoria_id ? Number(form.categoria_id) : null;

    if (!nombre || form.precio.trim() === "" || !Number.isFinite(precio) || precio < 0) {
      setError("Ingresá un nombre y un precio válido (puede ser 0)."); return;
    }
    if (!Number.isFinite(costo) || costo < 0) { setError("El costo debe ser un número igual o mayor a cero."); return; }
    if (!Number.isInteger(stockMinimo) || stockMinimo < 0) { setError("El stock mínimo debe ser un entero igual o mayor a cero."); return; }
    if (form.descripcion.length > 1500) { setError("La descripción no puede superar 1500 caracteres."); return; }
    if (precioMayorista !== null && (!Number.isFinite(precioMayorista) || precioMayorista < 0)) {
      setError("El precio mayorista no es válido."); return;
    }
    if (!Number.isInteger(minimo) || minimo < 1) { setError("La cantidad mínima debe ser mayor a cero."); return; }
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) { setError("El stock debe ser un entero no negativo."); return; }
    if (form.controlar_stock && stock === null) { setError("Indicá el stock si activaste el control de stock."); return; }
    if (categoriaId !== null && !categorias.some((categoria) => categoria.id === categoriaId)) {
      setError("Seleccioná una categoría válida de este catálogo."); return;
    }

    const datos = {
      catalogo_id: catalogoId,
      categoria_id: categoriaId,
      nombre,
      codigo: form.codigo.trim() || null,
      descripcion: form.descripcion.trim() || null,
      precio,
      costo,
      stock_minimo: stockMinimo,
      nuevo_ingreso: form.nuevo_ingreso,
      en_oferta: form.en_oferta,
      destacado: form.destacado,
      precio_mayorista: precioMayorista,
      cantidad_minima_mayorista: minimo,
      stock,
      controlar_stock: form.controlar_stock,
      imagen_url: form.imagen_url.trim() || null,
      activo: form.activo,
      visible: form.visible,
      actualizado_en: new Date().toISOString(),
    };

    setGuardando(true);
    try {
      const consulta = editando === null
        ? supabase.from("productos_externos").insert(datos)
        : supabase.from("productos_externos").update(datos).eq("id", editando).eq("catalogo_id", catalogoId);
      const { error: errorGuardado } = await consulta;
      if (errorGuardado) throw errorGuardado;
      const eraNuevo = editando === null;
      nuevoProducto();
      await cargar();
      setAviso(eraNuevo ? "Producto creado correctamente." : "Producto actualizado correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(producto: ProductoExterno) {
    if (!autorizado || !window.confirm(`¿Eliminar definitivamente «${producto.nombre}» de este catálogo?`)) return;
    setError(""); setAviso("");
    const { error: errorEliminar } = await supabase.from("productos_externos")
      .delete().eq("id", producto.id).eq("catalogo_id", catalogoId);
    if (errorEliminar) { setError(errorEliminar.message); return; }
    if (editando === producto.id) nuevoProducto();
    await cargar();
    setAviso("Producto eliminado. La imagen almacenada no se borra automáticamente.");
  }

  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));
  const texto = busqueda.trim().toLocaleLowerCase("es");
  const filtrados = productos.filter((p) => [p.nombre, p.codigo, p.descripcion, nombreCategoria.get(p.categoria_id ?? -1)]
    .some((valor) => (valor || "").toLocaleLowerCase("es").includes(texto)));

  if (cargando && !catalogo) return <main className={`min-h-screen p-8 ${temaPagina}`}>Cargando productos externos...</main>;
  if (!autorizado || !catalogo) return (
    <main className={`min-h-screen p-8 ${temaPagina}`}>
      <div className={`mx-auto max-w-2xl rounded-2xl border p-8 shadow-sm ${temaTarjeta}`}>
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className={`mt-3 ${modoOscuro ? "text-red-300" : "text-red-700"}`}>{error || "No se encontró el catálogo o no tenés permisos."}</p>
        <Link className={`mt-5 inline-block underline ${temaLink}`} href="/admin-comersys/catalogos-externos">Volver a Catálogos Externos</Link>
      </div>
    </main>
  );

  return (
    <main className={`min-h-screen px-4 py-8 sm:px-8 ${temaPagina}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-blue-700 to-violet-700 p-6 text-white">
          <Link href="/admin-comersys/catalogos-externos" className="text-sm font-semibold text-blue-100 hover:underline">← Catálogos Externos</Link>
          <h1 className="mt-3 text-3xl font-black">Productos · {catalogo.nombre}</h1>
          <p className="mt-1 text-sm text-blue-100">Solo administración. Este módulo no genera pedidos ni pagos.</p>
          <Link href={`/admin-comersys/catalogos-externos/${catalogoId}/categorias`} className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700">Administrar categorías</Link>
        </header>

        {error && <div role="alert" className={`rounded-xl border p-4 ${modoOscuro ? "border-red-800 bg-red-950/50 text-red-200" : "border-red-200 bg-red-50 text-red-800"}`}>{error}</div>}
        {aviso && <div role="status" className={`rounded-xl border p-4 ${modoOscuro ? "border-green-800 bg-green-950/50 text-green-200" : "border-green-200 bg-green-50 text-green-800"}`}>{aviso}</div>}

         <form onSubmit={guardar} className="space-y-6">
           <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
             <section className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${temaTarjeta}`}>
               <div className="flex flex-wrap items-center justify-between gap-3">
                 <h2 className="text-xl font-bold">{editando === null ? "Información del producto" : `Editar producto #${editando}`}</h2>
                 {editando !== null && <button type="button" onClick={nuevoProducto} className={`rounded-xl border px-4 py-2 font-semibold ${temaBordeBoton}`}>Cancelar edición</button>}
               </div>
               <div className="mt-6 grid gap-6 md:grid-cols-2">
                 <div className="md:col-span-2">
                   <label htmlFor="externo-nombre" className="mb-2 block font-semibold">Nombre del producto *</label>
                   <input id="externo-nombre" required maxLength={200} value={form.nombre} onChange={(e) => editarCampo("nombre", e.target.value)} placeholder="Ejemplo: Mate imperial premium" className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                 </div>
                 <div className="md:col-span-2">
                   <label htmlFor="externo-codigo" className="mb-2 block font-semibold">Código del producto (opcional)</label>
                   <input id="externo-codigo" maxLength={80} value={form.codigo} onChange={(e) => editarCampo("codigo", e.target.value)} placeholder="Ejemplo: 000125 o MAT-001" className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                   <p className={`mt-2 text-xs ${temaAyuda}`}>Escribí el código tal como lo usa el negocio. No se modifica automáticamente.</p>
                 </div>
                 <div>
                   <label htmlFor="externo-categoria" className="mb-2 block font-semibold">Categoría</label>
                   <select id="externo-categoria" value={form.categoria_id} onChange={(e) => editarCampo("categoria_id", e.target.value)} className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`}>
                     <option value="">Sin categoría</option>
                     {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}{!c.activo ? " (inactiva)" : ""}</option>)}
                   </select>
                   {categorias.length === 0 && <Link href={`/admin-comersys/catalogos-externos/${catalogoId}/categorias`} className={`mt-2 inline-block text-xs font-semibold underline ${temaLink}`}>Crear una categoría</Link>}
                 </div>
                 <div>
                   <label htmlFor="externo-precio" className="mb-2 block font-semibold">Precio minorista *</label>
                   <input id="externo-precio" required type="number" min="0" step="0.01" value={form.precio} onChange={(e) => editarCampo("precio", e.target.value)} placeholder="Ejemplo: 25000" className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                 </div>
                 <div>
                   <label htmlFor="externo-costo" className="mb-2 block font-semibold">Costo del producto</label>
                   <input id="externo-costo" type="number" min="0" step="0.01" value={form.costo} onChange={(e) => editarCampo("costo", e.target.value)} placeholder="Ejemplo: 15000" className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                 </div>
                 <div>
                   <label htmlFor="externo-mayorista" className="mb-2 block font-semibold">Precio mayorista</label>
                   <input id="externo-mayorista" type="number" min="0" step="0.01" value={form.precio_mayorista} onChange={(e) => editarCampo("precio_mayorista", e.target.value)} placeholder="Opcional. Ejemplo: 22000" className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                 </div>
                 <div>
                   <label htmlFor="externo-minimo-mayorista" className="mb-2 block font-semibold">Mayorista desde</label>
                   <input id="externo-minimo-mayorista" type="number" min="1" step="1" value={form.cantidad_minima_mayorista} onChange={(e) => editarCampo("cantidad_minima_mayorista", e.target.value)} className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                 </div>
                 <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${modoOscuro ? "border-blue-800 bg-blue-950/40 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                   Si no cargás precio mayorista se usa el minorista. El precio mayorista se muestra desde la cantidad indicada.
                 </div>
                 {form.controlar_stock && <>
                   <div>
                     <label htmlFor="externo-stock" className="mb-2 block font-semibold">Stock actual *</label>
                     <input id="externo-stock" required type="number" min="0" step="1" value={form.stock} onChange={(e) => editarCampo("stock", e.target.value)} placeholder="Ejemplo: 10" className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                   </div>
                   <div>
                     <label htmlFor="externo-stock-minimo" className="mb-2 block font-semibold">Stock mínimo</label>
                     <input id="externo-stock-minimo" type="number" min="0" step="1" value={form.stock_minimo} onChange={(e) => editarCampo("stock_minimo", e.target.value)} className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`} />
                   </div>
                 </>}
                 <div>
                   <label htmlFor="externo-estado" className="mb-2 block font-semibold">Estado</label>
                   <select id="externo-estado" value={form.activo ? "activo" : "inactivo"} onChange={(e) => editarCampo("activo", e.target.value === "activo")} className={`w-full rounded-xl border px-4 py-3 ${temaCampo}`}>
                     <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
                   </select>
                 </div>
                 <div className="md:col-span-2">
                   <label htmlFor="externo-descripcion" className="mb-2 block font-semibold">Descripción</label>
                   <textarea id="externo-descripcion" rows={6} maxLength={1500} value={form.descripcion} onChange={(e) => editarCampo("descripcion", e.target.value)} placeholder="Descripción comercial del producto..." className={`w-full resize-none rounded-xl border px-4 py-3 ${temaCampo}`} />
                   <p className={`mt-2 text-right text-xs ${temaAyuda}`}>{form.descripcion.length}/1500</p>
                 </div>
               </div>
             </section>
             <div className="space-y-6">
               <section className={`rounded-3xl border p-6 shadow-sm ${temaTarjeta}`}>
                 <h2 className="text-xl font-bold">Imagen principal</h2>
                 <input ref={archivoImagenRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={subiendoImagen || guardando} onChange={(e) => { void subirImagen(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
                 {form.imagen_url ? <>
                   <img src={form.imagen_url} alt="Vista previa del producto" className={`mt-5 h-72 w-full rounded-2xl border object-contain ${modoOscuro ? "border-slate-700" : "border-slate-200"}`} />
                   <button type="button" disabled={subiendoImagen || guardando} onClick={() => archivoImagenRef.current?.click()} className={`mt-4 w-full rounded-xl border px-4 py-3 font-semibold ${temaBordeBoton}`}>Cambiar imagen</button>
                   <button type="button" disabled={subiendoImagen || guardando} onClick={() => editarCampo("imagen_url", "")} className={`mt-2 w-full rounded-xl border px-4 py-3 font-semibold ${modoOscuro ? "border-red-800 text-red-300" : "border-red-200 text-red-700"}`}>Quitar imagen</button>
                 </> : <button type="button" disabled={subiendoImagen || guardando} onClick={() => archivoImagenRef.current?.click()} className={`mt-5 flex h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition disabled:opacity-50 ${modoOscuro ? "border-slate-600 bg-slate-800/70 hover:border-blue-400" : "border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50"}`}>
                   <span className="text-5xl">🖼️</span>
                   <span className="mt-4 font-semibold">{subiendoImagen ? "Subiendo imagen..." : "Seleccionar imagen"}</span>
                   <span className={`mt-2 text-xs ${temaAyuda}`}>JPG, PNG o WEBP · Máximo 10 MB</span>
                 </button>}
                 <div className={`mt-5 rounded-2xl border p-4 ${modoOscuro ? "border-slate-700 bg-slate-800/70" : "border-blue-200 bg-blue-50"}`}>
                   <p className="font-bold">✨ Mejorar foto con ChatGPT</p>
                   <p className={`mt-2 text-sm leading-6 ${temaSecundario}`}>Es opcional. Podés mejorar la iluminación y el fondo con ChatGPT y luego seleccionar la foto acá.</p>
                   <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="mt-4 block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700">Abrir ChatGPT para mejorar foto ↗</a>
                   <p className={`mt-2 text-xs ${temaAyuda}`}>La foto no se envía automáticamente.</p>
                 </div>
               </section>
               <section className={`rounded-3xl border p-6 shadow-sm ${temaTarjeta}`}>
                 <h2 className="text-xl font-bold">Publicación y etiquetas</h2>
                 <div className="mt-5 space-y-3">
                   {([
                     ["controlar_stock", "Controlar stock disponible", "Activado: permite informar el stock disponible. No se generan ventas ni se descuenta stock automáticamente."],
                     ["visible", "Visible en catálogo", "El público podrá ver este producto si está activo."],
                     ["nuevo_ingreso", "Nuevo ingreso", "Muestra la etiqueta Nuevo."],
                     ["en_oferta", "Oferta", "Muestra la etiqueta Oferta."],
                     ["destacado", "Destacado", "Permite identificar un producto destacado."],
                   ] as const).map(([campo, titulo, detalle]) => (
                     <label key={campo} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${modoOscuro ? "border-slate-700 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
                       <input type="checkbox" checked={form[campo]} onChange={(e) => editarCampo(campo, e.target.checked)} className="mt-1 h-5 w-5" />
                       <span><span className="block font-semibold">{titulo}</span><span className={`mt-1 block text-xs leading-5 ${temaAyuda}`}>{detalle}</span></span>
                     </label>
                   ))}
                 </div>
               </section>
             </div>
           </div>
           <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
             {editando !== null && <button type="button" onClick={nuevoProducto} className={`rounded-xl border px-6 py-3 font-semibold ${temaBordeBoton}`}>Cancelar edición</button>}
             <button type="submit" disabled={guardando || subiendoImagen} className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white transition hover:bg-blue-800 disabled:opacity-50">{guardando ? "Guardando producto..." : editando === null ? "Guardar producto" : "Guardar cambios"}</button>
           </div>
         </form>
        <section className={`rounded-3xl border p-5 shadow-sm sm:p-7 ${temaTarjeta}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Productos cargados ({productos.length})</h2>
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar nombre, código o categoría" aria-label="Buscar productos" className={`w-full rounded-xl border p-3 sm:w-80 ${temaCampo}`} />
          </div>
          {filtrados.length === 0 ? <p className={`mt-5 ${temaAyuda}`}>No se encontraron productos.</p> : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((p) => (
                <article key={p.id} className={`flex flex-col rounded-2xl border p-4 ${modoOscuro ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                  {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="h-40 w-full rounded-xl object-cover" /> : <div className={`flex h-40 items-center justify-center rounded-xl ${modoOscuro ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-400"}`}>Sin imagen</div>}
                  <p className={`mt-3 text-xs font-semibold ${temaLink}`}>{nombreCategoria.get(p.categoria_id ?? -1) || "Sin categoría"}</p>
                  <h3 className="mt-1 text-lg font-bold">{p.nombre}</h3>
                  {p.codigo && <p className={`mt-1 break-words text-sm ${temaSecundario}`}>Código: {p.codigo}</p>}
                  <p className="mt-2 font-bold">{dinero(Number(p.precio))}</p>
                  {p.precio_mayorista != null && <p className={`text-sm ${temaSecundario}`}>Mayorista: {dinero(Number(p.precio_mayorista))}</p>}
                  <p className={`mt-1 text-xs ${temaAyuda}`}>{p.activo ? "Activo" : "Inactivo"} · {p.visible ? "Visible" : "Oculto"}</p>
                  <div className="mt-auto flex gap-2 pt-4">
                    <button type="button" onClick={() => seleccionarProducto(p)} className="flex-1 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white">Editar</button>
                    <button type="button" onClick={() => void eliminar(p)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${modoOscuro ? "border-red-700 text-red-400 hover:bg-red-950/40" : "border-red-300 text-red-700"}`}>Eliminar</button>
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
