"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pedido = {
  id: number;
  numero?: number | null;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion?: string | null;
  total: number;
  estado: string;
  estado_pago: string;
  created_at: string;
  empresa_id: number;
};

const EMPRESA_ID = 1;

const ESTADOS = [
  "Pendiente",
  "Confirmado",
  "Preparando",
  "Listo",
  "Enviado",
  "Entregado",
  "Cancelado",
];

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [estadoSeleccionado, setEstadoSeleccionado] =
    useState("Todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarPedidos();
  }, []);

  async function cargarPedidos() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("empresa_id", EMPRESA_ID)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar pedidos:", error);
      setError(`No se pudieron cargar los pedidos: ${error.message}`);
      setCargando(false);
      return;
    }

    setPedidos((data as Pedido[]) || []);
    setCargando(false);
  }

  async function cambiarEstado(
    pedidoId: number,
    nuevoEstado: string
  ) {
    const estadoAnterior = pedidos.find(
      (pedido) => pedido.id === pedidoId
    )?.estado;

    setPedidos((pedidosActuales) =>
      pedidosActuales.map((pedido) =>
        pedido.id === pedidoId
          ? { ...pedido, estado: nuevoEstado }
          : pedido
      )
    );

    const { error } = await supabase
      .from("pedidos")
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pedidoId)
      .eq("empresa_id", EMPRESA_ID);

    if (error) {
      console.error("Error al cambiar estado:", error);

      setPedidos((pedidosActuales) =>
        pedidosActuales.map((pedido) =>
          pedido.id === pedidoId
            ? {
                ...pedido,
                estado: estadoAnterior || "Pendiente",
              }
            : pedido
        )
      );

      alert(`No se pudo cambiar el estado: ${error.message}`);
    }
  }

  function formatearPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(precio);
  }

  function formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(fecha));
  }

  function obtenerNumeroPedido(pedido: Pedido) {
    return String(pedido.numero ?? pedido.id).padStart(6, "0");
  }

  function clasesEstado(estado: string) {
    switch (estado) {
      case "Pendiente":
        return "bg-amber-100 text-amber-700";
      case "Confirmado":
        return "bg-blue-100 text-blue-700";
      case "Preparando":
        return "bg-violet-100 text-violet-700";
      case "Listo":
        return "bg-cyan-100 text-cyan-700";
      case "Enviado":
        return "bg-indigo-100 text-indigo-700";
      case "Entregado":
        return "bg-green-100 text-green-700";
      case "Cancelado":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  const pedidosFiltrados =
    estadoSeleccionado === "Todos"
      ? pedidos
      : pedidos.filter(
          (pedido) => pedido.estado === estadoSeleccionado
        );

  const cantidadPendientes = pedidos.filter(
    (pedido) => pedido.estado === "Pendiente"
  ).length;

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-8 text-[#1E293B]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold text-[#2563EB]">
            Administración
          </p>

          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Pedidos</h1>

              <p className="mt-2 text-slate-500">
                Gestioná los pedidos recibidos desde el catálogo.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarPedidos}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pedidos totales
            </p>

            <p className="mt-2 text-3xl font-bold">
              {pedidos.length}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm text-amber-700">
              Pendientes
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-700">
              {cantidadPendientes}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total mostrado
            </p>

            <p className="mt-2 text-3xl font-bold">
              {pedidosFiltrados.length}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <label
              htmlFor="filtro-estado"
              className="mb-2 block text-sm font-semibold"
            >
              Filtrar por estado
            </label>

            <select
              id="filtro-estado"
              value={estadoSeleccionado}
              onChange={(event) =>
                setEstadoSeleccionado(event.target.value)
              }
              className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Todos</option>

              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {cargando ? (
            <div className="p-10 text-center text-slate-500">
              Cargando pedidos...
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-slate-700">
                No hay pedidos para mostrar
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Los pedidos del catálogo aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pedidosFiltrados.map((pedido) => (
                <article
                  key={pedido.id}
                  className="p-6 transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold">
                          Pedido #{obtenerNumeroPedido(pedido)}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${clasesEstado(
                            pedido.estado
                          )}`}
                        >
                          {pedido.estado}
                        </span>
                      </div>

                      <p className="mt-3 font-semibold">
                        {pedido.cliente_nombre}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {pedido.cliente_telefono}
                      </p>

                      {pedido.cliente_direccion && (
                        <p className="mt-1 text-sm text-slate-500">
                          {pedido.cliente_direccion}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-slate-400">
                        {formatearFecha(pedido.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <p className="text-2xl font-bold">
                        {formatearPrecio(Number(pedido.total))}
                      </p>
<Link
  href={`/admin/pedidos/${pedido.id}`}
  className="rounded-xl bg-[#2563EB] px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
>
  Ver detalle
</Link>
                      <select
                        value={pedido.estado}
                        onChange={(event) =>
                          cambiarEstado(
                            pedido.id,
                            event.target.value
                          )
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                      >
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
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