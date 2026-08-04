const pasos = [
  {
    numero: "1",
    icono: "👤",
    titulo: "Creá tu cuenta",
    descripcion:
      "Registrate en ComerSys y comenzá tu prueba gratuita de 7 días.",
  },
  {
    numero: "2",
    icono: "🏪",
    titulo: "Configurá tu negocio",
    descripcion:
      "Completá los datos de tu empresa, agregá tu logo y personalizá tu catálogo.",
  },
  {
    numero: "3",
    icono: "📦",
    titulo: "Cargá tus productos",
    descripcion:
      "Agregá productos, categorías, imágenes y precios en pocos minutos.",
  },
  {
    numero: "4",
    icono: "📱",
    titulo: "Compartí tu catálogo",
    descripcion:
      "Generá un código QR y compartilo por WhatsApp o redes sociales.",
  },
  {
    numero: "5",
    icono: "💰",
    titulo: "Empezá a vender",
    descripcion:
      "Administrá clientes, pedidos, caja y hacé crecer tu negocio.",
  },
];

export default function ComoFuncionaPublico() {
  return (
    <section
      id="como-funciona"
      className="bg-slate-50 px-4 py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2563EB]">
            Es muy fácil comenzar
          </p>

          <h2 className="mt-3 text-4xl font-black text-slate-900">
            ¿Cómo funciona ComerSys?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            En pocos minutos vas a tener tu negocio listo para
            vender y compartir tu catálogo mediante un código QR.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          {pasos.map((paso) => (
            <article
              key={paso.numero}
              className="relative rounded-3xl border-2 border-slate-900 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] text-3xl text-white shadow-lg">
                {paso.icono}
              </div>

              <div className="mt-5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-white">
                {paso.numero}
              </div>

              <h3 className="mt-4 text-xl font-black text-slate-900">
                {paso.titulo}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {paso.descripcion}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-[#2563EB] px-8 py-10 text-center text-white shadow-xl">
          <h3 className="text-3xl font-black">
            ¿Listo para comenzar?
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
            Probá ComerSys gratis durante 7 días y descubrí todo
            lo que puede hacer por tu negocio.
          </p>

          <a
            href="/registro"
            className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 text-lg font-black text-[#2563EB] transition hover:scale-105"
          >
            🚀 Probalo gratis durante 7 días
          </a>
        </div>
      </div>
    </section>
  );
}