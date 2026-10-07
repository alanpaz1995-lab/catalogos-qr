"use client";

import Script from "next/script";
import { FormEvent, useRef, useState } from "react";

type MercadoPagoCardFormData = {
  token?: string;
  cardholderEmail?: string;
};

type MercadoPagoCardForm = {
  getCardFormData: () => MercadoPagoCardFormData;
};

type MercadoPagoInstance = {
  cardForm: (config: Record<string, unknown>) => MercadoPagoCardForm;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string }
    ) => MercadoPagoInstance;
  }
}

export default function MercadoPagoPruebaPage() {
  const [sdkListo, setSdkListo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const cardFormRef = useRef<MercadoPagoCardForm | null>(null);

  function inicializarCardForm() {
    if (cardFormRef.current) return;

    const publicKey =
      process.env.NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY;

    if (!publicKey) {
      setError(
        "Falta NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY en .env.local."
      );
      return;
    }

    if (!window.MercadoPago) {
      setError("No se pudo cargar MercadoPago.js.");
      return;
    }

    const mp = new window.MercadoPago(publicKey, {
      locale: "es-AR",
    });

    cardFormRef.current = mp.cardForm({
      amount: "17500",
      iframe: true,
      form: {
        id: "form-checkout",
        cardNumber: {
          id: "form-checkout__cardNumber",
          placeholder: "Número de tarjeta",
        },
        expirationDate: {
          id: "form-checkout__expirationDate",
          placeholder: "MM/AA",
        },
        securityCode: {
          id: "form-checkout__securityCode",
          placeholder: "Código de seguridad",
        },
        cardholderName: {
          id: "form-checkout__cardholderName",
          placeholder: "Nombre del titular",
        },
        issuer: {
          id: "form-checkout__issuer",
          placeholder: "Banco emisor",
        },
        installments: {
          id: "form-checkout__installments",
          placeholder: "Cuotas",
        },
        identificationType: {
          id: "form-checkout__identificationType",
          placeholder: "Tipo de documento",
        },
        identificationNumber: {
          id: "form-checkout__identificationNumber",
          placeholder: "Número de documento",
        },
        cardholderEmail: {
          id: "form-checkout__cardholderEmail",
          placeholder: "Email del comprador de prueba",
        },
      },
      callbacks: {
        onFormMounted: (mountError: unknown) => {
          if (mountError) {
            console.error("Error montando CardForm:", mountError);
            setError("Mercado Pago no pudo cargar el formulario.");
            return;
          }

          setSdkListo(true);
        },
        onFetching: () => {
          setMensaje("Consultando Mercado Pago...");
          return () => setMensaje("");
        },
      },
    });
  }

  async function crearSuscripcion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMensaje("");
    setProcesando(true);

    try {
      const cardForm = cardFormRef.current;

      if (!cardForm) {
        throw new Error(
          "El formulario de Mercado Pago todavía no está listo."
        );
      }

      const datos = cardForm.getCardFormData();

      if (!datos.token) {
        throw new Error(
          "Mercado Pago no generó el card_token_id."
        );
      }

      if (!datos.cardholderEmail) {
        throw new Error(
          "Ingresá el email del comprador de prueba."
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
            cardTokenId: datos.token,
            payerEmail: datos.cardholderEmail,
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        console.error("Error de suscripción de prueba:", data);

        throw new Error(
          data?.detalle?.message ||
            data?.error ||
            "No se pudo crear la suscripción de prueba."
        );
      }

      setMensaje(
        `Suscripción creada correctamente. Estado: ${data.status ?? "sin estado"}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error."
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={inicializarCardForm}
      />

      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl bg-white p-7 shadow-lg">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              ComerSys · Mercado Pago
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Suscripción de prueba
            </h1>

            <p className="mt-2 text-slate-500">
              Plan Profesional ComerSys PRUEBA · $17.500 por mes
            </p>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Usá solamente datos de prueba de Mercado Pago.
            </div>

            <form
              id="form-checkout"
              onSubmit={crearSuscripcion}
              className="mt-7 space-y-4"
            >
              <CampoIframe
                label="Número de tarjeta"
                id="form-checkout__cardNumber"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <CampoIframe
                  label="Vencimiento"
                  id="form-checkout__expirationDate"
                />
                <CampoIframe
                  label="Código de seguridad"
                  id="form-checkout__securityCode"
                />
              </div>

              <CampoInput
                label="Nombre del titular"
                id="form-checkout__cardholderName"
                type="text"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <CampoSelect
                  label="Banco emisor"
                  id="form-checkout__issuer"
                />
                <CampoSelect
                  label="Cuotas"
                  id="form-checkout__installments"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <CampoSelect
                  label="Tipo de documento"
                  id="form-checkout__identificationType"
                />
                <CampoInput
                  label="Número de documento"
                  id="form-checkout__identificationNumber"
                  type="text"
                />
              </div>

              <CampoInput
                label="Email del comprador de prueba"
                id="form-checkout__cardholderEmail"
                type="email"
              />

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                  {error}
                </div>
              )}

              {mensaje && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-700">
                  {mensaje}
                </div>
              )}

              <button
                id="form-checkout__submit"
                type="submit"
                disabled={!sdkListo || procesando}
                className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesando
                  ? "Creando suscripción..."
                  : sdkListo
                    ? "Crear suscripción de prueba"
                    : "Cargando Mercado Pago..."}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

function CampoIframe({
  label,
  id,
}: {
  label: string;
  id: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>
      <div
        id={id}
        className="h-12 rounded-xl border border-slate-300 bg-white px-3 py-3"
      />
    </label>
  );
}

function CampoInput({
  label,
  id,
  type,
}: {
  label: string;
  id: string;
  type: "text" | "email";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>
      <input
        id={id}
        type={type}
        className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function CampoSelect({
  label,
  id,
}: {
  label: string;
  id: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>
      <select
        id={id}
        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-500"
      />
    </label>
  );
}