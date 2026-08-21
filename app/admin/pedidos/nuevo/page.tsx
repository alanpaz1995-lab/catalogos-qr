"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  PackageSearch,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";
import { crearPedido } from "@/services/pedidos";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  direccion?: string | null;
  email?: string | null;
};

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  precio_mayorista?: number | null;
  cantidad_minima_mayorista?: number | null;
  stock?: number | null;
  controlar_stock?: boolean | null;
  categoria?: string | null;
  imaguen?: string | null;
  estado?: string | null;
};

type ItemPedidoManual = {
  producto: Producto;
  cantidad: number;
};

type ItemPedidoFueraCatalogo = {
  id: number;
  nombre: string;
  precio: string;
  cantidad: number;
};

export default function NuevoPedidoPage() {
  const router = useRouter();

  const {
    empresa,
    cargandoEmpresa,
    errorEmpresa,
  } = useEmpresa();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [items, setItems] = useState<ItemPedidoManual[]>([]);
  const [itemsFueraCatalogo, setItemsFueraCatalogo] = useState<
    ItemPedidoFueraCatalogo[]
  >([]);

  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!empresa?.id) return;

    cargarDatos();
  }, [empresa?.id]);

  async function cargarDatos() {
    if (!empresa?.id) return;

    setCargandoDatos(true);
    setError("");

    const [
      { data: clientesData, error: clientesError },
      { data: productosData, error: productosError },
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("id, nombre, telefono, direccion, email")
        .eq("empresa_id", empresa.id)
        .eq("activo", true)
        .order("nombre", { ascending: true }),

      supabase
        .from("productos")
        .select(
          "id, nombre, precio, precio_mayorista, cantidad_minima_mayorista, stock, controlar_stock, categoria, imaguen, estado"
        )
        .eq("empresa_id", empresa.id)
        .eq("estado", "Activo")
        .order("nombre", { ascending: true }),
    ]);

    if (clientesError || productosError) {
      setError(
        clientesError?.message ||
          productosError?.message ||
          "No se pudieron cargar los datos."
      );
      setCargandoDatos(false);
      return;
    }

    setClientes((clientesData as Cliente[]) || []);
    setProductos((productosData as Producto[]) || []);
    setCargandoDatos(false);
  }

  const clientesFiltrados = useMemo(() => {
    const texto = busquedaCliente.trim().toLowerCase();

    if (!texto) return clientes.slice(0, 8);

    return clientes
      .filter((cliente) => {
        return (
          cliente.nombre.toLowerCase().includes(texto) ||
          cliente.telefono.toLowerCase().includes(texto) ||
          (cliente.email || "").toLowerCase().includes(texto)
        );
      })
      .slice(0, 8);
  }, [clientes, busquedaCliente]);

  const productosFiltrados = useMemo(() => {
    const texto = busquedaProducto.trim().toLowerCase();

    return productos
      .filter((producto) => {
        const coincide =
          producto.nombre.toLowerCase().includes(texto) ||
          (producto.categoria || "").toLowerCase().includes(texto);

        const yaAgregado = items.some(
          (item) => item.producto.id === producto.id
        );

        return coincide && !yaAgregado;
      })
      .slice(0, 12);
  }, [productos, busquedaProducto, items]);

  function controlaStock(producto: Producto) {
    return producto.controlar_stock !== false;
  }

  function precioAplicado(
    producto: Producto,
    cantidad: number
  ) {
    const minimo = Math.max(
      1,
      Number(producto.cantidad_minima_mayorista ?? 10)
    );

    const mayorista = Number(producto.precio_mayorista);

    if (
      producto.precio_mayorista != null &&
      Number.isFinite(mayorista) &&
      mayorista > 0 &&
      cantidad >= minimo
    ) {
      return mayorista;
    }

    return Number(producto.precio);
  }

  function usaPrecioMayorista(
    producto: Producto,
    cantidad: number
  ) {
    return (
      producto.precio_mayorista != null &&
      Number(producto.precio_mayorista) > 0 &&
      cantidad >=
        Math.max(
          1,
          Number(
            producto.cantidad_minima_mayorista ?? 10
          )
        )
    );
  }

  const totalCatalogo = useMemo(
    () =>
      items.reduce(
        (acumulado, item) =>
          acumulado +
          precioAplicado(item.producto, item.cantidad) *
            item.cantidad,
        0
      ),
    [items]
  );

  const totalFueraCatalogo = useMemo(
    () =>
      itemsFueraCatalogo.reduce((acumulado, item) => {
        const precio = convertirPrecioManual(item.precio);

        if (!Number.isFinite(precio) || precio <= 0) {
          return acumulado;
        }

        return acumulado + precio * item.cantidad;
      }, 0),
    [itemsFueraCatalogo]
  );

  const total = totalCatalogo + totalFueraCatalogo;

  const cantidadTotal = useMemo(
    () =>
      items.reduce(
        (acumulado, item) => acumulado + item.cantidad,
        0
      ) +
      itemsFueraCatalogo.reduce(
        (acumulado, item) => acumulado + item.cantidad,
        0
      ),
    [items, itemsFueraCatalogo]
  );

  const cantidadProductosDistintos =
    items.length + itemsFueraCatalogo.length;

  function seleccionarCliente(cliente: Cliente) {
    setClienteId(String(cliente.id));
    setNombreCliente(cliente.nombre);
    setTelefonoCliente(cliente.telefono);
    setDireccionCliente(cliente.direccion || "");
    setBusquedaCliente("");
  }

  function limpiarCliente() {
    setClienteId("");
    setNombreCliente("");
    setTelefonoCliente("");
    setDireccionCliente("");
  }

  function agregarProducto(producto: Producto) {
    if (
      controlaStock(producto) &&
      typeof producto.stock === "number" &&
      producto.stock <= 0
    ) {
      setError(
        `${producto.nombre} no tiene stock disponible.`
      );
      return;
    }

    setError("");

    setItems((actuales) => [
      ...actuales,
      {
        producto,
        cantidad: 1,
      },
    ]);

    setBusquedaProducto("");
  }

  function cambiarCantidad(
    productoId: number,
    cantidad: number
  ) {
    if (cantidad <= 0) {
      eliminarProducto(productoId);
      return;
    }

    const itemActual = items.find(
      (item) => item.producto.id === productoId
    );

    const stockDisponible =
      itemActual?.producto.stock;

    if (
      itemActual != null &&
      controlaStock(itemActual.producto) &&
      typeof stockDisponible === "number" &&
      cantidad > stockDisponible
    ) {
      setError(
        `Solo hay ${stockDisponible} unidad(es) disponibles de ${
          itemActual?.producto.nombre || "este producto"
        }.`
      );
      return;
    }

    setError("");

    setItems((actuales) =>
      actuales.map((item) =>
        item.producto.id === productoId
          ? { ...item, cantidad }
          : item
      )
    );
  }

  function eliminarProducto(productoId: number) {
    setItems((actuales) =>
      actuales.filter(
        (item) => item.producto.id !== productoId
      )
    );
  }

  function agregarProductoFueraCatalogo() {
    setItemsFueraCatalogo((actuales) => [
      ...actuales,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        nombre: "",
        precio: "",
        cantidad: 1,
      },
    ]);
  }

  function actualizarProductoFueraCatalogo(
    id: number,
    campo: "nombre" | "precio",
    valor: string
  ) {
    setItemsFueraCatalogo((actuales) =>
      actuales.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  }

  function cambiarCantidadFueraCatalogo(
    id: number,
    cantidad: number
  ) {
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      eliminarProductoFueraCatalogo(id);
      return;
    }

    setItemsFueraCatalogo((actuales) =>
      actuales.map((item) =>
        item.id === id
          ? {
              ...item,
              cantidad,
            }
          : item
      )
    );
  }

  function eliminarProductoFueraCatalogo(id: number) {
    setItemsFueraCatalogo((actuales) =>
      actuales.filter((item) => item.id !== id)
    );
  }

  async function obtenerOCrearCliente() {
    if (!empresa?.id) {
      throw new Error(
        "No encontramos la empresa actual."
      );
    }

    if (clienteId) {
      return Number(clienteId);
    }

    const telefonoLimpio =
      telefonoCliente.trim();

    const {
      data: clienteExistente,
      error: errorBusqueda,
    } = await supabase
      .from("clientes")
      .select("id")
      .eq("empresa_id", empresa.id)
      .eq("telefono", telefonoLimpio)
      .maybeSingle();

    if (errorBusqueda) {
      throw new Error(
        `No se pudo verificar el cliente: ${errorBusqueda.message}`
      );
    }

    if (clienteExistente) {
      return Number(clienteExistente.id);
    }

    const {
      data: clienteCreado,
      error: errorCliente,
    } = await supabase
      .from("clientes")
      .insert({
        empresa_id: empresa.id,
        nombre: nombreCliente.trim(),
        telefono: telefonoLimpio,
        direccion:
          direccionCliente.trim() || null,
        activo: true,
      })
      .select("id")
      .single();

    if (errorCliente) {
      throw new Error(
        `No se pudo crear el cliente: ${errorCliente.message}`
      );
    }

    return Number(clienteCreado.id);
  }

  async function guardarPedido() {
    if (!empresa?.id) {
      setError("No encontramos la empresa actual.");
      return;
    }

    if (!nombreCliente.trim()) {
      setError("Ingresá o seleccioná un cliente.");
      return;
    }

    if (!telefonoCliente.trim()) {
      setError("Ingresá el teléfono del cliente.");
      return;
    }

    if (items.length === 0 && itemsFueraCatalogo.length === 0) {
      setError("Agregá al menos un producto.");
      return;
    }

    const productoManualInvalido =
      itemsFueraCatalogo.find((item) => {
        const precio = convertirPrecioManual(item.precio);

        return (
          !item.nombre.trim() ||
          !Number.isFinite(precio) ||
          precio <= 0 ||
          !Number.isInteger(item.cantidad) ||
          item.cantidad <= 0
        );
      });

    if (productoManualInvalido) {
      setError(
        "Completá nombre, precio y cantidad válidos en todos los productos fuera del catálogo."
      );
      return;
    }

    const itemSinStock = items.find(
      (item) =>
        controlaStock(item.producto) &&
        typeof item.producto.stock === "number" &&
        item.cantidad > item.producto.stock
    );

    if (itemSinStock) {
      setError(
        `No hay stock suficiente de ${itemSinStock.producto.nombre}. Disponible: ${itemSinStock.producto.stock}.`
      );
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const clienteFinalId =
        await obtenerOCrearCliente();

      const resultado = await crearPedido({
        empresaId: empresa.id,
        nombre: nombreCliente.trim(),
        telefono: telefonoCliente.trim(),
        direccion: direccionCliente.trim(),
        observaciones: observaciones.trim(),
        items: [
          ...items.map((item) => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
          })),
          ...itemsFueraCatalogo.map((item) => ({
            producto_id: null,
            producto_nombre: item.nombre.trim(),
            precio_unitario: convertirPrecioManual(item.precio),
            cantidad: item.cantidad,
          })),
        ],
      });

      const { error: errorVinculacion } =
        await supabase
          .from("pedidos")
          .update({
            cliente_id: clienteFinalId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", resultado.pedido_id)
          .eq("empresa_id", empresa.id);

      if (errorVinculacion) {
        throw new Error(
          `El pedido se creó, pero no se pudo vincular al cliente: ${errorVinculacion.message}`
        );
      }

      setMensaje(
        `Pedido #${String(resultado.numero_pedido).padStart(
          6,
          "0"
        )} creado correctamente.`
      );

      window.setTimeout(() => {
        router.push(`/admin/pedidos/${resultado.pedido_id}`);
        router.refresh();
      }, 900);
    } catch (errorDesconocido) {
      console.error(
        "Error al crear el pedido manual:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo crear el pedido."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargandoEmpresa || cargandoDatos) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p className="mt-4 font-semibold text-slate-500">
            Preparando nuevo pedido...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/pedidos"
              className="inline-flex items-center gap-2 font-semibold text-[#2563EB]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a pedidos
            </Link>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[#2563EB]">
              Ventas
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Nuevo pedido
            </h1>

            <p className="mt-3 max-w-2xl text-slate-500">
              Seleccioná un cliente, agregá productos y confirmá
              el pedido desde el panel.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Empresa
            </p>

            <p className="mt-1 font-black text-slate-800">
              {empresa?.nombre}
            </p>
          </div>
        </header>

        {(errorEmpresa || error) && (
          <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700">
            {errorEmpresa || error}
          </div>
        )}

        {mensaje && (
          <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-700">
            ✓ {mensaje}
          </div>
        )}

        <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_380px]">
          <div className="space-y-7">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <UserRound className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-xl font-black">
                    Cliente
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Buscá uno existente o completá los datos manualmente.
                  </p>
                </div>
              </div>

              <div className="relative mt-6">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={busquedaCliente}
                  onChange={(event) =>
                    setBusquedaCliente(event.target.value)
                  }
                  placeholder="Buscar por nombre, teléfono o email..."
                  className={`${clasesInput} pl-12`}
                />
              </div>

              {busquedaCliente && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                  {clientesFiltrados.length === 0 ? (
                    <p className="p-5 text-sm text-slate-500">
                      No se encontraron clientes.
                    </p>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() =>
                          seleccionarCliente(cliente)
                        }
                        className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
                      >
                        <span>
                          <span className="block font-bold text-slate-800">
                            {cliente.nombre}
                          </span>

                          <span className="mt-1 block text-sm text-slate-500">
                            {cliente.telefono}
                          </span>
                        </span>

                        <Plus className="h-5 w-5 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Campo
                  label="Nombre"
                  value={nombreCliente}
                  onChange={setNombreCliente}
                  placeholder="Nombre del cliente"
                />

                <Campo
                  label="Teléfono"
                  value={telefonoCliente}
                  onChange={setTelefonoCliente}
                  placeholder="Ej.: 3444 123456"
                />

                <div className="md:col-span-2">
                  <Campo
                    label="Dirección"
                    value={direccionCliente}
                    onChange={setDireccionCliente}
                    placeholder="Dirección de entrega o retiro"
                  />
                </div>
              </div>

              {clienteId && (
                <button
                  type="button"
                  onClick={limpiarCliente}
                  className="mt-5 text-sm font-bold text-slate-500 transition hover:text-slate-800"
                >
                  Usar otro cliente
                </button>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <PackageSearch className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-xl font-black">
                    Productos
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Agregá los artículos del pedido.
                  </p>
                </div>
              </div>

              <div className="relative mt-6">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={busquedaProducto}
                  onChange={(event) =>
                    setBusquedaProducto(event.target.value)
                  }
                  placeholder="Buscar producto o categoría..."
                  className={`${clasesInput} pl-12`}
                />
              </div>

              {busquedaProducto && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {productosFiltrados.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-500 sm:col-span-2">
                      No se encontraron productos disponibles.
                    </p>
                  ) : (
                    productosFiltrados.map((producto) => (
                      <button
                        key={producto.id}
                        type="button"
                        onClick={() =>
                          agregarProducto(producto)
                        }
                        disabled={
                          controlaStock(producto) &&
                          typeof producto.stock === "number" &&
                          producto.stock <= 0
                        }
                        className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      >
                        {producto.imaguen ? (
                          <img
                            src={producto.imaguen}
                            alt={producto.nombre}
                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <ShoppingCart className="h-5 w-5" />
                          </span>
                        )}

                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-slate-800">
                            {producto.nombre}
                          </span>

                          <span className="mt-1 block text-sm text-slate-500">
                            Minorista:{" "}
                            {formatearPrecio(
                              Number(producto.precio)
                            )}
                          </span>

                          {producto.precio_mayorista != null &&
                            Number(producto.precio_mayorista) > 0 && (
                              <span className="mt-1 block text-xs font-bold text-emerald-600">
                                Mayorista:{" "}
                                {formatearPrecio(
                                  Number(producto.precio_mayorista)
                                )}{" "}
                                desde{" "}
                                {Math.max(
                                  1,
                                  Number(
                                    producto.cantidad_minima_mayorista ??
                                      10
                                  )
                                )} u.
                              </span>
                            )}

                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              !controlaStock(producto) ||
                              typeof producto.stock !== "number" ||
                              producto.stock > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {!controlaStock(producto) ||
                            typeof producto.stock !== "number" ||
                            producto.stock > 0
                              ? "Disponible"
                              : "No disponible"}
                          </span>
                        </span>

                        <Plus className="h-5 w-5 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                <button
                  type="button"
                  onClick={agregarProductoFueraCatalogo}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                    <Plus className="h-5 w-5" />
                  </span>

                  <span>
                    <span className="block font-black text-green-700">
                      Agregar producto fuera del catálogo
                    </span>

                    <span className="mt-1 block text-sm text-slate-600">
                      Registralo solo en este pedido con nombre, precio y cantidad.
                    </span>
                  </span>
                </button>
              </div>

              {itemsFueraCatalogo.length > 0 && (
                <div className="mt-4 space-y-3">
                  {itemsFueraCatalogo.map((item, index) => {
                    const precioManual =
                      convertirPrecioManual(item.precio);

                    const subtotalManual =
                      Number.isFinite(precioManual) && precioManual > 0
                        ? precioManual * item.cantidad
                        : 0;

                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-green-200 bg-white p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-800">
                              Producto fuera del catálogo {index + 1}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-green-600">
                              No se guardará en Productos
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              eliminarProductoFueraCatalogo(item.id)
                            }
                            className="rounded-xl border border-red-200 p-3 text-red-500 transition hover:bg-red-50"
                            aria-label="Eliminar producto fuera del catálogo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                          <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                              Nombre
                            </label>

                            <input
                              type="text"
                              value={item.nombre}
                              onChange={(event) =>
                                actualizarProductoFueraCatalogo(
                                  item.id,
                                  "nombre",
                                  event.target.value
                                )
                              }
                              placeholder="Ejemplo: Mate nuevo de prueba"
                              className={clasesInput}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                              Precio unitario
                            </label>

                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.precio}
                              onChange={(event) =>
                                actualizarProductoFueraCatalogo(
                                  item.id,
                                  "precio",
                                  event.target.value
                                )
                              }
                              placeholder="Ej.: 15000"
                              className={clasesInput}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex w-fit items-center rounded-xl border border-slate-200 bg-slate-50">
                            <button
                              type="button"
                              onClick={() =>
                                cambiarCantidadFueraCatalogo(
                                  item.id,
                                  item.cantidad - 1
                                )
                              }
                              className="p-3 text-slate-600 transition hover:bg-white"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(event) =>
                                cambiarCantidadFueraCatalogo(
                                  item.id,
                                  Number(event.target.value)
                                )
                              }
                              className="w-14 bg-transparent text-center font-black outline-none"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                cambiarCantidadFueraCatalogo(
                                  item.id,
                                  item.cantidad + 1
                                )
                              }
                              className="p-3 text-slate-600 transition hover:bg-white"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Subtotal
                            </p>
                            <p className="mt-1 text-xl font-black text-slate-900">
                              {formatearPrecio(subtotalManual)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 space-y-4">
                {items.length === 0 && itemsFueraCatalogo.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                    <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-3 font-bold text-slate-700">
                      Todavía no agregaste productos
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Usá el buscador o agregá un producto fuera del catálogo.
                    </p>
                  </div>
                ) : (
                  items.map((item) => (
                    <article
                      key={item.producto.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-slate-800">
                            {item.producto.nombre}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatearPrecio(
                              precioAplicado(
                                item.producto,
                                item.cantidad
                              )
                            )}{" "}
                            por unidad
                          </p>

                          {usaPrecioMayorista(
                            item.producto,
                            item.cantidad
                          ) ? (
                            <p className="mt-2 text-xs font-black text-emerald-600">
                              ✓ Precio mayorista aplicado
                            </p>
                          ) : item.producto.precio_mayorista != null &&
                            Number(item.producto.precio_mayorista) > 0 ? (
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                              Mayorista desde{" "}
                              {Math.max(
                                1,
                                Number(
                                  item.producto
                                    .cantidad_minima_mayorista ?? 10
                                )
                              )}{" "}
                              unidades
                            </p>
                          ) : null}

                          {!controlaStock(item.producto) ? (
                            <p className="mt-2 text-xs font-bold text-blue-600">
                              ∞ Sin límite de venta por stock
                            </p>
                          ) : typeof item.producto.stock ===
                            "number" ? (
                            <p
                              className={`mt-2 text-xs font-bold ${
                                item.producto.stock <= 5
                                  ? "text-amber-600"
                                  : "text-slate-400"
                              }`}
                            >
                              Stock disponible:{" "}
                              {item.producto.stock}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                            <button
                              type="button"
                              onClick={() =>
                                cambiarCantidad(
                                  item.producto.id,
                                  item.cantidad - 1
                                )
                              }
                              className="p-3 text-slate-600 transition hover:bg-white"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={
                                controlaStock(item.producto) &&
                                typeof item.producto.stock ===
                                  "number"
                                  ? item.producto.stock
                                  : undefined
                              }
                              value={item.cantidad}
                              onChange={(event) =>
                                cambiarCantidad(
                                  item.producto.id,
                                  Number(event.target.value)
                                )
                              }
                              className="w-14 bg-transparent text-center font-black outline-none"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                cambiarCantidad(
                                  item.producto.id,
                                  item.cantidad + 1
                                )
                              }
                              className="p-3 text-slate-600 transition hover:bg-white"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <p className="min-w-28 text-right font-black text-slate-900">
                            {formatearPrecio(
                              precioAplicado(
                                item.producto,
                                item.cantidad
                              ) * item.cantidad
                            )}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              eliminarProducto(
                                item.producto.id
                              )
                            }
                            className="rounded-xl border border-red-200 p-3 text-red-500 transition hover:bg-red-50"
                            aria-label={`Eliminar ${item.producto.nombre}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-black">
                Observaciones
              </h2>

              <textarea
                rows={4}
                value={observaciones}
                onChange={(event) =>
                  setObservaciones(event.target.value)
                }
                placeholder="Aclaraciones, forma de entrega, referencias..."
                className={`${clasesInput} mt-5 resize-none`}
              />
            </section>
          </div>

          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Resumen
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Pedido actual
              </h2>

              <div className="mt-6 space-y-4 border-b border-slate-200 pb-6">
                <FilaResumen
                  label="Productos"
                  valor={String(cantidadProductosDistintos)}
                />

                <FilaResumen
                  label="Unidades"
                  valor={String(cantidadTotal)}
                />

                <FilaResumen
                  label="Cliente"
                  valor={nombreCliente || "Sin seleccionar"}
                />
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <span className="font-bold text-slate-500">
                  Total
                </span>

                <span className="text-3xl font-black text-slate-900">
                  {formatearPrecio(total)}
                </span>
              </div>

              <button
                type="button"
                onClick={guardarPedido}
                disabled={
                  guardando ||
                  !empresa?.id ||
                  cantidadProductosDistintos === 0
                }
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 py-4 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-5 w-5" />

                {guardando
                  ? "Guardando pedido..."
                  : "Guardar pedido"}
              </button>

              <Link
                href="/admin/pedidos"
                className="mt-3 block w-full rounded-2xl border border-slate-300 px-6 py-4 text-center font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </Link>

              <p className="mt-5 text-xs leading-5 text-slate-400">
                El precio y el total se validarán nuevamente en
                Supabase antes de crear el pedido.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
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
  onChange: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={clasesInput}
      />
    </div>
  );
}

function FilaResumen({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-black text-slate-800">
        {valor}
      </span>
    </div>
  );
}

function convertirPrecioManual(valor: string) {
  const limpio = valor
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(limpio);
}

function formatearPrecio(precio: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
}

const clasesInput =
  "w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";