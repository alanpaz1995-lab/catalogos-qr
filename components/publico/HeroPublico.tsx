import Link from "next/link";

export default function HeroPublico() {
  return (
    <section className="px-4 pb-12 pt-4 sm:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
        <div className="px-6 py-14 text-center sm:px-10 sm:py-20">
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-[#2563EB]">
            Gestión comercial simple e inteligente
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            Vendé más y organizá mejor tu negocio con ComerSys
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Administrá productos, clientes, pedidos, caja y
            compartí tu catálogo digital mediante un código QR
            desde una sola plataforma.
          </p>

          <Link
            href="/registro"
            className="mt-8 inline-flex rounded-2xl bg-[#2563EB] px-7 py-4 text-base font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            🚀 Probalo gratis durante 7 días
          </Link>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-slate-600 sm:flex-row sm:flex-wrap">
            <span>✓ Sin tarjeta de crédito</span>
            <span className="hidden text-slate-300 sm:inline">•</span>
            <span>✓ Configuración en menos de 5 minutos</span>
            <span className="hidden text-slate-300 sm:inline">•</span>
            <span>✓ Cancelá cuando quieras</span>
          </div>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-slate-500">
            En pocos minutos vas a poder cargar tus productos,
            organizar tu negocio y compartir tu catálogo por
            WhatsApp o mediante un código QR.
          </p>
        </div>
      </div>
    </section>
  );
}