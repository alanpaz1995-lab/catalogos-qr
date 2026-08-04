"use client";

export type ResumenProductoItem = {
  titulo: string;
  valor: number;
  icono: string;
  variante?:
    | "normal"
    | "verde"
    | "naranja"
    | "azul"
    | "violeta"
    | "gris";
};

type ResumenProductosProps = {
  items: ResumenProductoItem[];
};

export default function ResumenProductos({
  items,
}: ResumenProductosProps) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
          Resumen
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Estado del catálogo
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => (
          <TarjetaResumen
            key={item.titulo}
            {...item}
          />
        ))}
      </div>
    </section>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  icono,
  variante = "normal",
}: ResumenProductoItem) {
  const estilos = {
    normal: {
      contenedor:
        "border-slate-200 bg-white text-slate-900",
      icono:
        "bg-slate-100 text-slate-700",
    },

    verde: {
      contenedor:
        "border-green-200 bg-green-50 text-green-700",
      icono:
        "bg-green-100 text-green-700",
    },

    naranja: {
      contenedor:
        "border-amber-200 bg-amber-50 text-amber-700",
      icono:
        "bg-amber-100 text-amber-700",
    },

    azul: {
      contenedor:
        "border-blue-200 bg-blue-50 text-blue-700",
      icono:
        "bg-blue-100 text-blue-700",
    },

    violeta: {
      contenedor:
        "border-violet-200 bg-violet-50 text-violet-700",
      icono:
        "bg-violet-100 text-violet-700",
    },

    gris: {
      contenedor:
        "border-slate-200 bg-slate-100 text-slate-600",
      icono:
        "bg-slate-200 text-slate-600",
    },
  }[variante];

  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${estilos.contenedor}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium opacity-80">
            {titulo}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {valor}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${estilos.icono}`}
        >
          {icono}
        </div>
      </div>
    </article>
  );
}