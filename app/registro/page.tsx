"use client";

import Link from "next/link";
import { useState } from "react";

const rubros = [
  "Almacén",
  "Dietética",
  "Ferretería",
  "Indumentaria",
  "Librería",
  "Otro",
];

export default function RegistroPage() {
  const [paso, setPaso] = useState(1);
  const [nombreNegocio, setNombreNegocio] =
    useState("");
  const [rubro, setRubro] = useState("");
  const [nombreResponsable, setNombreResponsable] =
    useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] =
    useState("");
  const [error, setError] = useState("");

  function continuar() {
    setError("");

    if (paso === 1 && !nombreNegocio.trim()) {
      setError("Ingresá el nombre de tu negocio.");
      return;
    }

    if (paso === 2 && !rubro) {
      setError("Seleccioná el rubro de tu negocio.");
      return;
    }

    if (
      paso === 3 &&
      (!nombreResponsable.trim() || !telefono.trim())
    ) {
      setError(
        "Completá el nombre del responsable y el teléfono."
      );
      return;
    }

    if (
      paso === 4 &&
      (!email.trim() || contrasena.length < 6)
    ) {
      setError(
        "Ingresá un email válido y una contraseña de al menos 6 caracteres."
      );
      return;
    }

    setPaso((actual) => Math.min(actual + 1, 5));
  }

  function volver() {
    setError("");
    setPaso((actual) => Math.max(actual - 1, 1));
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#1E293B] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-2xl font-black text-white shadow-lg">
              C
            </div>

            <div>
              <p className="text-xl font-black">
                ComerSys
              </p>

              <p className="text-xs text-slate-500">
                Registro de negocio
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold transition hover:bg-slate-100"
          >
            Ya tengo cuenta
          </Link>
        </header>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2563EB]">
                  Prueba gratuita
                </p>

                <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                  Creá tu cuenta en ComerSys
                </h1>
              </div>

              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-[#2563EB]">
                Paso {paso} de 5
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all"
                style={{
                  width: `${paso * 20}%`,
                }}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {paso === 1 && (
              <PasoNombreNegocio
                valor={nombreNegocio}
                onChange={setNombreNegocio}
              />
            )}

            {paso === 2 && (
              <PasoRubro
                valor={rubro}
                onChange={setRubro}
              />
            )}

            {paso === 3 && (
              <PasoResponsable
                nombre={nombreResponsable}
                telefono={telefono}
                onNombreChange={setNombreResponsable}
                onTelefonoChange={setTelefono}
              />
            )}

            {paso === 4 && (
              <PasoAcceso
                email={email}
                contrasena={contrasena}
                onEmailChange={setEmail}
                onContrasenaChange={setContrasena}
              />
            )}

            {paso === 5 && (
              <PasoFinal
                negocio={nombreNegocio}
                responsable={nombreResponsable}
              />
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
              {paso > 1 && paso < 5 ? (
                <button
                  type="button"
                  onClick={volver}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-black transition hover:bg-slate-100"
                >
                  Volver
                </button>
              ) : (
                <div />
              )}

              {paso < 5 ? (
                <button
                  type="button"
                  onClick={continuar}
                  className="rounded-xl bg-[#2563EB] px-7 py-3 font-black text-white transition hover:bg-blue-700"
                >
                  Continuar
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl bg-[#2563EB] px-7 py-3 text-center font-black text-white transition hover:bg-blue-700"
                >
                  Crear cuenta y continuar
                </Link>
              )}
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-sm text-slate-500">
          7 días gratis · Sin tarjeta de crédito · Cancelá cuando quieras
        </p>
      </div>
    </main>
  );
}

function PasoNombreNegocio({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <span className="text-5xl">🏪</span>

      <h2 className="mt-5 text-3xl font-black">
        ¿Cómo se llama tu negocio?
      </h2>

      <p className="mt-3 text-slate-500">
        Este será el nombre principal que verá tu equipo y aparecerá en tu catálogo.
      </p>

      <input
        type="text"
        value={valor}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="Ej.: Almacén San Martín"
        className={clasesInput}
      />
    </div>
  );
}

function PasoRubro({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <span className="text-5xl">📦</span>

      <h2 className="mt-5 text-3xl font-black">
        ¿Qué tipo de negocio tenés?
      </h2>

      <p className="mt-3 text-slate-500">
        Esto nos ayudará a preparar mejor tu experiencia inicial.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {rubros.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-2xl border-2 px-5 py-4 text-left font-black transition ${
              valor === item
                ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function PasoResponsable({
  nombre,
  telefono,
  onNombreChange,
  onTelefonoChange,
}: {
  nombre: string;
  telefono: string;
  onNombreChange: (valor: string) => void;
  onTelefonoChange: (valor: string) => void;
}) {
  return (
    <div>
      <span className="text-5xl">👤</span>

      <h2 className="mt-5 text-3xl font-black">
        Contanos quién va a administrar la cuenta
      </h2>

      <div className="mt-7 grid gap-5">
        <input
          type="text"
          value={nombre}
          onChange={(event) =>
            onNombreChange(event.target.value)
          }
          placeholder="Nombre y apellido"
          className={clasesInput}
        />

        <input
          type="tel"
          value={telefono}
          onChange={(event) =>
            onTelefonoChange(event.target.value)
          }
          placeholder="Teléfono o WhatsApp"
          className={clasesInput}
        />
      </div>
    </div>
  );
}

function PasoAcceso({
  email,
  contrasena,
  onEmailChange,
  onContrasenaChange,
}: {
  email: string;
  contrasena: string;
  onEmailChange: (valor: string) => void;
  onContrasenaChange: (valor: string) => void;
}) {
  return (
    <div>
      <span className="text-5xl">🔐</span>

      <h2 className="mt-5 text-3xl font-black">
        Creá tus datos de acceso
      </h2>

      <p className="mt-3 text-slate-500">
        Vas a usar estos datos para ingresar a tu panel de administración.
      </p>

      <div className="mt-7 grid gap-5">
        <input
          type="email"
          value={email}
          onChange={(event) =>
            onEmailChange(event.target.value)
          }
          placeholder="Email"
          className={clasesInput}
        />

        <input
          type="password"
          value={contrasena}
          onChange={(event) =>
            onContrasenaChange(event.target.value)
          }
          placeholder="Contraseña"
          className={clasesInput}
        />
      </div>
    </div>
  );
}

function PasoFinal({
  negocio,
  responsable,
}: {
  negocio: string;
  responsable: string;
}) {
  return (
    <div className="text-center">
      <span className="text-7xl">🎉</span>

      <h2 className="mt-6 text-3xl font-black">
        ¡Todo listo para comenzar!
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">
        Vamos a crear la cuenta de{" "}
        <strong>{negocio}</strong> para que{" "}
        <strong>{responsable}</strong> pueda comenzar la prueba gratuita de 7 días.
      </p>
    </div>
  );
}

const clasesInput =
  "mt-7 w-full rounded-2xl border-2 border-slate-300 px-5 py-4 text-lg outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";