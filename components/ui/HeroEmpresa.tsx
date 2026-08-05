"use client";

import {
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Store,
} from "lucide-react";

type TurnoHorario = {
  desde: string;
  hasta: string;
};

type HorarioDia = {
  activo: boolean;
  turnos: TurnoHorario[];
};

type HorariosSemana = Record<string, HorarioDia>;

type HeroEmpresaProps = {
  nombre?: string | null;
  rubro?: string | null;
  descripcion?: string | null;
  logo?: string | null;
  portada?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  fecha: string;
  horariosSemana?: unknown;
  colorPrincipal?: string;
  colorSecundario?: string;
  cargando?: boolean;
  onActualizar: () => void;
};

export default function HeroEmpresa({
  nombre,
  rubro,
  descripcion,
  logo,
  portada,
  direccion,
  ciudad,
  provincia,
  fecha,
  horariosSemana,
  colorPrincipal = "#2563EB",
  colorSecundario = "#7C3AED",
  cargando = false,
  onActualizar,
}: HeroEmpresaProps) {
  const estadoNegocio =
    calcularEstadoNegocio(horariosSemana);

  const ubicacion = [
    direccion,
    ciudad,
    provincia,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div
        className="relative min-h-[430px] overflow-hidden"
        style={{
          background: `linear-gradient(115deg, ${colorPrincipal}, ${colorSecundario})`,
        }}
      >
        {portada && (
          <img
            src={portada}
            alt={`Portada de ${nombre || "la empresa"}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/25" />

        <div className="relative z-10 flex min-h-[430px] flex-col justify-between px-6 py-7 text-white sm:px-8 sm:py-9">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <Store className="h-4 w-4" />
              ComerSys PRO
            </div>

            <button
              type="button"
              disabled={cargando}
              onClick={onActualizar}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  cargando ? "animate-spin" : ""
                }`}
              />

              {cargando
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </div>

          <div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl sm:h-40 sm:w-40">
                {logo ? (
                  <img
                    src={logo}
                    alt={`Logo de ${nombre || "la empresa"}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-5xl font-black text-white"
                    style={{
                      backgroundColor: colorPrincipal,
                    }}
                  >
                    {nombre?.charAt(0).toUpperCase() || (
                      <Store className="h-14 w-14" />
                    )}
                  </div>
                )}
              </div>

              <div className="max-w-3xl">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/65">
                  Panel principal
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                  {nombre || "Mi negocio"}
                </h1>

                {rubro && (
                  <p className="mt-3 text-lg font-bold text-white/90">
                    {rubro}
                  </p>
                )}

                {descripcion && (
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
                    {descripcion}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <EstadoNegocio
                    abierto={estadoNegocio.abierto}
                    detalle={estadoNegocio.detalle}
                  />

                  <DatoHero
                    icono={<CalendarDays className="h-4 w-4" />}
                    texto={fecha}
                  />
                </div>
              </div>
            </div>

            {ubicacion && (
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white/75">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{ubicacion}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EstadoNegocio({
  abierto,
  detalle,
}: {
  abierto: boolean;
  detalle: string;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 backdrop-blur">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          abierto ? "bg-emerald-400" : "bg-red-400"
        }`}
      />

      <span className="text-sm font-black text-white">
        {abierto ? "Abierto ahora" : "Cerrado"}
      </span>

      {detalle && (
        <>
          <span className="hidden h-4 w-px bg-white/20 sm:block" />

          <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/75">
            <Clock3 className="h-4 w-4" />
            {detalle}
          </span>
        </>
      )}
    </div>
  );
}

function DatoHero({
  icono,
  texto,
}: {
  icono: React.ReactNode;
  texto: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold capitalize text-white/85 backdrop-blur">
      {icono}
      <span>{texto}</span>
    </div>
  );
}

function calcularEstadoNegocio(
  valor: unknown
) {
  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    return {
      abierto: false,
      detalle: "Horario no informado",
    };
  }

  const horarios = valor as HorariosSemana;

  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  const ahora = new Date();
  const horarioDia =
    horarios[dias[ahora.getDay()]];

  if (!horarioDia?.activo) {
    return {
      abierto: false,
      detalle: buscarProximaApertura(
        horarios,
        ahora
      ),
    };
  }

  const minutosAhora =
    ahora.getHours() * 60 +
    ahora.getMinutes();

  for (const turno of horarioDia.turnos || []) {
    const desde =
      convertirHoraAMinutos(turno.desde);
    const hasta =
      convertirHoraAMinutos(turno.hasta);

    if (
      minutosAhora >= desde &&
      minutosAhora < hasta
    ) {
      return {
        abierto: true,
        detalle: `Cierra a las ${turno.hasta}`,
      };
    }
  }

  return {
    abierto: false,
    detalle: buscarProximaApertura(
      horarios,
      ahora
    ),
  };
}

function buscarProximaApertura(
  horarios: HorariosSemana,
  fechaActual: Date
) {
  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  const etiquetas = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  for (
    let desplazamiento = 1;
    desplazamiento <= 7;
    desplazamiento++
  ) {
    const indice =
      (fechaActual.getDay() +
        desplazamiento) %
      7;

    const dia = horarios[dias[indice]];
    const primerTurno = dia?.turnos?.[0];

    if (
      dia?.activo &&
      primerTurno?.desde
    ) {
      return `Abre ${etiquetas[indice]} a las ${primerTurno.desde}`;
    }
  }

  return "Horario no informado";
}

function convertirHoraAMinutos(
  hora: string
) {
  const [horas, minutos] = hora
    .split(":")
    .map(Number);

  return horas * 60 + minutos;
}