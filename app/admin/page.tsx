"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

import HeaderDashboard from "@/components/dashboard/HeaderDashboard";
import KPICards, {
  type KPIItem,
} from "@/components/dashboard/KPICards";
import ModuleGrid, {
  type ModuloDashboard,
} from "@/components/dashboard/ModuleGrid";
import AlertsPanel, {
  type AlertaDashboard,
} from "@/components/dashboard/AlertsPanel";
import RecentActivity, {
  type ActividadReciente,
} from "@/components/dashboard/RecentActivity";

type Pedido = {
  id: number;
  numero: number;
  total: number;
  estado: string;
  estado_pago: string;
  cliente_id?: number | null;
  cliente_nombre: string;
  created_at: string;
};

type ClienteResumen = {
  id: number;
  nombre: string;
  total_comprado: number;
  total_pagado: number;
  saldo_pendiente: number;
  ultima_compra?: string | null;
  created_at: string;
};

type Producto = {
  id: number;
  nombre: string;
  stock?: number | null;
  estado: string;
  created_at: string;
};

type DetallePedido = {
  id: number;
  pedido_id: number;
  producto_id?: number | null;
  producto_nombre: string;
  cantidad: number;
  subtotal: number;
};

type Caja = {
  id: number;
  estado: string;
  saldo_inicial: number;
  abierta_at: string;
};

type PagoPedido = {
  id: number;
  pedido_id: number;
  importe: number;
  metodo_pago: string;
  anulado: boolean;
  created_at: string;
  caja_id?: number | null;
};

type EmpresaDashboard = {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  rubro?: string | null;
  logo?: string | null;
  portada?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  horarios_semana?: unknown;
  color_principal?: string | null;
  color_secundario?: string | null;
};

const STOCK_BAJO = 5;
const HORAS_PEDIDO_DEMORADO = 24;

