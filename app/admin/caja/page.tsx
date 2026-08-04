"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type Caja = {
  id: number;
  empresa_id: number;
  estado: "Abierta" | "Cerrada";
  saldo_inicial: number;
  saldo_esperado?: number | null;
  saldo_contado?: number | null;
  diferencia?: number | null;
  observaciones_apertura?: string | null;
  observaciones_cierre?: string | null;
  abierta_at: string;
  cerrada_at?: string | null;
  created_at: string;
  updated_at: string;
};

type MovimientoCaja = {
  id: number;
  caja_id: number;
  empresa_id: number;
  tipo: "Ingreso" | "Egreso";
  categoria: string;
  concepto: string;
  importe: number;
  metodo_pago: string;
  observaciones?: string | null;
  anulado: boolean;
  created_at: string;
  updated_at: string;
};

type PagoPedido = {
  id: number;
  pedido_id: number;
  empresa_id: number;
  caja_id?: number | null;
  importe: number;
  metodo_pago: string;
  observaciones?: string | null;
  anulado: boolean;
  created_at: string;
};

type TipoFormulario = "Ingreso" | "Egreso";

const EMPRESA_ID = 1;

const METODOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Cheque",
  "Tarjeta",
  "Mercado Pago",
  "Otro",
];

const CATEGORIAS_INGRESO = ["Venta", "Aporte", "Cobro", "Ajuste", "Otro"];

const CATEGORIAS_EGRESO = [
  "Compra",
  "Proveedor",
  "Servicios",
  "Transporte",
  "Impuestos",
  "Retiro",
  "Ajuste",
  "Otro",
];

