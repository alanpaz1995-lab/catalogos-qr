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
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

type ClienteResumen = {
  id: number;
  empresa_id: number;
  nombre: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  cantidad_pedidos: number;
  total_comprado: number;
  total_pagado: number;
  saldo_pendiente: number;
  ultima_compra?: string | null;
};

type PedidoCliente = {
  id: number;
  numero: number;
  cliente_id: number | null;
  total: number;
  estado: string;
  estado_pago: string;
  created_at: string;
};

type PagoPedido = {
  id: number;
  pedido_id: number;
  importe: number;
  metodo_pago: string;
  observaciones?: string | null;
  anulado: boolean;
  created_at: string;
};


export default function ClienteDetallePage() {
  const params = useParams();
  const {
    empresa,
    cargandoEmpresa,
    errorEmpresa,
  } = useEmpresa();
  const idParametro = Array.isArray(params.id) ? params.id[0] : params.id;
  const clienteId = Number(idParametro);

  const [cliente, setCliente] = useState<ClienteResumen | null>(null);
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [pagos, setPagos] = useState<PagoPedido[]>([]);

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeAccion, setMensajeAccion] = useState("");

  const cargarCliente = useCallback(async () => {
    if (!empresa?.id) return;

    setCargando(true);
    setError("");

    if (!clienteId || Number.isNaN(clienteId)) {
      setError("El cliente solicitado no es válido.");
      setCargando(false);
      return;
    }

    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes_resumen")
      .select("*")
      .eq("id", clienteId)
      .eq("empresa_id", empresa.id)
      .maybeSingle();

    if (clienteError || !clienteData) {
      setError(
        clienteError
          ? `No se pudo cargar el cliente: ${clienteError.message}`
          : "No encontramos ese cliente."
      );
      setCargando(false);
      return;
    }

    const { data: pedidosData, error: pedidosError } = await supabase
      .from("pedidos")
      .select("id, numero, cliente_id, total, estado, estado_pago, created_at")
      .eq("cliente_id", clienteId)
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false });

    if (pedidosError) {
      setError(`No se pudieron cargar los pedidos: ${pedidosError.message}`);
      setCargando(false);
      return;
    }

    const pedidosCargados = (pedidosData as PedidoCliente[]) || [];
    const pedidosIds = pedidosCargados.map((pedido) => pedido.id);
    let pagosCargados: PagoPedido[] = [];

    if (pedidosIds.length > 0) {
      const { data: pagosData, error: pagosError } = await supabase
        .from("pagos_pedido")
        .select("*")
        .in("pedido_id", pedidosIds)
        .eq("empresa_id", empresa.id)
        .order("created_at", { ascending: false });

      if (pagosError) {
        setError(`No se pudieron cargar los pagos: ${pagosError.message}`);
        setCargando(false);
        return;
      }

      pagosCargados = (pagosData as PagoPedido[]) || [];
    }

    const clienteCargado = clienteData as ClienteResumen;
    setCliente(clienteCargado);
    setPedidos(pedidosCargados);
    setPagos(pagosCargados);
    setNombre(clienteCargado.nombre);
    setTelefono(clienteCargado.telefono);
    setEmail(clienteCargado.email || "");
    setDireccion(clienteCargado.direccion || "");
    setObservaciones(clienteCargado.observaciones || "");
    setCargando(false);
  }, [clienteId, empresa?.id]);

  useEffect(() => {
    if (!empresa?.id) return;

    cargarCliente();
  }, [empresa?.id, cargarCliente]);

  const pagosActivos = useMemo(
    () => pagos.filter((pago) => !pago.anulado),
    [pagos]
  );

  const ticketPromedio = useMemo(() => {
    if (!cliente || Number(cliente.cantidad_pedidos || 0) === 0) return 0;
    return (
      Number(cliente.total_comprado || 0) /
      Number(cliente.cantidad_pedidos || 1)
    );
  }, [cliente]);

  const metodosPago = useMemo(
    () => Array.from(new Set(pagosActivos.map((pago) => pago.metodo_pago))),
    [pagosActivos]
  );

  async function guardarCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cliente || guardando) return;

    if (!empresa?.id) {
      alert(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.replace(/\D/g, "");

    if (!nombreLimpio) {
      alert("El nombre es obligatorio.");
      return;
    }

    if (!telefonoLimpio) {
      alert("El teléfono es obligatorio.");
      return;
    }

    setGuardando(true);
    setMensajeAccion("");

    const { error: errorActualizacion } = await supabase
      .from("clientes")
      .update({
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        observaciones: observaciones.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cliente.id)
      .eq("empresa_id", empresa.id);

    if (errorActualizacion) {
      alert(`No se pudo actualizar el cliente: ${errorActualizacion.message}`);
      setGuardando(false);
      return;
    }

    setCliente({
      ...cliente,
      nombre: nombreLimpio,
      telefono: telefonoLimpio,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
      observaciones: observaciones.trim() || null,
    });

    setEditando(false);
    setMensajeAccion("Datos del cliente actualizados.");
    setGuardando(false);
  }

  function cancelarEdicion() {
    if (!cliente) return;
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono);
    setEmail(cliente.email || "");
    setDireccion(cliente.direccion || "");
    setObservaciones(cliente.observaciones || "");
    setEditando(false);
  }

  function formatearPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(precio);
  }

  function formatearFecha(fecha?: string | null) {
    if (!fecha) return "Sin registros";
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

  function abrirWhatsApp() {
    if (!cliente) return;
    const numero = cliente.telefono.replace(/\D/g, "");
    if (!numero) {
      alert("El cliente no tiene un teléfono válido.");
      return;
    }

    const mensaje = encodeURIComponent(
      `Hola ${cliente.nombre}, te compartimos el estado de tu cuenta.\n\n` +
        `Total comprado: ${formatearPrecio(Number(cliente.total_comprado || 0))}\n` +
        `Total pagado: ${formatearPrecio(Number(cliente.total_pagado || 0))}\n` +
        `Saldo pendiente: ${formatearPrecio(Number(cliente.saldo_pendiente || 0))}\n\n` +
        `Podés solicitar el detalle completo en PDF.`
    );

    window.open(
      `https://wa.me/${numero}?text=${mensaje}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copiarTelefono() {
    if (!cliente) return;
    try {
      await navigator.clipboard.writeText(cliente.telefono);
      setMensajeAccion("Teléfono copiado.");
    } catch {
      alert("No se pudo copiar el teléfono.");
    }
  }

  function guardarComoPDF() {
    document.title = `Estado-de-cuenta-${cliente?.nombre || "cliente"}`;
    window.print();
  }

  function clasesEstadoPedido(estado: string) {
    switch (estado) {
      case "Pendiente": return "bg-amber-100 text-amber-700";
      case "Confirmado": return "bg-blue-100 text-blue-700";
      case "Preparando": return "bg-violet-100 text-violet-700";
      case "Listo": return "bg-cyan-100 text-cyan-700";
      case "Enviado": return "bg-indigo-100 text-indigo-700";
      case "Entregado": return "bg-green-100 text-green-700";
      case "Cancelado": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  }

  function clasesEstadoPago(estado: string) {
    switch (estado) {
      case "Pagado": return "bg-green-100 text-green-700";
      case "Parcial": return "bg-blue-100 text-blue-700";
      case "Reembolsado": return "bg-violet-100 text-violet-700";
      default: return "bg-amber-100 text-amber-700";
    }
  }

  if (cargandoEmpresa || cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p className="mt-4 text-slate-500">Cargando cliente...</p>
        </div>
      </main>
    );
  }

  if (errorEmpresa || !empresa?.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-700">
            Empresa no disponible
          </h1>
          <p className="mt-3 text-red-600">
            {errorEmpresa ||
              "No encontramos la empresa asociada a tu cuenta."}
          </p>
          <Link
            href="/admin/clientes"
            className="mt-6 inline-block rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
          >
            Volver a clientes
          </Link>
        </div>
      </main>
    );
  }

  if (error || !cliente) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-700">Cliente no disponible</h1>
          <p className="mt-3 text-red-600">{error || "No se pudo cargar el cliente."}</p>
          <Link href="/admin/clientes" className="mt-6 inline-block rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white">
            Volver a clientes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl">
        <div className="print:hidden">
          <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
            ← Volver a clientes
          </Link>
        </div>

        <section className="hidden print:block print:border-b print:border-slate-300 print:pb-5">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">COMERSYS</p>
          <h1 className="mt-2 text-3xl font-bold">Estado de cuenta</h1>
          <p className="mt-2 text-sm text-slate-600">
            Encabezado preparado para la futura identidad visual de cada empresa.
          </p>
          <p className="mt-2 text-sm">
            Fecha de emisión: {formatearFecha(new Date().toISOString())}
          </p>
        </section>

        <header className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 print:mt-6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-blue-100 text-2xl font-bold text-[#2563EB] print:hidden">
                {cliente.nombre.charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB] print:text-slate-500">Ficha del cliente</p>
                <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{cliente.nombre}</h1>
                <p className="mt-2 text-sm text-slate-500">Cliente desde {formatearFecha(cliente.created_at)}</p>
                {mensajeAccion && <p className="mt-3 text-sm font-semibold text-green-600 print:hidden">✓ {mensajeAccion}</p>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
              <button type="button" onClick={abrirWhatsApp} className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white">💬 WhatsApp</button>
              <button type="button" onClick={copiarTelefono} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold">📋 Copiar teléfono</button>
              <button type="button" onClick={() => setEditando(true)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold">✏️ Editar cliente</button>
              <button type="button" onClick={guardarComoPDF} className="rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white">📄 Guardar PDF</button>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
          {[
            ["Total comprado", Number(cliente.total_comprado || 0)],
            ["Total pagado", Number(cliente.total_pagado || 0)],
            ["Saldo pendiente", Number(cliente.saldo_pendiente || 0)],
            ["Ticket promedio", ticketPromedio],
          ].map(([titulo, valor]) => (
            <div key={String(titulo)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:shadow-none">
              <p className="text-sm text-slate-500">{titulo}</p>
              <p className="mt-2 text-3xl font-bold">{formatearPrecio(Number(valor))}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr] print:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:shadow-none">
              <h2 className="text-xl font-bold">Datos del cliente</h2>
              <div className="mt-5 space-y-4">
                <Dato label="Teléfono" value={cliente.telefono} />
                <Dato label="Email" value={cliente.email || "No informado"} />
                <Dato label="Dirección" value={cliente.direccion || "No informada"} />
                <Dato label="Última compra" value={formatearFecha(cliente.ultima_compra)} />
                <Dato label="Cantidad de pedidos" value={String(Number(cliente.cantidad_pedidos || 0))} />
              </div>

              {cliente.observaciones && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notas internas</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{cliente.observaciones}</p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:shadow-none">
              <h2 className="text-xl font-bold">Formas de pago usadas</h2>
              {metodosPago.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Todavía no hay pagos registrados.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {metodosPago.map((metodo) => (
                    <span key={metodo} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{metodo}</span>
                  ))}
                </div>
              )}
            </section>
          </aside>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-bold">Pedidos del cliente</h2>
                <p className="mt-1 text-sm text-slate-500">{pedidos.length} pedido(s) registrados</p>
              </div>

              {pedidos.length === 0 ? (
                <div className="p-10 text-center text-slate-500">Este cliente todavía no tiene pedidos.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pedidos.map((pedido) => (
                    <article key={pedido.id} className="p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold">Pedido #{String(pedido.numero).padStart(6, "0")}</h3>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${clasesEstadoPedido(pedido.estado)}`}>{pedido.estado}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${clasesEstadoPago(pedido.estado_pago)}`}>{pedido.estado_pago}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{formatearFechaCorta(pedido.created_at)}</p>
                        </div>

                        <div className="flex flex-col gap-3 sm:items-end">
                          <p className="text-2xl font-bold">{formatearPrecio(Number(pedido.total))}</p>
                          <Link href={`/admin/pedidos/${pedido.id}`} className="rounded-xl bg-[#2563EB] px-4 py-3 text-center font-semibold text-white print:hidden">Ver pedido</Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-bold">Historial de pagos</h2>
                <p className="mt-1 text-sm text-slate-500">{pagosActivos.length} pago(s) activos</p>
              </div>

              {pagos.length === 0 ? (
                <div className="p-10 text-center text-slate-500">Todavía no hay pagos registrados.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pagos.map((pago) => (
                    <article key={pago.id} className={`p-6 ${pago.anulado ? "bg-red-50 opacity-70" : ""}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">{pago.metodo_pago}</p>
                            {pago.anulado && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Anulado</span>}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{formatearFechaCorta(pago.created_at)}</p>
                          {pago.observaciones && <p className="mt-2 text-sm text-slate-600">{pago.observaciones}</p>}
                        </div>

                        <p className={`text-xl font-bold ${pago.anulado ? "text-red-500 line-through" : "text-green-700"}`}>
                          {formatearPrecio(Number(pago.importe))}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="mt-8 hidden border-t border-slate-300 pt-4 text-center text-xs text-slate-500 print:block">
          Documento generado por ComerSys. El encabezado y pie podrán personalizarse desde la configuración de cada empresa.
        </footer>
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold">Editar cliente</h2>
                <p className="mt-1 text-sm text-slate-500">Actualizá sus datos y notas internas.</p>
              </div>
              <button type="button" onClick={cancelarEdicion} className="rounded-full bg-slate-100 px-3 py-2 font-bold">✕</button>
            </div>

            <form onSubmit={guardarCliente} className="space-y-5 p-6">
              <Campo label="Nombre" value={nombre} onChange={setNombre} required />
              <Campo label="Teléfono" value={telefono} onChange={setTelefono} required />
              <Campo label="Email" value={email} onChange={setEmail} />
              <Campo label="Dirección" value={direccion} onChange={setDireccion} />

              <div>
                <label className="mb-2 block font-semibold">Notas internas</label>
                <textarea
                  rows={4}
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  placeholder="Preferencias, horarios, información útil..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={cancelarEdicion} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold">Cancelar</button>
                <button type="submit" disabled={guardando} className="rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white disabled:opacity-60">
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-semibold">{label}</label>
      <input
        type="text"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}