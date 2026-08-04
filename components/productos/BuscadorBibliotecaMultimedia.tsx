"use client";

type BuscadorBibliotecaMultimediaProps = {
  valor: string;
  onChange: (valor: string) => void;
};

export default function BuscadorBibliotecaMultimedia({
  valor,
  onChange,
}: BuscadorBibliotecaMultimediaProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Buscar imágenes
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Buscá por nombre del archivo, producto o descripción.
          </p>
        </div>

        <div className="w-full lg:max-w-md">
          <input
            type="search"
            value={valor}
            onChange={(event) =>
              onChange(event.target.value)
            }
            placeholder="Buscar imágenes..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>
    </section>
  );
}