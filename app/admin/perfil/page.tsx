"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

const BUCKET_EMPRESAS = "empresas";

type TurnoHorario = {
  desde: string;
  hasta: string;
};

type HorarioDia = {
  activo: boolean;
  turnos: TurnoHorario[];
};

type DiaSemana =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

type HorariosSemana = Record<DiaSemana, HorarioDia>;

type PerfilEmpresa = {
  nombre: string;
  descripcion: string;
  rubro: string;
  logo: string;
  portada: string;
  whatsapp: string;
  email: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  pais: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  sitio_web: string;
  horario: string;
  horarios_semana: HorariosSemana;
  latitud: string;
  longitud: string;
  medios_pago: string;
  realiza_envios: boolean;
  color_principal: string;
  color_secundario: string;
};

const horariosSemanaIniciales: HorariosSemana = {
  lunes: {
    activo: true,
    turnos: [
      { desde: "09:00", hasta: "13:00" },
      { desde: "16:00", hasta: "20:00" },
    ],
  },
  martes: {
    activo: true,
    turnos: [
      { desde: "09:00", hasta: "13:00" },
      { desde: "16:00", hasta: "20:00" },
    ],
  },
  miercoles: {
    activo: true,
    turnos: [
      { desde: "09:00", hasta: "13:00" },
      { desde: "16:00", hasta: "20:00" },
    ],
  },
  jueves: {
    activo: true,
    turnos: [
      { desde: "09:00", hasta: "13:00" },
      { desde: "16:00", hasta: "20:00" },
    ],
  },
  viernes: {
    activo: true,
    turnos: [
      { desde: "09:00", hasta: "13:00" },
      { desde: "16:00", hasta: "20:00" },
    ],
  },
  sabado: {
    activo: true,
    turnos: [{ desde: "09:00", hasta: "13:00" }],
  },
  domingo: {
    activo: false,
    turnos: [],
  },
};

const diasSemana: {
  clave: DiaSemana;
  etiqueta: string;
}[] = [
  { clave: "lunes", etiqueta: "Lunes" },
  { clave: "martes", etiqueta: "Martes" },
  { clave: "miercoles", etiqueta: "Miércoles" },
  { clave: "jueves", etiqueta: "Jueves" },
  { clave: "viernes", etiqueta: "Viernes" },
  { clave: "sabado", etiqueta: "Sábado" },
  { clave: "domingo", etiqueta: "Domingo" },
];

const perfilInicial: PerfilEmpresa = {
  nombre: "",
  descripcion: "",
  rubro: "",
  logo: "",
  portada: "",
  whatsapp: "",
  email: "",
  direccion: "",
  ciudad: "",
  provincia: "",
  pais: "Argentina",
  instagram: "",
  facebook: "",
  tiktok: "",
  sitio_web: "",
  horario: "",
  horarios_semana: horariosSemanaIniciales,
  latitud: "",
  longitud: "",
  medios_pago: "",
  realiza_envios: false,
  color_principal: "#2563EB",
  color_secundario: "#F97316",
};

