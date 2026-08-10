import Image from "next/image";
import Link from "next/link";

export default function HeroPublico() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAFC] px-4 pb-8 pt-8 sm:px-6 lg:pt-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(99,102,241,0.10),transparent_32%),radial-gradient(circle_at_14%_62%,rgba(37,99,235,0.08),transparent_28%)]" />

      <div className="relative mx-auto grid max-w-[1500px] items-center gap-10 lg:grid-cols-[0.8fr_1.35fr]">
        <div className="px-1 py-4 sm:px-4 lg:py-10">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-[#2563EB]">
            La plataforma todo en uno para tu negocio
          </span>

          <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Vendé más y organizá mejor tu negocio con{" "}
            <span className="bg-gradient-to-r from-[#0868F7] to-[#7412F4] bg-clip-text text-transparent">
              ComerSys
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            Administrá productos, clientes, pedidos, caja y compartí tu
            catálogo digital mediante un código QR desde una sola plataforma.
          </p>

          <Link
            href="/registro"
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#0868F7] to-[#7412F4] px-7 py-4 text-base font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5"
          >
            🚀 Probalo gratis durante 7 días
            <span aria-hidden="true">→</span>
          </Link>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-slate-700">
            <span className="inline-flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Sin tarjeta de crédito
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Configuración en menos de 5 minutos
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Cancelá cuando quieras
            </span>
          </div>

          <p className="mt-7 inline-flex items-center gap-3 text-sm leading-6 text-slate-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              🛡️
            </span>
            Seguro, confiable y pensado para hacer crecer tu negocio.
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.15)] sm:p-3">
            <Image
              src="/brand/dashboard-comersys.png"
              alt="Panel real de administración de ComerSys"
              width={1536}
              height={901}
              priority
              className="h-auto w-full rounded-[20px]"
            />
          </div>
        </div>
      </div>

      <div
        id="beneficios"
        className="relative mx-auto mt-8 grid max-w-[1500px] gap-4 rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:grid-cols-2 xl:grid-cols-4"
      >
        <Beneficio
          icono="🛍️"
          titulo="Catálogo digital"
          texto="Compartí tu catálogo por WhatsApp o código QR y vendé más."
        />
        <Beneficio
          icono="👥"
          titulo="Gestión completa"
          texto="Controlá productos, clientes, pedidos y stock en un solo lugar."
        />
        <Beneficio
          icono="📈"
          titulo="Reportes inteligentes"
          texto="Tomá mejores decisiones con datos claros y actualizados."
        />
        <Beneficio
          icono="🔒"
          titulo="Seguro y confiable"
          texto="Tu información protegida con tecnología pensada para tu negocio."
        />
      </div>
    </section>
  );
}

function Beneficio({
  icono,
  titulo,
  texto,
}: {
  icono: string;
  titulo: string;
  texto: string;
}) {
  return (
    <article className="flex gap-4 rounded-2xl px-3 py-2">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
        {icono}
      </div>

      <div>
        <h2 className="font-black text-slate-950">
          {titulo}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {texto}
        </p>
      </div>
    </article>
  );
}