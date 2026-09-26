"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pedido = {
  id: number;
  numero: number;
  estado: string;
  created_at: string;
};

type DetallePedido = {
  id: number;
  pedido_id: number;
  producto_id?: number | null;
  producto_nombre: string;
  precio_unitario: number;
  costo_unitario: number;
  cantidad: number;
  subtotal: number;
};

type ResumenProducto = {
  clave: string;
  nombre: string;
  unidades: number;
  ventas: number;
  costos: number;
  ganancia: number;
};

export default function GananciasPage() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarGanancias = useCallback(async () => {
    setCargando(true);
    setError("");

    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
      setError(
        errorUsuario?.message ||
          "Tu sesión no está activa. Iniciá sesión nuevamente."
      );
      setCargando(false);
      return;
    }

    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (empresaError || !empresa) {
      setError(
        empresaError?.message ||
          "No encontramos una empresa asociada a tu cuenta."
      );
      setCargando(false);
      return;
    }

    const inicio = new Date(anio, mes, 1);
    const fin = new Date(anio, mes + 1, 1);

    const { data: pedidosData, error: pedidosError } = await supabase
      .from("pedidos")
      .select("id, numero, estado, created_at")
      .eq("empresa_id", empresa.id)
      .gte("created_at", inicio.toISOString())
      .lt("created_at", fin.toISOString())
      .neq("estado", "Cancelado")
      .order("created_at", { ascending: false });

    if (pedidosError) {
      setError(`No se pudieron cargar los pedidos: ${pedidosError.message}`);
      setCargando(false);
      return;
    }

    const pedidos = (pedidosData as Pedido[]) || [];
    const ids = pedidos.map((pedido) => pedido.id);

    if (ids.length === 0) {
      setDetalles([]);
      setCargando(false);
      return;
    }

    const { data: detallesData, error: detallesError } = await supabase
      .from("pedido_detalles")
      .select(
        "id, pedido_id, producto_id, producto_nombre, precio_unitario, costo_unitario, cantidad, subtotal"
      )
      .in("pedido_id", ids);

    if (detallesError) {
      setError(
        `No se pudieron cargar los productos vendidos: ${detallesError.message}`
      );
      setCargando(false);
      return;
    }

    setDetalles((detallesData as DetallePedido[]) || []);
    setCargando(false);
  }, [anio, mes]);

  useEffect(() => {
    cargarGanancias();
  }, [cargarGanancias]);

  const resumen = useMemo(() => {
    const mapa = new Map<string, ResumenProducto>();

    for (const detalle of detalles) {
      const cantidad = Number(detalle.cantidad || 0);
      const ventas = Number(detalle.subtotal || 0);
      const costoUnitario = Number(detalle.costo_unitario || 0);
      const costos = costoUnitario * cantidad;
      const ganancia = ventas - costos;
      const clave =
        detalle.producto_id !== null && detalle.producto_id !== undefined
          ? `producto-${detalle.producto_id}`
          : `manual-${detalle.producto_nombre.toLowerCase()}`;

      const actual = mapa.get(clave) || {
        clave,
        nombre: detalle.producto_nombre,
        unidades: 0,
        ventas: 0,
        costos: 0,
        ganancia: 0,
      };

      actual.unidades += cantidad;
      actual.ventas += ventas;
      actual.costos += costos;
      actual.ganancia += ganancia;
      mapa.set(clave, actual);
    }

    return Array.from(mapa.values()).sort(
      (a, b) => b.ganancia - a.ganancia
    );
  }, [detalles]);

  const totales = useMemo(
    () =>
      resumen.reduce(
        (acc, item) => {
          acc.ventas += item.ventas;
          acc.costos += item.costos;
          acc.ganancia += item.ganancia;
          acc.unidades += item.unidades;
          return acc;
        },
        { ventas: 0, costos: 0, ganancia: 0, unidades: 0 }
      ),
    [resumen]
  );

  const nombrePeriodo = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(anio, mes, 1));

  const cambiarMes = (direccion: number) => {
    const fecha = new Date(anio, mes + direccion, 1);
    setAnio(fecha.getFullYear());
    setMes(fecha.getMonth());
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-bold text-[#2563EB] hover:underline"
            >
              ← Volver al inicio
            </Link>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Rentabilidad
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Ganancias
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Ventas menos el costo histórico de los productos vendidos.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarGanancias}
            disabled={cargando}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {cargando ? "Actualizando..." : "↻ Actualizar"}
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50"
            >
              ← Mes anterior
            </button>

            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Período
              </p>
              <h2 className="mt-1 text-xl font-black capitalize text-slate-900">
                {nombrePeriodo}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => cambiarMes(1)}
              disabled={
                anio === hoy.getFullYear() && mes >= hoy.getMonth()
              }
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mes siguiente →
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Tarjeta
            titulo="Ventas del mes"
            valor={formatearPrecio(totales.ventas)}
            detalle={`${totales.unidades} unidad(es) vendida(s)`}
            icono="📈"
          />
          <Tarjeta
            titulo="Costo de productos vendidos"
            valor={formatearPrecio(totales.costos)}
            detalle="Costo histórico registrado"
            icono="📦"
          />
          <Tarjeta
            titulo="Ganancia del mes"
            valor={formatearPrecio(totales.ganancia)}
            detalle="Ventas menos costos"
            icono="💰"
            destacado
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Ganancia por producto
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Detalle acumulado de {nombrePeriodo}.
            </p>
          </div>

          {cargando ? (
            <div className="p-12 text-center text-slate-500">
              Cargando ganancias...
            </div>
          ) : resumen.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">📊</div>
              <h3 className="mt-4 font-black text-slate-900">
                No hay ventas para este período
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Cuando registres ventas, el detalle de ganancias aparecerá acá.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4 text-right">Unidades</th>
                    <th className="px-6 py-4 text-right">Ventas</th>
                    <th className="px-6 py-4 text-right">Costos</th>
                    <th className="px-6 py-4 text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.map((item) => (
                    <tr key={item.clave} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {item.nombre}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {item.unidades}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatearPrecio(item.ventas)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatearPrecio(item.costos)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-black ${
                          item.ganancia < 0
                            ? "text-red-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatearPrecio(item.ganancia)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr className="font-black text-slate-900">
                    <td className="px-6 py-5">TOTAL</td>
                    <td className="px-6 py-5 text-right">
                      {totales.unidades}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {formatearPrecio(totales.ventas)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {formatearPrecio(totales.costos)}
                    </td>
                    <td className="px-6 py-5 text-right text-emerald-700">
                      {formatearPrecio(totales.ganancia)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          <strong>Importante:</strong> las ventas históricas realizadas antes de
          incorporar el costo unitario pueden tener costo $0. Las ventas nuevas
          conservan el costo que tenía el producto al momento de venderse.
        </div>
      </div>
    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  icono,
  destacado = false,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  icono: string;
  destacado?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-6 shadow-sm ${
        destacado
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{titulo}</p>
          <p
            className={`mt-3 text-3xl font-black ${
              destacado ? "text-emerald-700" : "text-slate-900"
            }`}
          >
            {valor}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {detalle}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          {icono}
        </div>
      </div>
    </article>
  );
}

function formatearPrecio(precio: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(precio);
}
