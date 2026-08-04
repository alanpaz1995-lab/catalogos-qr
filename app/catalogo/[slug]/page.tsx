"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CheckoutModal from "./components/CheckoutModal";
import { Empresa } from "@/types/empresa";
import { Producto } from "@/types/producto";
import { ItemPedido } from "@/types/pedido";

export default function CatalogoEmpresaPage() {
  const params = useParams();

  const slugParametro = Array.isArray(params.slug)
    ? params.slug[0]
    : params.slug;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("Todos");

  const [carrito, setCarrito] = useState<ItemPedido[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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

      setEmpresa(empresaEncontrada);

      const { data: productosData, error: productosError } =
        await supabase
          .from("productos")
          .select("*")
          .eq("empresa_id", empresaEncontrada.id)
          .eq("estado", "Activo")
          .order("id", { ascending: false });

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

      setProductos((productosData as Producto[]) || []);
      setCargando(false);
    }

    cargarCatalogo();
  }, [slugParametro]);

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

  const categorias = [
    "Todos",
    ...new Set(
      productos
        .map((producto) => producto.categoria)
        .filter((categoria): categoria is string => Boolean(categoria))
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

  function agregarAlCarrito(producto: Producto) {
    setCarrito((carritoActual) => {
      const productoExistente = carritoActual.find(
        (item) => item.producto.id === producto.id
      );

      if (productoExistente) {
        return carritoActual.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      return [...carritoActual, { producto, cantidad: 1 }];
    });
  }

  function aumentarCantidad(idProducto: number) {
    setCarrito((carritoActual) =>
      carritoActual.map((item) =>
        item.producto.id === idProducto
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      )
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

  function abrirCheckout() {
    setCarritoAbierto(false);
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
      total + Number(item.producto.precio) * item.cantidad,
    0
  );

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
      <button
        type="button"
        onClick={() => setCarritoAbierto(!carritoAbierto)}
        className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-full bg-[#2563EB] px-5 py-3 font-semibold text-white shadow-xl transition hover:scale-105 hover:bg-blue-700"
      >
        <span>🛒</span>
        <span>{cantidadCarrito}</span>
      </button>

      {carritoAbierto && (
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
                              Number(item.producto.precio)
                            )}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            Subtotal:{" "}
                            {formatearPrecio(
                              Number(item.producto.precio) *
                                item.cantidad
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
                                className="font-bold text-slate-700"
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

      <CheckoutModal
        abierto={checkoutAbierto}
        empresa={empresa}
        items={carrito}
        total={totalCarrito}
        formatearPrecio={formatearPrecio}
        onCerrar={() => setCheckoutAbierto(false)}
        onPedidoCreado={pedidoCreado}
      />

      <header className="bg-[#2563EB] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center">
          {empresa.logo ? (
            <img
              src={empresa.logo}
              alt={`Logo de ${empresa.nombre}`}
              className="h-24 w-24 rounded-2xl bg-white object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl font-bold shadow-lg">
              {empresa.nombre.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
              Catálogo digital
            </p>

            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
              {empresa.nombre}
            </h1>

            {empresa.descripcion && (
              <p className="mt-3 max-w-2xl text-lg text-blue-100">
                {empresa.descripcion}
              </p>
            )}
          </div>
        </div>
      </header>

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
                    ? "bg-[#2563EB] text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
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
                      <img
                        src={producto.imaguen}
                        alt={producto.nombre}
                        className="h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-slate-100 text-sm font-medium text-slate-400">
                        Sin imagen
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-sm font-semibold text-[#2563EB]">
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
                        <p className="text-2xl font-bold">
                          {formatearPrecio(
                            Number(producto.precio)
                          )}
                        </p>

                        {typeof producto.stock === "number" && (
                          <p className="mt-1 text-sm text-slate-500">
                            Stock disponible: {producto.stock}
                          </p>
                        )}

                        <div className="mt-5 space-y-3">
                          <button
                            type="button"
                            onClick={() =>
                              agregarAlCarrito(producto)
                            }
                            className="w-full rounded-xl bg-[#2563EB] px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
                          >
                            🛒 Agregar al carrito
                          </button>

                          <a
                            href={enlaceWhatsApp}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full rounded-xl bg-[#F97316] px-4 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
                          >
                            Comprar ahora
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

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          Catálogo creado con ComerSys
        </div>
      </footer>
    </main>
  );
}