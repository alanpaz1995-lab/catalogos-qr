"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Pedido = {
  id: number;
  numero?: number | null;
  empresa_id: number;
  cliente_id?: number | null;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion?: string | null;
  observaciones?: string | null;
  subtotal: number;
  costo_envio?: number | null;
  descuento?: number | null;
  total: number;
  estado: string;
  estado_pago: string;
  metodo_pago?: string | null;
  metodo_entrega?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type DetallePedido = {
  id: number;
  pedido_id: number;
  producto_id?: number | null;
  producto_nombre: string;
  producto_imagen?: string | null;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
};

type PagoPedido = {
  id: number;
  pedido_id: number;
  empresa_id: number;
  importe: number;
  metodo_pago: string;
  observaciones?: string | null;
  anulado: boolean;
  created_at: string;
  updated_at?: string | null;
};

const EMPRESA_ID = 1;

const ESTADOS_PEDIDO = [
  "Pendiente",
  "Confirmado",
  "Preparando",
  "Listo",
  "Enviado",
  "Entregado",
  "Cancelado",
];

const METODOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Cheque",
  "Tarjeta",
  "Mercado Pago",
  "Otro",
];

export default function DetallePedidoPage() {
  const params = useParams();

  const idParametro = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const pedidoId = Number(idParametro);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [pagos, setPagos] = useState<PagoPedido[]>([]);

  const [importePago, setImportePago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [observacionesPago, setObservacionesPago] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [pagoAnulandoId, setPagoAnulandoId] = useState<number | null>(
    null
  );

  const [mensajeAccion, setMensajeAccion] = useState("");
  const [error, setError] = useState("");

  const cargarDetallePedido = useCallback(async () => {
    setCargando(true);
    setError("");

    if (!pedidoId || Number.isNaN(pedidoId)) {
      setError("El número de pedido no es válido.");
      setCargando(false);
      return;
    }

    const [
      { data: pedidoData, error: pedidoError },
      { data: detallesData, error: detallesError },
      { data: pagosData, error: pagosError },
    ] = await Promise.all([
      supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedidoId)
        .eq("empresa_id", EMPRESA_ID)
        .maybeSingle(),

      supabase
        .from("pedido_detalles")
        .select("*")
        .eq("pedido_id", pedidoId)
        .order("id", { ascending: true }),

      supabase
        .from("pagos_pedido")
        .select("*")
        .eq("pedido_id", pedidoId)
        .eq("empresa_id", EMPRESA_ID)
        .order("created_at", { ascending: false }),
    ]);

    if (pedidoError) {
      console.error("Error al cargar pedido:", pedidoError);
      setError(
        `No se pudo cargar el pedido: ${pedidoError.message}`
      );
      setCargando(false);
      return;
    }

    if (!pedidoData) {
      setError("No encontramos ese pedido.");
      setCargando(false);
      return;
    }

    if (detallesError) {
      console.error(
        "Error al cargar productos del pedido:",
        detallesError
      );
      setError(
        `No se pudieron cargar los productos: ${detallesError.message}`
      );
      setCargando(false);
      return;
    }

    if (pagosError) {
      console.error(
        "Error al cargar pagos del pedido:",
        pagosError
      );
      setError(
        `No se pudieron cargar los pagos: ${pagosError.message}`
      );
      setCargando(false);
      return;
    }

    setPedido(pedidoData as Pedido);
    setDetalles((detallesData as DetallePedido[]) || []);
    setPagos((pagosData as PagoPedido[]) || []);
    setCargando(false);
  }, [pedidoId]);

  useEffect(() => {
    cargarDetallePedido();
  }, [cargarDetallePedido]);

  const pagosActivos = useMemo(
    () => pagos.filter((pago) => !pago.anulado),
    [pagos]
  );

  const totalPedido = Number(pedido?.total || 0);

  const totalCobrado = useMemo(
    () =>
      pagosActivos.reduce(
        (total, pago) => total + Number(pago.importe),
        0
      ),
    [pagosActivos]
  );

  const saldoPendiente = Math.max(totalPedido - totalCobrado, 0);

  const porcentajeCobrado =
    totalPedido > 0
      ? Math.min((totalCobrado / totalPedido) * 100, 100)
      : 0;

  const cantidadTotal = useMemo(
    () =>
      detalles.reduce(
        (total, detalle) => total + Number(detalle.cantidad),
        0
      ),
    [detalles]
  );

  const metodosUtilizados = useMemo(
    () =>
      Array.from(
        new Set(pagosActivos.map((pago) => pago.metodo_pago))
      ),
    [pagosActivos]
  );

  function calcularEstadoPago(
    cobrado: number,
    total: number
  ): "Pendiente" | "Parcial" | "Pagado" {
    if (cobrado <= 0) return "Pendiente";
    if (cobrado + 0.009 < total) return "Parcial";
    return "Pagado";
  }

  async function actualizarEstadoPagoAutomatico(
    nuevoTotalCobrado: number,
    metodoUltimoPago?: string
  ) {
    if (!pedido) return false;

    const nuevoEstado = calcularEstadoPago(
      nuevoTotalCobrado,
      Number(pedido.total)
    );

    const cambios: {
      estado_pago: string;
      updated_at: string;
      metodo_pago?: string;
    } = {
      estado_pago: nuevoEstado,
      updated_at: new Date().toISOString(),
    };

    if (metodoUltimoPago) {
      cambios.metodo_pago = metodoUltimoPago;
    }

    const { error: errorActualizacion } = await supabase
      .from("pedidos")
      .update(cambios)
      .eq("id", pedido.id)
      .eq("empresa_id", EMPRESA_ID);

    if (errorActualizacion) {
      console.error(
        "Error al actualizar estado del pago:",
        errorActualizacion
      );
      return false;
    }

    setPedido((pedidoActual) =>
      pedidoActual
        ? {
            ...pedidoActual,
            estado_pago: nuevoEstado,
            metodo_pago:
              metodoUltimoPago ?? pedidoActual.metodo_pago,
          }
        : pedidoActual
    );

    return true;
  }

  async function cambiarEstado(nuevoEstado: string) {
    if (!pedido || guardandoEstado) return;

    const pedidoAnterior = pedido;

    setPedido({
      ...pedido,
      estado: nuevoEstado,
    });
    setGuardandoEstado(true);
    setMensajeAccion("");

    const { error: errorActualizacion } = await supabase
      .from("pedidos")
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pedido.id)
      .eq("empresa_id", EMPRESA_ID);

    if (errorActualizacion) {
      console.error(
        "Error al cambiar estado:",
        errorActualizacion
      );
      setPedido(pedidoAnterior);
      alert(
        `No se pudo cambiar el estado: ${errorActualizacion.message}`
      );
    } else {
      setMensajeAccion("Estado del pedido guardado.");
    }

    setGuardandoEstado(false);
  }

  async function registrarPago(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!pedido || registrandoPago) return;

    const importe = Number(
      importePago.replace(/\./g, "").replace(",", ".")
    );

    if (!Number.isFinite(importe) || importe <= 0) {
      alert("Ingresá un importe válido mayor que cero.");
      return;
    }

    if (importe > saldoPendiente + 0.009) {
      alert(
        `El importe supera el saldo pendiente de ${formatearPrecio(
          saldoPendiente
        )}.`
      );
      return;
    }

    setRegistrandoPago(true);
    setMensajeAccion("");

    const { data: pagoCreado, error: errorPago } = await supabase
      .from("pagos_pedido")
      .insert({
        pedido_id: pedido.id,
        empresa_id: pedido.empresa_id,
        importe,
        metodo_pago: metodoPago,
        observaciones: observacionesPago.trim() || null,
      })
      .select("*")
      .single();

    if (errorPago || !pagoCreado) {
      console.error("Error al registrar pago:", errorPago);
      alert(
        `No se pudo registrar el pago: ${
          errorPago?.message || "respuesta vacía de Supabase"
        }`
      );
      setRegistrandoPago(false);
      return;
    }

    const nuevoTotalCobrado = totalCobrado + importe;

    const estadoActualizado =
      await actualizarEstadoPagoAutomatico(
        nuevoTotalCobrado,
        metodoPago
      );

    if (!estadoActualizado) {
      await supabase
        .from("pagos_pedido")
        .update({
          anulado: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pagoCreado.id)
        .eq("empresa_id", EMPRESA_ID);

      alert(
        "El pago no pudo sincronizarse con el pedido y fue anulado automáticamente."
      );
      setRegistrandoPago(false);
      await cargarDetallePedido();
      return;
    }

    setPagos((pagosActuales) => [
      pagoCreado as PagoPedido,
      ...pagosActuales,
    ]);

    setImportePago("");
    setObservacionesPago("");
    setMensajeAccion("Pago registrado correctamente.");
    setRegistrandoPago(false);
  }

  async function anularPago(pago: PagoPedido) {
    if (!pedido || pago.anulado || pagoAnulandoId !== null) return;

    const confirmar = window.confirm(
      `¿Querés anular el pago de ${formatearPrecio(
        Number(pago.importe)
      )} realizado por ${pago.metodo_pago}?`
    );

    if (!confirmar) return;

    setPagoAnulandoId(pago.id);
    setMensajeAccion("");

    const { error: errorAnulacion } = await supabase
      .from("pagos_pedido")
      .update({
        anulado: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pago.id)
      .eq("pedido_id", pedido.id)
      .eq("empresa_id", EMPRESA_ID);

    if (errorAnulacion) {
      console.error("Error al anular pago:", errorAnulacion);
      alert(
        `No se pudo anular el pago: ${errorAnulacion.message}`
      );
      setPagoAnulandoId(null);
      return;
    }

    const nuevoTotalCobrado = Math.max(
      totalCobrado - Number(pago.importe),
      0
    );

    const estadoActualizado =
      await actualizarEstadoPagoAutomatico(nuevoTotalCobrado);

    if (!estadoActualizado) {
      await supabase
        .from("pagos_pedido")
        .update({
          anulado: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pago.id)
        .eq("empresa_id", EMPRESA_ID);

      alert(
        "No se pudo sincronizar el estado del pedido. La anulación fue revertida."
      );
      setPagoAnulandoId(null);
      await cargarDetallePedido();
      return;
    }

    setPagos((pagosActuales) =>
      pagosActuales.map((pagoActual) =>
        pagoActual.id === pago.id
          ? {
              ...pagoActual,
              anulado: true,
              updated_at: new Date().toISOString(),
            }
          : pagoActual
      )
    );

    setMensajeAccion("Pago anulado correctamente.");
    setPagoAnulandoId(null);
  }

  async function copiarDireccion() {
    if (!pedido?.cliente_direccion) return;

    try {
      await navigator.clipboard.writeText(
        pedido.cliente_direccion
      );
      setMensajeAccion("Dirección copiada.");
    } catch (errorCopia) {
      console.error("No se pudo copiar la dirección:", errorCopia);
      alert("No se pudo copiar la dirección.");
    }
  }

  function limpiarNumero(numero: string) {
    return numero.replace(/\D/g, "");
  }

  function obtenerNumeroPedido() {
    if (!pedido) return "";

    return String(pedido.numero ?? pedido.id).padStart(6, "0");
  }

  function abrirWhatsApp() {
    if (!pedido) return;

    const numero = limpiarNumero(pedido.cliente_telefono);

    if (!numero) {
      alert("El cliente no tiene un teléfono válido.");
      return;
    }

    const mensaje = encodeURIComponent(
      `Hola ${pedido.cliente_nombre}, te escribimos por tu pedido #${obtenerNumeroPedido()}. Saldo pendiente: ${formatearPrecio(
        saldoPendiente
      )}.`
    );

    window.open(
      `https://wa.me/${numero}?text=${mensaje}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function llamarCliente() {
    if (!pedido) return;

    const numero = limpiarNumero(pedido.cliente_telefono);

    if (!numero) {
      alert("El cliente no tiene un teléfono válido.");
      return;
    }

    window.location.href = `tel:${numero}`;
  }

  function imprimirPedido() {
    window.print();
  }

  function formatearPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(precio);
  }

  function formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(fecha));
  }

  function formatearFechaCorta(fecha: string) {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(fecha));
  }

  function clasesEstadoPedido(estado: string) {
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

  function clasesEstadoPago(estado: string) {
    switch (estado) {
      case "Pagado":
        return "bg-green-100 text-green-700";
      case "Parcial":
        return "bg-blue-100 text-blue-700";
      case "Reembolsado":
        return "bg-violet-100 text-violet-700";
      case "Pendiente":
      default:
        return "bg-amber-100 text-amber-700";
    }
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p className="mt-4 text-slate-500">
            Cargando pedido...
          </p>
        </div>
      </main>
    );
  }

  if (error || !pedido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-700">
            Pedido no disponible
          </h1>

          <p className="mt-3 text-red-600">
            {error || "No se pudo cargar el pedido."}
          </p>

          <Link
            href="/admin/pedidos"
            className="mt-6 inline-block rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
          >
            Volver a pedidos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="print:hidden">
          <Link
            href="/admin/pedidos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] transition hover:text-blue-700"
          >
            ← Volver a pedidos
          </Link>
        </div>

        <header className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
                Centro de gestión del pedido
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold sm:text-4xl">
                  Pedido #{obtenerNumeroPedido()}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${clasesEstadoPedido(
                    pedido.estado
                  )}`}
                >
                  {pedido.estado}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${clasesEstadoPago(
                    pedido.estado_pago
                  )}`}
                >
                  Pago: {pedido.estado_pago}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {formatearFecha(pedido.created_at)}
              </p>

              {mensajeAccion && (
                <p className="mt-3 text-sm font-semibold text-green-600 print:hidden">
                  ✓ {mensajeAccion}
                </p>
              )}
            </div>

            <div className="w-full xl:max-w-xs print:hidden">
              <label
                htmlFor="estado-pedido"
                className="mb-2 block text-sm font-semibold"
              >
                Estado del pedido
              </label>

              <select
                id="estado-pedido"
                value={pedido.estado}
                disabled={guardandoEstado}
                onChange={(event) =>
                  cambiarEstado(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ESTADOS_PEDIDO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                El estado del pago se calcula automáticamente.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <button
            type="button"
            onClick={abrirWhatsApp}
            className="rounded-2xl bg-green-600 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            💬 WhatsApp
          </button>

          <button
            type="button"
            onClick={llamarCliente}
            className="rounded-2xl bg-[#2563EB] px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            📞 Llamar
          </button>

          <button
            type="button"
            onClick={copiarDireccion}
            disabled={!pedido.cliente_direccion}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            📍 Copiar dirección
          </button>

          <button
            type="button"
            onClick={imprimirPedido}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            🖨️ Imprimir
          </button>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Gestión de pagos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Registrá pagos parciales y consultá el saldo en tiempo real.
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${clasesEstadoPago(
                  pedido.estado_pago
                )}`}
              >
                {pedido.estado_pago}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-6 xl:grid-cols-[1fr_420px]">
            <div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">
                    Total del pedido
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {formatearPrecio(totalPedido)}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-sm text-green-700">
                    Total cobrado
                  </p>

                  <p className="mt-2 text-2xl font-bold text-green-700">
                    {formatearPrecio(totalCobrado)}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-5">
                  <p className="text-sm text-amber-700">
                    Saldo pendiente
                  </p>

                  <p className="mt-2 text-2xl font-bold text-amber-700">
                    {formatearPrecio(saldoPendiente)}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">
                    Progreso del cobro
                  </span>

                  <span className="font-bold">
                    {porcentajeCobrado.toFixed(0)}%
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{
                      width: `${porcentajeCobrado}%`,
                    }}
                  />
                </div>
              </div>

              {metodosUtilizados.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-600">
                    Métodos utilizados
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {metodosUtilizados.map((metodo) => (
                      <span
                        key={metodo}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {metodo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="font-bold">
                  Historial de pagos
                </h3>

                {pagos.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    Todavía no hay pagos registrados.
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {pagos.map((pago) => (
                      <article
                        key={pago.id}
                        className={`rounded-2xl border p-4 ${
                          pago.anulado
                            ? "border-red-200 bg-red-50 opacity-70"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">
                                {pago.metodo_pago}
                              </p>

                              {pago.anulado && (
                                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                  Anulado
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatearFechaCorta(
                                pago.created_at
                              )}
                            </p>

                            {pago.observaciones && (
                              <p className="mt-2 text-sm text-slate-600">
                                {pago.observaciones}
                              </p>
                            )}
                          </div>

                          <div className="text-left sm:text-right">
                            <p
                              className={`text-xl font-bold ${
                                pago.anulado
                                  ? "text-red-500 line-through"
                                  : "text-green-700"
                              }`}
                            >
                              {formatearPrecio(
                                Number(pago.importe)
                              )}
                            </p>

                            {!pago.anulado && (
                              <button
                                type="button"
                                onClick={() => anularPago(pago)}
                                disabled={
                                  pagoAnulandoId === pago.id
                                }
                                className="mt-2 text-sm font-semibold text-red-500 transition hover:text-red-700 disabled:opacity-50 print:hidden"
                              >
                                {pagoAnulandoId === pago.id
                                  ? "Anulando..."
                                  : "Anular pago"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="print:hidden">
              <div className="rounded-2xl bg-slate-50 p-5">
                <h3 className="text-lg font-bold">
                  Registrar nuevo pago
                </h3>

                {saldoPendiente <= 0 ? (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                    ✓ El pedido está completamente abonado.
                  </div>
                ) : (
                  <form
                    onSubmit={registrarPago}
                    className="mt-5 space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="importe-pago"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Importe
                      </label>

                      <input
                        id="importe-pago"
                        type="text"
                        inputMode="decimal"
                        value={importePago}
                        onChange={(event) =>
                          setImportePago(event.target.value)
                        }
                        placeholder="Ejemplo: 50000"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setImportePago(
                            String(saldoPendiente)
                          )
                        }
                        className="mt-2 text-sm font-semibold text-[#2563EB]"
                      >
                        Completar con el saldo pendiente
                      </button>
                    </div>

                    <div>
                      <label
                        htmlFor="metodo-pago"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Forma de pago
                      </label>

                      <select
                        id="metodo-pago"
                        value={metodoPago}
                        onChange={(event) =>
                          setMetodoPago(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                      >
                        {METODOS_PAGO.map((metodo) => (
                          <option key={metodo} value={metodo}>
                            {metodo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="observaciones-pago"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Observaciones
                        <span className="ml-1 font-normal text-slate-400">
                          (opcional)
                        </span>
                      </label>

                      <textarea
                        id="observaciones-pago"
                        rows={3}
                        value={observacionesPago}
                        onChange={(event) =>
                          setObservacionesPago(
                            event.target.value
                          )
                        }
                        placeholder="Ejemplo: seña, número de cheque..."
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={registrandoPago}
                      className="w-full rounded-xl bg-[#F97316] px-5 py-4 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {registrandoPago
                        ? "Registrando pago..."
                        : "Registrar pago"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Productos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {detalles.length} producto(s) diferente(s)
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-600">
                {cantidadTotal} unidad(es)
              </p>
            </div>

            {detalles.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                Este pedido no tiene productos cargados.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {detalles.map((detalle) => (
                  <article
                    key={detalle.id}
                    className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center"
                  >
                    {detalle.producto_imagen ? (
                      <img
                        src={detalle.producto_imagen}
                        alt={detalle.producto_nombre}
                        className="h-24 w-24 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400">
                        Sin imagen
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">
                        {detalle.producto_nombre}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {formatearPrecio(
                          Number(detalle.precio_unitario)
                        )}{" "}
                        × {detalle.cantidad}
                      </p>
                    </div>

                    <p className="text-xl font-bold">
                      {formatearPrecio(
                        Number(detalle.subtotal)
                      )}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Cliente
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Nombre
                  </p>

                  <p className="mt-1 font-semibold">
                    {pedido.cliente_nombre}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Teléfono
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {pedido.cliente_telefono}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Dirección
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {pedido.cliente_direccion || "No informada"}
                  </p>
                </div>
              </div>

              {pedido.observaciones && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Observaciones
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {pedido.observaciones}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Resumen
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    {formatearPrecio(
                      Number(pedido.subtotal)
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Envío
                  </span>

                  <span className="font-semibold">
                    {formatearPrecio(
                      Number(pedido.costo_envio || 0)
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Descuento
                  </span>

                  <span className="font-semibold">
                    -{" "}
                    {formatearPrecio(
                      Number(pedido.descuento || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
                <span className="text-lg font-semibold">
                  Total
                </span>

                <span className="text-2xl font-bold">
                  {formatearPrecio(Number(pedido.total))}
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Estado del pago
                  </p>

                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${clasesEstadoPago(
                      pedido.estado_pago
                    )}`}
                  >
                    {pedido.estado_pago}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Método de entrega
                  </p>

                  <p className="mt-2 font-semibold">
                    {pedido.metodo_entrega || "No informado"}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}