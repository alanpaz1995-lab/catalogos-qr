"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LogoComerSys from "@/components/brand/LogoComerSys";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] =
    useState(false);
  const [recordarme, setRecordarme] = useState(true);
  const [ingresando, setIngresando] = useState(false);
  const [error, setError] = useState("");

  async function iniciarSesion(
    event: FormEvent<HTMLFormElement>
  ) {
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
          errorIngreso.message ===
            "Invalid login credentials"
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
      console.error(
        "Error al iniciar sesión:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo iniciar sesión."
      );

      setIngresando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-10 text-[#1E293B] sm:px-6">
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-200/50 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-gradient-to-br from-[#2563EB] via-blue-600 to-violet-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <LogoComerSys
            variante="icono"
            ancho={110}
            alto={110}
            conLink
          />

          <div className="mt-12">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">
              Gestión Comercial Inteligente
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight">
              Todo tu negocio, en un solo lugar.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-blue-100">
              Administrá productos, clientes, pedidos,
              caja y catálogo digital con QR desde una
              plataforma simple y conectada.
            </p>
          </div>

          <div className="mt-12 grid gap-3 text-sm font-semibold text-blue-100">
            <p>✓ Acceso seguro</p>
            <p>✓ Disponible desde celular y computadora</p>
            <p>✓ Información centralizada</p>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="lg:hidden">
            <LogoComerSys
              variante="icono"
              ancho={84}
              alto={84}
            />
          </div>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[#2563EB] lg:mt-0">
            Bienvenido nuevamente
          </p>

          <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Iniciá sesión en ComerSys
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Ingresá con tu cuenta autorizada para administrar
            el negocio.
          </p>

          <form
            onSubmit={iniciarSesion}
            className="mt-8"
          >
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
                onChange={(event) =>
                  setEmail(event.target.value)
                }
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
                  type={
                    mostrarContrasena
                      ? "text"
                      : "password"
                  }
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
                  className="absolute inset-y-0 right-4 my-auto h-fit text-sm font-black text-[#2563EB]"
                >
                  {mostrarContrasena
                    ? "Ocultar"
                    : "Mostrar"}
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
              className="mt-6 w-full rounded-2xl bg-[#2563EB] px-6 py-4 font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ingresando
                ? "Ingresando..."
                : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              ¿Todavía no tenés una cuenta?
            </p>

            <Link
              href="/registro"
              className="mt-3 inline-flex rounded-xl border-2 border-[#2563EB] px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-blue-50"
            >
              Probar ComerSys durante 7 días
            </Link>
          </div>

          <Link
            href="/"
            className="mt-6 block text-center text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          >
            ← Volver al inicio
          </Link>
        </section>
      </div>
    </main>
  );
}

const clasesInput =
  "w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";