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

  const activarPlanProfesional = async () => {
    if (!empresa) {
      setErrorSuscripcion(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    setActivandoPlan(true);
    setErrorSuscripcion("");

    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user?.email) {
        throw new Error(
          "No pudimos obtener el correo de tu cuenta."
        );
      }

      const respuesta = await fetch(
        "/api/mercadopago/crear-suscripcion",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            empresaId: empresa.id,
            email: user.email,
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
        className={`flex min-h-screen items-center justify-center p-8 ${
          modoOscuro
            ? "bg-slate-950 text-slate-100"
            : "bg-[#F8FAFC]"
        }`}
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p
            className={`mt-4 ${
              modoOscuro ? "text-slate-400" : "text-slate-500"
            }`}
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
        className={`flex min-h-screen items-center justify-center p-5 sm:p-8 ${
          modoOscuro ? "bg-slate-950" : "bg-[#F8FAFC]"
        }`}
      >
        <section
          className={`w-full max-w-xl rounded-3xl border p-8 text-center shadow-lg ${
            modoOscuro
              ? "border-red-900/60 bg-slate-900"
              : "border-red-200 bg-white"
          }`}
        >
          <div className="text-4xl">⚠️</div>
          <h1
            className={`mt-4 text-2xl font-black ${
              modoOscuro ? "text-white" : "text-slate-900"
            }`}
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
      <main
        className={`flex min-h-screen items-center justify-center p-5 sm:p-8 ${
          modoOscuro
            ? "bg-slate-950 text-slate-100"
            : "bg-[#F8FAFC] text-[#1E293B]"
        }`}
      >
        <section
          className={`w-full max-w-2xl rounded-3xl border p-7 text-center shadow-xl sm:p-10 ${
            modoOscuro
              ? "border-red-900/60 bg-slate-900"
              : "border-red-200 bg-white"
          }`}
        >
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${
              modoOscuro ? "bg-red-950/50" : "bg-red-50"
            }`}
          >
            🔒
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-red-600">
            Suscripción requerida
          </p>

          <h1
            className={`mt-3 text-3xl font-black ${
              modoOscuro ? "text-white" : "text-slate-900"
            }`}
          >
            Tu acceso a ComerSyS está bloqueado
          </h1>

          <p
            className={`mx-auto mt-4 max-w-xl text-base leading-7 ${
              modoOscuro ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Tu período de prueba finalizó o tu suscripción no está activa.
            Para continuar usando el panel de administración, activá el Plan
            Profesional.
          </p>

          {empresa?.prueba_fin && empresa.plan === "prueba" && (
            <p
              className={`mt-3 text-sm font-semibold ${
                modoOscuro ? "text-slate-400" : "text-slate-500"
              }`}
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
            className={`mt-8 rounded-2xl p-5 ${
              modoOscuro ? "bg-slate-800" : "bg-slate-50"
            }`}
          >
            <p
              className={`text-sm ${
                modoOscuro ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Plan Profesional
            </p>
            <p
              className={`mt-1 text-2xl font-black ${
                modoOscuro ? "text-white" : "text-slate-900"
              }`}
            >
              $17.500 por mes
            </p>
          </div>

          <button
            type="button"
            onClick={activarPlanProfesional}
            disabled={activandoPlan}
            className="mt-7 w-full rounded-2xl bg-[#2563EB] px-6 py-4 font-black text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {activandoPlan
              ? "Abriendo Mercado Pago..."
              : "Activar Plan Profesional"}
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
              className={`text-sm font-bold underline underline-offset-4 transition ${
                modoOscuro
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cerrar sesión
            </button>
          </div>

          <p
            className={`mt-6 text-sm ${
              modoOscuro ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Tus datos permanecen guardados. El acceso se restablecerá cuando
            la suscripción vuelva a estar activa.
          </p>
        </section>
      </main>
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
