import Link from "next/link";

const planes = [
  {
    nombre: "Prueba gratuita",
    descripcion:
      "Ideal para conocer ComerSys y probar todas sus herramientas.",
    precio: "7 días gratis",
    destacado: true,
    color: "verde",
    boton: "🚀 Probar gratis",
    href: "/registro",
    funciones: [
      "Acceso a todas las funciones",
      "Sin tarjeta de crédito",
      "Productos y clientes",
      "Pedidos y caja",
      "Catálogo digital con QR",
      "Herramientas de inteligencia artificial",
    ],
  },
  {
    nombre: "Profesional",
    descripcion:
      "Para comercios que necesitan administrar su negocio todos los días.",
    precio: "Próximamente",
    destacado: false,
    color: "azul",
    boton: "Comenzar",
    href: "/registro",
    funciones: [
      "Productos ilimitados",
      "Gestión de clientes",
      "Pedidos y cuentas corrientes",
      "Control de caja",
      "Estadísticas comerciales",
      "Soporte técnico",
    ],
  },
  {
    nombre: "Empresa",
    descripcion:
      "Para negocios con mayor volumen, equipos de trabajo o varias sucursales.",
    precio: "Consultar",
    destacado: false,
    color: "violeta",
    boton: "Consultar",
    href: "#contacto",
    funciones: [
      "Todo lo incluido en Profesional",
      "Múltiples usuarios",
      "Roles y permisos",
      "Varias sucursales",
      "Reportes avanzados",
      "Soporte prioritario",
    ],
  },
];

export default function PlanesPublicos() {
  return (
    <section
      id="planes"
      className="scroll-mt-32 bg-slate-50 px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2563EB]">
            Planes ComerSys
          </p>

          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            Elegí la opción ideal para tu negocio
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Empezá con una prueba gratuita y elegí tu plan
            cuando ya conozcas todo lo que ComerSys puede hacer.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {planes.map((plan) => (
            <Plan key={plan.nombre} {...plan} />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Los precios definitivos y las condiciones comerciales
          se incorporarán próximamente.
        </p>
      </div>
    </section>
  );
}

type PlanProps = {
  nombre: string;
  descripcion: string;
  precio: string;
  destacado: boolean;
  color: string;
  boton: string;
  href: string;
  funciones: string[];
};

function Plan({
  nombre,
  descripcion,
  precio,
  destacado,
  color,
  boton,
  href,
  funciones,
}: PlanProps) {
  const estilos = obtenerEstilos(color);

  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl border-2 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        destacado
          ? "border-green-500 ring-4 ring-green-100"
          : "border-slate-900"
      }`}
    >
      {destacado && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg">
          ⭐ Ideal para empezar
        </span>
      )}

      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-md ${estilos.icono}`}
      >
        {color === "verde"
          ? "🎁"
          : color === "azul"
            ? "🚀"
            : "🏢"}
      </div>

      <h3 className="mt-6 text-2xl font-black text-slate-900">
        {nombre}
      </h3>

      <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600">
        {descripcion}
      </p>

      <p className={`mt-6 text-3xl font-black ${estilos.precio}`}>
        {precio}
      </p>

      <div className="my-6 h-px bg-slate-200" />

      <ul className="flex-1 space-y-3">
        {funciones.map((funcion) => (
          <li
            key={funcion}
            className="flex items-start gap-3 text-sm leading-6 text-slate-700"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${estilos.check}`}
            >
              ✓
            </span>

            <span>{funcion}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`mt-8 rounded-2xl px-6 py-4 text-center font-black transition hover:-translate-y-0.5 ${estilos.boton}`}
      >
        {boton}
      </Link>
    </article>
  );
}

function obtenerEstilos(color: string) {
  switch (color) {
    case "verde":
      return {
        icono: "bg-green-100 text-green-700",
        precio: "text-green-700",
        check: "bg-green-100 text-green-700",
        boton:
          "bg-green-600 text-white hover:bg-green-700",
      };

    case "violeta":
      return {
        icono: "bg-violet-100 text-violet-700",
        precio: "text-violet-700",
        check: "bg-violet-100 text-violet-700",
        boton:
          "bg-violet-600 text-white hover:bg-violet-700",
      };

    default:
      return {
        icono: "bg-blue-100 text-blue-700",
        precio: "text-[#2563EB]",
        check: "bg-blue-100 text-blue-700",
        boton:
          "bg-[#2563EB] text-white hover:bg-blue-700",
      };
  }
}