import Link from "next/link";

export default function LlamadoFinalPublico() {
  return (
    <section className="bg-[#2563EB] px-4 py-20 text-white">
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
          🚀 Tu negocio puede empezar hoy mismo
        </span>

        <h2 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
          ¿Listo para transformar tu negocio?
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-blue-100">
          Probá ComerSys durante 7 días y descubrí una forma más simple
          de administrar productos, clientes, pedidos, caja y tu
          catálogo digital con QR.
        </p>

        <Link
          href="/registro"
          className="mt-10 inline-flex rounded-2xl bg-white px-8 py-4 text-lg font-black text-[#2563EB] shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
        >
          🚀 Probalo gratis durante 7 días
        </Link>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm font-semibold sm:flex-row sm:gap-6">
          <span>✓ Sin tarjeta de crédito</span>
          <span>✓ Configuración en menos de 5 minutos</span>
          <span>✓ Cancelá cuando quieras</span>
        </div>
      </div>
    </section>
  );
}