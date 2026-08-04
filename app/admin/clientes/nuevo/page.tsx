"use client";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/services/clientes";

const EMPRESA_ID = 1;

export default function NuevoClientePage() {
  const router = useRouter();

  const [nombre, setNombre] =
    useState("");
  const [telefono, setTelefono] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [direccion, setDireccion] =
    useState("");
  const [observaciones, setObservaciones] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);
  const [error, setError] =
    useState("");

  async function guardarCliente(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const nombreLimpio =
      nombre.trim();
    const telefonoLimpio =
      telefono.trim();

    if (!nombreLimpio) {
      setError(
        "Ingresá el nombre del cliente."
      );
      return;
    }

    if (!telefonoLimpio) {
      setError(
        "Ingresá el teléfono del cliente."
      );
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const cliente = await crearCliente({
        empresa_id: EMPRESA_ID,
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        email,
        direccion,
        observaciones,
        activo: true,
      });

      router.push(
        `/admin/clientes/${cliente.id}`
      );
      router.refresh();
    } catch (errorDesconocido) {
      console.error(
        "Error al crear cliente:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo crear el cliente."
      );

      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-4xl">
        <header>
          <Link
            href="/admin/clientes"
            className="font-semibold text-[#2563EB]"
          >
            ← Volver a clientes
          </Link>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Clientes PRO
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Nuevo cliente
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Registrá los datos básicos del
            cliente para utilizarlo en pedidos,
            cobros y cuenta corriente.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form
            onSubmit={guardarCliente}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Campo
                id="nombre"
                etiqueta="Nombre"
                requerido
              >
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(event) =>
                    setNombre(
                      event.target.value
                    )
                  }
                  placeholder="Nombre y apellido"
                  className={clasesInput}
                />
              </Campo>

              <Campo
                id="telefono"
                etiqueta="Teléfono"
                requerido
              >
                <input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(event) =>
                    setTelefono(
                      event.target.value
                    )
                  }
                  placeholder="Ej.: 11 5555-5555"
                  className={clasesInput}
                />
              </Campo>

              <Campo
                id="email"
                etiqueta="Email"
              >
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="cliente@email.com"
                  className={clasesInput}
                />
              </Campo>

              <Campo
                id="direccion"
                etiqueta="Dirección"
              >
                <input
                  id="direccion"
                  type="text"
                  value={direccion}
                  onChange={(event) =>
                    setDireccion(
                      event.target.value
                    )
                  }
                  placeholder="Calle, número y localidad"
                  className={clasesInput}
                />
              </Campo>
            </div>

            <Campo
              id="observaciones"
              etiqueta="Observaciones"
            >
              <textarea
                id="observaciones"
                value={observaciones}
                onChange={(event) =>
                  setObservaciones(
                    event.target.value
                  )
                }
                placeholder="Notas internas sobre el cliente..."
                rows={5}
                className={`${clasesInput} resize-y`}
              />
            </Campo>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/admin/clientes"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold transition hover:bg-slate-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl bg-[#2563EB] px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando
                  ? "Guardando..."
                  : "Crear cliente"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Campo({
  id,
  etiqueta,
  requerido = false,
  children,
}: {
  id: string;
  etiqueta: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold"
      >
        {etiqueta}

        {requerido && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

const clasesInput =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100";