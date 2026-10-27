"use client";

import {
  DragEvent,
  useEffect,
  useState,
} from "react";

export type MultimediaProducto = {
  id: number;
  empresa_id: number;
  producto_id: number;
  tipo: string;
  url: string;
  nombre_archivo: string | null;
  descripcion: string | null;
  es_principal: boolean;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export function esVideoProducto(item: Pick<MultimediaProducto, "tipo" | "url">) {
  return item.tipo?.toLowerCase() === "video" || /\.(mp4|webm)(?:[?#]|$)/i.test(item.url);
}

type GaleriaMultimediaProps = {
  multimedia: MultimediaProducto[];
  productoNombre: string;
  actualizandoId: number | null;
  eliminandoId: number | null;
  guardandoOrden: boolean;
  onMarcarPrincipal: (
    item: MultimediaProducto
  ) => void | Promise<void>;
  onEliminar: (
    item: MultimediaProducto
  ) => void | Promise<void>;
  onGuardarOrden: (
    items: MultimediaProducto[]
  ) => void | Promise<void>;
};

export default function GaleriaMultimedia({
  multimedia,
  productoNombre,
  actualizandoId,
  eliminandoId,
  guardandoOrden,
  onMarcarPrincipal,
  onEliminar,
  onGuardarOrden,
}: GaleriaMultimediaProps) {
  const [items, setItems] =
    useState<MultimediaProducto[]>([]);
  const [arrastrandoId, setArrastrandoId] =
    useState<number | null>(null);
  const [sobreId, setSobreId] =
    useState<number | null>(null);
  const [ampliado, setAmpliado] = useState<MultimediaProducto | null>(null);

  useEffect(() => {
    if (!ampliado) return;
    const cerrar = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAmpliado(null);
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [ampliado]);

  useEffect(() => {
    setItems(
      [...multimedia].sort(
        (a, b) =>
          Number(a.orden || 0) -
          Number(b.orden || 0)
      )
    );
  }, [multimedia]);

  function iniciarArrastre(
    event: DragEvent<HTMLElement>,
    item: MultimediaProducto
  ) {
    if (
      guardandoOrden ||
      actualizandoId !== null ||
      eliminandoId !== null
    ) {
      event.preventDefault();
      return;
    }

    setArrastrandoId(item.id);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      String(item.id)
    );
  }

  function permitirSoltar(
    event: DragEvent<HTMLElement>,
    destinoId: number
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect =
      "move";
    setSobreId(destinoId);
  }

  async function soltar(
    event: DragEvent<HTMLElement>,
    destinoId: number
  ) {
    event.preventDefault();

    const origenId =
      arrastrandoId ??
      Number(
        event.dataTransfer.getData(
          "text/plain"
        )
      );

    limpiarArrastre();

    if (
      !origenId ||
      origenId === destinoId ||
      guardandoOrden
    ) {
      return;
    }

    const origenIndice =
      items.findIndex(
        (item) => item.id === origenId
      );

    const destinoIndice =
      items.findIndex(
        (item) => item.id === destinoId
      );

    if (
      origenIndice === -1 ||
      destinoIndice === -1
    ) {
      return;
    }

    const copia = [...items];
    const [movido] = copia.splice(
      origenIndice,
      1
    );

    copia.splice(
      destinoIndice,
      0,
      movido
    );

    const reordenados = copia.map(
      (item, indice) => ({
        ...item,
        orden: indice,
      })
    );

    setItems(reordenados);

    try {
      await onGuardarOrden(
        reordenados
      );
    } catch {
      setItems(
        [...multimedia].sort(
          (a, b) =>
            Number(a.orden || 0) -
            Number(b.orden || 0)
        )
      );
    }
  }

  function limpiarArrastre() {
    setArrastrandoId(null);
    setSobreId(null);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Galería del producto
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {items.filter((item) => !esVideoProducto(item)).length} imagen(es) y{" "}
            {items.filter(esVideoProducto).length} video(s) activos
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {guardandoOrden && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Guardando orden...
            </span>
          )}

          {items.length > 1 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              ↕ Arrastrá para ordenar
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EstadoVacio />
      ) : (
        <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(
            (item, indice) => (
              <TarjetaMultimedia
                key={item.id}
                item={item}
                indice={indice}
                productoNombre={
                  productoNombre
                }
                actualizandoId={
                  actualizandoId
                }
                eliminandoId={
                  eliminandoId
                }
                guardandoOrden={
                  guardandoOrden
                }
                arrastrando={
                  arrastrandoId ===
                  item.id
                }
                esDestino={
                  sobreId === item.id &&
                  arrastrandoId !==
                    item.id
                }
                onDragStart={
                  iniciarArrastre
                }
                onDragOver={
                  permitirSoltar
                }
                onDrop={soltar}
                onDragEnd={
                  limpiarArrastre
                }
                onMarcarPrincipal={
                  onMarcarPrincipal
                }
                onEliminar={
                  onEliminar
                }
                onAmpliar={setAmpliado}
              />
            )
          )}
        </div>
      )}

      {ampliado && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada del archivo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setAmpliado(null)}
        >
          <button type="button" onClick={() => setAmpliado(null)} className="absolute right-5 top-5 rounded-lg bg-white px-4 py-2 font-bold text-slate-900">Cerrar ✕</button>
          {esVideoProducto(ampliado) ? (
            <video key={ampliado.id} src={ampliado.url} controls playsInline preload="metadata" className="max-h-[85vh] max-w-full" onClick={(event) => event.stopPropagation()} />
          ) : (
            <img src={ampliado.url} alt={ampliado.descripcion || ampliado.nombre_archivo || productoNombre} className="max-h-[85vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
          )}
        </div>
      )}
    </section>
  );
}

