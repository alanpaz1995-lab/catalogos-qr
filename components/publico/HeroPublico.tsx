import Image from "next/image";
import Link from "next/link";

export default function HeroPublico() {
  return (
    <section className="bg-[#F8FAFC] px-4 pb-8 pt-5 sm:px-6">
      <div className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[28px] border border-slate-800 bg-[#020817] shadow-[0_24px_70px_rgba(15,23,42,0.20)]">
        {/* Luces de fondo */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(14,165,233,0.13),transparent_30%),radial-gradient(circle_at_82%_28%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_94%_48%,rgba(124,58,237,0.18),transparent_34%)]" />

        <div className="relative grid min-h-[590px] lg:grid-cols-[0.82fr_1.18fr]">
          {/* IZQUIERDA */}
          <div className="relative z-20 flex flex-col justify-center px-7 py-12 sm:px-10 lg:px-12 lg:py-16">
            <span className="w-fit rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-sky-300">
              Gestión comercial todo en uno
            </span>

            <h1 className="mt-7 max-w-[620px] text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[58px]">
              Todo tu negocio
              <span className="block bg-gradient-to-r from-[#0EA5FF] via-[#2563EB] to-[#8B2CF5] bg-clip-text text-transparent">
                en un solo sistema
              </span>
            </h1>

            <p className="mt-6 max-w-[560px] text-base leading-7 text-slate-300 sm:text-lg">
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

          {/* DERECHA */}
          <div className="relative min-h-[430px] overflow-hidden lg:min-h-[590px]">
            {/* Resplandor detrás del panel */}
            <div className="pointer-events-none absolute left-[12%] top-[15%] h-[58%] w-[78%] rounded-full bg-blue-500/20 blur-[80px]" />

            <div className="pointer-events-none absolute bottom-[14%] right-[4%] h-[42%] w-[58%] rounded-full bg-violet-600/20 blur-[90px]" />

            {/* Panel flotante */}
            <div className="absolute left-[5%] right-[-2%] top-[9%] z-10 sm:left-[8%] sm:right-[2%] lg:left-[3%] lg:right-[-3%] lg:top-[10%]">
              <div className="origin-center rotate-[-1.2deg]">
                {/* Marco exterior */}
                <div className="rounded-[28px] border border-white/25 bg-gradient-to-br from-slate-700 via-slate-950 to-black p-[5px] shadow-[0_35px_90px_rgba(0,0,0,0.65),0_0_45px_rgba(14,165,233,0.20),0_0_70px_rgba(124,58,237,0.12)]">
                  {/* Marco interior */}
                  <div className="overflow-hidden rounded-[23px] bg-[#07111F] p-[9px]">
                    <Image
                      src="/brand/dashboard-comersys.png"
                      alt="Panel real de administración de ComerSyS"
                      width={1536}
                      height={901}
                      priority
                      className="h-auto w-full rounded-[16px]"
                    />
                  </div>
                </div>

                {/* Base luminosa */}
                <div className="mx-auto h-[3px] w-[74%] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-80 shadow-[0_0_18px_rgba(56,189,248,0.9)]" />
              </div>
            </div>

            {/* Oscurecimiento suave hacia el texto */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[18%] bg-gradient-to-r from-[#020817] to-transparent" />
          </div>
        </div>
      </div>

      {/* BENEFICIOS */}
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