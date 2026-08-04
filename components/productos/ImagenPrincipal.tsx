"use client";

type ImagenPrincipalProps = {
  productoNombre: string;
  url: string | null;
  nombreArchivo?: string | null;
};

export default function ImagenPrincipal({
  productoNombre,
  url,
  nombreArchivo,
}: ImagenPrincipalProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Imagen principal
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Es la imagen que se muestra primero en el catálogo.
          </p>
        </div>

        {url && (
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            ⭐ Principal
          </span>
        )}
      </div>

      {url ? (
        <>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img
              src={url}
              alt={productoNombre}
              className="h-80 w-full object-contain"
            />
          </div>

          <p
            className="mt-4 truncate text-sm font-semibold text-slate-700"
            title={
              nombreArchivo ||
              "Imagen principal"
            }
          >
            {nombreArchivo ||
              "Imagen principal"}
          </p>
        </>
      ) : (
        <div className="mt-5 flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <span className="text-5xl">
            🖼️
          </span>

          <p className="mt-4 font-semibold text-slate-600">
            Todavía no hay una imagen principal
          </p>

          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
            Subí una imagen para que aparezca en el catálogo del producto.
          </p>
        </div>
      )}
    </section>
  );
}