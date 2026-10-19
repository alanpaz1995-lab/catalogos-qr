"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

type Producto = {
  id: number;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  precio: number | null;
  precio_mayorista: number | null;
  imaguen: string | null;
  estado: string;
};

type Lista = { id: number; nombre: string; activa: boolean };
type PrecioLista = { producto_id: number; lista_id: number; precio_minorista: number | null; precio_mayorista: number | null; visible: boolean };
type Seleccion = { cantidad: number; lista: string; tipoPrecio: "minorista" | "mayorista" };
type DescuentoTipo = "ninguno" | "porcentaje" | "fijo";

const MONEDA = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const pesos = (n: number) => MONEDA.format(n);
const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter] || caracter);
const numeroSeguro = (valor: unknown) => { const n = Number(valor); return Number.isFinite(n) && n >= 0 ? n : 0; };

export default function PresupuestoClientePage() {
  const { empresa, cargandoEmpresa, errorEmpresa } = useEmpresa();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [precios, setPrecios] = useState<Record<number, Record<number, PrecioLista>>>({});
  const [seleccion, setSeleccion] = useState<Record<number, Seleccion>>({});
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("__todas__");
  const [cliente, setCliente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [descuentoTipo, setDescuentoTipo] = useState<DescuentoTipo>("ninguno");
  const [descuentoValor, setDescuentoValor] = useState("0");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    if (!empresa?.id) return;
    setCargando(true);
    setError("");
    try {
      const [rProductos, rListas] = await Promise.all([
        supabase.from("productos").select("id,nombre,categoria,descripcion,precio,precio_mayorista,imaguen,estado").eq("empresa_id", empresa.id).order("nombre"),
        supabase.from("listas_catalogos").select("id,nombre,activa").eq("empresa_id", empresa.id).eq("activa", true).order("created_at"),
      ]);
      if (rProductos.error) throw rProductos.error;
      if (rListas.error) throw rListas.error;
      const items = (rProductos.data || []) as Producto[];
      const listasActivas = (rListas.data || []) as Lista[];
      setProductos(items);
      setListas(listasActivas);
      const mapa: Record<number, Record<number, PrecioLista>> = {};
      const ids = listasActivas.map((lista) => lista.id);
      for (let i = 0; i < ids.length; i += 40) {
        const lote = ids.slice(i, i + 40);
        let pagina = 0;
        while (true) {
          const { data, error: errorPrecios } = await supabase.from("lista_productos")
            .select("producto_id,lista_id,precio_minorista,precio_mayorista,visible")
            .in("lista_id", lote).order("producto_id").order("lista_id").range(pagina * 500, pagina * 500 + 499);
          if (errorPrecios) throw errorPrecios;
          const filas = (data || []) as PrecioLista[];
          filas.forEach((fila) => { (mapa[fila.producto_id] ??= {})[fila.lista_id] = fila; });
          if (filas.length < 500) break;
          pagina++;
        }
      }
      setPrecios(mapa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar los productos y listas.");
    } finally { setCargando(false); }
  }, [empresa?.id]);

  useEffect(() => { void cargarDatos(); }, [cargarDatos]);

  const categorias = useMemo(() => [...new Set(productos.map(p => (p.categoria || "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,"es")), [productos]);
  const visibles = useMemo(() => productos.filter(p =>
    (categoria === "__todas__" || p.categoria?.trim() === categoria) &&
    [p.nombre, p.categoria || "", p.descripcion || ""].join(" ").toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es"))
  ), [productos, categoria, busqueda]);

  function opcionesPrecio(producto: Producto) {
    const opciones: { clave: string; etiqueta: string; tipo: "minorista" | "mayorista"; precio: number }[] = [];
    if (producto.precio !== null) opciones.push({ clave: "principal:minorista", etiqueta: "Lista principal · Minorista", tipo: "minorista", precio: numeroSeguro(producto.precio) });
    if (producto.precio_mayorista !== null) opciones.push({ clave: "principal:mayorista", etiqueta: "Lista principal · Mayorista", tipo: "mayorista", precio: numeroSeguro(producto.precio_mayorista) });
    for (const lista of listas) {
      const dato = precios[producto.id]?.[lista.id];
      if (!dato?.visible) continue;
      if (dato.precio_minorista !== null) opciones.push({ clave: `${lista.id}:minorista`, etiqueta: `${lista.nombre} · Minorista`, tipo: "minorista", precio: numeroSeguro(dato.precio_minorista) });
      if (dato.precio_mayorista !== null) opciones.push({ clave: `${lista.id}:mayorista`, etiqueta: `${lista.nombre} · Mayorista`, tipo: "mayorista", precio: numeroSeguro(dato.precio_mayorista) });
    }
    return opciones;
  }

  function cambiarSeleccion(producto: Producto, activo: boolean) {
    setSeleccion(actual => {
      const nuevo = { ...actual };
      if (!activo) delete nuevo[producto.id];
      else { const primera = opcionesPrecio(producto)[0]; if (primera) nuevo[producto.id] = { cantidad: 1, lista: primera.clave.split(":")[0], tipoPrecio: primera.tipo }; }
      return nuevo;
    });
  }

  const renglones = useMemo(() => productos.flatMap(producto => {
    const sel = seleccion[producto.id];
    if (!sel) return [];
    const opcion = opcionesPrecio(producto).find(item => item.clave === `${sel.lista}:${sel.tipoPrecio}`);
    if (!opcion) return [];
    return [{ producto, seleccion: sel, opcion, subtotal: opcion.precio * sel.cantidad }];
  }), [productos, seleccion, listas, precios]);
  const subtotal = renglones.reduce((total, renglon) => total + renglon.subtotal, 0);
  const valorD = numeroSeguro(descuentoValor.replace(",", "."));
  const descuento = descuentoTipo === "porcentaje" ? subtotal * Math.min(100, valorD) / 100 : descuentoTipo === "fijo" ? Math.min(subtotal, valorD) : 0;
  const total = Math.max(0, subtotal - descuento);

  function imprimirPresupuesto() {
    if (!renglones.length) { setError("Seleccioná al menos un producto con un precio válido."); return; }
    setError("");
    const ventana = window.open("", "_blank");
    if (!ventana) { setError("El navegador bloqueó la ventana del presupuesto. Habilitá las ventanas emergentes y volvé a intentar."); return; }
    const hoy = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date());
    const logo = (empresa as { logo?: string | null })?.logo;
    const empresaNombre = (empresa as { nombre?: string })?.nombre || "Presupuesto";
    const descuentoNombre = descuentoTipo === "porcentaje" ? `Descuento (${valorD}%)` : "Descuento ($)";
    const filas = renglones.map(({ producto, seleccion: item, opcion, subtotal: parcial }) => `
      <article class="producto">
        ${producto.imaguen ? `<img src="${escapar(producto.imaguen)}" alt=""/>` : '<div class="sin-imagen">Sin imagen</div>'}
        <div class="datos"><h3>${escapar(producto.nombre)}</h3><p>${escapar(producto.descripcion || "")}</p>
        <small>${escapar(opcion.etiqueta)} · Cantidad: ${item.cantidad} · Unitario: ${pesos(opcion.precio)}</small></div>
        <strong>${pesos(parcial)}</strong>
      </article>`).join("");
    const datosImportacion = {
      formato: "COMERSYS_PRESUPUESTO_V1", fecha: new Date().toISOString(), empresa_id: empresa?.id,
      cliente, mensaje, subtotal, descuento_tipo: descuentoTipo, descuento_valor: valorD, descuento, total,
      productos: renglones.map(({ producto, seleccion: item, opcion }) => ({ id: producto.id, nombre: producto.nombre, cantidad: item.cantidad, lista: item.lista, tipo_precio: item.tipoPrecio, precio_unitario: opcion.precio }))
    };
    // La información estructurada también viaja en el PDF para facilitar una futura importación a Pedidos.
    const referencia = btoa(unescape(encodeURIComponent(JSON.stringify(datosImportacion))));
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Presupuesto - ${escapar(cliente || empresaNombre)}</title>
      <style>
        @page { size: A4; margin: 15mm; } * { box-sizing:border-box; } body { font-family:Arial,sans-serif; color:#1e293b; margin:0; }
        header { display:flex; align-items:center; gap:18px; border-bottom:3px solid #2563eb; padding-bottom:18px; margin-bottom:22px; }
        header img { width:75px; height:75px; object-fit:contain; } h1 { font-size:24px; margin:0; } h2 { font-size:20px; margin:0 0 12px; }
        .fecha { color:#64748b; font-size:12px; margin-top:6px; } .intro { background:#f1f5f9; padding:15px; border-radius:9px; margin-bottom:18px; white-space:pre-wrap; }
        .producto { display:flex; gap:16px; padding:15px 0; border-bottom:1px solid #e2e8f0; break-inside:avoid; align-items:flex-start; }
        .producto img,.sin-imagen { width:95px; height:95px; object-fit:contain; border:1px solid #e2e8f0; border-radius:8px; flex-shrink:0; }
        .sin-imagen { display:grid;place-items:center;color:#94a3b8;font-size:11px; } .datos { flex:1; } h3 {margin:0 0 7px;font-size:15px;}
        .datos p { font-size:12px; margin:0 0 10px; white-space:pre-wrap; color:#475569; } small { font-size:11px; color:#64748b; }
        .producto strong { white-space:nowrap; font-size:14px; } .totales { margin:24px 0 0 auto; max-width:300px; }
        .linea {display:flex;justify-content:space-between;padding:9px 0; border-bottom:1px solid #e2e8f0;}
        .final {font-size:19px;font-weight:700;color:#1d4ed8;border-bottom:0;} .nota {font-size:10px;color:#64748b;margin-top:25px;}
        .datos-importacion { font-size:1px; color:#fff; overflow-wrap:anywhere; line-height:1px; }
        @media screen { body {padding:35px;max-width:850px;margin:auto;} .acciones{position:sticky;top:0;background:white;padding:12px 0;display:flex;gap:10px;} button{background:#2563eb;color:white;padding:12px 18px;border:0;border-radius:8px;cursor:pointer;} }
        @media print {.acciones{display:none;} }
      </style></head><body>
      <div class="acciones"><button onclick="window.print()">Guardar / imprimir PDF</button><button onclick="window.close()">Cerrar</button></div>
      <header>${logo ? `<img src="${escapar(logo)}" alt="Logo"/>` : ""}<div><h1>${escapar(empresaNombre)}</h1><div class="fecha">Presupuesto · ${escapar(hoy)}</div></div></header>
      ${cliente.trim() ? `<h2>Para: ${escapar(cliente)}</h2>` : ""}
      ${mensaje.trim() ? `<div class="intro">${escapar(mensaje)}</div>` : ""}
      <h2>Productos seleccionados</h2>${filas}
      <div class="totales"><div class="linea"><span>Subtotal</span><b>${pesos(subtotal)}</b></div>
      ${descuentoTipo !== "ninguno" ? `<div class="linea"><span>${escapar(descuentoNombre)}</span><b>− ${pesos(descuento)}</b></div>` : ""}
      <div class="linea final"><span>Total final</span><span>${pesos(total)}</span></div></div>
      <p class="nota">Presupuesto informativo. La disponibilidad y las condiciones de venta se confirman al realizar el pedido.</p>
      <div class="datos-importacion">COMERSYS_PRESUPUESTO_V1:${referencia}:FIN_COMERSYS_PRESUPUESTO</div>
      </body></html>`;
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
  }

  if (cargandoEmpresa || cargando) return <main className="min-h-screen bg-slate-50 p-10 text-center text-slate-600">Cargando productos y precios...</main>;
  if (errorEmpresa) return <main className="p-8 text-red-700">{errorEmpresa}</main>;

  return <main className="min-h-screen bg-[#F8FAFC] p-5 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <div><Link href="/admin" className="font-semibold text-blue-600">← Volver al panel</Link><h1 className="mt-4 text-3xl font-bold">Presupuesto para cliente</h1>
        <p className="mt-2 text-slate-500">Elegí productos y precios por lista, calculá descuentos y guardá el presupuesto como PDF.</p></div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Seleccionar productos</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Buscar producto
            <input className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Nombre o descripción" /></label>
            <label className="text-sm font-semibold">Categoría<select className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="__todas__">Todas las categorías</option>{categorias.map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
          <div className="mt-4 space-y-3">{visibles.map(producto=>{
            const opciones = opcionesPrecio(producto);
            const actual = seleccion[producto.id];
            const elegido = actual ? `${actual.lista}:${actual.tipoPrecio}` : opciones[0]?.clave || "";
            return <article key={producto.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3"><input aria-label={`Seleccionar ${producto.nombre}`} type="checkbox" className="mt-2 h-5 w-5 shrink-0" checked={Boolean(actual)} disabled={!opciones.length} onChange={e=>cambiarSeleccion(producto,e.target.checked)} />
                {producto.imaguen ? <img src={producto.imaguen} alt="" className="h-20 w-20 shrink-0 rounded-lg border object-contain"/> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">Sin foto</div>}
                <div className="min-w-0 flex-1"><h3 className="font-bold">{producto.nombre}</h3><p className="text-xs text-slate-500">{producto.categoria || "Sin categoría"}{producto.estado !== "Activo" ? " · Inactivo" : ""}</p>
                {!opciones.length && <p className="mt-1 text-xs text-amber-700">Sin precio disponible para presupuestar</p>}</div></div>
              {actual && <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px]">
                <label className="text-sm font-semibold">Lista y precio<select value={elegido} className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-normal" onChange={e=>{ const [lista,tipoPrecio]=e.target.value.split(":");setSeleccion(prev=>({...prev,[producto.id]:{...prev[producto.id],lista,tipoPrecio:tipoPrecio as Seleccion["tipoPrecio"]}})); }}>
                  {opciones.map(o=><option key={o.clave} value={o.clave}>{o.etiqueta} — {pesos(o.precio)}</option>)}
                </select></label>
                <label className="text-sm font-semibold">Cantidad<input className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-normal" type="number" min="1" step="1" value={actual.cantidad} onChange={e=>{const n=Number(e.target.value);setSeleccion(prev=>({...prev,[producto.id]:{...prev[producto.id],cantidad:Number.isFinite(n)?Math.max(1,Math.floor(n)):1}}));}} /></label>
                <div className="text-sm font-semibold sm:col-span-2">Subtotal: {pesos((opciones.find(o=>o.clave===elegido)?.precio||0)*actual.cantidad)}</div>
              </div>}</article>;
          })}{!visibles.length && <p className="py-8 text-center text-slate-500">No hay productos para esta búsqueda.</p>}</div>
        </section>
        <aside className="space-y-4 xl:sticky xl:top-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Datos del presupuesto</h2>
            <label className="mt-4 block text-sm font-semibold">Cliente (opcional)<input value={cliente} onChange={e=>setCliente(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder="Nombre del cliente" /></label>
            <label className="mt-4 block text-sm font-semibold">Mensaje para el cliente<textarea value={mensaje} onChange={e=>setMensaje(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder="Te compartimos estas opciones..." /></label></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Resumen y descuento</h2>
            <p className="mt-2 text-sm text-slate-500">{renglones.length} producto(s) seleccionado(s)</p>
            <div className="mt-4 flex justify-between"><span>Subtotal</span><strong>{pesos(subtotal)}</strong></div>
            <label className="mt-4 block text-sm font-semibold">Descuento<select value={descuentoTipo} onChange={e=>setDescuentoTipo(e.target.value as DescuentoTipo)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"><option value="ninguno">Sin descuento</option><option value="porcentaje">Porcentaje (%)</option><option value="fijo">Importe fijo ($)</option></select></label>
            {descuentoTipo !== "ninguno" && <label className="mt-3 block text-sm font-semibold">Valor<input type="number" min="0" max={descuentoTipo==="porcentaje"?100:undefined} step="any" value={descuentoValor} onChange={e=>setDescuentoValor(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>}
            {descuentoTipo !== "ninguno" && <div className="mt-4 flex justify-between text-green-700"><span>Descuento</span><strong>− {pesos(descuento)}</strong></div>}
            <div className="mt-4 flex justify-between border-t pt-4 text-xl font-bold"><span>Total</span><span>{pesos(total)}</span></div>
            <button type="button" onClick={imprimirPresupuesto} disabled={!renglones.length} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Generar / descargar PDF</button>
            <p className="mt-3 text-xs leading-5 text-slate-500">Se abrirá una vista lista para imprimir. En Chrome, elegí «Guardar como PDF». No se genera un pedido ni se descuenta stock.</p>
          </section>
        </aside>
      </div>
    </div>
  </main>;
}
