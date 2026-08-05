"use client";

import Link from "next/link";

type TurnoHorario = {
  desde: string;
  hasta: string;
};

type HorarioDia = {
  activo: boolean;
  turnos: TurnoHorario[];
};

type HorariosSemana = Record<string, HorarioDia>;

type HeaderDashboardProps = {
  fecha: string;
  cargando?: boolean;
  onActualizar: () => void;
  nombreEmpresa?: string | null;
  descripcionEmpresa?: string | null;
  rubroEmpresa?: string | null;
  logo?: string | null;
  portada?: string | null;
  colorPrincipal?: string;
  colorSecundario?: string;
  slugEmpresa?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  horariosSemana?: unknown;
};

export default function HeaderDashboard({
  fecha,
  cargando = false,
  onActualizar,
  nombreEmpresa,
  descripcionEmpresa,
  rubroEmpresa,
  logo,
  portada,
  colorPrincipal = "#2563EB",
  colorSecundario = "#7C3AED",
  slugEmpresa,
  whatsapp,
  direccion,
  ciudad,
  provincia,
  horariosSemana,
}: HeaderDashboardProps) {
  const estadoNegocio =
    calcularEstadoNegocio(horariosSemana);

  const ubicacion = [
    direccion,
    ciudad,
    provincia,
  ]
    .filter(Boolean)
    .join(", ");

  const enlaceWhatsApp = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : "";

  const enlaceComoLlegar = ubicacion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        ubicacion
      )}`
    : "";

  async function copiarEnlaceCatalogo() {
    if (!slugEmpresa) return;

    const enlace = `${window.location.origin}/catalogo/${slugEmpresa}`;

    await navigator.clipboard.writeText(enlace);
    window.alert("Enlace del catálogo copiado.");
  }

  return (
    <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div
        className="relative min-h-[460px] overflow-hidden"
        style={{
          background: `linear-gradient(115deg, ${colorPrincipal}, ${colorSecundario})`,
        }}
      >
        {portada && (
          <img
            src={portada}
            alt={`Portada de ${
              nombreEmpresa || "la empresa"
            }`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/60 to-slate-950/25" />

        <div className="relative z-10 flex min-h-[460px] flex-col justify-between px-6 py-7 text-white sm:px-8 sm:py-9">
          <div className="flex items-start justify-between gap-4">
            <p className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur">
              ComerSys PRO
            </p>

            <button
              type="button"
              disabled={cargando}
              onClick={onActualizar}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={
                  cargando ? "animate-spin" : ""
                }
              >
                ↻
              </span>

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
                    alt={`Logo de ${
                      nombreEmpresa || "la empresa"
                    }`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-5xl font-black text-white"
                    style={{
                      backgroundColor:
                        colorPrincipal,
                    }}
                  >
                    {nombreEmpresa
                      ?.charAt(0)
                      .toUpperCase() || "🏪"}
                  </div>
                )}
              </div>

              <div className="max-w-3xl">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/70">
                  Panel principal
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                  {nombreEmpresa || "Mi negocio"}
                </h1>

                {rubroEmpresa && (
                  <p className="mt-3 text-lg font-bold text-white/90">
                    {rubroEmpresa}
                  </p>
                )}

                {descripcionEmpresa && (
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
                    {descripcionEmpresa}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-black ${
                      estadoNegocio.abierto
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  >
                    {estadoNegocio.abierto
                      ? "🟢 Abierto ahora"
                      : "🔴 Cerrado"}
                  </span>

                  {estadoNegocio.detalle && (
                    <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                      {estadoNegocio.detalle}
                    </span>
                  )}

                  <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white/90 backdrop-blur">
                    {fecha}
                  </span>
                </div>
              </div>
            </div>

            {ubicacion && (
              <p className="mt-6 text-sm font-semibold text-white/75">
                📍 {ubicacion}
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/admin/perfil"
                className="rounded-2xl bg-white px-5 py-3 font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                ✏️ Editar perfil
              </Link>

              {slugEmpresa && (
                <Link
                  href={`/catalogo/${slugEmpresa}`}
                  target="_blank"
                  className="rounded-2xl px-5 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-95"
                  style={{
                    backgroundColor:
                      colorPrincipal,
                  }}
                >
                  👁️ Ver catálogo público
                </Link>
              )}

              {enlaceWhatsApp && (
                <a
                  href={enlaceWhatsApp}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-green-600 px-5 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-700"
                >
                  💬 WhatsApp
                </a>
              )}

              {enlaceComoLlegar && (
                <a
                  href={enlaceComoLlegar}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/35 bg-white/10 px-5 py-3 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  🗺️ Cómo llegar
                </a>
              )}

              {slugEmpresa && (
                <button
                  type="button"
                  onClick={copiarEnlaceCatalogo}
                  className="rounded-2xl border border-white/35 bg-white/10 px-5 py-3 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  🔗 Copiar enlace
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 text-sm sm:grid-cols-3 sm:px-8">
        <EstadoRapido
          icono="📊"
          titulo="Panel general"
          detalle="Ventas, stock y actividad del negocio."
        />

        <EstadoRapido
          icono="🛍️"
          titulo="Catálogo conectado"
          detalle="Los cambios se reflejan automáticamente."
        />

        <EstadoRapido
          icono="⚙️"
          titulo="Gestión centralizada"
          detalle="Editá una vez y actualizá todo ComerSys."
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
      <span className="text-2xl">{icono}</span>

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
    const desde = convertirHoraAMinutos(
      turno.desde
    );
    const hasta = convertirHoraAMinutos(
      turno.hasta
    );

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