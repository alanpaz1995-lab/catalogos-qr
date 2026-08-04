import Link from "next/link";

const enlacesProducto = [
  {
    texto: "Beneficios",
    href: "#beneficios",
  },
  {
    texto: "Funciones",
    href: "#funciones",
  },
  {
    texto: "Cómo funciona",
    href: "#como-funciona",
  },
  {
    texto: "Planes",
    href: "#planes",
  },
];

const enlacesLegales = [
  {
    texto: "Política de privacidad",
    href: "/privacidad",
  },
  {
    texto: "Términos y condiciones",
    href: "/terminos",
  },
];

export default function FooterPublico() {
  const anioActual = new Date().getFullYear();

  return (
    <footer
      id="contacto"
      className="scroll-mt-32 bg-slate-950 px-4 py-14 text-white sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-950">
                C
              </div>

              <div>
                <p className="text-2xl font-black">
                  ComerSys
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Gestión Comercial Inteligente
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Una plataforma simple para administrar productos,
              clientes, pedidos, caja y catálogos digitales con
              código QR.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
              Producto
            </h2>

            <nav className="mt-5 grid gap-3">
              {enlacesProducto.map((enlace) => (
                <a
                  key={enlace.href}
                  href={enlace.href}
                  className="w-fit text-sm font-semibold text-slate-400 transition hover:text-white"
                >
                  {enlace.texto}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
              Contacto
            </h2>

            <div className="mt-5 grid gap-3 text-sm text-slate-400">
              <a
                href="mailto:contacto@comersys.com"
                className="w-fit font-semibold transition hover:text-white"
              >
                ✉️ contacto@comersys.com
              </a>

              <a
                href="#contacto"
                className="w-fit font-semibold transition hover:text-white"
              >
                📱 WhatsApp
              </a>

              <p>
                🌎 Atención online
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
              Acceso
            </h2>

            <div className="mt-5 grid gap-3">
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-black transition hover:bg-white hover:text-slate-950"
              >
                Iniciar sesión
              </Link>

              <Link
                href="/registro"
                className="rounded-xl bg-[#2563EB] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700"
              >
                🚀 Probar 7 días
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6">
          <div className="flex flex-col gap-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {anioActual} ComerSys. Todos los derechos reservados.
            </p>

            <nav className="flex flex-wrap gap-5">
              {enlacesLegales.map((enlace) => (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className="font-semibold transition hover:text-white"
                >
                  {enlace.texto}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}