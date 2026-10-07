"use client";

import { FormEvent, useState } from "react";

export default function MercadoPagoPruebaPage() {
  const [payerEmail, setPayerEmail] = useState(
    "test_user_2428931112239000366@testuser.com"
  );
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function crearSuscripcionPending(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMensaje("");
    setProcesando(true);

    try {
      const email = payerEmail.trim().toLowerCase();

      if (!email || !email.includes("@")) {
        throw new Error(
          "Ingresá un payer_email válido."
        );
      }

      const respuesta = await fetch(
        "/api/mercadopago/crear-suscripcion-prueba",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payerEmail: email,
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        console.error(
          "Mercado Pago rechazó la suscripción PENDING:",
          data
        );

        throw new Error(
          data?.detalle?.message ||
            data?.error ||
            "No se pudo crear la suscripción pendiente."
        );
      }

      const resultado = data?.data ?? data;

      console.log(
        "Suscripción PENDING creada:",
        resultado
      );

      const initPoint = resultado?.init_point;

      if (!initPoint) {
        throw new Error(
          "Mercado Pago creó la suscripción pero no devolvió init_point."
        );
      }

      setMensaje(
        "Suscripción creada correctamente. Redirigiendo a Mercado Pago..."
      );

      window.location.href = initPoint;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear la suscripción."
      );

      setProcesando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-xl">
        <section className="rounded-3xl bg-white p-7 shadow-lg">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            ComerSys · Mercado Pago
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Prueba de suscripción pendiente
          </h1>

          <p className="mt-2 text-slate-500">
            Plan Profesional ComerSys PRUEBA ·
            $17.500 por mes
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Esta prueba crea una suscripción en estado{" "}
            <strong>pending</strong> y luego redirige al
            checkout de Mercado Pago.
          </div>

          <form
            onSubmit={crearSuscripcionPending}
            className="mt-7 space-y-5"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                Email del comprador de prueba
              </span>

              <input
                type="email"
                value={payerEmail}
                onChange={(event) =>
                  setPayerEmail(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={procesando}
              className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {procesando
                ? "Redirigiendo a Mercado Pago..."
                : "Continuar con Mercado Pago"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}