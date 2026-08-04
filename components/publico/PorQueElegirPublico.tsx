const motivos = [
  {
    icono: "🧩",
    titulo: "Todo integrado",
    descripcion:
      "Productos, clientes, pedidos, caja, catálogo QR e inteligencia artificial dentro del mismo sistema.",
  },
  {
    icono: "📱",
    titulo: "Usalo desde cualquier dispositivo",
    descripcion:
      "Accedé desde computadora, tablet o celular sin instalar programas adicionales.",
  },
  {
    icono: "⚡",
    titulo: "Simple y rápido",
    descripcion:
      "ComerSys está pensado para que puedas empezar a usarlo sin conocimientos técnicos.",
  },
  {
    icono: "📊",
    titulo: "Información clara",
    descripcion:
      "Consultá ventas, saldos, stock, pedidos y movimientos desde un panel fácil de entender.",
  },
  {
    icono: "🔄",
    titulo: "Catálogo siempre actualizado",
    descripcion:
      "Los cambios de precios, productos e imágenes se reflejan en tu catálogo digital.",
  },
  {
    icono: "🚀",
    titulo: "Preparado para crecer",
    descripcion:
      "Empezá con lo necesario y sumá nuevas funciones a medida que tu negocio avance.",
  },
];

export default function PorQueElegirPublico() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2563EB]">
              Pensado para comercios reales
            </p>

            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
              ¿Por qué elegir ComerSys?
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Porque administrar un negocio no debería ser complicado.
              ComerSys reúne las herramientas principales en una
              experiencia simple, clara y preparada para acompañarte
              todos los días.
            </p>

            <div className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">
              <p className="text-xl font-black text-slate-900">
                Menos tiempo administrando.
              </p>

              <p className="mt-2 text-xl font-black text-[#F97316]">
                Más tiempo haciendo crecer tu negocio.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {motivos.map((motivo) => (
              <article
                key={motivo.titulo}
                className="rounded-3xl border-2 border-slate-900 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB] text-3xl shadow-md shadow-blue-200">
                  {motivo.icono}
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-900">
                  {motivo.titulo}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {motivo.descripcion}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}