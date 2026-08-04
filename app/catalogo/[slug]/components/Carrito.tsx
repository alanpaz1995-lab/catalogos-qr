type Producto = {
  id: number;
  nombre: string;
  categoria?: string | null;
  precio: number;
  stock?: number | null;
  descripcion?: string | null;
  imaguen?: string | null;
  estado?: string | null;
  empresa_id: number;
};

type ItemCarrito = {
  producto: Producto;
  cantidad: number;
};

type CarritoProps = {
  abierto: boolean;
  items: ItemCarrito[];
  cantidadTotal: number;
  total: number;
  onCerrar: () => void;
  onAumentar: (idProducto: number) => void;
  onDisminuir: (idProducto: number) => void;
  onEliminar: (idProducto: number) => void;
  onFinalizar: () => void;
  formatearPrecio: (precio: number) => string;
};

export default function Carrito({
  abierto,
  items,
  cantidadTotal,
  total,
  onCerrar,
  onAumentar,
  onDisminuir,
  onEliminar,
  onFinalizar,
  formatearPrecio,
}: CarritoProps) {
  if (!abierto) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={onCerrar}
        className="fixed inset-0 z-40 bg-black/40"
      />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">Tu carrito</h2>

            <p className="mt-1 text-sm text-slate-500">
              {cantidadTotal} producto(s)
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 transition hover:bg-slate-200"
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
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
                onClick={onCerrar}
                className="mt-5 rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Seguir comprando
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {items.map((item) => (
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
                              onDisminuir(item.producto.id)
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
                              onAumentar(item.producto.id)
                            }
                            className="font-bold text-slate-700"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onEliminar(item.producto.id)
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
                  {formatearPrecio(total)}
                </span>
              </div>

              <button
                type="button"
                onClick={onFinalizar}
                className="mt-5 w-full rounded-xl bg-[#F97316] px-5 py-4 font-semibold text-white transition hover:bg-orange-600"
              >
                Finalizar pedido
              </button>

              <button
                type="button"
                onClick={onCerrar}
                className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}