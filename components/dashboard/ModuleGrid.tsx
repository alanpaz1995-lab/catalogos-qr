"use client";

import Link from "next/link";

export type AccesoModulo = {
  texto: string;
  href: string;
};

export type ModuloDashboard = {
  titulo: string;
  descripcion: string;
  icono: string;
  color:
    | "azul"
    | "verde"
    | "violeta"
    | "naranja"
    | "rosa"
    | "gris";
  accesos: AccesoModulo[];
};

type ModuleGridProps = {
  modulos: ModuloDashboard[];
};

export default function ModuleGrid({
  modulos,
}: ModuleGridProps) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
          Centro de módulos
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Accesos principales
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Entrá directamente a las funciones más importantes de ComerSys.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {modulos.map((modulo) => (
          <TarjetaModulo
            key={modulo.titulo}
            {...modulo}
          />
        ))}
      </div>
    </section>
  );
}

function TarjetaModulo({
  titulo,
  descripcion,
  icono,
  color,
  accesos,
}: ModuloDashboard) {
  const estilos = {
    azul: {
      borde: "border-blue-200",
      fondo: "bg-blue-50",
      icono: "bg-blue-100 text-blue-700",
      titulo: "text-blue-800",
      link: "text-blue-700 hover:bg-blue-100",
    },

    verde: {
      borde: "border-green-200",
      fondo: "bg-green-50",
      icono: "bg-green-100 text-green-700",
      titulo: "text-green-800",
      link: "text-green-700 hover:bg-green-100",
    },

    violeta: {
      borde: "border-violet-200",
      fondo: "bg-violet-50",
      icono: "bg-violet-100 text-violet-700",
      titulo: "text-violet-800",
      link: "text-violet-700 hover:bg-violet-100",
    },

    naranja: {
      borde: "border-amber-200",
      fondo: "bg-amber-50",
      icono: "bg-amber-100 text-amber-700",
      titulo: "text-amber-800",
      link: "text-amber-700 hover:bg-amber-100",
    },

    rosa: {
      borde: "border-pink-200",
      fondo: "bg-pink-50",
      icono: "bg-pink-100 text-pink-700",
      titulo: "text-pink-800",
      link: "text-pink-700 hover:bg-pink-100",
    },

    gris: {
      borde: "border-slate-200",
      fondo: "bg-white",
      icono: "bg-slate-100 text-slate-700",
      titulo: "text-slate-900",
      link: "text-slate-700 hover:bg-slate-100",
    },
  }[color];

  return (
    <article
      className={`overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${estilos.borde} ${estilos.fondo}`}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${estilos.icono}`}
          >
            {icono}
          </div>

          <div>
            <h3
              className={`text-xl font-bold ${estilos.titulo}`}
            >
              {titulo}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {descripcion}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          {accesos.map((acceso) => (
            <Link
              key={`${titulo}-${acceso.texto}`}
              href={acceso.href}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${estilos.link}`}
            >
              {acceso.texto}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}