function TarjetaMultimedia({
  item,
  indice,
  productoNombre,
  actualizandoId,
  eliminandoId,
  guardandoOrden,
  arrastrando,
  esDestino,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMarcarPrincipal,
  onEliminar,
  onAmpliar,
}: {
  item: MultimediaProducto;
  indice: number;
  productoNombre: string;
  actualizandoId: number | null;
  eliminandoId: number | null;
  guardandoOrden: boolean;
  arrastrando: boolean;
  esDestino: boolean;
  onDragStart: (
    event: DragEvent<HTMLElement>,
    item: MultimediaProducto
  ) => void;
  onDragOver: (
    event: DragEvent<HTMLElement>,
    destinoId: number
  ) => void;
  onDrop: (
    event: DragEvent<HTMLElement>,
    destinoId: number
  ) => void;
  onDragEnd: () => void;
  onMarcarPrincipal: (
    item: MultimediaProducto
  ) => void | Promise<void>;
  onEliminar: (
    item: MultimediaProducto
  ) => void | Promise<void>;
  onAmpliar: (item: MultimediaProducto) => void;
}) {
  const video = esVideoProducto(item);
  const actualizando =
    actualizandoId === item.id;
  const eliminando =
    eliminandoId === item.id;

  const bloqueado =
    guardandoOrden ||
    actualizandoId !== null ||
    eliminandoId !== null;

  return (
    <article
      draggable={!bloqueado && !video}
      onDragStart={(event) =>
        onDragStart(event, item)
      }
      onDragOver={(event) =>
        onDragOver(event, item.id)
      }
      onDrop={(event) =>
        onDrop(event, item.id)
      }
      onDragEnd={onDragEnd}
      className={`overflow-hidden rounded-3xl border bg-white transition ${
        bloqueado
          ? "cursor-default"
          : "cursor-grab active:cursor-grabbing"
      } ${
        item.es_principal
          ? "border-violet-400 ring-2 ring-violet-100"
          : "border-slate-200"
      } ${
        arrastrando
          ? "scale-95 opacity-50"
          : ""
      } ${
        esDestino
          ? "border-blue-500 ring-4 ring-blue-100"
          : ""
      }`}
    >
      <div className="relative bg-slate-100">
        {video ? (
          <video
            src={item.url}
            controls
            playsInline
            preload="metadata"
            draggable={false}
            className="h-56 w-full bg-black object-contain"
          />
        ) : (
          <button type="button" className="block w-full" onClick={() => onAmpliar(item)} title="Ampliar fotografía">
            <img
              src={item.url}
              alt={item.descripcion || item.nombre_archivo || productoNombre}
              draggable={false}
              className="h-56 w-full select-none object-contain"
            />
          </button>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          {item.es_principal && (
            <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow">
              ⭐ Principal
            </span>
          )}

          <span className="rounded-full bg-slate-900/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            Posición {indice + 1}
          </span>
        </div>

        {video && <button type="button" onClick={() => onAmpliar(item)} className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900">Ampliar video</button>}

        {!bloqueado && !video && (
          <span className="absolute bottom-3 right-3 rounded-xl bg-white/90 px-3 py-2 text-sm font-bold text-slate-700 shadow backdrop-blur">
            ⠿
          </span>
        )}
      </div>

      <div className="p-4">
        <p
          className="truncate font-semibold"
          title={
            item.nombre_archivo ||
            (video ? "Video del producto" : "Imagen del producto")
          }
        >
          {item.nombre_archivo ||
            (video ? "Video del producto" : "Imagen del producto")}
        </p>

        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            Tipo: {item.tipo}
          </span>

          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
            Activa
          </span>
        </div>

        {item.descripcion && (
          <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">
            {item.descripcion}
          </p>
        )}

        <div className="mt-4 grid gap-2">
          {!video && <button
            type="button"
            disabled={
              item.es_principal ||
              video ||
              bloqueado
            }
            onClick={() =>
              onMarcarPrincipal(item)
            }
            className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.es_principal
              ? "✓ Imagen principal"
              : actualizando
                ? "Actualizando..."
                : "Marcar como principal"}
          </button>}

          <button
            type="button"
            disabled={bloqueado}
            onClick={() =>
              onEliminar(item)
            }
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {eliminando
              ? "Eliminando..."
              : video ? "Eliminar video" : "Eliminar imagen"}
          </button>
        </div>
      </div>
    </article>
  );
}

function EstadoVacio() {
  return (
    <div className="p-12 text-center">
      <span className="text-6xl">
        🖼️
      </span>

      <p className="mt-5 font-semibold text-slate-700">
        La galería está vacía
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Seleccioná fotos o videos desde el
        panel izquierdo.
      </p>
    </div>
  );
}