export default function CajaPage() {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [pagos, setPagos] = useState<PagoPedido[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarApertura, setMostrarApertura] = useState(false);
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [mostrarCierre, setMostrarCierre] = useState(false);

  const [saldoInicial, setSaldoInicial] = useState("");
  const [observacionesApertura, setObservacionesApertura] = useState("");

  const [tipoMovimiento, setTipoMovimiento] = useState<TipoFormulario>("Ingreso");
  const [categoriaMovimiento, setCategoriaMovimiento] = useState("Venta");
  const [conceptoMovimiento, setConceptoMovimiento] = useState("");
  const [importeMovimiento, setImporteMovimiento] = useState("");
  const [metodoMovimiento, setMetodoMovimiento] = useState("Efectivo");
  const [observacionesMovimiento, setObservacionesMovimiento] = useState("");

  const [saldoContado, setSaldoContado] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");

  const [procesando, setProcesando] = useState(false);

  const cargarCaja = useCallback(async () => {
    setCargando(true);
    setError("");

    const { data: cajaData, error: cajaError } = await supabase
      .from("cajas")
      .select("*")
      .eq("empresa_id", EMPRESA_ID)
      .eq("estado", "Abierta")
      .order("abierta_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cajaError) {
      setError(`No se pudo cargar la caja: ${cajaError.message}`);
      setCargando(false);
      return;
    }

    if (!cajaData) {
      setCaja(null);
      setPagos([]);
      setMovimientos([]);
      setCargando(false);
      return;
    }

    const cajaActual = cajaData as Caja;

    const [
      { data: pagosData, error: pagosError },
      { data: movimientosData, error: movimientosError },
    ] = await Promise.all([
      supabase
        .from("pagos_pedido")
        .select("*")
        .eq("empresa_id", EMPRESA_ID)
        .eq("caja_id", cajaActual.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("movimientos_caja")
        .select("*")
        .eq("empresa_id", EMPRESA_ID)
        .eq("caja_id", cajaActual.id)
        .order("created_at", { ascending: false }),
    ]);

    if (pagosError) {
      setError(`No se pudieron cargar los pagos: ${pagosError.message}`);
      setCargando(false);
      return;
    }

    if (movimientosError) {
      setError(`No se pudieron cargar los movimientos: ${movimientosError.message}`);
      setCargando(false);
      return;
    }

    setCaja(cajaActual);
    setPagos((pagosData as PagoPedido[]) || []);
    setMovimientos((movimientosData as MovimientoCaja[]) || []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarCaja();
  }, [cargarCaja]);

  const pagosActivos = useMemo(
    () => pagos.filter((pago) => !pago.anulado),
    [pagos]
  );

  const movimientosActivos = useMemo(
    () => movimientos.filter((movimiento) => !movimiento.anulado),
    [movimientos]
  );

  const ingresosPedidos = useMemo(
    () => pagosActivos.reduce((total, pago) => total + Number(pago.importe), 0),
    [pagosActivos]
  );

  const ingresosManuales = useMemo(
    () =>
      movimientosActivos
        .filter((movimiento) => movimiento.tipo === "Ingreso")
        .reduce((total, movimiento) => total + Number(movimiento.importe), 0),
    [movimientosActivos]
  );

  const egresos = useMemo(
    () =>
      movimientosActivos
        .filter((movimiento) => movimiento.tipo === "Egreso")
        .reduce((total, movimiento) => total + Number(movimiento.importe), 0),
    [movimientosActivos]
  );

  const saldoEsperado =
    Number(caja?.saldo_inicial || 0) +
    ingresosPedidos +
    ingresosManuales -
    egresos;

  const totalesPorMetodo = useMemo(() => {
    const totales: Record<string, number> = {};

    for (const metodo of METODOS_PAGO) {
      totales[metodo] = 0;
    }

    for (const pago of pagosActivos) {
      totales[pago.metodo_pago] =
        (totales[pago.metodo_pago] || 0) + Number(pago.importe);
    }

    for (const movimiento of movimientosActivos) {
      const importe = Number(movimiento.importe);
      totales[movimiento.metodo_pago] =
        (totales[movimiento.metodo_pago] || 0) +
        (movimiento.tipo === "Ingreso" ? importe : -importe);
    }

    return totales;
  }, [pagosActivos, movimientosActivos]);

  const historial = useMemo(() => {
    const pagosConvertidos = pagos.map((pago) => ({
      id: `pago-${pago.id}`,
      origen: "Pedido",
      tipo: "Ingreso" as const,
      concepto: `Pago del pedido #${pago.pedido_id}`,
      categoria: "Venta",
      importe: Number(pago.importe),
      metodo_pago: pago.metodo_pago,
      observaciones: pago.observaciones,
      anulado: pago.anulado,
      created_at: pago.created_at,
    }));

    const movimientosConvertidos = movimientos.map((movimiento) => ({
      id: `movimiento-${movimiento.id}`,
      origen: "Manual",
      tipo: movimiento.tipo,
      concepto: movimiento.concepto,
      categoria: movimiento.categoria,
      importe: Number(movimiento.importe),
      metodo_pago: movimiento.metodo_pago,
      observaciones: movimiento.observaciones,
      anulado: movimiento.anulado,
      created_at: movimiento.created_at,
    }));

    return [...pagosConvertidos, ...movimientosConvertidos].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
  }, [pagos, movimientos]);

  async function abrirCaja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saldo = convertirImporte(saldoInicial);

    if (!Number.isFinite(saldo) || saldo < 0) {
      setError("Ingresá un saldo inicial válido.");
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    const { error: aperturaError } = await supabase.from("cajas").insert({
      empresa_id: EMPRESA_ID,
      saldo_inicial: saldo,
      observaciones_apertura: observacionesApertura.trim() || null,
    });

    if (aperturaError) {
      setError(`No se pudo abrir la caja: ${aperturaError.message}`);
      setProcesando(false);
      return;
    }

    setSaldoInicial("");
    setObservacionesApertura("");
    setMostrarApertura(false);
    setMensaje("Caja abierta correctamente.");
    setProcesando(false);
    await cargarCaja();
  }

  async function registrarMovimiento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!caja) return;

    const importe = convertirImporte(importeMovimiento);

    if (!conceptoMovimiento.trim()) {
      setError("Escribí el concepto del movimiento.");
      return;
    }

    if (!Number.isFinite(importe) || importe <= 0) {
      setError("Ingresá un importe válido mayor que cero.");
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    const { error: movimientoError } = await supabase
      .from("movimientos_caja")
      .insert({
        caja_id: caja.id,
        empresa_id: EMPRESA_ID,
        tipo: tipoMovimiento,
        categoria: categoriaMovimiento,
        concepto: conceptoMovimiento.trim(),
        importe,
        metodo_pago: metodoMovimiento,
        observaciones: observacionesMovimiento.trim() || null,
      });

    if (movimientoError) {
      setError(`No se pudo registrar el movimiento: ${movimientoError.message}`);
      setProcesando(false);
      return;
    }

    setConceptoMovimiento("");
    setImporteMovimiento("");
    setMetodoMovimiento("Efectivo");
    setObservacionesMovimiento("");
    setMostrarMovimiento(false);
    setMensaje(
      tipoMovimiento === "Ingreso"
        ? "Ingreso registrado correctamente."
        : "Egreso registrado correctamente."
    );
    setProcesando(false);
    await cargarCaja();
  }

  async function anularMovimiento(movimientoId: number) {
    const confirmar = window.confirm("¿Querés anular este movimiento?");
    if (!confirmar) return;

    const { error: anulacionError } = await supabase
      .from("movimientos_caja")
      .update({
        anulado: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", movimientoId)
      .eq("empresa_id", EMPRESA_ID);

    if (anulacionError) {
      setError(`No se pudo anular el movimiento: ${anulacionError.message}`);
      return;
    }

    setMensaje("Movimiento anulado.");
    await cargarCaja();
  }

  async function cerrarCaja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!caja) return;

    const contado = convertirImporte(saldoContado);

    if (!Number.isFinite(contado) || contado < 0) {
      setError("Ingresá un saldo contado válido.");
      return;
    }

    const diferencia = contado - saldoEsperado;

    setProcesando(true);
    setError("");
    setMensaje("");

    const { error: cierreError } = await supabase
      .from("cajas")
      .update({
        estado: "Cerrada",
        saldo_esperado: saldoEsperado,
        saldo_contado: contado,
        diferencia,
        observaciones_cierre: observacionesCierre.trim() || null,
        cerrada_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", caja.id)
      .eq("empresa_id", EMPRESA_ID);

    if (cierreError) {
      setError(`No se pudo cerrar la caja: ${cierreError.message}`);
      setProcesando(false);
      return;
    }

    setSaldoContado("");
    setObservacionesCierre("");
    setMostrarCierre(false);
    setMensaje(`Caja cerrada. Diferencia: ${formatearPrecio(diferencia)}.`);
    setProcesando(false);
    await cargarCaja();
  }

  function convertirImporte(valor: string) {
    return Number(valor.replace(/\./g, "").replace(",", "."));
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
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(fecha));
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p className="mt-4 text-slate-500">Cargando caja...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
              Finanzas
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Caja PRO</h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Controlá ingresos, egresos, métodos de pago y cierre diario desde una sola pantalla.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarCaja}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold shadow-sm"
          >
            Actualizar
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-700">
            ✓ {mensaje}
          </div>
        )}

        {!caja ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl">
              🔒
            </div>

            <h2 className="mt-5 text-2xl font-bold">La caja está cerrada</h2>
            <p className="mt-2 text-slate-500">
              Abrí una caja para empezar a registrar movimientos.
            </p>

            <button
              type="button"
              onClick={() => setMostrarApertura(true)}
              className="mt-6 rounded-xl bg-[#2563EB] px-6 py-4 font-semibold text-white"
            >
              Abrir caja
            </button>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Caja abierta
                  </span>
                  <p className="mt-3 text-sm text-green-700">
                    Apertura: {formatearFecha(caja.abierta_at)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarCierre(true)}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
                >
                  Cerrar caja
                </button>
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Resumen titulo="Saldo inicial" valor={formatearPrecio(Number(caja.saldo_inicial))} />
              <Resumen titulo="Pagos de pedidos" valor={formatearPrecio(ingresosPedidos)} variante="verde" />
              <Resumen titulo="Ingresos manuales" valor={formatearPrecio(ingresosManuales)} variante="azul" />
              <Resumen titulo="Egresos" valor={formatearPrecio(egresos)} variante="rojo" />
              <Resumen titulo="Saldo esperado" valor={formatearPrecio(saldoEsperado)} variante="naranja" />
            </section>

            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setTipoMovimiento("Ingreso");
                  setCategoriaMovimiento("Venta");
                  setMostrarMovimiento(true);
                }}
                className="rounded-2xl bg-green-600 px-5 py-4 font-semibold text-white"
              >
                ➕ Registrar ingreso
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoMovimiento("Egreso");
                  setCategoriaMovimiento("Compra");
                  setMostrarMovimiento(true);
                }}
                className="rounded-2xl bg-red-600 px-5 py-4 font-semibold text-white"
              >
                💸 Registrar egreso
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold"
              >
                🖨️ Imprimir resumen
              </button>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Totales por método de pago</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {METODOS_PAGO.map((metodo) => (
                  <div key={metodo} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{metodo}</p>
                    <p className="mt-2 text-xl font-bold">
                      {formatearPrecio(Number(totalesPorMetodo[metodo] || 0))}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-bold">Movimientos de la caja</h2>
                <p className="mt-1 text-sm text-slate-500">{historial.length} movimiento(s)</p>
              </div>

              {historial.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  Todavía no hay movimientos.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historial.map((item) => (
                    <article
                      key={item.id}
                      className={`p-6 ${item.anulado ? "bg-red-50 opacity-70" : ""}`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                item.tipo === "Ingreso"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.tipo}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {item.origen}
                            </span>

                            {item.anulado && (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                Anulado
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 font-bold">{item.concepto}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.categoria} · {item.metodo_pago} · {formatearFecha(item.created_at)}
                          </p>

                          {item.observaciones && (
                            <p className="mt-2 text-sm text-slate-600">
                              {item.observaciones}
                            </p>
                          )}
                        </div>

                        <div className="sm:text-right">
                          <p
                            className={`text-2xl font-bold ${
                              item.tipo === "Ingreso"
                                ? "text-green-700"
                                : "text-red-700"
                            } ${item.anulado ? "line-through" : ""}`}
                          >
                            {item.tipo === "Ingreso" ? "+" : "-"} {formatearPrecio(item.importe)}
                          </p>

                          {item.origen === "Manual" && !item.anulado && (
                            <button
                              type="button"
                              onClick={() =>
                                anularMovimiento(
                                  Number(String(item.id).replace("movimiento-", ""))
                                )
                              }
                              className="mt-2 text-sm font-semibold text-red-500"
                            >
                              Anular movimiento
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {mostrarApertura && (
        <Modal titulo="Abrir caja" onCerrar={() => setMostrarApertura(false)}>
          <form onSubmit={abrirCaja} className="space-y-5">
            <Campo
              label="Saldo inicial"
              value={saldoInicial}
              onChange={setSaldoInicial}
              placeholder="Ejemplo: 50000"
            />

            <Area
              label="Observaciones"
              value={observacionesApertura}
              onChange={setObservacionesApertura}
              placeholder="Detalle opcional de la apertura..."
            />

            <BotonesModal
              procesando={procesando}
              textoConfirmar="Abrir caja"
              onCancelar={() => setMostrarApertura(false)}
            />
          </form>
        </Modal>
      )}

      {mostrarMovimiento && caja && (
        <Modal
          titulo={tipoMovimiento === "Ingreso" ? "Registrar ingreso" : "Registrar egreso"}
          onCerrar={() => setMostrarMovimiento(false)}
        >
          <form onSubmit={registrarMovimiento} className="space-y-5">
            <div>
              <label className="mb-2 block font-semibold">Categoría</label>
              <select
                value={categoriaMovimiento}
                onChange={(event) => setCategoriaMovimiento(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {(tipoMovimiento === "Ingreso"
                  ? CATEGORIAS_INGRESO
                  : CATEGORIAS_EGRESO
                ).map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>

            <Campo
              label="Concepto"
              value={conceptoMovimiento}
              onChange={setConceptoMovimiento}
              placeholder="Ejemplo: compra de insumos"
            />

            <Campo
              label="Importe"
              value={importeMovimiento}
              onChange={setImporteMovimiento}
              placeholder="Ejemplo: 12500"
            />

            <div>
              <label className="mb-2 block font-semibold">Método de pago</label>
              <select
                value={metodoMovimiento}
                onChange={(event) => setMetodoMovimiento(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
            </div>

            <Area
              label="Observaciones"
              value={observacionesMovimiento}
              onChange={setObservacionesMovimiento}
              placeholder="Información adicional..."
            />

            <BotonesModal
              procesando={procesando}
              textoConfirmar={
                tipoMovimiento === "Ingreso"
                  ? "Registrar ingreso"
                  : "Registrar egreso"
              }
              onCancelar={() => setMostrarMovimiento(false)}
            />
          </form>
        </Modal>
      )}

      {mostrarCierre && caja && (
        <Modal titulo="Cerrar caja" onCerrar={() => setMostrarCierre(false)}>
          <form onSubmit={cerrarCaja} className="space-y-5">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Saldo esperado</p>
              <p className="mt-2 text-3xl font-bold">
                {formatearPrecio(saldoEsperado)}
              </p>
            </div>

            <Campo
              label="Saldo contado"
              value={saldoContado}
              onChange={setSaldoContado}
              placeholder="Dinero realmente contado"
            />

            <Area
              label="Observaciones del cierre"
              value={observacionesCierre}
              onChange={setObservacionesCierre}
              placeholder="Diferencias, aclaraciones..."
            />

            <BotonesModal
              procesando={procesando}
              textoConfirmar="Cerrar caja"
              onCancelar={() => setMostrarCierre(false)}
            />
          </form>
        </Modal>
      )}
    </main>
  );
}

function Resumen({
  titulo,
  valor,
  variante = "normal",
}: {
  titulo: string;
  valor: string;
  variante?: "normal" | "verde" | "azul" | "rojo" | "naranja";
}) {
  const clases = {
    normal: "border-slate-200 bg-white text-slate-900",
    verde: "border-green-200 bg-green-50 text-green-700",
    azul: "border-blue-200 bg-blue-50 text-blue-700",
    rojo: "border-red-200 bg-red-50 text-red-700",
    naranja: "border-amber-200 bg-amber-50 text-amber-700",
  }[variante];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${clases}`}>
      <p className="text-sm opacity-80">{titulo}</p>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
    </div>
  );
}

function Modal({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-2xl font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full bg-slate-100 px-3 py-2 font-bold"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const esNumerico =
    label.toLowerCase().includes("saldo") ||
    label.toLowerCase().includes("importe");

  return (
    <div>
      <label className="mb-2 block font-semibold">{label}</label>
      <input
        type="text"
        inputMode={esNumerico ? "decimal" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-semibold">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function BotonesModal({
  procesando,
  textoConfirmar,
  onCancelar,
}: {
  procesando: boolean;
  textoConfirmar: string;
  onCancelar: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onCancelar}
        className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={procesando}
        className="rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {procesando ? "Procesando..." : textoConfirmar}
      </button>
    </div>
  );
}