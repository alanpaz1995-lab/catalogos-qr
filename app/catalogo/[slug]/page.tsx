"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CheckoutModal from "./components/CheckoutModal";
import HeroCatalogo from "./components/HeroCatalogo";
import { Empresa } from "@/types/empresa";
import { Producto } from "@/types/producto";
import { ItemPedido } from "@/types/pedido";

type ClienteCatalogo = {
  cliente_id: number;
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
};

export default function CatalogoEmpresaPage() {
  const params = useParams();

  const slugParametro = Array.isArray(params.slug)
    ? params.slug[0]
    : params.slug;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriasOrdenadas, setCategoriasOrdenadas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("Todos");

  const [carrito, setCarrito] = useState<ItemPedido[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);
  const [registroClienteAbierto, setRegistroClienteAbierto] =
    useState(false);
  const [clienteRegistrado, setClienteRegistrado] =
    useState<ClienteCatalogo | null>(null);

  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [registrandoCliente, setRegistrandoCliente] =
    useState(false);
  const [errorRegistroCliente, setErrorRegistroCliente] =
    useState("");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [avisoActualizacion, setAvisoActualizacion] =
    useState("");

  const [imagenAmpliada, setImagenAmpliada] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  useEffect(() => {
    async function cargarCatalogo() {
      setCargando(true);
      setError("");

      if (!slugParametro) {
        setError("El catálogo solicitado no es válido.");
        setCargando(false);
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("slug", slugParametro)
        .maybeSingle();

      if (empresaError) {
        console.error("Error al cargar la empresa:", empresaError);
        setError(
          `No se pudo cargar la empresa: ${empresaError.message}`
        );
        setCargando(false);
        return;
      }

      if (!empresaData) {
        setError("No encontramos ese catálogo.");
        setCargando(false);
        return;
      }

      const empresaEncontrada = empresaData as Empresa;

      if (
        empresaEncontrada.estado &&
        empresaEncontrada.estado !== "Activo"
      ) {
        setError("Este catálogo no se encuentra disponible.");
        setCargando(false);
        return;
      }

      if (empresaEncontrada.catalogo_activo === false) {
        setError("Este catálogo está temporalmente desactivado.");
        setCargando(false);
        return;
      }

      setEmpresa(empresaEncontrada);

      const [
        { data: productosData, error: productosError },
        { data: categoriasData, error: categoriasError },
      ] = await Promise.all([
        supabase
          .from("productos")
          .select("*")
          .eq("empresa_id", empresaEncontrada.id)
          .eq("estado", "Activo")
          .order("id", { ascending: false }),
        supabase
          .from("categorias")
          .select("nombre, orden")
          .eq("empresa_id", empresaEncontrada.id)
          .eq("estado", "Activo")
          .order("orden", { ascending: true })
          .order("nombre", { ascending: true }),
      ]);

      if (productosError) {
        console.error(
          "Error al cargar los productos:",
          productosError
        );

        setError(
          `No se pudieron cargar los productos: ${productosError.message}`
        );
        setCargando(false);
        return;
      }

      if (categoriasError) {
        console.error(
          "Error al cargar las categorías:",
          categoriasError
        );

        setError(
          `No se pudieron cargar las categorías: ${categoriasError.message}`
        );
        setCargando(false);
        return;
      }

      const productosCargados =
        (productosData as Producto[]) || [];

      const nombresOrdenados = (
        (categoriasData as Array<{
          nombre: string;
          orden?: number | null;
        }>) || []
      ).map((categoria) => categoria.nombre);

      setCategoriasOrdenadas(nombresOrdenados);

      const posicionCategoria = new Map(
        nombresOrdenados.map((nombre, indice) => [
          nombre,
          indice,
        ])
      );

      setProductos(
        [...productosCargados].sort((a, b) => {
          const ordenA =
            posicionCategoria.get(a.categoria || "") ??
            Number.MAX_SAFE_INTEGER;
          const ordenB =
            posicionCategoria.get(b.categoria || "") ??
            Number.MAX_SAFE_INTEGER;

          if (ordenA !== ordenB) {
            return ordenA - ordenB;
          }

          return b.id - a.id;
        })
      );
      setCargando(false);
    }

    cargarCatalogo();
  }, [slugParametro]);

  useEffect(() => {
    if (!empresa?.id) return;

    const clave = `comersys_cliente_${empresa.id}`;

    try {
      const guardado = window.localStorage.getItem(clave);

      if (!guardado) return;

      const cliente = JSON.parse(guardado) as ClienteCatalogo;

      if (
        cliente?.cliente_id &&
        cliente?.nombre &&
        cliente?.telefono
      ) {
        setClienteRegistrado(cliente);
      }
    } catch (errorDesconocido) {
      console.warn(
        "No se pudo recuperar el cliente guardado:",
        errorDesconocido
      );
    }
  }, [empresa?.id]);

  useEffect(() => {
    if (!empresa?.id) return;

    const canal = supabase
      .channel(`catalogo-productos-${empresa.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "productos",
          filter: `empresa_id=eq.${empresa.id}`,
        },
        (evento) => {
          const productoNuevo =
            evento.new as Producto;
          const productoAnterior =
            evento.old as Partial<Producto>;

          if (evento.eventType === "INSERT") {
            if (productoNuevo.estado === "Activo") {
              setProductos((actuales) => [
                productoNuevo,
                ...actuales.filter(
                  (producto) =>
                    producto.id !== productoNuevo.id
                ),
              ]);
            }

            setAvisoActualizacion(
              "El catálogo se actualizó automáticamente."
            );
          }

          if (evento.eventType === "UPDATE") {
            setProductos((actuales) => {
              if (productoNuevo.estado !== "Activo") {
                return actuales.filter(
                  (producto) =>
                    producto.id !== productoNuevo.id
                );
              }

              const existe = actuales.some(
                (producto) =>
                  producto.id === productoNuevo.id
              );

              if (!existe) {
                return [productoNuevo, ...actuales];
              }

              return actuales.map((producto) =>
                producto.id === productoNuevo.id
                  ? productoNuevo
                  : producto
              );
            });

            setCarrito((actual) =>
              actual
                .map((item) =>
                  item.producto.id === productoNuevo.id
                    ? {
                        ...item,
                        producto: productoNuevo,
                      }
                    : item
                )
                .filter(
                  (item) =>
                    item.producto.estado === "Activo"
                )
            );

            setAvisoActualizacion(
              "Se actualizaron precios o datos del catálogo."
            );
          }

          if (evento.eventType === "DELETE") {
            const productoId = Number(
              productoAnterior.id
            );

            setProductos((actuales) =>
              actuales.filter(
                (producto) =>
                  producto.id !== productoId
              )
            );

            setCarrito((actual) =>
              actual.filter(
                (item) =>
                  item.producto.id !== productoId
              )
            );

            setAvisoActualizacion(
              "Un producto dejó de estar disponible."
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [empresa?.id]);

  useEffect(() => {
    if (!avisoActualizacion) return;

    const temporizador = window.setTimeout(() => {
      setAvisoActualizacion("");
    }, 4500);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [avisoActualizacion]);

  useEffect(() => {
    if (!imagenAmpliada) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImagenAmpliada(null);
      }
    };

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [imagenAmpliada]);

  const productosFiltrados = productos.filter((producto) => {
    const textoBuscado = busqueda.trim().toLowerCase();

    const nombre = producto.nombre?.toLowerCase() || "";
    const categoria = producto.categoria?.toLowerCase() || "";
    const descripcion = producto.descripcion?.toLowerCase() || "";

    const coincideBusqueda =
      nombre.includes(textoBuscado) ||
      categoria.includes(textoBuscado) ||
      descripcion.includes(textoBuscado);

    const coincideCategoria =
      categoriaSeleccionada === "Todos" ||
      producto.categoria === categoriaSeleccionada;

    return coincideBusqueda && coincideCategoria;
  });

  const categoriasDeProductos = new Set(
    productos
      .map((producto) => producto.categoria)
      .filter((categoria): categoria is string => Boolean(categoria))
  );

  const categorias = [
    "Todos",
    ...categoriasOrdenadas.filter((categoria) =>
      categoriasDeProductos.has(categoria)
    ),
    ...Array.from(categoriasDeProductos).filter(
      (categoria) => !categoriasOrdenadas.includes(categoria)
    ),
  ];

  function formatearPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(precio);
  }

  function limpiarNumeroWhatsApp(numero: string) {
    return numero.replace(/\D/g, "");
  }

  function productoDisponible(producto: Producto) {
    if (producto.controlar_stock === false) {
      return true;
    }

    return (
      producto.stock == null ||
      Number(producto.stock) > 0
    );
  }

  function obtenerCantidadMinimaMayorista(producto: Producto) {
    const minimo = Number(producto.cantidad_minima_mayorista ?? 10);

    return Number.isFinite(minimo) && minimo > 0
      ? minimo
      : 10;
  }

  function tienePrecioMayorista(producto: Producto) {
    return (
      producto.precio_mayorista != null &&
      Number.isFinite(Number(producto.precio_mayorista))
    );
  }

  function obtenerPrecioAplicado(
    producto: Producto,
    cantidad: number
  ) {
    const minimo = obtenerCantidadMinimaMayorista(producto);

    if (
      tienePrecioMayorista(producto) &&
      cantidad >= minimo
    ) {
      return Number(producto.precio_mayorista);
    }

    return Number(producto.precio);
  }

  function agregarAlCarrito(producto: Producto) {
    if (!productoDisponible(producto)) {
      setAvisoActualizacion(
        "Este producto no se encuentra disponible."
      );
      return;
    }

    setCarrito((carritoActual) => {
      const productoExistente = carritoActual.find(
        (item) => item.producto.id === producto.id
      );

      if (productoExistente) {
        const nuevaCantidad =
          productoExistente.cantidad + 1;

        if (
          producto.controlar_stock !== false &&
          producto.stock != null &&
          nuevaCantidad > Number(producto.stock)
        ) {
          setAvisoActualizacion(
            "No hay disponibilidad suficiente para agregar más unidades."
          );
          return carritoActual;
        }

        return carritoActual.map((item) =>
          item.producto.id === producto.id
            ? {
                ...item,
                cantidad: nuevaCantidad,
              }
            : item
        );
      }

      return [
        ...carritoActual,
        {
          producto,
          cantidad: 1,
        },
      ];
    });

    setCarritoAbierto(true);
  }

  function aumentarCantidad(idProducto: number) {
    setCarrito((carritoActual) =>
      carritoActual.map((item) => {
        if (item.producto.id !== idProducto) {
          return item;
        }

        if (!productoDisponible(item.producto)) {
          setAvisoActualizacion(
            "Este producto no se encuentra disponible."
          );
          return item;
        }

        const nuevaCantidad = item.cantidad + 1;

        if (
          item.producto.controlar_stock !== false &&
          item.producto.stock != null &&
          nuevaCantidad > Number(item.producto.stock)
        ) {
          setAvisoActualizacion(
            "No hay disponibilidad suficiente para agregar más unidades."
          );
          return item;
        }

        return {
          ...item,
          cantidad: nuevaCantidad,
        };
      })
    );
  }

  function disminuirCantidad(idProducto: number) {
    setCarrito((carritoActual) =>
      carritoActual
        .map((item) =>
          item.producto.id === idProducto
            ? { ...item, cantidad: item.cantidad - 1 }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  function eliminarDelCarrito(idProducto: number) {
    setCarrito((carritoActual) =>
      carritoActual.filter(
        (item) => item.producto.id !== idProducto
      )
    );
  }

  async function registrarCliente() {
    if (!empresa?.id) return;

    const nombreLimpio = nombreCliente.trim();
    const telefonoLimpio = telefonoCliente.trim();

    if (!nombreLimpio || !telefonoLimpio) {
      setErrorRegistroCliente(
        "Completá el nombre y el teléfono."
      );
      return;
    }

    setRegistrandoCliente(true);
    setErrorRegistroCliente("");

    try {
      const { data, error: errorRegistro } =
        await supabase.rpc(
          "registrar_cliente_catalogo",
          {
            p_empresa_id: empresa.id,
            p_nombre: nombreLimpio,
            p_telefono: telefonoLimpio,
            p_email: emailCliente.trim() || null,
            p_direccion:
              direccionCliente.trim() || null,
            p_observaciones: null,
          }
        );

      if (errorRegistro) {
        throw new Error(errorRegistro.message);
      }

      const resultado = Array.isArray(data)
        ? data[0]
        : data;

      if (!resultado) {
        throw new Error(
          "No se pudo recuperar el cliente registrado."
        );
      }

      const cliente: ClienteCatalogo = {
        cliente_id: Number(resultado.cliente_id),
        nombre: String(
          resultado.cliente_nombre || nombreLimpio
        ),
        telefono: String(
          resultado.cliente_telefono || telefonoLimpio
        ),
        email: emailCliente.trim() || "",
        direccion: direccionCliente.trim() || "",
      };

      setClienteRegistrado(cliente);

      window.localStorage.setItem(
        `comersys_cliente_${empresa.id}`,
        JSON.stringify(cliente)
      );

      setRegistroClienteAbierto(false);
      setNombreCliente("");
      setTelefonoCliente("");
      setEmailCliente("");
      setDireccionCliente("");

      setAvisoActualizacion(
        `Cliente registrado. ¡Bienvenido/a, ${cliente.nombre}!`
      );
    } catch (errorDesconocido) {
      setErrorRegistroCliente(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo registrar el cliente."
      );
    } finally {
      setRegistrandoCliente(false);
    }
  }

  function cambiarCliente() {
    if (!empresa?.id) return;

    window.localStorage.removeItem(
      `comersys_cliente_${empresa.id}`
    );

    setClienteRegistrado(null);
    setCheckoutAbierto(false);
    setRegistroClienteAbierto(true);
  }

  function abrirCheckout() {
    setCarritoAbierto(false);

    if (!clienteRegistrado) {
      setRegistroClienteAbierto(true);
      return;
    }

    setCheckoutAbierto(true);
  }

  function pedidoCreado() {
    setCheckoutAbierto(false);
    setCarrito([]);
  }

  const cantidadCarrito = carrito.reduce(
    (total, item) => total + item.cantidad,
    0
  );

  const totalCarrito = carrito.reduce(
    (total, item) =>
      total +
      obtenerPrecioAplicado(
        item.producto,
        item.cantidad
      ) *
        item.cantidad,
    0
  );

  const permitirCompras =
    empresa?.permitir_compras !== false;

  const mostrarPrecios =
    empresa?.mostrar_precios !== false;

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p className="mt-4 text-slate-500">
            Cargando catálogo...
          </p>
        </div>
      </main>
    );
  }

  if (error || !empresa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-700">
            Catálogo no disponible
          </h1>

          <p className="mt-3 text-red-600">
            {error || "No se pudo cargar el catálogo."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {avisoActualizacion && (
        <div className="fixed left-1/2 top-5 z-[70] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-center text-sm font-bold text-slate-700 shadow-2xl">
          🔄 {avisoActualizacion}
        </div>
      )}
      <div className="fixed left-6 top-6 z-50">
        {clienteRegistrado ? (
          <div className="rounded-2xl border border-green-200 bg-white px-4 py-3 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
              ✓ Cliente registrado
            </p>
            <p className="mt-1 font-bold text-slate-800">
              {clienteRegistrado.nombre}
            </p>
            <button
              type="button"
              onClick={cambiarCliente}
              className="mt-1 text-xs font-semibold text-[#2563EB]"
            >
              No soy esta persona
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              setRegistroClienteAbierto(true)
            }
            className="rounded-full bg-white px-5 py-3 font-semibold text-[#2563EB] shadow-xl transition hover:scale-105"
          >
            👤 Nuevo cliente
          </button>
        )}
      </div>

      {permitirCompras && (
        <button
          type="button"
          onClick={() =>
            setCarritoAbierto(!carritoAbierto)
          }
          className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-white shadow-xl transition hover:scale-105"
          style={{
            backgroundColor:
              empresa.color_principal || "#2563EB",
          }}
        >
          <span>🛒</span>
          <span>{cantidadCarrito}</span>
        </button>
      )}

      {permitirCompras && carritoAbierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar carrito"
            onClick={() => setCarritoAbierto(false)}
            className="fixed inset-0 z-40 bg-black/40"
          />

          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold">Tu carrito</h2>

                <p className="mt-1 text-sm text-slate-500">
                  {cantidadCarrito} producto(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCarritoAbierto(false)}
                className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 transition hover:bg-slate-200"
                aria-label="Cerrar carrito"
              >
                ✕
              </button>
            </div>

            {carrito.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    El carrito está vacío
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Agregá productos para comenzar tu pedido.
                  </p>

                  <button
                    type="button"
                    onClick={() => setCarritoAbierto(false)}
                    className="mt-5 rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Seguir comprando
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                  {carrito.map((item) => (
                    <article
                      key={item.producto.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex gap-4">
                        {item.producto.imaguen ? (
                          <img
                            src={item.producto.imaguen}
                            alt={item.producto.nombre}
                            className="h-20 w-20 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                            Sin imagen
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold">
                            {item.producto.nombre}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatearPrecio(
                              obtenerPrecioAplicado(
                                item.producto,
                                item.cantidad
                              )
                            )}{" "}
                            c/u
                          </p>

                          {tienePrecioMayorista(
                            item.producto
                          ) && (
                            <p
                              className={`mt-1 text-xs font-semibold ${
                                item.cantidad >=
                                obtenerCantidadMinimaMayorista(
                                  item.producto
                                )
                                  ? "text-emerald-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {item.cantidad >=
                              obtenerCantidadMinimaMayorista(
                                item.producto
                              )
                                ? "✓ Precio mayorista aplicado"
                                : `Mayorista desde ${obtenerCantidadMinimaMayorista(
                                    item.producto
                                  )} unidades`}
                            </p>
                          )}

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            Subtotal:{" "}
                            {formatearPrecio(
                              obtenerPrecioAplicado(
                                item.producto,
                                item.cantidad
                              ) * item.cantidad
                            )}
                          </p>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 rounded-full bg-slate-100 px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  disminuirCantidad(
                                    item.producto.id
                                  )
                                }
                                className="font-bold text-slate-700"
                              >
                                −
                              </button>

                              <span className="min-w-5 text-center font-semibold">
                                {item.cantidad}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  aumentarCantidad(
                                    item.producto.id
                                  )
                                }
                                disabled={
                                  item.producto.controlar_stock !== false &&
                                  item.producto.stock != null &&
                                  item.cantidad >=
                                    Number(item.producto.stock)
                                }
                                className="font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarDelCarrito(
                                  item.producto.id
                                )
                              }
                              className="text-sm font-semibold text-red-500 transition hover:text-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="border-t border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      Total
                    </span>

                    <span className="text-2xl font-bold">
                      {formatearPrecio(totalCarrito)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={abrirCheckout}
                    className="mt-5 w-full rounded-xl bg-[#F97316] px-5 py-4 font-semibold text-white transition hover:bg-orange-600"
                  >
                    Finalizar pedido
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarritoAbierto(false)}
                    className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </aside>
        </>
      )}

      {registroClienteAbierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar registro"
            onClick={() =>
              setRegistroClienteAbierto(false)
            }
            className="fixed inset-0 z-[80] bg-black/50"
          />

          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-2xl font-bold">
                    Nuevo cliente
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Registrate para comenzar tu compra.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRegistroClienteAbierto(false)
                  }
                  className="rounded-full bg-slate-100 px-3 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-5 p-6">
                <CampoRegistroCliente
                  label="Nombre"
                  value={nombreCliente}
                  onChange={setNombreCliente}
                  placeholder="Tu nombre"
                  required
                />

                <CampoRegistroCliente
                  label="Teléfono"
                  value={telefonoCliente}
                  onChange={setTelefonoCliente}
                  placeholder="Ejemplo: 1123456789"
                  required
                />

                <CampoRegistroCliente
                  label="Email"
                  value={emailCliente}
                  onChange={setEmailCliente}
                  placeholder="Opcional"
                />

                <CampoRegistroCliente
                  label="Dirección"
                  value={direccionCliente}
                  onChange={setDireccionCliente}
                  placeholder="Opcional"
                />

                {errorRegistroCliente && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorRegistroCliente}
                  </div>
                )}

                <button
                  type="button"
                  onClick={registrarCliente}
                  disabled={registrandoCliente}
                  className="w-full rounded-xl bg-[#2563EB] px-5 py-4 font-semibold text-white disabled:opacity-60"
                >
                  {registrandoCliente
                    ? "Registrando..."
                    : "Registrarme como cliente"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <CheckoutModal
        abierto={checkoutAbierto}
        empresa={empresa}
        items={carrito}
        total={totalCarrito}
        formatearPrecio={formatearPrecio}
        onCerrar={() => setCheckoutAbierto(false)}
        onPedidoCreado={pedidoCreado}
        clienteRegistrado={clienteRegistrado}
      />

      <HeroCatalogo empresa={empresa} />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Nuestros productos
              </h2>

              <p className="mt-1 text-slate-500">
                Encontrá el producto que estás buscando.
              </p>
            </div>

            <input
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar productos..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 sm:max-w-md"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categorias.map((categoria) => (
              <button
                key={categoria}
                type="button"
                onClick={() =>
                  setCategoriaSeleccionada(categoria)
                }
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  categoriaSeleccionada === categoria
                    ? "text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                style={
                  categoriaSeleccionada === categoria
                    ? {
                        backgroundColor:
                          empresa.color_principal ||
                          "#2563EB",
                      }
                    : undefined
                }
              >
                {categoria}
              </button>
            ))}
          </div>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              No se encontraron productos
            </p>

            <p className="mt-2 text-slate-500">
              Probá realizando otra búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productosFiltrados.map((producto) => {
              const mensajeWhatsApp = encodeURIComponent(
                `Hola, quiero consultar por el producto: ${producto.nombre}`
              );

              const numeroWhatsApp = empresa.whatsapp
                ? limpiarNumeroWhatsApp(empresa.whatsapp)
                : "";

              const enlaceWhatsApp = numeroWhatsApp
                ? `https://wa.me/${numeroWhatsApp}?text=${mensajeWhatsApp}`
                : `https://wa.me/?text=${mensajeWhatsApp}`;

              return (
                <article
                  key={producto.id}
                  className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex w-full flex-col">
                    {producto.imaguen ? (
                      <button
                        type="button"
                        onClick={() =>
                          setImagenAmpliada({
                            src: producto.imaguen!,
                            alt: producto.nombre,
                          })
                        }
                        className="group relative block h-56 w-full cursor-zoom-in overflow-hidden bg-slate-100 text-left"
                        aria-label={`Ver imagen completa de ${producto.nombre}`}
                      >
                        <img
                          src={producto.imaguen}
                          alt={producto.nombre}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />

                        <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                          🔍 Ver completa
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-slate-100 text-sm font-medium text-slate-400">
                        Sin imagen
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color:
                            empresa.color_principal ||
                            "#2563EB",
                        }}
                      >
                        {producto.categoria || "Sin categoría"}
                      </p>

                      <h3 className="mt-2 text-xl font-bold">
                        {producto.nombre}
                      </h3>

                      {producto.descripcion && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                          {producto.descripcion}
                        </p>
                      )}

                      <div className="mt-auto pt-5">
                        {mostrarPrecios && (
                          <div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Precio minorista
                              </p>
                              <p className="mt-1 text-2xl font-bold">
                                {formatearPrecio(
                                  Number(producto.precio)
                                )}
                              </p>
                            </div>

                            {tienePrecioMayorista(producto) && (
                              <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                                  Precio mayorista
                                </p>
                                <p className="mt-1 text-xl font-bold text-emerald-700">
                                  {formatearPrecio(
                                    Number(
                                      producto.precio_mayorista
                                    )
                                  )}
                                </p>
                                <p className="mt-1 text-xs font-medium text-emerald-700">
                                  Desde{" "}
                                  {obtenerCantidadMinimaMayorista(
                                    producto
                                  )}{" "}
                                  unidades de este producto
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4">
                          {productoDisponible(producto) ? (
                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                              Disponible
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600">
                              No disponible
                            </span>
                          )}
                        </div>

                        <div className="mt-5 space-y-3">
                          {permitirCompras && (
                            <button
                              type="button"
                              onClick={() =>
                                agregarAlCarrito(
                                  producto
                                )
                              }
                              disabled={
                                !productoDisponible(producto)
                              }
                              className="w-full rounded-xl px-4 py-3 text-center font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                              style={{
                                backgroundColor:
                                  empresa.color_principal ||
                                  "#2563EB",
                              }}
                            >
                              {productoDisponible(producto)
                                ? "🛒 Agregar al carrito"
                                : "No disponible"}
                            </button>
                          )}

                          <a
                            href={enlaceWhatsApp}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full rounded-xl px-4 py-3 text-center font-semibold text-white transition hover:brightness-95"
                            style={{
                              backgroundColor:
                                empresa.color_secundario ||
                                "#F97316",
                            }}
                          >
                            {permitirCompras
                              ? "Consultar por WhatsApp"
                              : "Consultar producto"}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={imagenAmpliada.alt}
          onClick={() => setImagenAmpliada(null)}
        >
          <button
            type="button"
            onClick={() => setImagenAmpliada(null)}
            className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-800 shadow-2xl transition hover:scale-105 sm:right-6 sm:top-6"
            aria-label="Cerrar imagen"
          >
            ✕
          </button>

          <div
            className="flex h-full w-full items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={imagenAmpliada.src}
              alt={imagenAmpliada.alt}
              className="max-h-[94vh] max-w-[96vw] object-contain"
            />
          </div>
        </div>
      )}

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          Catálogo creado con ComerSys
        </div>
      </footer>
    </main>
  );
}

function CampoRegistroCliente({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-semibold">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}