"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { EmpresaProvider } from "@/lib/empresa/EmpresaProvider";
import { supabase } from "@/lib/supabase";

type EmpresaAcceso = {
  id: number;
  nombre: string;
  plan: string;
  estado_suscripcion: string;
  prueba_fin?: string | null;
  suscripcion_activa: boolean;
};

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [cargando, setCargando] = useState(true);
  const [empresa, setEmpresa] = useState<EmpresaAcceso | null>(null);
  const [error, setError] = useState("");
  const [activandoPlan, setActivandoPlan] = useState(false);
  const [errorSuscripcion, setErrorSuscripcion] = useState("");
  const [modoOscuro, setModoOscuro] = useState(false);

  const [mostrarCorreoMercadoPago, setMostrarCorreoMercadoPago] =
    useState(false);

  const [correoMercadoPago, setCorreoMercadoPago] = useState("");

  useEffect(() => {
    const aplicarTema = () => {
      const oscuro =
        window.localStorage.getItem("comersys-modo-oscuro") === "true";

      setModoOscuro(oscuro);
    };

    aplicarTema();

    window.addEventListener("storage", aplicarTema);
    window.addEventListener("focus", aplicarTema);

    return () => {
      window.removeEventListener("storage", aplicarTema);
      window.removeEventListener("focus", aplicarTema);
    };
  }, []);

  useEffect(() => {
    async function verificarAcceso() {
      setCargando(true);
      setError("");

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        setError(
          errorUsuario?.message ||
            "Tu sesión no está activa. Iniciá sesión nuevamente."
        );

        setCargando(false);
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select(
          "id, nombre, plan, estado_suscripcion, prueba_fin, suscripcion_activa"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (empresaError || !empresaData) {
        setError(
          empresaError?.message ||
            "No encontramos una empresa asociada a tu cuenta."
        );

        setCargando(false);
        return;
      }

      setEmpresa(empresaData as EmpresaAcceso);
      setCargando(false);
    }

    verificarAcceso();
  }, []);

  const pruebaVigente = (() => {
    if (
      !empresa ||
      empresa.plan !== "prueba" ||
      empresa.suscripcion_activa ||
      !empresa.prueba_fin
    ) {
      return false;
    }

    return new Date(empresa.prueba_fin).getTime() > Date.now();
  })();

  const accesoPermitido =
    Boolean(empresa?.suscripcion_activa) || pruebaVigente;

  const abrirFormularioMercadoPago = () => {
    setErrorSuscripcion("");
    setCorreoMercadoPago("");
    setMostrarCorreoMercadoPago(true);
  };

  const cerrarFormularioMercadoPago = () => {
    if (activandoPlan) return;

    setMostrarCorreoMercadoPago(false);
    setCorreoMercadoPago("");
    setErrorSuscripcion("");
  };

  const activarPlanProfesional = async () => {
    if (!empresa) {
      setErrorSuscripcion(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    const emailMercadoPago = correoMercadoPago.trim().toLowerCase();

    if (!emailMercadoPago) {
      setErrorSuscripcion(
        "Ingresá el correo que utilizás en Mercado Pago."
      );
      return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      emailMercadoPago
    );

    if (!emailValido) {
      setErrorSuscripcion(
        "El correo de Mercado Pago no parece válido."
      );
      return;
    }

    setActivandoPlan(true);
    setErrorSuscripcion("");

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion || !session?.access_token) {
        throw new Error(
          "Tu sesión no está activa. Iniciá sesión nuevamente."
        );
      }

      const respuesta = await fetch(
        "/api/mercadopago/crear-suscripcion",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + session.access_token,
          },
          body: JSON.stringify({
            empresaId: empresa.id,
            email: emailMercadoPago,
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data?.detalle?.message ||
            data?.error ||
            "No se pudo iniciar la suscripción."
        );
      }

      if (!data?.initPoint) {
        throw new Error(
          "Mercado Pago no devolvió el enlace de pago."
        );
      }

      setMostrarCorreoMercadoPago(false);

      window.location.href = data.initPoint;
    } catch (error) {
      setErrorSuscripcion(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar la suscripción."
      );

      setActivandoPlan(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (cargando) {
    return (
      <main
        className={
          modoOscuro
            ? "flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-100"
            : "flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8"
        }
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p
            className={
              modoOscuro
                ? "mt-4 text-slate-400"
                : "mt-4 text-slate-500"
            }
          >
            Verificando acceso...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        className={
          modoOscuro
            ? "flex min-h-screen items-center justify-center bg-slate-950 p-5 sm:p-8"
            : "flex min-h-screen items-center justify-center bg-[#F8FAFC] p-5 sm:p-8"
        }
      >
        <section
          className={
            modoOscuro
              ? "w-full max-w-xl rounded-3xl border border-red-900/60 bg-slate-900 p-8 text-center shadow-lg"
              : "w-full max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-lg"
          }
        >
          <div className="text-4xl">⚠️</div>

          <h1
            className={
              modoOscuro
                ? "mt-4 text-2xl font-black text-white"
                : "mt-4 text-2xl font-black text-slate-900"
            }
          >
            No pudimos verificar tu acceso
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white"
          >
            Volver a iniciar sesión
          </button>
        </section>
      </main>
    );
  }

  if (!accesoPermitido) {
    return (
      <>
        <main
          className={
            modoOscuro
              ? "flex min-h-screen items-center justify-center bg-slate-950 p-5 text-slate-100 sm:p-8"
              : "flex min-h-screen items-center justify-center bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8"
          }
        >
          <section
            className={
              modoOscuro
                ? "w-full max-w-2xl rounded-3xl border border-red-900/60 bg-slate-900 p-7 text-center shadow-xl sm:p-10"
                : "w-full max-w-2xl rounded-3xl border border-red-200 bg-white p-7 text-center shadow-xl sm:p-10"
            }
          >
            <div
              className={
                modoOscuro
                  ? "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/50 text-3xl"
                  : "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl"
              }
            >
              🔒
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-red-600">
              Suscripción requerida
            </p>

            <h1
              className={
                modoOscuro
                  ? "mt-3 text-3xl font-black text-white"
                  : "mt-3 text-3xl font-black text-slate-900"
              }
            >
              Tu acceso a ComerSyS está bloqueado
            </h1>

            <p
              className={
                modoOscuro
                  ? "mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300"
                  : "mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600"
              }
            >
              Tu período de prueba finalizó o tu suscripción no está activa.
              Para continuar usando el panel de administración, activá el
              Plan Profesional.
            </p>

            {empresa?.prueba_fin && empresa.plan === "prueba" && (
              <p
                className={
                  modoOscuro
                    ? "mt-3 text-sm font-semibold text-slate-400"
                    : "mt-3 text-sm font-semibold text-slate-500"
                }
              >
                La prueba terminó el{" "}
                {new Intl.DateTimeFormat("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(empresa.prueba_fin))}
                .
              </p>
            )}

            <div
              className={
                modoOscuro
                  ? "mt-8 rounded-2xl bg-slate-800 p-5"
                  : "mt-8 rounded-2xl bg-slate-50 p-5"
              }
            >
              <p
                className={
                  modoOscuro
                    ? "text-sm text-slate-400"
                    : "text-sm text-slate-500"
                }
              >
                Plan Profesional
              </p>

              <p
                className={
                  modoOscuro
                    ? "mt-1 text-2xl font-black text-white"
                    : "mt-1 text-2xl font-black text-slate-900"
                }
              >
                $17.500 por mes
              </p>
            </div>

            <button
              type="button"
              onClick={abrirFormularioMercadoPago}
              disabled={activandoPlan}
              className="mt-7 w-full rounded-2xl bg-[#2563EB] px-6 py-4 font-black text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Activar Plan Profesional
            </button>

            {errorSuscripcion && (
              <p className="mx-auto mt-4 max-w-lg text-sm font-semibold text-red-600">
                {errorSuscripcion}
              </p>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={cerrarSesion}
                className={
                  modoOscuro
                    ? "text-sm font-bold text-slate-400 underline underline-offset-4 transition hover:text-white"
                    : "text-sm font-bold text-slate-500 underline underline-offset-4 transition hover:text-slate-800"
                }
              >
                Cerrar sesión
              </button>
            </div>

            <p
              className={
                modoOscuro
                  ? "mt-6 text-sm text-slate-400"
                  : "mt-6 text-sm text-slate-500"
              }
            >
              Tus datos permanecen guardados. El acceso se restablecerá
              cuando la suscripción vuelva a estar activa.
            </p>
          </section>
        </main>

        {mostrarCorreoMercadoPago && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !activandoPlan) {
                cerrarFormularioMercadoPago();
              }
            }}
          >
            <div
              className={
                modoOscuro
                  ? "w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl sm:p-8"
                  : "w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
              }
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                💳
              </div>

              <h2 className="mt-5 text-center text-2xl font-black">
                Correo de Mercado Pago
              </h2>

              <p
                className={
                  modoOscuro
                    ? "mt-3 text-center text-sm leading-6 text-slate-300"
                    : "mt-3 text-center text-sm leading-6 text-slate-600"
                }
              >
                Ingresá el correo de la cuenta de{" "}
                <strong>Mercado Pago</strong> que va a realizar el pago de la
                suscripción.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="correoMercadoPago"
                  className={
                    modoOscuro
                      ? "mb-2 block text-sm font-bold text-slate-200"
                      : "mb-2 block text-sm font-bold text-slate-700"
                  }
                >
                  Correo de Mercado Pago
                </label>

                <input
                  id="correoMercadoPago"
                  type="email"
                  value={correoMercadoPago}
                  onChange={(e) => {
                    setCorreoMercadoPago(e.target.value);
                    setErrorSuscripcion("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !activandoPlan) {
                      activarPlanProfesional();
                    }
                  }}
                  placeholder="ejemplo@gmail.com"
                  autoComplete="email"
                  autoFocus
                  disabled={activandoPlan}
                  className={
                    modoOscuro
                      ? "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      : "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  }
                />
              </div>

              <div
                className={
                  modoOscuro
                    ? "mt-4 rounded-2xl bg-slate-800 p-4 text-sm leading-6 text-slate-300"
                    : "mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-slate-600"
                }
              >
                <strong>Importante:</strong> este correo es solamente para
                Mercado Pago. No cambia el correo con el que iniciás sesión
                en ComerSys.
              </div>

              {errorSuscripcion && (
                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-600">
                  {errorSuscripcion}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={cerrarFormularioMercadoPago}
                  disabled={activandoPlan}
                  className={
                    modoOscuro
                      ? "w-full rounded-2xl border border-slate-700 px-5 py-3.5 font-bold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      : "w-full rounded-2xl border border-slate-300 px-5 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={activarPlanProfesional}
                  disabled={activandoPlan}
                  className="w-full rounded-2xl bg-[#2563EB] px-5 py-3.5 font-black text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activandoPlan
                    ? "Abriendo Mercado Pago..."
                    : "Continuar con Mercado Pago"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <EmpresaProvider>
      <div
        data-comersys-theme={modoOscuro ? "dark" : "light"}
        className={modoOscuro ? "comersys-admin-dark" : ""}
      >
        {children}
      </div>
    </EmpresaProvider>
  );
}