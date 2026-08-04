import type { MultimediaProducto } from "./GaleriaMultimedia";
import TarjetaBibliotecaMultimedia from "./TarjetaBibliotecaMultimedia";

export type MultimediaBiblioteca =
  MultimediaProducto & {
    producto_nombre: string;
  };

type GridBibliotecaMultimediaProps = {
  items: MultimediaBiblioteca[];
  cargando: boolean;
  tieneBusqueda: boolean;
};

export default function GridBibliotecaMultimedia({
  items,
  cargando,
  tieneBusqueda,
}: GridBibliotecaMultimediaProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">
          Todas las imágenes
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {items.length} imagen(es) encontrada(s)
        </p>
      </div>

      {cargando ? (
        <EstadoCarga />
      ) : items.length === 0 ? (
        <EstadoVacio tieneBusqueda={tieneBusqueda} />
      ) : (
        <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <TarjetaBibliotecaMultimedia
              key={item.id}
              item={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EstadoCarga() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

      <p className="mt-4 text-slate-500">
        Cargando biblioteca multimedia...
      </p>
    </div>
  );
}

function EstadoVacio({
  tieneBusqueda,
}: {
  tieneBusqueda: boolean;
}) {
  return (
    <div className="p-12 text-center">
      <span className="text-6xl">
        🖼️
      </span>

      <p className="mt-5 font-semibold text-slate-700">
        {tieneBusqueda
          ? "No encontramos resultados"
          : "La biblioteca está vacía"}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {tieneBusqueda
          ? "Probá con otra palabra o borrá la búsqueda."
          : "Subí imágenes desde la galería de un producto."}
      </p>
    </div>
  );
}