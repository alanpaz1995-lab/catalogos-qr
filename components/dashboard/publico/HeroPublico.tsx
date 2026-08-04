import Link from "next/link";

export default function HeroPublico() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAFC]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-100px] h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-100px] h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-[#2563EB]">
            Gestión comercial para negocios modernos
          </span>

          <h2 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Administrá tu negocio desde un solo lugar.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Productos, clientes, pedidos, caja, catálogo con
            QR, herramientas de IA y mucho más en una sola
            plataforma pensada para comercios.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="rounded-2xl bg-[#2563EB] px-6 py-4 text-center font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Crear cuenta gratis
            </Link>

            <Link
              href="/catalogo"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-4 text-center font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Ver catálogo de ejemplo
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-500">
            <span>✓ Sin tarjeta para empezar</span>
            <span>✓ Acceso desde celular</span>
            <span>✓ Catálogo compartible por QR</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    Panel ComerSys
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    Resumen del negocio
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-xl font-bold">
                  C
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <TarjetaDemo
                  titulo="Ventas de hoy"
                  valor="$ 125.400"
                  detalle="8 pedidos"
                  icono="💰"
                />

                <TarjetaDemo
                  titulo="Clientes"
                  valor="42"
                  detalle="6 nuevos este mes"
                  icono="👥"
                />

                <TarjetaDemo
                  titulo="Productos"
                  valor="128"
                  detalle="4 con stock bajo"
                  icono="📦"
                />

                <TarjetaDemo
                  titulo="Caja"
                  valor="$ 89.200"
                  detalle="Caja abierta"
                  icono="💵"
                />
              </div>

              <div className="mt-4 rounded-2xl bg-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Catálogo público
                    </p>

                    <p className="mt-1 font-semibold">
                      Compartí tus productos con QR
                    </p>
                  </div>

                  <span className="text-4xl">
                    📱
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 shadow-lg sm:block">
            <p className="text-sm font-semibold text-orange-700">
              🤖 IA para mejorar productos
            </p>
          </div>

          <div className="absolute -right-5 -top-5 hidden rounded-2xl border border-green-200 bg-green-50 px-5 py-4 shadow-lg sm:block">
            <p className="text-sm font-semibold text-green-700">
              ✓ Todo conectado
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TarjetaDemo({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  icono: string;
}) {
  return (
    <article className="rounded-2xl bg-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">
            {titulo}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {valor}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {detalle}
          </p>
        </div>

        <span className="text-2xl">
          {icono}
        </span>
      </div>
    </article>
  );
}