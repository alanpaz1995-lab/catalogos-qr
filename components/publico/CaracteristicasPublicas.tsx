const caracteristicas = [
  {
    icono: "📦",
    titulo: "Productos",
    descripcion:
      "Creá, organizá y actualizá tu catálogo, precios, stock e imágenes desde un solo lugar.",
  },
  {
    icono: "👥",
    titulo: "Clientes",
    descripcion:
      "Registrá clientes, consultá su historial y controlá saldos y cuentas corrientes.",
  },
  {
    icono: "🧾",
    titulo: "Pedidos",
    descripcion:
      "Creá pedidos, seguí su estado y mantené organizada cada venta de tu negocio.",
  },
  {
    icono: "💰",
    titulo: "Caja",
    descripcion:
      "Controlá ingresos, cobros y movimientos para conocer la situación diaria de tu negocio.",
  },
  {
    icono: "📱",
    titulo: "Catálogo con QR",
    descripcion:
      "Compartí tus productos por WhatsApp o mediante un código QR siempre actualizado.",
  },
  {
    icono: "🤖",
    titulo: "Inteligencia artificial",
    descripcion:
      "Ahorrá tiempo creando descripciones, contenido comercial y productos con ayuda de IA.",
  },
];

export default function CaracteristicasPublicas() {
  return (
    <section
      id="funciones"
      className="scroll-mt-32 bg-white px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2563EB]">
            Todo en un solo lugar
          </p>

          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            Las herramientas que necesitás para organizar y hacer crecer tu negocio
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            ComerSys reúne las tareas más importantes de tu comercio en una plataforma simple, clara y accesible.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {caracteristicas.map((caracteristica) => (
            <article
              key={caracteristica.titulo}
              className="group rounded-3xl border-2 border-slate-900 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB] text-3xl shadow-md shadow-blue-200 transition group-hover:scale-105">
                {caracteristica.icono}
              </div>

              <h3 className="mt-5 text-xl font-black text-slate-900">
                {caracteristica.titulo}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {caracteristica.descripcion}
              </p>
            </article>
          ))}
        </div>

        <div
          id="beneficios"
          className="mt-12 scroll-mt-32 rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8"
        >
          <div className="grid gap-5 text-center sm:grid-cols-3">
            <Beneficio
              valor="24/7"
              texto="Acceso desde cualquier lugar"
            />

            <Beneficio
              valor="1 solo"
              texto="Sistema para gestionar todo"
            />

            <Beneficio
              valor="5 min"
              texto="Para comenzar a configurarlo"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Beneficio({
  valor,
  texto,
}: {
  valor: string;
  texto: string;
}) {
  return (
    <div>
      <p className="text-3xl font-black text-[#2563EB]">
        {valor}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-700">
        {texto}
      </p>
    </div>
  );
}