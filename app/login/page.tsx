"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LogoComerSys from "@/components/brand/LogoComerSys";
import { supabase } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [recordarme, setRecordarme] = useState(true);
  const [ingresando, setIngresando] = useState(false);
  const [error, setError] = useState("");

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio || !contrasena) {
      setError("Completá el email y la contraseña.");
      return;
    }

    setIngresando(true);
    setError("");

    try {
      const { error: errorIngreso } =
        await supabase.auth.signInWithPassword({
          email: emailLimpio,
          password: contrasena,
        });

      if (errorIngreso) {
        setError(
          errorIngreso.message === "Invalid login credentials"
            ? "El email o la contraseña no son correctos."
            : errorIngreso.message
        );

        setIngresando(false);
        return;
      }

      const siguiente = searchParams.get("siguiente");

      const destino =
        siguiente && siguiente.startsWith("/admin")
          ? siguiente
          : "/admin";

      router.replace(destino);
      router.refresh();
    } catch (errorDesconocido) {
      console.error("Error al iniciar sesión:", errorDesconocido);

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo iniciar sesión."
      );

      setIngresando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817] px-4 py-8 text-slate-900 sm:px-6">
      {/* Luces de fondo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.20),transparent_30%),radial-gradient(circle_at_52%_100%,rgba(37,99,235,0.10),transparent_34%)]" />

      <div className="pointer-events-none absolute -left-24 top-[18%] h-72 w-72 rounded-full bg-sky-500/10 blur-[90px]" />
      <div className="pointer-events-none absolute -right-24 bottom-[8%] h-80 w-80 rounded-full bg-violet-600/10 blur-[100px]" />

      <div className="relative z-10 grid w-full max-w-[1180px] overflow-hidden rounded-[30px] border border-white/15 bg-[#07111F] shadow-[0_35px_100px_rgba(0,0,0,0.55),0_0_60px_rgba(14,165,233,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
        {/* LADO IZQUIERDO */}
        <section className="relative hidden min-h-[700px] overflow-hidden border-r border-white/10 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(14,165,233,0.20),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(124,58,237,0.22),transparent_35%)]" />

          <div className="pointer-events-none absolute bottom-[20%] left-[-10%] h-40 w-[120%] rotate-[-4deg] rounded-[50%] border-t border-sky-400/40 shadow-[0_-8px_30px_rgba(14,165,233,0.22)]" />

          <div className="relative z-10">
            <Link
              href="/"
              aria-label="Volver al inicio de ComerSyS"
              className="inline-flex items-center gap-4"
            >
              <div className="overflow-hidden rounded-[20px] border border-white/30 bg-black shadow-[0_0_28px_rgba(14,165,233,0.22)]">
                <LogoComerSys
                  variante="icono"
                  ancho={88}
                  alto={88}
                  conLink={false}
                />
              </div>

              <div>
                <p className="text-4xl font-black leading-none tracking-tight text-white">
                  Comer<span className="text-sky-400">SyS</span>
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-300">
                  Gestión Comercial Inteligente
                </p>
              </div>
            </Link>
          </div>

          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-sky-300">
              Tu negocio en un solo sistema
            </span>

            <h1 className="mt-6 max-w-md text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl">
              Gestioná tu negocio
              <span className="block bg-gradient-to-r from-[#0EA5FF] via-[#2563EB] to-[#8B2CF5] bg-clip-text text-transparent">
                de forma inteligente
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Administrá productos, clientes, pedidos, caja y tu catálogo
              digital desde una plataforma simple, segura y conectada.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 text-sm font-semibold text-slate-300">
            <p className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              Acceso seguro
            </p>

            <p className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              Disponible desde celular y computadora
            </p>

            <p className="flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              Toda la información centralizada
            </p>
          </div>
        </section>

        {/* FORMULARIO */}
        <section className="relative bg-white p-6 sm:p-10 lg:p-12 xl:px-14">
          <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-blue-100/60 blur-[80px]" />

          <div className="relative">
            {/* Logo móvil */}
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-3"
                aria-label="Volver al inicio de ComerSyS"
              >
                <LogoComerSys
                  variante="icono"
                  ancho={64}
                  alto={64}
                  conLink={false}
                />

                <div>
                  <p className="text-2xl font-black leading-none text-slate-950">
                    Comer<span className="text-sky-500">SyS</span>
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Gestión Comercial Inteligente
                  </p>
                </div>
              </Link>
            </div>

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#2563EB]">
              Bienvenido nuevamente
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Iniciá sesión en ComerSyS
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Ingresá con tu cuenta para administrar tu negocio.
            </p>

            <form onSubmit={iniciarSesion} className="mt-8">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  Correo electrónico
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="administrador@empresa.com"
                  className={clasesInput}
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    htmlFor="contrasena"
                    className="block text-sm font-black text-slate-700"
                  >
                    Contraseña
                  </label>

                  <Link
                    href="/recuperar"
                    className="text-sm font-bold text-[#2563EB] transition hover:text-blue-700"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="contrasena"
                    type={mostrarContrasena ? "text" : "password"}
                    autoComplete="current-password"
                    value={contrasena}
                    onChange={(event) =>
                      setContrasena(event.target.value)
                    }
                    placeholder="Tu contraseña"
                    className={`${clasesInput} pr-24`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarContrasena(
                        (valorActual) => !valorActual
                      )
                    }
                    className="absolute inset-y-0 right-4 my-auto h-fit text-sm font-black text-[#2563EB] transition hover:text-blue-700"
                  >
                    {mostrarContrasena ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(event) =>
                    setRecordarme(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]"
                />

                Mantener la sesión iniciada
              </label>

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={ingresando}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#008CFF] to-[#7412F4] px-6 py-4 font-black text-white shadow-[0_12px_30px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ingresando ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
              <p className="text-sm text-slate-500">
                ¿Todavía no tenés una cuenta?
              </p>

              <Link
                href="/registro"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border-2 border-[#2563EB] px-6 py-3 text-sm font-black text-[#2563EB] transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                🚀 Probar ComerSyS durante 7 días
              </Link>
            </div>

            <Link
              href="/"
              className="mt-6 block text-center text-sm font-semibold text-slate-400 transition hover:text-slate-700"
            >
              ← Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<CargandoLogin />}>
      <LoginContent />
    </Suspense>
  );
}

function CargandoLogin() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.15),transparent_32%)]" />

      <div className="relative text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-sky-400" />

        <p className="mt-4 font-semibold text-slate-300">
          Cargando ComerSyS...
        </p>
      </div>
    </main>
  );
}

const clasesInput =
  "w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-5 py-4 text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-100";