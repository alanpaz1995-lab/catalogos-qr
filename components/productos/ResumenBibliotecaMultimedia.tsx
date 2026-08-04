type ResumenBibliotecaMultimediaProps = {
  totalImagenes: number;
  imagenesPrincipales: number;
  productosConImagenes: number;
  resultadosVisibles: number;
};

export default function ResumenBibliotecaMultimedia({
  totalImagenes,
  imagenesPrincipales,
  productosConImagenes,
  resultadosVisibles,
}: ResumenBibliotecaMultimediaProps) {
  const items = [
    {
      titulo: "Imágenes activas",
      valor: totalImagenes,
      detalle: "Total disponible",
    },
    {
      titulo: "Imágenes principales",
      valor: imagenesPrincipales,
      detalle: "Marcadas como portada",
    },
    {
      titulo: "Productos con imágenes",
      valor: productosConImagenes,
      detalle: "Productos representados",
    },
    {
      titulo: "Resultados visibles",
      valor: resultadosVisibles,
      detalle: "Según el filtro actual",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.titulo}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm font-semibold text-slate-500">
            {item.titulo}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {item.valor}
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {item.detalle}
          </p>
        </article>
      ))}
    </section>
  );
}