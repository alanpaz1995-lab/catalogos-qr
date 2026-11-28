"use client";

import { Empresa } from "@/types/empresa";

type TurnoHorario = {
  desde: string;
  hasta: string;
};

type HorarioDia = {
  activo: boolean;
  abierto24Horas?: boolean;
  turnos: TurnoHorario[];
};

type HorariosSemana = Record<string, HorarioDia>;

const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export default function HeroCatalogo({
  empresa,
  modoOscuro = false,
}: {
  empresa: Empresa;
  modoOscuro?: boolean;
}) {
  const colorPrincipal =
    empresa.color_principal || "#2563EB";
  const colorSecundario =
    empresa.color_secundario || "#F97316";

  const enlaceWhatsApp = empresa.whatsapp
    ? `https://wa.me/${empresa.whatsapp.replace(
        /\D/g,
        ""
      )}`
    : "";

  const enlaceComoLlegar =
    empresa.latitud && empresa.longitud
      ? `https://www.google.com/maps?q=${encodeURIComponent(
          `${empresa.latitud},${empresa.longitud}`
        )}`
      : empresa.direccion
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [
              empresa.direccion,
              empresa.ciudad,
              empresa.provincia,
            ]
              .filter(Boolean)
              .join(", ")
          )}`
        : "";

  const estadoNegocio = calcularEstadoNegocio(
    empresa.horarios_semana
  );

  async function compartirCatalogo() {
    // El enlace compartido siempre apunta al catálogo público, sin parámetros
    // de vista administrativa ni preferencias visuales del administrador.
    const enlacePublico = `${window.location.origin}${window.location.pathname}`;
    const datos = {
      title: empresa.nombre,
      text: `Conocé el catálogo de ${empresa.nombre}`,
      url: enlacePublico,
    };

    if (navigator.share) {
      await navigator.share(datos);
      return;
    }

    await navigator.clipboard.writeText(enlacePublico);

    window.alert(
      "El enlace del catálogo fue copiado."
    );
  }

  return (
    <header className={modoOscuro ? "bg-black" : "bg-white"}>
      <div
        className="relative min-h-[520px] overflow-hidden"
        style={{
          background: `linear-gradient(120deg, ${colorPrincipal}, ${colorSecundario})`,
        }}
      >
        {empresa.portada && (
          <img
            src={empresa.portada}
            alt={`Portada de ${empresa.nombre}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/60 to-slate-950/25" />

        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-7xl items-end px-6 pb-12 pt-24">
          <div className="w-full">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl sm:h-40 sm:w-40">
                {empresa.logo ? (
                  <img
                    src={empresa.logo}
                    alt={`Logo de ${empresa.nombre}`}
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
                    {empresa.nombre
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="max-w-3xl text-white">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/75">
                  Catálogo oficial
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                  {empresa.nombre}
                </h1>

                {empresa.rubro && (
                  <p className="mt-3 text-lg font-bold text-white/90">
                    {empresa.rubro}
                  </p>
                )}

                {empresa.descripcion && (
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                    {empresa.descripcion}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-black ${
                      estadoNegocio.abierto
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
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
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
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
                  className="rounded-2xl bg-white px-5 py-3 font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  🗺️ Cómo llegar
                </a>
              )}

              <button
                type="button"
                onClick={compartirCatalogo}
                className="rounded-2xl border border-white/40 bg-white/10 px-5 py-3 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                🔗 Compartir
              </button>
            </div>

            {(empresa.direccion ||
              empresa.ciudad ||
              empresa.provincia) && (
              <p className="mt-6 text-sm font-semibold text-white/75">
                📍{" "}
                {[
                  empresa.direccion,
                  empresa.ciudad,
                  empresa.provincia,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function convertirHoraAMinutos(hora: string): number {
  if (typeof hora !== "string" || !/^(?:[01]?\d|2[0-4]):[0-5]\d$/.test(hora.trim())) {
    return Number.NaN;
  }
  const [horas, minutos] = hora.trim().split(":").map(Number);
  if (horas === 24 && minutos !== 0) return Number.NaN;
  return horas * 60 + minutos;
}

function turnoCubreDiaCompleto(turno: TurnoHorario): boolean {
  const desde = convertirHoraAMinutos(turno.desde);
  const hasta = convertirHoraAMinutos(turno.hasta);
  // Algunas pantallas guardan 24 horas como 00:00–00:00,
  // otras como 00:00–23:59 o 00:00–24:00.
  return desde === 0 && (hasta === 0 || hasta === 1439 || hasta === 1440);
}

function diaAbiertoTodoElDia(dia: HorarioDia | undefined): boolean {
  return Boolean(dia?.activo && (dia.abierto24Horas === true ||
    (Array.isArray(dia.turnos) && dia.turnos.some(turnoCubreDiaCompleto))));
}

function calcularEstadoNegocio(
  horariosValor: Empresa["horarios_semana"]
): { abierto: boolean; detalle: string } {
  if (!horariosValor) {
    return { abierto: false, detalle: "Horario no informado" };
  }

  let horarios: HorariosSemana;
  try {
    horarios = typeof horariosValor === "string"
      ? JSON.parse(horariosValor)
      : (horariosValor as unknown as HorariosSemana);
  } catch {
    return { abierto: false, detalle: "Horario no disponible" };
  }

  if (!horarios || typeof horarios !== "object") {
    return { abierto: false, detalle: "Horario no disponible" };
  }

  // Los siete días configurados como jornada completa: abierto siempre,
  // sin mensaje de hora de cierre.
  if (DIAS_SEMANA.every((dia) => diaAbiertoTodoElDia(horarios[dia]))) {
    return { abierto: true, detalle: "" };
  }

  const ahora = new Date();
  const indiceActual = ahora.getDay();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const horarioDia = horarios[DIAS_SEMANA[indiceActual]];
  const horarioAyer = horarios[DIAS_SEMANA[(indiceActual + 6) % 7]];

  if (diaAbiertoTodoElDia(horarioDia)) {
    return { abierto: true, detalle: "" };
  }

  // Un turno nocturno puede seguir abierto después de medianoche.
  if (horarioAyer?.activo && !diaAbiertoTodoElDia(horarioAyer) && Array.isArray(horarioAyer.turnos)) {
    for (const turno of horarioAyer.turnos) {
      const desde = convertirHoraAMinutos(turno.desde);
      const hasta = convertirHoraAMinutos(turno.hasta);
      if (Number.isFinite(desde) && Number.isFinite(hasta) &&
          hasta < desde && minutosAhora < hasta && !turnoCubreDiaCompleto(turno)) {
        return { abierto: true, detalle: `Cierra a las ${turno.hasta}` };
      }
    }
  }

  if (horarioDia?.activo && Array.isArray(horarioDia.turnos)) {
    for (const turno of horarioDia.turnos) {
      const desde = convertirHoraAMinutos(turno.desde);
      const hasta = convertirHoraAMinutos(turno.hasta);
      if (!Number.isFinite(desde) || !Number.isFinite(hasta)) continue;

      if (desde < hasta && minutosAhora >= desde && minutosAhora < hasta) {
        return { abierto: true, detalle: `Cierra a las ${turno.hasta}` };
      }
      if (desde > hasta && minutosAhora >= desde) {
        return { abierto: true, detalle: `Cierra a las ${turno.hasta}` };
      }
    }
  }

  return { abierto: false, detalle: buscarProximaApertura(horarios, ahora) };
}

function buscarProximaApertura(
  horarios: HorariosSemana,
  fechaActual: Date
) {
  const etiquetas = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  for (let desplazamiento = 1; desplazamiento <= 7; desplazamiento++) {
    const indice = (fechaActual.getDay() + desplazamiento) % 7;
    const dia = horarios[DIAS_SEMANA[indice]];
    if (diaAbiertoTodoElDia(dia)) {
      return `Abre ${etiquetas[indice]} (24 horas)`;
    }
    const primerTurno = dia?.turnos?.[0];

    if (dia?.activo && primerTurno?.desde) {
      return `Abre ${etiquetas[indice]} a las ${primerTurno.desde}`;
    }
  }

  return "Horario no informado";
}
