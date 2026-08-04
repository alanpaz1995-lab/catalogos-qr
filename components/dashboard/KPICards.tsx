"use client";

import Link from "next/link";

type VarianteKPI =
  | "verde"
  | "azul"
  | "violeta"
  | "naranja"
  | "gris";

export type KPIItem = {
  titulo: string;
  valor: string;
  detalle: string;
  icono: string;
  variante?: VarianteKPI;
  href?: string;
};

type KPICardsProps = {
  items: KPIItem[];
};

export default function KPICards({
  items,
}: KPICardsProps) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
          Resumen general
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Indicadores principales
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <TarjetaKPI
            key={item.titulo}
            {...item}
          />
        ))}
      </div>
    </section>
  );
}

function TarjetaKPI({
  titulo,
  valor,
  detalle,
  icono,
  variante = "gris",
  href,
}: KPIItem) {
  const estilos: Record<
    VarianteKPI,
    {
      contenedor: string;
      icono: string;
      valor: string;
    }
  > = {
    verde: {
      contenedor:
        "border-green-200 bg-green-50",
      icono:
        "bg-green-100 text-green-700",
      valor: "text-green-700",
    },

    azul: {
      contenedor:
        "border-blue-200 bg-blue-50",
      icono:
        "bg-blue-100 text-blue-700",
      valor: "text-blue-700",
    },

    violeta: {
      contenedor:
        "border-violet-200 bg-violet-50",
      icono:
        "bg-violet-100 text-violet-700",
      valor: "text-violet-700",
    },

    naranja: {
      contenedor:
        "border-amber-200 bg-amber-50",
      icono:
        "bg-amber-100 text-amber-700",
      valor: "text-amber-700",
    },

    gris: {
      contenedor:
        "border-slate-200 bg-white",
      icono:
        "bg-slate-100 text-slate-700",
      valor: "text-slate-900",
    },
  };

  const estilo = estilos[variante];

  const contenido = (
    <article
      className={`h-full rounded-3xl border p-5 shadow-sm transition ${
        href
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg"
          : ""
      } ${estilo.contenedor}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {titulo}
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${estilo.valor}`}
          >
            {valor}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {detalle}
          </p>

          {href && (
            <p className="mt-3 text-xs font-semibold text-[#2563EB]">
              Ver información →
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${estilo.icono}`}
        >
          {icono}
        </div>
      </div>
    </article>
  );

  if (!href) {
    return contenido;
  }

  return (
    <Link
      href={href}
      className="block h-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
      aria-label={`Abrir ${titulo}`}
    >
      {contenido}
    </Link>
  );
}