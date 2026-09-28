import Image from "next/image";
import Link from "next/link";

export default function HeroPublico() {
  return (
    <section className="bg-[#F8FAFC] px-4 pb-8 pt-5 sm:px-6">
      <div className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[28px] border border-slate-800 bg-[#020817] shadow-[0_24px_70px_rgba(15,23,42,0.20)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_85%_30%,rgba(124,58,237,0.14),transparent_34%)]" />

        <div className="relative grid min-h-[510px] items-center lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative z-10 px-7 py-12 sm:px-10 lg:px-12 lg:py-16">
            <span className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-sky-300">
              Gestión comercial todo en uno
            </span>

            <h1 className="mt-7 max-w-[620px] text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[58px]">
              Todo tu negocio
              <span className="block bg-gradient-to-r from-[#0EA5FF] via-[#2563EB] to-[#8B2CF5] bg-clip-text text-transparent">
                en un solo sistema
              </span>
            </h1>

            <p className="mt-6 max-w-[580px] text-base leading-7 text-slate-300 sm:text-lg">
              Administrá productos, clientes, pedidos, caja y compartí tu
              catálogo digital mediante un código QR desde una sola plataforma.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/registro"
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#008CFF] to-[#7412F4] px-6 py-4 text-sm font-black text-white shadow-[0_12px_32px_rgba(37,99,235,0.30)] transition hover:-translate-y-0.5 sm:text-base"
              >
                🚀 Probalo gratis durante 7 días
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/10 sm:text-base"
              >
                Iniciar sesión
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-slate-300 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Sin tarjeta de crédito
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Configuración rápida
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Cancelá cuando quieras
              </span>
            </div>
          </div>

          <div className="relative flex h-full min-h-[390px] items-end overflow-hidden lg:min-h-[510px]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#020817] via-[#020817]/25 to-transparent lg:w-[28%]" />

            <div className="absolute inset-x-5 bottom-[-3%] sm:inset-x-8 lg:bottom-[-5%] lg:left-0 lg:right-[-4%]">
              <div className="overflow-hidden rounded-t-[26px] border border-white/15 bg-white/10 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-3">
                <Image
                  src="/brand/dashboard-comersys.png"
                  alt="Panel real de administración de ComerSys"
                  width={1536}
                  height={901}
                  priority
                  className="h-auto w-full rounded-t-[18px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="beneficios"
        className="mx-auto mt-5 grid max-w-[1500px] overflow-hidden rounded-[26px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] sm:grid-cols-2 lg:grid-cols-4"
      >
        <Beneficio
          icono="📦"
          titulo="Productos"
          texto="Stock, precios y categorías"
        />

        <Beneficio
          icono="👥"
          titulo="Clientes"
          texto="Historial y cuentas corrientes"
        />

        <Beneficio
          icono="📋"
          titulo="Pedidos"
          texto="Control y seguimiento"
        />

        <Beneficio
          icono="📊"
          titulo="Caja y ganancias"
          texto="Ingresos, egresos y resultados"
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
    <article className="flex items-center gap-3 border-slate-200 px-4 py-3 lg:not-last:border-r">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl">
        {icono}
      </div>

      <div>
        <h2 className="text-sm font-black text-slate-950">
          {titulo}
        </h2>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {texto}
        </p>
      </div>
    </article>
  );
}