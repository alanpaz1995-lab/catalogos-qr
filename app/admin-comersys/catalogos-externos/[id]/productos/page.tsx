"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
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
    const precioMayorista = form.precio_mayorista.trim() === "" ? null : Number(form.precio_mayorista);
    const minimo = Number(form.cantidad_minima_mayorista);
    const stock = form.stock.trim() === "" ? null : Number(form.stock);
    const categoriaId = form.categoria_id ? Number(form.categoria_id) : null;

    if (!nombre || form.precio.trim() === "" || !Number.isFinite(precio) || precio < 0) {
      setError("Ingresá un nombre y un precio válido (puede ser 0)."); return;
    }
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
      nuevoProducto();
      await cargar();
      setAviso(editando === null ? "Producto creado correctamente." : "Producto actualizado correctamente.");
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

  if (cargando && !catalogo) return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Cargando productos externos...</main>;
  if (!autorizado || !catalogo) return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-3 text-red-700">{error || "No se encontró el catálogo o no tenés permisos."}</p>
        <Link className="mt-5 inline-block text-blue-700 underline" href="/admin-comersys/catalogos-externos">Volver a Catálogos Externos</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-blue-700 to-violet-700 p-6 text-white">
          <Link href="/admin-comersys/catalogos-externos" className="text-sm font-semibold text-blue-100 hover:underline">← Catálogos Externos</Link>
          <h1 className="mt-3 text-3xl font-black">Productos · {catalogo.nombre}</h1>
          <p className="mt-1 text-sm text-blue-100">Solo administración. Este módulo no genera pedidos ni pagos.</p>
          <Link href={`/admin-comersys/catalogos-externos/${catalogoId}/categorias`} className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700">Administrar categorías</Link>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
        {aviso && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">{aviso}</div>}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">{editando === null ? "Nuevo producto" : `Editar producto #${editando}`}</h2>
            {editando !== null && <button type="button" onClick={nuevoProducto} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold">Cancelar edición</button>}
          </div>
          <form onSubmit={guardar} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Nombre *
              <input required maxLength={200} value={form.nombre} onChange={(e) => editarCampo("nombre", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label className="block text-sm font-semibold">Código (opcional)
              <input maxLength={80} value={form.codigo} onChange={(e) => editarCampo("codigo", e.target.value)} placeholder="Ej.: 000125, MAT-001" className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label className="block text-sm font-semibold">Categoría
              <select value={form.categoria_id} onChange={(e) => editarCampo("categoria_id", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3">
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}{!c.activo ? " (inactiva)" : ""}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Precio minorista (ARS) *
              <input required type="number" min="0" step="0.01" value={form.precio} onChange={(e) => editarCampo("precio", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label className="block text-sm font-semibold">Precio mayorista (opcional)
              <input type="number" min="0" step="0.01" value={form.precio_mayorista} onChange={(e) => editarCampo("precio_mayorista", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label className="block text-sm font-semibold">Cantidad mínima mayorista
              <input type="number" min="1" step="1" value={form.cantidad_minima_mayorista} onChange={(e) => editarCampo("cantidad_minima_mayorista", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label className="block text-sm font-semibold">Stock (opcional)
              <input type="number" min="0" step="1" value={form.stock} onChange={(e) => editarCampo("stock", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label className="block text-sm font-semibold">Imagen del producto (JPG, PNG, WebP; máx. 10 MB)
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={subiendoImagen} onChange={(e) => { void subirImagen(e.target.files?.[0]); e.target.value = ""; }} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm" />
              {subiendoImagen && <span className="mt-1 block text-blue-700">Subiendo imagen...</span>}
            </label>
            {form.imagen_url && <div className="sm:col-span-2 flex flex-wrap items-center gap-4"><img src={form.imagen_url} alt="Vista previa del producto" className="h-28 w-28 rounded-xl border object-cover" /><button type="button" className="text-sm font-semibold text-red-700 underline" onClick={() => editarCampo("imagen_url", "")}>Quitar imagen del producto</button><span className="text-xs text-slate-500">Esto no elimina el archivo almacenado.</span></div>}
            <label className="block text-sm font-semibold sm:col-span-2">Descripción
              <textarea rows={3} value={form.descripcion} onChange={(e) => editarCampo("descripcion", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <div className="sm:col-span-2 flex flex-wrap gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.controlar_stock} onChange={(e) => editarCampo("controlar_stock", e.target.checked)} /> Controlar stock</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.activo} onChange={(e) => editarCampo("activo", e.target.checked)} /> Producto activo</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.visible} onChange={(e) => editarCampo("visible", e.target.checked)} /> Visible en catálogo</label>
            </div>
            <button type="submit" disabled={guardando || subiendoImagen} className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">
              {guardando ? "Guardando..." : editando === null ? "Crear producto" : "Guardar cambios"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Productos cargados ({productos.length})</h2>
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar nombre, código o categoría" aria-label="Buscar productos" className="w-full rounded-xl border border-slate-300 p-3 sm:w-80" />
          </div>
          {filtrados.length === 0 ? <p className="mt-5 text-slate-500">No se encontraron productos.</p> : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((p) => (
                <article key={p.id} className="flex flex-col rounded-2xl border border-slate-200 p-4">
                  {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="h-40 w-full rounded-xl object-cover" /> : <div className="flex h-40 items-center justify-center rounded-xl bg-slate-100 text-slate-400">Sin imagen</div>}
                  <p className="mt-3 text-xs font-semibold text-blue-700">{nombreCategoria.get(p.categoria_id ?? -1) || "Sin categoría"}</p>
                  <h3 className="mt-1 text-lg font-bold">{p.nombre}</h3>
                  {p.codigo && <p className="mt-1 break-words text-sm text-slate-600">Código: {p.codigo}</p>}
                  <p className="mt-2 font-bold">{dinero(Number(p.precio))}</p>
                  {p.precio_mayorista != null && <p className="text-sm text-slate-600">Mayorista: {dinero(Number(p.precio_mayorista))}</p>}
                  <p className="mt-1 text-xs text-slate-500">{p.activo ? "Activo" : "Inactivo"} · {p.visible ? "Visible" : "Oculto"}</p>
                  <div className="mt-auto flex gap-2 pt-4">
                    <button type="button" onClick={() => seleccionarProducto(p)} className="flex-1 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white">Editar</button>
                    <button type="button" onClick={() => void eliminar(p)} className="rounded-xl border border-red-300 px-3 py-2 text-sm font-bold text-red-700">Eliminar</button>
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
