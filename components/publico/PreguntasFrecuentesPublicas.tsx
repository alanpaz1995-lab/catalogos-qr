"use client";

import { useState } from "react";

const preguntas = [
  {
    pregunta: "¿Necesito instalar algún programa?",
    respuesta:
      "No. ComerSys funciona desde el navegador y también se adapta a celulares y tablets. Solo necesitás conexión a Internet.",
  },
  {
    pregunta: "¿Puedo probar el sistema antes de contratar un plan?",
    respuesta:
      "Sí. Podés probar ComerSys gratis durante 7 días con acceso a todas las funciones disponibles.",
  },
  {
    pregunta: "¿Puedo compartir mi catálogo por WhatsApp?",
    respuesta:
      "Sí. Cada negocio tendrá un catálogo digital con un enlace y un código QR para compartir fácilmente.",
  },
  {
    pregunta: "¿Mis datos están seguros?",
    respuesta:
      "Sí. La información se almacena en servidores seguros y cada empresa solo puede acceder a sus propios datos.",
  },
  {
    pregunta: "¿Qué tipo de negocios pueden usar ComerSys?",
    respuesta:
      "ComerSys está pensado para comercios, emprendimientos y empresas que necesiten organizar productos, clientes, pedidos y ventas.",
  },
];

export default function PreguntasFrecuentesPublicas() {
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <section
      className="bg-white px-4 py-20"
      id="preguntas"
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2563EB]">
            Preguntas frecuentes
          </p>

          <h2 className="mt-3 text-4xl font-black text-slate-900">
            Respondemos las dudas más comunes
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Si todavía tenés alguna consulta, podés comunicarte
            con nosotros cuando quieras.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {preguntas.map((item, index) => (
            <div
              key={item.pregunta}
              className="overflow-hidden rounded-2xl border-2 border-slate-900"
            >
              <button
                type="button"
                onClick={() =>
                  setAbierta(
                    abierta === index ? null : index
                  )
                }
                className="flex w-full items-center justify-between bg-slate-50 px-6 py-5 text-left"
              >
                <span className="font-black text-slate-900">
                  {item.pregunta}
                </span>

                <span className="text-2xl font-black text-[#2563EB]">
                  {abierta === index ? "−" : "+"}
                </span>
              </button>

              {abierta === index && (
                <div className="bg-white px-6 py-5 text-slate-600">
                  {item.respuesta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}