export default function DashboardPage() {
  const [pedidosHoy, setPedidosHoy] =
    useState<Pedido[]>([]);
  const [pedidosMes, setPedidosMes] =
    useState<Pedido[]>([]);
  const [pedidosPendientes, setPedidosPendientes] =
    useState<Pedido[]>([]);
  const [clientes, setClientes] =
    useState<ClienteResumen[]>([]);
  const [productos, setProductos] =
    useState<Producto[]>([]);
  const [detallesMes, setDetallesMes] =
    useState<DetallePedido[]>([]);
  const [caja, setCaja] =
    useState<Caja | null>(null);
  const [pagosCaja, setPagosCaja] =
    useState<PagoPedido[]>([]);
  const [empresa, setEmpresa] =
    useState<EmpresaDashboard | null>(null);

  const [cargando, setCargando] =
    useState(true);
  const [error, setError] = useState("");

  const cargarDashboard = useCallback(async () => {
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

    const {
      data: empresaData,
      error: empresaError,
    } = await supabase
      .from("empresas")
      .select(
        "id, nombre, slug, descripcion, rubro, logo, portada, whatsapp, direccion, ciudad, provincia, horarios_semana, color_principal, color_secundario"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (empresaError || !empresaData) {
      setError(
        empresaError?.message ||
          "No encontramos una empresa asociada a tu cuenta."
      );
      setCargando(false);
      return;
    }

    const empresaActual =
      empresaData as EmpresaDashboard;
    const empresaId = empresaActual.id;

    setEmpresa(empresaActual);

    const inicioHoy = obtenerInicioDelDia();
    const inicioMes = obtenerInicioDelMes();

    const [
      { data: pedidosHoyData, error: pedidosHoyError },
      { data: pedidosMesData, error: pedidosMesError },
      { data: pendientesData, error: pendientesError },
      { data: clientesData, error: clientesError },
      { data: productosData, error: productosError },
      { data: cajaData, error: cajaError },
    ] = await Promise.all([
      supabase
        .from("pedidos")
        .select(
          "id, numero, total, estado, estado_pago, cliente_id, cliente_nombre, created_at"
        )
        .eq("empresa_id", empresaId)
        .gte("created_at", inicioHoy)
        .order("created_at", { ascending: false }),

      supabase
        .from("pedidos")
        .select(
          "id, numero, total, estado, estado_pago, cliente_id, cliente_nombre, created_at"
        )
        .eq("empresa_id", empresaId)
        .gte("created_at", inicioMes)
        .order("created_at", { ascending: false }),

      supabase
        .from("pedidos")
        .select(
          "id, numero, total, estado, estado_pago, cliente_id, cliente_nombre, created_at"
        )
        .eq("empresa_id", empresaId)
        .in("estado", [
          "Pendiente",
          "Confirmado",
          "Preparando",
          "Listo",
        ])
        .order("created_at", { ascending: false })
        .limit(12),

      supabase
        .from("clientes_resumen")
        .select(
          "id, nombre, total_comprado, total_pagado, saldo_pendiente, ultima_compra, created_at"
        )
        .eq("empresa_id", empresaId)
        .order("total_comprado", {
          ascending: false,
        }),

      supabase
        .from("productos")
        .select(
          "id, nombre, stock, estado, created_at"
        )
        .eq("empresa_id", empresaId)
        .eq("estado", "Activo")
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("cajas")
        .select(
          "id, estado, saldo_inicial, abierta_at"
        )
        .eq("empresa_id", empresaId)
        .eq("estado", "Abierta")
        .order("abierta_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),
    ]);

    const primerError =
      pedidosHoyError ||
      pedidosMesError ||
      pendientesError ||
      clientesError ||
      productosError ||
      cajaError;

    if (primerError) {
      setError(
        `No se pudo cargar el dashboard: ${primerError.message}`
      );
      setCargando(false);
      return;
    }

    const pedidosDelMes =
      (pedidosMesData as Pedido[]) || [];

    const pedidosIds = pedidosDelMes.map(
      (pedido) => pedido.id
    );

    let detallesCargados: DetallePedido[] = [];

    if (pedidosIds.length > 0) {
      const {
        data: detallesData,
        error: detallesError,
      } = await supabase
        .from("pedido_detalles")
        .select(
          "id, pedido_id, producto_id, producto_nombre, cantidad, subtotal"
        )
        .in("pedido_id", pedidosIds);

      if (detallesError) {
        setError(
          `No se pudieron cargar los productos vendidos: ${detallesError.message}`
        );
        setCargando(false);
        return;
      }

      detallesCargados =
        (detallesData as DetallePedido[]) || [];
    }

    const cajaActual =
      (cajaData as Caja | null) || null;

    let pagosCargados: PagoPedido[] = [];

    if (cajaActual) {
      const {
        data: pagosData,
        error: pagosError,
      } = await supabase
        .from("pagos_pedido")
        .select(
          "id, pedido_id, importe, metodo_pago, anulado, created_at, caja_id"
        )
        .eq("empresa_id", empresaId)
        .eq("caja_id", cajaActual.id)
        .eq("anulado", false)
        .order("created_at", {
          ascending: false,
        });

      if (pagosError) {
        setError(
          `No se pudieron cargar los movimientos de caja: ${pagosError.message}`
        );
        setCargando(false);
        return;
      }

      pagosCargados =
        (pagosData as PagoPedido[]) || [];
    }

    setPedidosHoy(
      (pedidosHoyData as Pedido[]) || []
    );
    setPedidosMes(pedidosDelMes);
    setPedidosPendientes(
      (pendientesData as Pedido[]) || []
    );
    setClientes(
      (clientesData as ClienteResumen[]) || []
    );
    setProductos(
      (productosData as Producto[]) || []
    );
    setDetallesMes(detallesCargados);
    setCaja(cajaActual);
    setPagosCaja(pagosCargados);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  const pedidosHoyValidos = useMemo(
    () =>
      pedidosHoy.filter(
        (pedido) =>
          pedido.estado !== "Cancelado"
      ),
    [pedidosHoy]
  );

  const pedidosMesValidos = useMemo(
    () =>
      pedidosMes.filter(
        (pedido) =>
          pedido.estado !== "Cancelado"
      ),
    [pedidosMes]
  );

  const ventasHoy = useMemo(
    () =>
      pedidosHoyValidos.reduce(
        (total, pedido) =>
          total + Number(pedido.total),
        0
      ),
    [pedidosHoyValidos]
  );

  const ventasMes = useMemo(
    () =>
      pedidosMesValidos.reduce(
        (total, pedido) =>
          total + Number(pedido.total),
        0
      ),
    [pedidosMesValidos]
  );

  const ticketPromedioMes =
    pedidosMesValidos.length > 0
      ? ventasMes /
        pedidosMesValidos.length
      : 0;

  const productosStockBajo = useMemo(
    () =>
      productos.filter(
        (producto) =>
          typeof producto.stock ===
            "number" &&
          producto.stock <= STOCK_BAJO
      ),
    [productos]
  );

  const productosNuevos = useMemo(() => {
    const hace30Dias = new Date();
    hace30Dias.setDate(
      hace30Dias.getDate() - 30
    );

    return productos.filter(
      (producto) =>
        new Date(producto.created_at) >=
        hace30Dias
    );
  }, [productos]);

  const pedidosDemorados = useMemo(() => {
    const limite =
      Date.now() -
      HORAS_PEDIDO_DEMORADO *
        60 *
        60 *
        1000;

    return pedidosPendientes.filter(
      (pedido) =>
        pedido.estado !== "Listo" &&
        new Date(
          pedido.created_at
        ).getTime() < limite
    );
  }, [pedidosPendientes]);

  const pedidosConPagoPendiente =
    useMemo(
      () =>
        pedidosPendientes.filter(
          (pedido) =>
            pedido.estado_pago ===
              "Pendiente" ||
            pedido.estado_pago ===
              "Parcial"
        ),
      [pedidosPendientes]
    );

  const clientesConDeuda = useMemo(
    () =>
      clientes
        .filter(
          (cliente) =>
            Number(
              cliente.saldo_pendiente || 0
            ) > 0
        )
        .sort(
          (a, b) =>
            Number(
              b.saldo_pendiente || 0
            ) -
            Number(
              a.saldo_pendiente || 0
            )
        ),
    [clientes]
  );

  const clientesNuevosMes = useMemo(() => {
    const inicioMes = new Date(
      obtenerInicioDelMes()
    );

    return clientes.filter(
      (cliente) =>
        new Date(cliente.created_at) >=
        inicioMes
    );
  }, [clientes]);

  const clientePrincipal =
    clientes[0] || null;

  const productoMasVendido = useMemo(() => {
    const acumulado = new Map<
      string,
      {
        nombre: string;
        cantidad: number;
        total: number;
      }
    >();

    for (const detalle of detallesMes) {
      const clave =
        detalle.producto_id !== null &&
        detalle.producto_id !== undefined
          ? String(detalle.producto_id)
          : detalle.producto_nombre;

      const actual =
        acumulado.get(clave) || {
          nombre:
            detalle.producto_nombre,
          cantidad: 0,
          total: 0,
        };

      actual.cantidad += Number(
        detalle.cantidad
      );
      actual.total += Number(
        detalle.subtotal
      );

      acumulado.set(clave, actual);
    }

    return (
      Array.from(
        acumulado.values()
      ).sort(
        (a, b) =>
          b.cantidad - a.cantidad
      )[0] || null
    );
  }, [detallesMes]);

  const ingresosCaja = useMemo(
    () =>
      pagosCaja.reduce(
        (total, pago) =>
          total + Number(pago.importe),
        0
      ),
    [pagosCaja]
  );

  const saldoPendienteTotal = useMemo(
    () =>
      clientes.reduce(
        (total, cliente) =>
          total +
          Number(
            cliente.saldo_pendiente || 0
          ),
        0
      ),
    [clientes]
  );

  const nombreDia =
    new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());

  const kpis: KPIItem[] = [
    {
      titulo: "Ventas de hoy",
      valor: formatearPrecio(ventasHoy),
      detalle: `${pedidosHoyValidos.length} pedido(s)`,
      icono: "💰",
      variante: "verde",
      href: "/admin/pedidos",
    },
    {
      titulo: "Ventas del mes",
      valor: formatearPrecio(ventasMes),
      detalle: `${pedidosMesValidos.length} pedido(s)`,
      icono: "📈",
      variante: "azul",
      href: "/admin/pedidos",
    },
    {
      titulo: "Ticket promedio",
      valor: formatearPrecio(
        ticketPromedioMes
      ),
      detalle: "Promedio del mes",
      icono: "🧾",
      variante: "violeta",
      href: "/admin/pedidos",
    },
    {
      titulo: "Saldo por cobrar",
      valor: formatearPrecio(
        saldoPendienteTotal
      ),
      detalle: `${clientesConDeuda.length} cliente(s) con deuda`,
      icono: "💳",
      variante: "naranja",
      href: "/admin/clientes",
    },
    {
      titulo: "Productos activos",
      valor: String(productos.length),
      detalle: `${productosStockBajo.length} con stock bajo`,
      icono: "📦",
      variante: "azul",
      href: "/admin/productos",
    },
    {
      titulo: "Clientes",
      valor: String(clientes.length),
      detalle: `${clientesNuevosMes.length} nuevo(s) este mes`,
      icono: "👥",
      variante: "verde",
      href: "/admin/clientes",
    },
    {
      titulo: "Pedidos pendientes",
      valor: String(
        pedidosPendientes.length
      ),
      detalle: `${pedidosDemorados.length} demorado(s)`,
      icono: "⏰",
      variante: "naranja",
      href: "/admin/pedidos",
    },
    {
      titulo: "Ingresos de caja",
      valor: formatearPrecio(
        ingresosCaja
      ),
      detalle: caja
        ? "Caja abierta"
        : "Caja cerrada",
      icono: "💵",
      variante: caja
        ? "verde"
        : "gris",
      href: "/admin/caja",
    },
  ];

  const modulos: ModuloDashboard[] = [
    {
      titulo: "Productos",
      descripcion:
        "Administrá el catálogo, stock, imágenes y herramientas de IA.",
      icono: "📦",
      color: "azul",
      accesos: [
        {
          texto: "👁️ Ver productos",
          href: "/admin/productos",
        },
        {
          texto: "➕ Nuevo producto",
          href: "/admin/productos/nuevo",
        },
        {
          texto: "🤖 Crear con IA",
          href: "/admin/productos/nuevo/ia",
        },
        {
          texto: "🏷️ Categorías",
          href: "/admin/categorias",
        },
      ],
    },
    {
      titulo: "Clientes",
      descripcion:
        "Gestioná clientes, saldos, historial y cuentas corrientes.",
      icono: "👥",
      color: "verde",
      accesos: [
        {
          texto: "👥 Ver clientes",
          href: "/admin/clientes",
        },
        {
          texto: "➕ Nuevo cliente",
          href: "/admin/clientes/nuevo",
        },
        {
          texto: "💳 Cuentas corrientes",
          href: "/admin/clientes",
        },
      ],
    },
    {
      titulo: "Pedidos",
      descripcion:
        "Creá pedidos, controlá estados y realizá cobros.",
      icono: "🧾",
      color: "violeta",
      accesos: [
        {
          texto: "📋 Ver pedidos",
          href: "/admin/pedidos",
        },
        {
          texto: "➕ Nuevo pedido",
          href: "/admin/pedidos",
        },
        {
          texto: "💳 Cobrar pedidos",
          href: "/admin/pedidos",
        },
      ],
    },
    {
      titulo: "Caja",
      descripcion:
        "Controlá ingresos, movimientos y el estado actual de la caja.",
      icono: "💰",
      color: "naranja",
      accesos: [
        {
          texto: caja
            ? "💵 Ver caja abierta"
            : "🔓 Abrir caja",
          href: "/admin/caja",
        },
        {
          texto: "📈 Ver movimientos",
          href: "/admin/caja",
        },
      ],
    },
    {
      titulo: "Marketing",
      descripcion:
        "Prepará publicaciones y contenido comercial para tus productos.",
      icono: "📣",
      color: "rosa",
      accesos: [
        {
          texto: "📱 Productos para publicar",
          href: "/admin/productos",
        },
        {
          texto: "🤖 Crear contenido con IA",
          href: "/admin/productos",
        },
      ],
    },
    {
      titulo: "IA Comercial",
      descripcion:
        "Analizá imágenes y mejorá la información de tus productos.",
      icono: "🤖",
      color: "gris",
      accesos: [
        {
          texto: "📷 Crear producto con IA",
          href: "/admin/productos/nuevo/ia",
        },
        {
          texto: "📦 Revisar productos",
          href: "/admin/productos",
        },
      ],
    },
  ];

  const alertas: AlertaDashboard[] =
    useMemo(() => {
      const items: AlertaDashboard[] = [];

      if (
        productosStockBajo.length > 0
      ) {
        items.push({
          id: "stock-bajo",
          titulo: `${productosStockBajo.length} producto(s) con stock bajo`,
          descripcion:
            "Revisá los productos que necesitan reposición.",
          tipo: "warning",
        });
      }

      if (pedidosDemorados.length > 0) {
        items.push({
          id: "pedidos-demorados",
          titulo: `${pedidosDemorados.length} pedido(s) demorados`,
          descripcion: `Llevan más de ${HORAS_PEDIDO_DEMORADO} horas abiertos.`,
          tipo: "error",
        });
      }

      if (
        pedidosConPagoPendiente.length > 0
      ) {
        items.push({
          id: "pagos-pendientes",
          titulo: `${pedidosConPagoPendiente.length} pedido(s) sin cobrar completamente`,
          descripcion:
            "Incluye pagos pendientes y parciales.",
          tipo: "warning",
        });
      }

      if (clientesConDeuda.length > 0) {
        items.push({
          id: "clientes-deuda",
          titulo: `${clientesConDeuda.length} cliente(s) con saldo pendiente`,
          descripcion: `Total por cobrar: ${formatearPrecio(
            saldoPendienteTotal
          )}.`,
          tipo: "info",
        });
      }

      return items;
    }, [
      productosStockBajo.length,
      pedidosDemorados.length,
      pedidosConPagoPendiente.length,
      clientesConDeuda.length,
      saldoPendienteTotal,
    ]);

  const actividades: ActividadReciente[] =
    useMemo(() => {
      const items: Array<
        ActividadReciente & {
          timestamp: number;
        }
      > = [];

      pedidosPendientes
        .slice(0, 4)
        .forEach((pedido) => {
          items.push({
            id: `pedido-${pedido.id}`,
            titulo: `Pedido #${String(
              pedido.numero
            ).padStart(6, "0")}`,
            descripcion: `${pedido.cliente_nombre} · ${pedido.estado} · ${formatearPrecio(
              Number(pedido.total)
            )}`,
            fecha: formatearFechaCorta(
              pedido.created_at
            ),
            icono: "🧾",
            timestamp: new Date(
              pedido.created_at
            ).getTime(),
          });
        });

      productos
        .slice(0, 3)
        .forEach((producto) => {
          items.push({
            id: `producto-${producto.id}`,
            titulo: "Producto agregado",
            descripcion:
              producto.nombre,
            fecha: formatearFechaCorta(
              producto.created_at
            ),
            icono: "📦",
            timestamp: new Date(
              producto.created_at
            ).getTime(),
          });
        });

      clientes
        .slice(0, 2)
        .forEach((cliente) => {
          items.push({
            id: `cliente-${cliente.id}`,
            titulo: "Cliente registrado",
            descripcion:
              cliente.nombre,
            fecha: formatearFechaCorta(
              cliente.created_at
            ),
            icono: "👤",
            timestamp: new Date(
              cliente.created_at
            ).getTime(),
          });
        });

      return items
        .sort(
          (a, b) =>
            b.timestamp - a.timestamp
        )
        .slice(0, 6)
        .map(
          ({
            timestamp: _timestamp,
            ...actividad
          }) => actividad
        );
    }, [
      pedidosPendientes,
      productos,
      clientes,
    ]);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p className="mt-4 text-slate-500">
            Cargando Dashboard PRO...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <HeaderDashboard
          fecha={nombreDia}
          cargando={cargando}
          onActualizar={cargarDashboard}
          nombreEmpresa={empresa?.nombre}
          descripcionEmpresa={empresa?.descripcion}
          rubroEmpresa={empresa?.rubro}
          logo={empresa?.logo}
          portada={empresa?.portada}
          colorPrincipal={
            empresa?.color_principal || "#2563EB"
          }
          colorSecundario={
            empresa?.color_secundario || "#7C3AED"
          }
          slugEmpresa={empresa?.slug}
          whatsapp={empresa?.whatsapp}
          direccion={empresa?.direccion}
          ciudad={empresa?.ciudad}
          provincia={empresa?.provincia}
          horariosSemana={empresa?.horarios_semana}
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <KPICards items={kpis} />

        <ModuleGrid modulos={modulos} />

        <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
          <AlertsPanel alertas={alertas} />

          <RecentActivity
            actividades={actividades}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Agenda del día
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Pedidos que necesitan seguimiento.
                </p>
              </div>

              <Link
                href="/admin/pedidos"
                className="text-sm font-semibold text-[#2563EB]"
              >
                Ver todos
              </Link>
            </div>

            {pedidosPendientes.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No hay pedidos pendientes.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pedidosPendientes
                  .slice(0, 6)
                  .map((pedido) => {
                    const demorado =
                      pedidosDemorados.some(
                        (item) =>
                          item.id === pedido.id
                      );

                    return (
                      <article
                        key={pedido.id}
                        className="p-6"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold">
                                Pedido #
                                {String(
                                  pedido.numero
                                ).padStart(
                                  6,
                                  "0"
                                )}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${clasesEstado(
                                  pedido.estado
                                )}`}
                              >
                                {
                                  pedido.estado
                                }
                              </span>

                              {pedido.estado_pago !==
                                "Pagado" && (
                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                  Pago{" "}
                                  {pedido.estado_pago.toLowerCase()}
                                </span>
                              )}

                              {demorado && (
                                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                  Demorado
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                              {
                                pedido.cliente_nombre
                              }{" "}
                              ·{" "}
                              {formatearFecha(
                                pedido.created_at
                              )}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 sm:items-end">
                            <p className="text-xl font-bold">
                              {formatearPrecio(
                                Number(
                                  pedido.total
                                )
                              )}
                            </p>

                            <Link
                              href={`/admin/pedidos/${pedido.id}`}
                              className="rounded-xl bg-[#2563EB] px-4 py-2 text-center text-sm font-semibold text-white"
                            >
                              Abrir pedido
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Estado de la caja
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Situación actual
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    caja
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {caja
                    ? "Abierta"
                    : "Cerrada"}
                </span>
              </div>

              {caja ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-green-50 p-5">
                    <p className="text-sm text-green-700">
                      Ingresos registrados
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-700">
                      {formatearPrecio(
                        ingresosCaja
                      )}
                    </p>
                  </div>

                  <p className="text-sm text-slate-500">
                    Abierta el{" "}
                    {formatearFecha(
                      caja.abierta_at
                    )}
                  </p>

                  <Link
                    href="/admin/caja"
                    className="block rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white"
                  >
                    Ver Caja PRO
                  </Link>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center">
                  <p className="font-semibold">
                    La caja está cerrada
                  </p>

                  <Link
                    href="/admin/caja"
                    className="mt-4 inline-block rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
                  >
                    Abrir caja
                  </Link>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Destacados del mes
              </h2>

              <div className="mt-5 space-y-4">
                <Destacado
                  titulo="Producto más vendido"
                  principal={
                    productoMasVendido?.nombre ||
                    "Sin ventas registradas"
                  }
                  detalle={
                    productoMasVendido
                      ? `${productoMasVendido.cantidad} unidad(es) · ${formatearPrecio(
                          productoMasVendido.total
                        )}`
                      : "Todavía no hay información suficiente."
                  }
                  icono="🏆"
                />

                <Destacado
                  titulo="Mejor cliente"
                  principal={
                    clientePrincipal?.nombre ||
                    "Sin clientes"
                  }
                  detalle={
                    clientePrincipal
                      ? `${formatearPrecio(
                          Number(
                            clientePrincipal.total_comprado ||
                              0
                          )
                        )} comprado`
                      : "Todavía no hay información suficiente."
                  }
                  icono="⭐"
                />

                <Destacado
                  titulo="Productos nuevos"
                  principal={`${productosNuevos.length} producto(s)`}
                  detalle="Agregados durante los últimos 30 días."
                  icono="🆕"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function obtenerInicioDelDia() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha.toISOString();
}

function obtenerInicioDelMes() {
  const fecha = new Date();
  fecha.setDate(1);
  fecha.setHours(0, 0, 0, 0);
  return fecha.toISOString();
}

function formatearPrecio(
  precio: number
) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(precio);
}

function formatearFecha(
  fecha: string
) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(fecha));
}

function formatearFechaCorta(
  fecha: string
) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

function clasesEstado(
  estado: string
) {
  switch (estado) {
    case "Pendiente":
      return "bg-amber-100 text-amber-700";
    case "Confirmado":
      return "bg-blue-100 text-blue-700";
    case "Preparando":
      return "bg-violet-100 text-violet-700";
    case "Listo":
      return "bg-cyan-100 text-cyan-700";
    case "Entregado":
      return "bg-green-100 text-green-700";
    case "Cancelado":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function Destacado({
  titulo,
  principal,
  detalle,
  icono,
}: {
  titulo: string;
  principal: string;
  detalle: string;
  icono: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex gap-3">
        <span className="text-2xl">
          {icono}
        </span>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {titulo}
          </p>

          <p className="mt-1 font-bold">
            {principal}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {detalle}
          </p>
        </div>
      </div>
    </div>
  );
}