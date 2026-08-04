"use client";

export type FiltroProducto =
  | "Todos"
  | "Stock bajo"
  | "Nuevos"
  | "Ofertas"
  | "Destacados"
  | "Ocultos"
  | "Inactivos";

type Props = {
  busqueda: string;
  filtro: FiltroProducto;
  cargando?: boolean;
  vista: "lista" | "tarjetas";

  onBusqueda: (valor: string) => void;
  onFiltro: (valor: FiltroProducto) => void;
  onVista: (vista: "lista" | "tarjetas") => void;
  onActualizar: () => void;
};

export default function FiltrosProductos({
  busqueda,
  filtro,
  cargando = false,
  vista,
  onBusqueda,
  onFiltro,
  onVista,
  onActualizar,
}: Props) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[1fr_260px_auto]">
        <div>
          <label
            htmlFor="buscar-producto"
            className="mb-2 block text-sm font-semibold"
          >
            Buscar producto
          </label>

          <input
            id="buscar-producto"
            type="search"
            value={busqueda}
            onChange={(event) =>
              onBusqueda(event.target.value)
            }
            placeholder="Nombre, categoría o descripción..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="filtro-productos"
            className="mb-2 block text-sm font-semibold"
          >
            Filtro
          </label>

          <select
            id="filtro-productos"
            value={filtro}
            onChange={(event) =>
              onFiltro(
                event.target.value as FiltroProducto
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="Todos">Todos</option>
            <option value="Stock bajo">
              Stock bajo
            </option>
            <option value="Nuevos">
              Nuevos
            </option>
            <option value="Ofertas">
              Ofertas
            </option>
            <option value="Destacados">
              Destacados
            </option>
            <option value="Ocultos">
              Ocultos
            </option>
            <option value="Inactivos">
              Inactivos
            </option>
          </select>
        </div>

        <button
          type="button"
          disabled={cargando}
          onClick={onActualizar}
          className="self-end rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          {cargando
            ? "Actualizando..."
            : "↻ Actualizar"}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
        <div className="text-sm text-slate-500">
          Elegí cómo querés visualizar el catálogo.
        </div>

        <div className="flex overflow-hidden rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => onVista("lista")}
            className={`px-5 py-2 font-semibold transition ${
              vista === "lista"
                ? "bg-blue-600 text-white"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            ☰ Lista
          </button>

          <button
            type="button"
            onClick={() =>
              onVista("tarjetas")
            }
            className={`px-5 py-2 font-semibold transition ${
              vista === "tarjetas"
                ? "bg-blue-600 text-white"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            ⬛ Tarjetas
          </button>
        </div>
      </div>
    </section>
  );
}