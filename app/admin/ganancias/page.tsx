"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pedido = { id: number; estado: string; created_at: string; descuento: number | null; subtotal: number | null; total: number | null };
type DetallePedido = { id: number; pedido_id: number; producto_id: number | null; producto_nombre: string; costo_unitario: number | null; cantidad: number; subtotal: number; lista_precio_id: number | null };
type Lista = { id: number; nombre: string; activa: boolean };
type Resumen = { clave: string; nombre: string; unidades: number; ventas: number; costos: number; ganancia: number };
type Totales = { ventas: number; costos: number; ganancia: number; unidades: number };
const vacio = (): Totales => ({ ventas: 0, costos: 0, ganancia: 0, unidades: 0 });
const dinero = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Supabase devuelve como máximo 1000 filas por consulta en muchos proyectos.
async function traerTodas<T>(crearConsulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const resultado: T[] = [];
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await crearConsulta(desde, desde + 499);
    if (error) throw new Error(error.message);
    const pagina = (data || []) as T[];
    resultado.push(...pagina);
    if (pagina.length < 500) return resultado;
  }
}

export default function GananciasPage() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [listaSeleccionada, setListaSeleccionada] = useState("principal");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarGanancias = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
      if (errorUsuario || !user) throw new Error(errorUsuario?.message || "Tu sesión no está activa. Iniciá sesión nuevamente.");
      const { data: empresa, error: errorEmpresa } = await supabase.from("empresas").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (errorEmpresa || !empresa) throw new Error(errorEmpresa?.message || "No encontramos una empresa asociada a tu cuenta.");
      const inicio = new Date(anio, mes, 1).toISOString();
      const fin = new Date(anio, mes + 1, 1).toISOString();
      const [pedidosNuevos, listasNuevas] = await Promise.all([
        traerTodas<Pedido>((desde, hasta) => supabase.from("pedidos")
          .select("id, estado, created_at, descuento, subtotal, total")
          .eq("empresa_id", empresa.id).gte("created_at", inicio).lt("created_at", fin)
          .neq("estado", "Cancelado").order("id", { ascending: true }).range(desde, hasta)),
        traerTodas<Lista>((desde, hasta) => supabase.from("listas_catalogos")
          .select("id, nombre, activa").eq("empresa_id", empresa.id)
          .order("id", { ascending: true }).range(desde, hasta)),
      ]);
      const todosDetalles: DetallePedido[] = [];
      // Grupos pequeños para evitar URL excesivamente largas con filtros .in().
      for (let i = 0; i < pedidosNuevos.length; i += 100) {
        const ids = pedidosNuevos.slice(i, i + 100).map((p) => p.id);
        const lote = await traerTodas<DetallePedido>((desde, hasta) => supabase.from("pedido_detalles")
          .select("id, pedido_id, producto_id, producto_nombre, costo_unitario, cantidad, subtotal, lista_precio_id")
          .in("pedido_id", ids).order("id", { ascending: true }).range(desde, hasta));
        todosDetalles.push(...lote);
      }
      setPedidos(pedidosNuevos);
      setDetalles(todosDetalles);
      setListas(listasNuevas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las ganancias.");
    } finally {
      setCargando(false);
    }
  }, [anio, mes]);

  useEffect(() => { void cargarGanancias(); }, [cargarGanancias]);

  const calculos = useMemo(() => {
    const pedidosPorId = new Map(pedidos.map((p) => [p.id, p]));
    const subtotalDetalles = new Map<number, number>();
    for (const d of detalles) subtotalDetalles.set(d.pedido_id, (subtotalDetalles.get(d.pedido_id) || 0) + Number(d.subtotal || 0));
    const porLista = new Map<string, Totales>();
    const porProducto = new Map<string, Map<string, Resumen>>();
    const total = vacio();
    // Repartir el descuento de cada pedido proporcionalmente entre sus renglones.
    // La asignación por centavos evita diferencias entre la suma de listas y el total.
    const grupos = new Map<number, DetallePedido[]>();
    for (const d of detalles) grupos.set(d.pedido_id, [...(grupos.get(d.pedido_id) || []), d]);
    for (const [pedidoId, renglones] of grupos) {
      const pedido = pedidosPorId.get(pedidoId);
      if (!pedido) continue;
      const bruto = subtotalDetalles.get(pedidoId) || 0;
      const descuento = Math.min(Math.max(Number(pedido.descuento || 0), 0), bruto);
      let descuentoAsignado = 0;
      renglones.forEach((d, indice) => {
        const ventaBruta = Number(d.subtotal || 0);
        const parte = indice === renglones.length - 1
          ? redondear(descuento - descuentoAsignado)
          : bruto > 0 ? redondear(descuento * ventaBruta / bruto) : 0;
        descuentoAsignado = redondear(descuentoAsignado + parte);
        const venta = redondear(ventaBruta - parte);
        const unidades = Number(d.cantidad || 0);
        const costos = redondear(Number(d.costo_unitario || 0) * unidades);
        const ganancia = redondear(venta - costos);
        const lista = d.lista_precio_id == null ? "principal" : String(d.lista_precio_id);
        const tot = porLista.get(lista) || vacio();
        tot.ventas = redondear(tot.ventas + venta);
        tot.costos = redondear(tot.costos + costos);
        tot.ganancia = redondear(tot.ganancia + ganancia);
        tot.unidades += unidades;
        porLista.set(lista, tot);
        total.ventas = redondear(total.ventas + venta);
        total.costos = redondear(total.costos + costos);
        total.ganancia = redondear(total.ganancia + ganancia);
        total.unidades += unidades;
        const clave = d.producto_id != null ? `producto-${d.producto_id}` : `manual-${d.producto_nombre.toLowerCase()}`;
        const mapa = porProducto.get(lista) || new Map<string, Resumen>();
        const p = mapa.get(clave) || { clave, nombre: d.producto_nombre, unidades: 0, ventas: 0, costos: 0, ganancia: 0 };
        p.unidades += unidades;
        p.ventas = redondear(p.ventas + venta);
        p.costos = redondear(p.costos + costos);
        p.ganancia = redondear(p.ganancia + ganancia);
        mapa.set(clave, p);
        porProducto.set(lista, mapa);
      });
    }
    return { porLista, porProducto, total };
  }, [pedidos, detalles]);

  const todasLasListas = useMemo(() => {
    const base = [{ id: "principal", nombre: "Lista Principal" }, ...listas.map((l) => ({ id: String(l.id), nombre: l.nombre }))];
    for (const id of calculos.porLista.keys()) {
      if (!base.some((l) => l.id === id)) base.push({ id, nombre: `Lista ${id} (histórica)` });
    }
    return base;
  }, [listas, calculos]);
  const resumenSeleccionado = useMemo(() => Array.from(calculos.porProducto.get(listaSeleccionada)?.values() || []).sort((a, b) => b.ganancia - a.ganancia), [calculos, listaSeleccionada]);
  const totalesSeleccionados = calculos.porLista.get(listaSeleccionada) || vacio();
  const nombrePeriodo = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(anio, mes, 1));
  const cambiarMes = (direccion: number) => { const fecha = new Date(anio, mes + direccion, 1); setAnio(fecha.getFullYear()); setMes(fecha.getMonth()); };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-[#2563EB] hover:underline">← Volver al inicio</Link>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Rentabilidad</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Ganancias</h1>
            <p className="mt-2 text-sm text-slate-500">Ventas menos descuentos y costo histórico de los productos vendidos.</p>
          </div>
          <button type="button" onClick={() => void cargarGanancias()} disabled={cargando} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">{cargando ? "Actualizando..." : "↻ Actualizar"}</button>
        </header>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => cambiarMes(-1)} className="rounded-xl border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50">← Mes anterior</button>
            <div className="text-center"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Período</p><h2 className="mt-1 text-xl font-black capitalize text-slate-900">{nombrePeriodo}</h2></div>
            <button type="button" onClick={() => cambiarMes(1)} disabled={anio === hoy.getFullYear() && mes >= hoy.getMonth()} className="rounded-xl border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Mes siguiente →</button>
          </div>
        </section>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700">{error}</div>}
        <h2 className="text-center text-2xl font-black text-slate-900">Ganancias Totales</h2>
        <section className="grid gap-4 md:grid-cols-3">
          <Tarjeta titulo="Ventas del mes" valor={dinero(calculos.total.ventas)} detalle={`${calculos.total.unidades} unidad(es) vendida(s)`} icono="📈" />
          <Tarjeta titulo="Costo de productos vendidos" valor={dinero(calculos.total.costos)} detalle="Costo histórico registrado" icono="📦" />
          <Tarjeta titulo="Ganancia del mes" valor={dinero(calculos.total.ganancia)} detalle="Ventas netas menos costos" icono="💰" destacado />
        </section>
        <h2 className="text-center text-2xl font-black text-slate-900">Ganancias de cada Lista</h2>
        <section className="grid gap-4 md:grid-cols-3">
          {todasLasListas.map((lista) => {
            const t = calculos.porLista.get(lista.id) || vacio();
            return (
              <article key={lista.id} className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-slate-900 shadow-sm">
                <h3 className="mb-4 text-lg font-black text-emerald-900">{lista.nombre}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-600">Total vendido</p>
                    <p className="mt-1 break-words text-xl font-black text-slate-900">{dinero(t.ventas)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-600">Costos</p>
                    <p className="mt-1 break-words text-xl font-black text-slate-900">{dinero(t.costos)}</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-emerald-200 pt-3 text-center">
                  <p className="text-sm font-bold text-emerald-900">Ganancias</p>
                  <p className={`mt-1 break-words text-2xl font-black ${t.ganancia < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {dinero(t.ganancia)}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-black text-slate-900">Ganancia por producto</h2><p className="mt-1 text-sm text-slate-500">Detalle acumulado de {nombrePeriodo}.</p></div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">Lista
              <select value={listaSeleccionada} onChange={(e) => setListaSeleccionada(e.target.value)} className="max-w-56 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-500">
                {todasLasListas.map((lista) => <option key={lista.id} value={lista.id}>{lista.nombre}</option>)}
              </select>
            </label>
          </div>
          {cargando ? <div className="p-12 text-center text-slate-500">Cargando ganancias...</div> : resumenSeleccionado.length === 0 ? <div className="p-12 text-center"><div className="text-4xl">📊</div><h3 className="mt-4 font-black text-slate-900">No hay ventas para esta lista en este período</h3></div> :
            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-50"><tr className="text-left text-xs font-black uppercase tracking-wide text-slate-500"><th className="px-6 py-4">Producto</th><th className="px-6 py-4 text-right">Unidades</th><th className="px-6 py-4 text-right">Ventas</th><th className="px-6 py-4 text-right">Costos</th><th className="px-6 py-4 text-right">Ganancia</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{resumenSeleccionado.map((item) => <tr key={item.clave} className="hover:bg-slate-50/70"><td className="px-6 py-4 font-bold text-slate-900">{item.nombre}</td><td className="px-6 py-4 text-right font-semibold">{item.unidades}</td><td className="px-6 py-4 text-right">{dinero(item.ventas)}</td><td className="px-6 py-4 text-right">{dinero(item.costos)}</td><td className={`px-6 py-4 text-right font-black ${item.ganancia < 0 ? "text-red-600" : "text-emerald-700"}`}>{dinero(item.ganancia)}</td></tr>)}</tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50"><tr className="font-black text-slate-900"><td className="px-6 py-5">TOTAL</td><td className="px-6 py-5 text-right">{totalesSeleccionados.unidades}</td><td className="px-6 py-5 text-right">{dinero(totalesSeleccionados.ventas)}</td><td className="px-6 py-5 text-right">{dinero(totalesSeleccionados.costos)}</td><td className="px-6 py-5 text-right text-emerald-700">{dinero(totalesSeleccionados.ganancia)}</td></tr></tfoot></table></div>}
        </section>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900"><strong>Importante:</strong> las ventas históricas anteriores a las listas se asignan a Lista Principal. Si antes no se registraba el costo unitario, ese costo puede figurar como $0. Los descuentos se distribuyen proporcionalmente entre los productos. Como en el módulo anterior, se incluyen pedidos pendientes de pago y se excluyen los cancelados.</div>
      </div>
    </main>
  );
}

function Tarjeta({ titulo, valor, detalle, icono, destacado = false }: { titulo: string; valor: string; detalle: string; icono: string; destacado?: boolean }) {
  return <article className={`rounded-3xl border p-6 shadow-sm ${destacado ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-500">{titulo}</p><p className={`mt-3 text-3xl font-black ${destacado ? "text-emerald-700" : "text-slate-900"}`}>{valor}</p><p className="mt-2 text-xs font-semibold text-slate-500">{detalle}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">{icono}</div></div></article>;
}