export default function PerfilEmpresaPage() {
  const [perfil, setPerfil] =
    useState<PerfilEmpresa>(perfilInicial);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] =
    useState(false);
  const [subiendoPortada, setSubiendoPortada] =
    useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [empresaId, setEmpresaId] =
    useState<number | null>(null);

  useEffect(() => {
    cargarPerfil();
  }, []);

  async function cargarPerfil() {
    setCargando(true);
    setError("");

    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) {
        throw errorUsuario;
      }

      if (!user) {
        throw new Error(
          "Tu sesión no está activa. Iniciá sesión nuevamente para editar el perfil."
        );
      }

      const { data, error: errorConsulta } =
        await supabase
          .from("empresas")
          .select("*")
          .eq("auth_user_id", user.id)
          .maybeSingle();

      if (errorConsulta) {
        throw errorConsulta;
      }

      if (!data) {
        throw new Error(
          "No encontramos una empresa asociada a tu cuenta."
        );
      }

      setEmpresaId(data.id);

      setPerfil({
        nombre: data.nombre ?? "",
        descripcion: data.descripcion ?? "",
        rubro: data.rubro ?? "",
        logo: data.logo ?? "",
        portada: data.portada ?? "",
        whatsapp: data.whatsapp ?? "",
        email: data.email ?? "",
        direccion: data.direccion ?? "",
        ciudad: data.ciudad ?? "",
        provincia: data.provincia ?? "",
        pais: data.pais ?? "Argentina",
        instagram: data.instagram ?? "",
        facebook: data.facebook ?? "",
        tiktok: data.tiktok ?? "",
        sitio_web: data.sitio_web ?? "",
        horario: data.horario ?? "",
        horarios_semana: normalizarHorariosSemana(
          data.horarios_semana
        ),
        latitud:
          data.latitud !== null &&
          data.latitud !== undefined
            ? String(data.latitud)
            : "",
        longitud:
          data.longitud !== null &&
          data.longitud !== undefined
            ? String(data.longitud)
            : "",
        medios_pago: data.medios_pago ?? "",
        realiza_envios:
          data.realiza_envios ?? false,
        color_principal:
          data.color_principal ?? "#2563EB",
        color_secundario:
          data.color_secundario ?? "#F97316",
      });
    } catch (errorDesconocido) {
      console.error(
        "Error al cargar la empresa:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo cargar el perfil."
      );
    } finally {
      setCargando(false);
    }
  }

  function actualizarCampo<
    Campo extends keyof PerfilEmpresa
  >(
    campo: Campo,
    valor: PerfilEmpresa[Campo]
  ) {
    setPerfil((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function guardarPerfil(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!perfil.nombre.trim()) {
      setError(
        "Ingresá el nombre comercial de la empresa."
      );
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const latitud =
      perfil.latitud.trim() === ""
        ? null
        : Number(perfil.latitud);

    const longitud =
      perfil.longitud.trim() === ""
        ? null
        : Number(perfil.longitud);

    if (
      latitud !== null &&
      Number.isNaN(latitud)
    ) {
      setError("La latitud no es válida.");
      setGuardando(false);
      return;
    }

    if (
      longitud !== null &&
      Number.isNaN(longitud)
    ) {
      setError("La longitud no es válida.");
      setGuardando(false);
      return;
    }

    try {
      if (!empresaId) {
        throw new Error(
          "No encontramos la empresa asociada a tu cuenta."
        );
      }

      const { error: errorActualizacion } =
        await supabase
          .from("empresas")
          .update({
            nombre: perfil.nombre.trim(),
            descripcion:
              perfil.descripcion.trim() || null,
            rubro: perfil.rubro.trim() || null,
            logo: perfil.logo || null,
            portada: perfil.portada || null,
            whatsapp:
              perfil.whatsapp.trim() || null,
            email: perfil.email.trim() || null,
            direccion:
              perfil.direccion.trim() || null,
            ciudad: perfil.ciudad.trim() || null,
            provincia:
              perfil.provincia.trim() || null,
            pais: perfil.pais.trim() || null,
            instagram:
              perfil.instagram.trim() || null,
            facebook:
              perfil.facebook.trim() || null,
            tiktok: perfil.tiktok.trim() || null,
            sitio_web:
              perfil.sitio_web.trim() || null,
            horario:
              formatearHorarios(perfil.horarios_semana) ||
              null,
            horarios_semana: perfil.horarios_semana,
            latitud,
            longitud,
            medios_pago:
              perfil.medios_pago.trim() || null,
            realiza_envios:
              perfil.realiza_envios,
            color_principal:
              perfil.color_principal,
            color_secundario:
              perfil.color_secundario,
            updated_at: new Date().toISOString(),
          })
          .eq("id", empresaId);

      if (errorActualizacion) {
        throw errorActualizacion;
      }

      setMensaje(
        "El perfil de la empresa se guardó correctamente."
      );
    } catch (errorDesconocido) {
      console.error(
        "Error al guardar el perfil:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo guardar el perfil."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function seleccionarImagen(
    event: ChangeEvent<HTMLInputElement>,
    tipo: "logo" | "portada"
  ) {
    const archivo = event.target.files?.[0];

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setError(
        "Seleccioná un archivo de imagen válido."
      );
      event.target.value = "";
      return;
    }

    const limiteBytes = 5 * 1024 * 1024;

    if (archivo.size > limiteBytes) {
      setError(
        "La imagen no puede superar los 5 MB."
      );
      event.target.value = "";
      return;
    }

    if (tipo === "logo") {
      setSubiendoLogo(true);
    } else {
      setSubiendoPortada(true);
    }

    setError("");
    setMensaje("");

    try {
      if (!empresaId) {
        throw new Error(
          "No encontramos la empresa asociada a tu cuenta."
        );
      }

      const extension =
        archivo.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const ruta =
        `empresa-${empresaId}/${tipo}-${Date.now()}.${extension}`;

      const { error: errorSubida } =
        await supabase.storage
          .from(BUCKET_EMPRESAS)
          .upload(ruta, archivo, {
            cacheControl: "3600",
            upsert: true,
          });

      if (errorSubida) {
        throw errorSubida;
      }

      const { data } = supabase.storage
        .from(BUCKET_EMPRESAS)
        .getPublicUrl(ruta);

      actualizarCampo(tipo, data.publicUrl);

      const { error: errorGuardado } =
        await supabase
          .from("empresas")
          .update({
            [tipo]: data.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", empresaId);

      if (errorGuardado) {
        throw errorGuardado;
      }

      setMensaje(
        tipo === "logo"
          ? "El logo se actualizó correctamente."
          : "La portada se actualizó correctamente."
      );
    } catch (errorDesconocido) {
      console.error(
        "Error al subir la imagen:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo subir la imagen."
      );
    } finally {
      setSubiendoLogo(false);
      setSubiendoPortada(false);
      event.target.value = "";
    }
  }

  const enlaceComoLlegar =
    perfil.latitud && perfil.longitud
      ? `https://www.google.com/maps?q=${encodeURIComponent(
          `${perfil.latitud},${perfil.longitud}`
        )}`
      : perfil.direccion
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [
              perfil.direccion,
              perfil.ciudad,
              perfil.provincia,
              perfil.pais,
            ]
              .filter(Boolean)
              .join(", ")
          )}`
        : "";

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p className="mt-4 font-semibold text-slate-500">
            Cargando perfil de empresa...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2563EB]">
            Configuración
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Perfil de la empresa
          </h1>

          <p className="mt-3 max-w-3xl text-slate-500">
            Personalizá la identidad pública de tu
            negocio, la información de contacto y la
            ubicación que verán tus clientes.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-700">
            ✓ {mensaje}
          </div>
        )}

        <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_390px]">
          <form
            onSubmit={guardarPerfil}
            className="space-y-7"
          >
            <SeccionFormulario
              titulo="Identidad visual"
              descripcion="Cargá el logo y la portada que representarán a tu negocio."
            >
              <div className="grid gap-6 md:grid-cols-2">
                <SelectorImagen
                  titulo="Foto de perfil o logo"
                  descripcion="Recomendado: imagen cuadrada."
                  imagen={perfil.logo}
                  cargando={subiendoLogo}
                  onChange={(event) =>
                    seleccionarImagen(event, "logo")
                  }
                  tipo="logo"
                />

                <SelectorImagen
                  titulo="Foto de portada"
                  descripcion="Recomendado: imagen horizontal."
                  imagen={perfil.portada}
                  cargando={subiendoPortada}
                  onChange={(event) =>
                    seleccionarImagen(
                      event,
                      "portada"
                    )
                  }
                  tipo="portada"
                />
              </div>
            </SeccionFormulario>

            <SeccionFormulario
              titulo="Información principal"
              descripcion="Estos datos aparecerán en el catálogo y el perfil público."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Campo
                  label="Nombre comercial"
                  value={perfil.nombre}
                  onChange={(valor) =>
                    actualizarCampo("nombre", valor)
                  }
                  placeholder="Ej.: Mates Paz"
                  required
                />

                <Campo
                  label="Rubro"
                  value={perfil.rubro}
                  onChange={(valor) =>
                    actualizarCampo("rubro", valor)
                  }
                  placeholder="Ej.: Mates y accesorios"
                />
              </div>

              <div className="mt-5">
                <label className={clasesLabel}>
                  Descripción de la empresa
                </label>

                <textarea
                  rows={5}
                  value={perfil.descripcion}
                  onChange={(event) =>
                    actualizarCampo(
                      "descripcion",
                      event.target.value
                    )
                  }
                  placeholder="Contá brevemente qué ofrece tu negocio..."
                  className={clasesTextarea}
                />
              </div>
            </SeccionFormulario>

            <SeccionFormulario
              titulo="Contacto"
              descripcion="Información para que los clientes puedan comunicarse."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Campo
                  label="WhatsApp"
                  value={perfil.whatsapp}
                  onChange={(valor) =>
                    actualizarCampo(
                      "whatsapp",
                      valor
                    )
                  }
                  placeholder="Ej.: 5491123456789"
                />

                <Campo
                  label="Email"
                  type="email"
                  value={perfil.email}
                  onChange={(valor) =>
                    actualizarCampo("email", valor)
                  }
                  placeholder="contacto@empresa.com"
                />

                <Campo
                  label="Sitio web"
                  value={perfil.sitio_web}
                  onChange={(valor) =>
                    actualizarCampo(
                      "sitio_web",
                      valor
                    )
                  }
                  placeholder="https://..."
                />

                <div className="md:col-span-2">
                  <EditorHorarios
                    value={perfil.horarios_semana}
                    onChange={(horarios) => {
                      actualizarCampo(
                        "horarios_semana",
                        horarios
                      );
                      actualizarCampo(
                        "horario",
                        formatearHorarios(horarios)
                      );
                    }}
                  />
                </div>
              </div>
            </SeccionFormulario>

            <SeccionFormulario
              titulo="Ubicación"
              descripcion="La dirección permitirá mostrar el botón Cómo llegar."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Campo
                    label="Dirección"
                    value={perfil.direccion}
                    onChange={(valor) =>
                      actualizarCampo(
                        "direccion",
                        valor
                      )
                    }
                    placeholder="Calle, número y localidad"
                  />
                </div>

                <Campo
                  label="Ciudad"
                  value={perfil.ciudad}
                  onChange={(valor) =>
                    actualizarCampo("ciudad", valor)
                  }
                  placeholder="Ciudad"
                />

                <Campo
                  label="Provincia"
                  value={perfil.provincia}
                  onChange={(valor) =>
                    actualizarCampo(
                      "provincia",
                      valor
                    )
                  }
                  placeholder="Provincia"
                />

                <Campo
                  label="País"
                  value={perfil.pais}
                  onChange={(valor) =>
                    actualizarCampo("pais", valor)
                  }
                  placeholder="Argentina"
                />

                <div />

                <Campo
                  label="Latitud"
                  type="number"
                  step="any"
                  value={perfil.latitud}
                  onChange={(valor) =>
                    actualizarCampo(
                      "latitud",
                      valor
                    )
                  }
                  placeholder="-34.6037"
                />

                <Campo
                  label="Longitud"
                  type="number"
                  step="any"
                  value={perfil.longitud}
                  onChange={(valor) =>
                    actualizarCampo(
                      "longitud",
                      valor
                    )
                  }
                  placeholder="-58.3816"
                />
              </div>

              {enlaceComoLlegar && (
                <a
                  href={enlaceComoLlegar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex rounded-xl border-2 border-[#2563EB] px-5 py-3 font-black text-[#2563EB] transition hover:bg-blue-50"
                >
                  🗺️ Probar “Cómo llegar”
                </a>
              )}
            </SeccionFormulario>

            <SeccionFormulario
              titulo="Redes sociales"
              descripcion="Agregá los enlaces públicos de tu negocio."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Campo
                  label="Instagram"
                  value={perfil.instagram}
                  onChange={(valor) =>
                    actualizarCampo(
                      "instagram",
                      valor
                    )
                  }
                  placeholder="https://instagram.com/..."
                />

                <Campo
                  label="Facebook"
                  value={perfil.facebook}
                  onChange={(valor) =>
                    actualizarCampo(
                      "facebook",
                      valor
                    )
                  }
                  placeholder="https://facebook.com/..."
                />

                <Campo
                  label="TikTok"
                  value={perfil.tiktok}
                  onChange={(valor) =>
                    actualizarCampo("tiktok", valor)
                  }
                  placeholder="https://tiktok.com/@..."
                />
              </div>
            </SeccionFormulario>

            <SeccionFormulario
              titulo="Opciones comerciales"
              descripcion="Configurá información adicional para tus clientes."
            >
              <div>
                <label className={clasesLabel}>
                  Medios de pago aceptados
                </label>

                <textarea
                  rows={3}
                  value={perfil.medios_pago}
                  onChange={(event) =>
                    actualizarCampo(
                      "medios_pago",
                      event.target.value
                    )
                  }
                  placeholder="Efectivo, transferencia, tarjetas..."
                  className={clasesTextarea}
                />
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={perfil.realiza_envios}
                  onChange={(event) =>
                    actualizarCampo(
                      "realiza_envios",
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 accent-[#2563EB]"
                />

                <span className="font-bold">
                  La empresa realiza envíos
                </span>
              </label>
            </SeccionFormulario>

            <SeccionFormulario
              titulo="Colores del catálogo"
              descripcion="Elegí los colores que identificarán a tu empresa."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectorColor
                  label="Color principal"
                  value={perfil.color_principal}
                  onChange={(valor) =>
                    actualizarCampo(
                      "color_principal",
                      valor
                    )
                  }
                />

                <SelectorColor
                  label="Color secundario"
                  value={perfil.color_secundario}
                  onChange={(valor) =>
                    actualizarCampo(
                      "color_secundario",
                      valor
                    )
                  }
                />
              </div>
            </SeccionFormulario>

            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-2xl bg-[#2563EB] px-7 py-4 text-lg font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {guardando
                ? "Guardando perfil..."
                : "Guardar cambios"}
            </button>
          </form>

          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <VistaPrevia
              perfil={perfil}
              enlaceComoLlegar={enlaceComoLlegar}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function SeccionFormulario({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-black">
        {titulo}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={clasesLabel}>
        {label}
      </label>

      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        className={clasesInput}
      />
    </div>
  );
}

function EditorHorarios({
  value,
  onChange,
}: {
  value: HorariosSemana;
  onChange: (horarios: HorariosSemana) => void;
}) {
  function actualizarDia(
    dia: DiaSemana,
    cambios: Partial<HorarioDia>
  ) {
    onChange({
      ...value,
      [dia]: {
        ...value[dia],
        ...cambios,
      },
    });
  }

  function actualizarTurno(
    dia: DiaSemana,
    indice: number,
    campo: keyof TurnoHorario,
    valor: string
  ) {
    const turnos = value[dia].turnos.map(
      (turno, indiceActual) =>
        indiceActual === indice
          ? { ...turno, [campo]: valor }
          : turno
    );

    actualizarDia(dia, { turnos });
  }

  function agregarTurno(dia: DiaSemana) {
    if (value[dia].turnos.length >= 2) return;

    actualizarDia(dia, {
      activo: true,
      turnos: [
        ...value[dia].turnos,
        { desde: "09:00", hasta: "13:00" },
      ],
    });
  }

  function eliminarTurno(
    dia: DiaSemana,
    indice: number
  ) {
    actualizarDia(dia, {
      turnos: value[dia].turnos.filter(
        (_, indiceActual) =>
          indiceActual !== indice
      ),
    });
  }

  function cambiarActivo(
    dia: DiaSemana,
    activo: boolean
  ) {
    actualizarDia(dia, {
      activo,
      turnos:
        activo && value[dia].turnos.length === 0
          ? [{ desde: "09:00", hasta: "13:00" }]
          : value[dia].turnos,
    });
  }

  return (
    <div>
      <div className="mb-4">
        <p className={clasesLabel}>
          Horarios de atención
        </p>

        <p className="text-sm leading-6 text-slate-500">
          Activá los días de atención y cargá hasta
          dos turnos por día.
        </p>
      </div>

      <div className="space-y-4">
        {diasSemana.map(({ clave, etiqueta }) => {
          const horarioDia = value[clave];

          return (
            <div
              key={clave}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={horarioDia.activo}
                    onChange={(event) =>
                      cambiarActivo(
                        clave,
                        event.target.checked
                      )
                    }
                    className="h-5 w-5 accent-[#2563EB]"
                  />

                  <span className="font-black text-slate-800">
                    {etiqueta}
                  </span>
                </label>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    horarioDia.activo
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {horarioDia.activo
                    ? "Abierto"
                    : "Cerrado"}
                </span>
              </div>

              {horarioDia.activo && (
                <div className="mt-4 space-y-3">
                  {horarioDia.turnos.map(
                    (turno, indice) => (
                      <div
                        key={`${clave}-${indice}`}
                        className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"
                      >
                        <input
                          type="time"
                          value={turno.desde}
                          onChange={(event) =>
                            actualizarTurno(
                              clave,
                              indice,
                              "desde",
                              event.target.value
                            )
                          }
                          className={clasesInput}
                          aria-label={`${etiqueta}, hora de apertura`}
                        />

                        <span className="text-center text-sm font-bold text-slate-500">
                          a
                        </span>

                        <input
                          type="time"
                          value={turno.hasta}
                          onChange={(event) =>
                            actualizarTurno(
                              clave,
                              indice,
                              "hasta",
                              event.target.value
                            )
                          }
                          className={clasesInput}
                          aria-label={`${etiqueta}, hora de cierre`}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            eliminarTurno(
                              clave,
                              indice
                            )
                          }
                          className="rounded-xl border border-red-200 px-3 py-3 text-sm font-black text-red-600 transition hover:bg-red-50"
                          aria-label={`Eliminar turno de ${etiqueta}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    )
                  )}

                  {horarioDia.turnos.length < 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        agregarTurno(clave)
                      }
                      className="rounded-xl border-2 border-dashed border-[#2563EB] px-4 py-3 text-sm font-black text-[#2563EB] transition hover:bg-blue-50"
                    >
                      + Agregar segundo turno
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizarHorariosSemana(
  valor: unknown
): HorariosSemana {
  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    return structuredClone(horariosSemanaIniciales);
  }

  const horarios = valor as Partial<HorariosSemana>;
  const resultado =
    structuredClone(horariosSemanaIniciales);

  for (const { clave } of diasSemana) {
    const dia = horarios[clave];

    if (!dia || typeof dia !== "object") continue;

    resultado[clave] = {
      activo:
        typeof dia.activo === "boolean"
          ? dia.activo
          : resultado[clave].activo,
      turnos: Array.isArray(dia.turnos)
        ? dia.turnos
            .filter(
              (turno): turno is TurnoHorario =>
                Boolean(
                  turno &&
                    typeof turno.desde === "string" &&
                    typeof turno.hasta === "string"
                )
            )
            .slice(0, 2)
        : resultado[clave].turnos,
    };
  }

  return resultado;
}

function formatearHorarios(
  horarios: HorariosSemana
) {
  return diasSemana
    .map(({ clave, etiqueta }) => {
      const dia = horarios[clave];

      if (!dia.activo) {
        return `${etiqueta}: Cerrado`;
      }

      const turnosValidos = dia.turnos.filter(
        (turno) => turno.desde && turno.hasta
      );

      if (turnosValidos.length === 0) {
        return `${etiqueta}: Horario no informado`;
      }

      return `${etiqueta}: ${turnosValidos
        .map(
          (turno) =>
            `${turno.desde} a ${turno.hasta}`
        )
        .join(" / ")}`;
    })
    .join("\n");
}

function SelectorImagen({
  titulo,
  descripcion,
  imagen,
  cargando,
  onChange,
  tipo,
}: {
  titulo: string;
  descripcion: string;
  imagen: string;
  cargando: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  tipo: "logo" | "portada";
}) {
  return (
    <div>
      <p className={clasesLabel}>{titulo}</p>

      <div
        className={`relative mt-2 overflow-hidden border border-slate-200 bg-slate-100 ${
          tipo === "logo"
            ? "aspect-square max-w-56 rounded-3xl"
            : "aspect-[16/8] rounded-3xl"
        }`}
      >
        {imagen ? (
          <img
            src={imagen}
            alt={titulo}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm font-semibold text-slate-400">
            {tipo === "logo"
              ? "Sin logo"
              : "Sin portada"}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {descripcion}
      </p>

      <label className="mt-4 inline-flex cursor-pointer rounded-xl border-2 border-[#2563EB] px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-blue-50">
        {cargando
          ? "Subiendo imagen..."
          : "Seleccionar imagen"}

        <input
          type="file"
          accept="image/*"
          disabled={cargando}
          onChange={onChange}
          className="hidden"
        />
      </label>
    </div>
  );
}

function SelectorColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <label className={clasesLabel}>
        {label}
      </label>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-14 w-16 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
        />

        <input
          type="text"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={clasesInput}
        />
      </div>
    </div>
  );
}

function VistaPrevia({
  perfil,
  enlaceComoLlegar,
}: {
  perfil: PerfilEmpresa;
  enlaceComoLlegar: string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div
        className="relative h-44 bg-slate-200"
        style={{
          backgroundColor:
            perfil.color_principal,
        }}
      >
        {perfil.portada && (
          <img
            src={perfil.portada}
            alt="Portada de la empresa"
            className="h-full w-full object-cover"
          />
        )}

        <div className="absolute -bottom-12 left-6 h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-lg">
          {perfil.logo ? (
            <img
              src={perfil.logo}
              alt="Logo de la empresa"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">
              🏪
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-7 pt-16">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Vista previa
        </p>

        <h2 className="mt-2 text-2xl font-black">
          {perfil.nombre || "Nombre del negocio"}
        </h2>

        <p
          className="mt-1 text-sm font-bold"
          style={{
            color: perfil.color_principal,
          }}
        >
          {perfil.rubro || "Rubro comercial"}
        </p>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          {perfil.descripcion ||
            "La descripción de la empresa aparecerá en este lugar."}
        </p>

        <div className="mt-6 grid gap-3">
          {perfil.whatsapp && (
            <a
              href={`https://wa.me/${perfil.whatsapp.replace(
                /\D/g,
                ""
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-green-600 px-5 py-3 text-center font-black text-white"
            >
              💬 WhatsApp
            </a>
          )}

          {enlaceComoLlegar && (
            <a
              href={enlaceComoLlegar}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl px-5 py-3 text-center font-black text-white"
              style={{
                backgroundColor:
                  perfil.color_principal,
              }}
            >
              🗺️ Cómo llegar
            </a>
          )}
        </div>

        <div className="mt-6 space-y-2 text-sm text-slate-500">
          {formatearHorarios(perfil.horarios_semana) && (
            <p className="whitespace-pre-line">
              🕒{" "}
              {formatearHorarios(
                perfil.horarios_semana
              )}
            </p>
          )}

          {perfil.direccion && (
            <p>📍 {perfil.direccion}</p>
          )}

          {perfil.realiza_envios && (
            <p>🚚 Realiza envíos</p>
          )}
        </div>
      </div>
    </section>
  );
}

const clasesLabel =
  "mb-2 block text-sm font-black text-slate-700";

const clasesInput =
  "w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";

const clasesTextarea =
  "w-full resize-none rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";