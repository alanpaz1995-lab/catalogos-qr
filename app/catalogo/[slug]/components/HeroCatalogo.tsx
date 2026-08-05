"use client";

import { Empresa } from "@/types/empresa";

type TurnoHorario = {
  desde: string;
  hasta: string;
};

type HorarioDia = {
  activo: boolean;
  turnos: TurnoHorario[];
};

type HorariosSemana = Record<string, HorarioDia>;

export default function HeroCatalogo({
  empresa,
}: {
  empresa: Empresa;
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
    const datos = {
      title: empresa.nombre,
      text: `Conocé el catálogo de ${empresa.nombre}`,
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(datos);
      return;
    }

    await navigator.clipboard.writeText(
      window.location.href
    );

    window.alert(
      "El enlace del catálogo fue copiado."
    );
  }

  return (
    <header className="bg-white">
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

function calcularEstadoNegocio(
  horariosValor: Empresa["horarios_semana"]
) {
  if (!horariosValor) {
    return {
      abierto: false,
      detalle: "Horario no informado",
    };
  }

  let horarios: HorariosSemana;

  try {
    horarios =
      typeof horariosValor === "string"
        ? JSON.parse(horariosValor)
        : (horariosValor as unknown as HorariosSemana);
  } catch {
    return {
      abierto: false,
      detalle: "Horario no disponible",
    };
  }

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
  const diaActual = dias[ahora.getDay()];
  const horarioDia = horarios[diaActual];

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
    ahora.getHours() * 60 + ahora.getMinutes();

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

  for (let desplazamiento = 1; desplazamiento <= 7; desplazamiento++) {
    const indice =
      (fechaActual.getDay() + desplazamiento) %
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