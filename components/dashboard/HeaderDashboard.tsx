"use client";

type HeaderDashboardProps = {
  fecha: string;
  cargando?: boolean;
  onActualizar: () => void;
};

export default function HeaderDashboard({
  fecha,
  cargando = false,
  onActualizar,
}: HeaderDashboardProps) {
  return (
    <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-violet-700 px-6 py-8 text-white sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">
              ComerSys PRO
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Mi negocio hoy
            </h1>

            <p className="mt-3 capitalize text-blue-100">
              {fecha}
            </p>
          </div>

          <button
            type="button"
            disabled={cargando}
            onClick={onActualizar}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={
                cargando
                  ? "animate-spin"
                  : ""
              }
            >
              ↻
            </span>

            {cargando
              ? "Actualizando..."
              : "Actualizar datos"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 text-sm sm:grid-cols-3 sm:px-8">
        <EstadoRapido
          icono="📊"
          titulo="Panel general"
          detalle="Resumen de ventas, stock y actividad."
        />

        <EstadoRapido
          icono="⚡"
          titulo="Accesos rápidos"
          detalle="Entrá a los módulos más usados."
        />

        <EstadoRapido
          icono="🤖"
          titulo="IA Comercial"
          detalle="Preparado para análisis y automatización."
        />
      </div>
    </header>
  );
}

function EstadoRapido({
  icono,
  titulo,
  detalle,
}: {
  icono: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <span className="text-2xl">
        {icono}
      </span>

      <div>
        <p className="font-bold text-slate-800">
          {titulo}
        </p>

        <p className="mt-1 leading-5 text-slate-500">
          {detalle}
        </p>
      </div>
    </div>
  );
}