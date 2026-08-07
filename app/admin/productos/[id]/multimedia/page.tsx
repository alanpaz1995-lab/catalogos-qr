"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";
import GaleriaMultimedia, {
  type MultimediaProducto,
} from "@/components/productos/GaleriaMultimedia";

const BUCKET = "productos";
const TAMANO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type Producto = {
  id: number;
  nombre: string;
  imaguen: string | null;
};

type ArchivoPreparado = {
  archivo: File;
  vistaPrevia: string;
};

export default function ProductoMultimediaPage() {
  const params = useParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    empresa,
    cargandoEmpresa,
    errorEmpresa,
  } = useEmpresa();

  const idParametro = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const productoId = Number(idParametro);

  const [producto, setProducto] =
    useState<Producto | null>(null);

  const [multimedia, setMultimedia] =
    useState<MultimediaProducto[]>([]);

  const [archivos, setArchivos] =
    useState<ArchivoPreparado[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [subiendo, setSubiendo] =
    useState(false);

  const [actualizandoId, setActualizandoId] =
    useState<number | null>(null);

  const [eliminandoId, setEliminandoId] =
    useState<number | null>(null);

  const [guardandoOrden, setGuardandoOrden] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const cargarDatos =
    useCallback(async () => {
      if (!empresa?.id) return;

      if (
        !productoId ||
        Number.isNaN(productoId)
      ) {
        setError(
          "El identificador del producto no es válido."
        );
        setCargando(false);
        return;
      }

      setCargando(true);
      setError("");

      const [
        {
          data: productoData,
          error: productoError,
        },
        {
          data: multimediaData,
          error: multimediaError,
        },
      ] = await Promise.all([
        supabase
          .from("productos")
          .select("id, nombre, imaguen")
          .eq("id", productoId)
          .eq("empresa_id", empresa.id)
          .maybeSingle(),

        supabase
          .from("producto_multimedia")
          .select("*")
          .eq("producto_id", productoId)
          .eq("empresa_id", empresa.id)
          .eq("activo", true)
          .order("orden", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (productoError) {
        setError(
          `No se pudo cargar el producto: ${productoError.message}`
        );
        setCargando(false);
        return;
      }

      if (!productoData) {
        setError(
          "No encontramos ese producto."
        );
        setCargando(false);
        return;
      }

      if (multimediaError) {
        setError(
          `No se pudo cargar la galería: ${multimediaError.message}`
        );
        setCargando(false);
        return;
      }

      setProducto(
        productoData as Producto
      );

      setMultimedia(
        (
          multimediaData as MultimediaProducto[]
        ) || []
      );

      setCargando(false);
    }, [empresa?.id, productoId]);

  useEffect(() => {
    if (!empresa?.id) return;

    cargarDatos();
  }, [empresa?.id, cargarDatos]);

  useEffect(() => {
    return () => {
      archivos.forEach((item) => {
        URL.revokeObjectURL(
          item.vistaPrevia
        );
      });
    };
  }, [archivos]);

  const principal = useMemo(
    () =>
      multimedia.find(
        (item) => item.es_principal
      ) ||
      multimedia[0] ||
      null,
    [multimedia]
  );

  function seleccionarArchivos(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const seleccionados = Array.from(
      event.target.files || []
    );

    setError("");
    setMensaje("");

    const validos: ArchivoPreparado[] =
      [];

    for (const archivo of seleccionados) {
      if (
        !TIPOS_PERMITIDOS.includes(
          archivo.type
        )
      ) {
        setError(
          "Solo se permiten imágenes JPG, PNG o WEBP."
        );
        continue;
      }

      if (
        archivo.size > TAMANO_MAXIMO
      ) {
        setError(
          `La imagen "${archivo.name}" supera los 10 MB.`
        );
        continue;
      }

      validos.push({
        archivo,
        vistaPrevia:
          URL.createObjectURL(archivo),
      });
    }

    setArchivos((actuales) => [
      ...actuales,
      ...validos,
    ]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function quitarArchivo(
    indice: number
  ) {
    setArchivos((actuales) => {
      const archivo =
        actuales[indice];

      if (archivo) {
        URL.revokeObjectURL(
          archivo.vistaPrevia
        );
      }

      return actuales.filter(
        (_, indiceActual) =>
          indiceActual !== indice
      );
    });
  }

  function extensionSegura(
    archivo: File
  ) {
    const extension = archivo.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      extension === "jpg" ||
      extension === "jpeg" ||
      extension === "png" ||
      extension === "webp"
    ) {
      return extension;
    }

    return "jpg";
  }

  async function subirArchivos() {
    if (!empresa?.id) {
      setError(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    if (archivos.length === 0) {
      setError(
        "Seleccioná al menos una imagen para subir."
      );
      return;
    }

    setSubiendo(true);
    setError("");
    setMensaje("");

    const subidas: {
      ruta: string;
      url: string;
      nombreArchivo: string;
    }[] = [];

    try {
      for (const item of archivos) {
        const extension =
          extensionSegura(item.archivo);

        const nombreUnico = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const ruta = `${empresa.id}/${productoId}/${nombreUnico}`;

        const {
          error: storageError,
        } = await supabase.storage
          .from(BUCKET)
          .upload(
            ruta,
            item.archivo,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                item.archivo.type,
            }
          );

        if (storageError) {
          throw new Error(
            storageError.message
          );
        }

        const { data: urlData } =
          supabase.storage
            .from(BUCKET)
            .getPublicUrl(ruta);

        subidas.push({
          ruta,
          url: urlData.publicUrl,
          nombreArchivo:
            item.archivo.name,
        });
      }

      const yaExistePrincipal =
        multimedia.some(
          (item) => item.es_principal
        );

      const ordenInicial =
        multimedia.length === 0
          ? 0
          : Math.max(
              ...multimedia.map(
                (item) =>
                  Number(item.orden || 0)
              )
            ) + 1;

      const registros = subidas.map(
        (item, indice) => ({
          empresa_id: empresa.id,
          producto_id: productoId,
          tipo: "Original",
          url: item.url,
          nombre_archivo:
            item.nombreArchivo,
          descripcion: null,
          es_principal:
            !yaExistePrincipal &&
            indice === 0,
          activo: true,
          orden:
            ordenInicial + indice,
        })
      );

      const {
        data: registrosCreados,
        error: baseError,
      } = await supabase
        .from("producto_multimedia")
        .insert(registros)
        .select("*");

      if (baseError) {
        await supabase.storage
          .from(BUCKET)
          .remove(
            subidas.map(
              (item) => item.ruta
            )
          );

        throw new Error(
          baseError.message
        );
      }

      const creados =
        (
          registrosCreados as MultimediaProducto[]
        ) || [];

      const nuevaPrincipal =
        creados.find(
          (item) =>
            item.es_principal
        );

      if (nuevaPrincipal) {
        const {
          error: productoError,
        } = await supabase
          .from("productos")
          .update({
            imaguen:
              nuevaPrincipal.url,
            actualizado_at:
              new Date().toISOString(),
          })
          .eq("id", productoId)
          .eq(
            "empresa_id",
            empresa.id
          );

        if (productoError) {
          console.error(
            "No se pudo actualizar la imagen principal:",
            productoError
          );
        }
      }

      archivos.forEach((item) => {
        URL.revokeObjectURL(
          item.vistaPrevia
        );
      });

      setArchivos([]);

      setMensaje(
        `${creados.length} imagen(es) subida(s) correctamente.`
      );

      await cargarDatos();
    } catch (errorDesconocido) {
      console.error(
        "Error al subir multimedia:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof
          Error
          ? errorDesconocido.message
          : "No se pudieron subir las imágenes."
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function marcarPrincipal(
    item: MultimediaProducto
  ) {
    if (!empresa?.id) {
      setError(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    if (
      item.es_principal ||
      actualizandoId !== null
    ) {
      return;
    }

    setActualizandoId(item.id);
    setError("");
    setMensaje("");

    try {
      const {
        error: quitarError,
      } = await supabase
        .from("producto_multimedia")
        .update({
          es_principal: false,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "producto_id",
          productoId
        )
        .eq(
          "empresa_id",
          empresa.id
        );

      if (quitarError) {
        throw new Error(
          quitarError.message
        );
      }

      const {
        error: marcarError,
      } = await supabase
        .from("producto_multimedia")
        .update({
          es_principal: true,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq(
          "empresa_id",
          empresa.id
        );

      if (marcarError) {
        throw new Error(
          marcarError.message
        );
      }

      const {
        error: productoError,
      } = await supabase
        .from("productos")
        .update({
          imaguen: item.url,
          actualizado_at:
            new Date().toISOString(),
        })
        .eq("id", productoId)
        .eq(
          "empresa_id",
          empresa.id
        );

      if (productoError) {
        throw new Error(
          productoError.message
        );
      }

      setMultimedia(
        (actuales) =>
          actuales.map(
            (actual) => ({
              ...actual,
              es_principal:
                actual.id === item.id,
            })
          )
      );

      setProducto((actual) =>
        actual
          ? {
              ...actual,
              imaguen: item.url,
            }
          : actual
      );

      setMensaje(
        "Imagen principal actualizada correctamente."
      );
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof
          Error
          ? errorDesconocido.message
          : "No se pudo cambiar la imagen principal."
      );
    } finally {
      setActualizandoId(null);
    }
  }

  function obtenerRutaDesdeUrl(
    url: string
  ) {
    const marcador = `/storage/v1/object/public/${BUCKET}/`;

    const indice =
      url.indexOf(marcador);

    if (indice === -1) {
      return null;
    }

    return decodeURIComponent(
      url.slice(
        indice +
          marcador.length
      )
    );
  }

  async function eliminarMultimedia(
    item: MultimediaProducto
  ) {
    if (!empresa?.id) {
      setError(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    if (eliminandoId !== null) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Seguro que querés eliminar "${item.nombre_archivo || "esta imagen"}"?`
      );

    if (!confirmar) {
      return;
    }

    setEliminandoId(item.id);
    setError("");
    setMensaje("");

    try {
      const eraPrincipal =
        item.es_principal;

      const {
        error: baseError,
      } = await supabase
        .from("producto_multimedia")
        .delete()
        .eq("id", item.id)
        .eq(
          "empresa_id",
          empresa.id
        );

      if (baseError) {
        throw new Error(
          baseError.message
        );
      }

      const ruta =
        obtenerRutaDesdeUrl(
          item.url
        );

      if (ruta) {
        const {
          error: storageError,
        } = await supabase.storage
          .from(BUCKET)
          .remove([ruta]);

        if (storageError) {
          console.warn(
            "El registro se eliminó, pero Storage respondió:",
            storageError
          );
        }
      }

      const restantes =
        multimedia.filter(
          (actual) =>
            actual.id !== item.id
        );

      setMultimedia(restantes);

      if (eraPrincipal) {
        const nuevaPrincipal =
          restantes[0] || null;

        if (nuevaPrincipal) {
          await supabase
            .from(
              "producto_multimedia"
            )
            .update({
              es_principal: true,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              nuevaPrincipal.id
            )
            .eq(
              "empresa_id",
              empresa.id
            );
        }

        await supabase
          .from("productos")
          .update({
            imaguen:
              nuevaPrincipal?.url ||
              null,
            actualizado_at:
              new Date().toISOString(),
          })
          .eq("id", productoId)
          .eq(
            "empresa_id",
            empresa.id
          );

        setProducto((actual) =>
          actual
            ? {
                ...actual,
                imaguen:
                  nuevaPrincipal?.url ||
                  null,
              }
            : actual
        );

        setMultimedia(
          (actuales) =>
            actuales.map(
              (actual) => ({
                ...actual,
                es_principal:
                  nuevaPrincipal !==
                    null &&
                  actual.id ===
                    nuevaPrincipal.id,
              })
            )
        );
      }

      setMensaje(
        "Imagen eliminada correctamente."
      );
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof
          Error
          ? errorDesconocido.message
          : "No se pudo eliminar la imagen."
      );
    } finally {
      setEliminandoId(null);
    }
  }

  async function guardarOrden(
    itemsOrdenados: MultimediaProducto[]
  ) {
    if (!empresa?.id) {
      setError(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    if (guardandoOrden) {
      return;
    }

    setGuardandoOrden(true);
    setError("");
    setMensaje("");

    const anteriores = multimedia;

    setMultimedia(itemsOrdenados);

    try {
      const resultados =
        await Promise.all(
          itemsOrdenados.map(
            (item, indice) =>
              supabase
                .from(
                  "producto_multimedia"
                )
                .update({
                  orden: indice,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq("id", item.id)
                .eq(
                  "empresa_id",
                  empresa.id
                )
          )
        );

      const errorOrden =
        resultados.find(
          (resultado) =>
            resultado.error
        )?.error;

      if (errorOrden) {
        throw new Error(
          errorOrden.message
        );
      }

      setMultimedia(
        itemsOrdenados.map(
          (item, indice) => ({
            ...item,
            orden: indice,
          })
        )
      );

      setMensaje(
        "Orden de imágenes guardado correctamente."
      );
    } catch (errorDesconocido) {
      setMultimedia(anteriores);

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo guardar el nuevo orden."
      );

      throw errorDesconocido;
    } finally {
      setGuardandoOrden(false);
    }
  }

  if (cargandoEmpresa || cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p className="mt-4 text-slate-500">
            Cargando Multimedia PRO...
          </p>
        </div>
      </main>
    );
  }

  if (errorEmpresa) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8">
          <h1 className="text-2xl font-bold">
            No se pudo cargar la empresa
          </h1>

          <p className="mt-3 text-red-600">
            {errorEmpresa}
          </p>

          <Link
            href="/admin/productos"
            className="mt-6 inline-flex rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
          >
            Volver a productos
          </Link>
        </div>
      </main>
    );
  }

  if (!producto) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8">
          <h1 className="text-2xl font-bold">
            No se pudo abrir Multimedia PRO
          </h1>

          <p className="mt-3 text-red-600">
            {error ||
              "Producto no encontrado."}
          </p>

          <Link
            href="/admin/productos"
            className="mt-6 inline-flex rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
          >
            Volver a productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/productos"
              className="font-semibold text-[#2563EB]"
            >
              ← Volver a Productos PRO
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-violet-600">
              Multimedia PRO
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {producto.nombre}
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Subí varias imágenes,
              elegí la principal y
              administrá la galería del
              producto.
            </p>
          </div>

          <Link
            href={`/admin/productos/editar/${productoId}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold shadow-sm"
          >
            Editar producto
          </Link>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-700">
            ✓ {mensaje}
          </div>
        )}

        <section className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Imagen principal
              </h2>

              {principal ? (
                <>
                  <img
                    src={principal.url}
                    alt={producto.nombre}
                    className="mt-5 h-80 w-full rounded-2xl border border-slate-200 object-contain"
                  />

                  <p className="mt-4 truncate text-sm font-semibold">
                    {principal.nombre_archivo ||
                      "Imagen principal"}
                  </p>
                </>
              ) : (
                <div className="mt-5 flex h-80 items-center justify-center rounded-2xl bg-slate-100 p-6 text-center text-slate-400">
                  Todavía no hay imágenes
                  cargadas.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Agregar imágenes
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Podés seleccionar varias
                fotografías de una sola vez.
              </p>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  seleccionarArchivos
                }
                className="hidden"
              />

              <button
                type="button"
                disabled={subiendo}
                onClick={() =>
                  inputRef.current?.click()
                }
                className="mt-5 w-full rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 px-5 py-8 font-semibold text-violet-700 disabled:opacity-50"
              >
                📁 Seleccionar imágenes
              </button>

              <p className="mt-3 text-center text-xs text-slate-400">
                JPG, PNG o WEBP · Máximo
                10 MB por imagen
              </p>

              {archivos.length > 0 && (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {archivos.map(
                      (item, indice) => (
                        <div
                          key={`${item.archivo.name}-${indice}`}
                          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                        >
                          <img
                            src={
                              item.vistaPrevia
                            }
                            alt={
                              item.archivo.name
                            }
                            className="h-32 w-full object-cover"
                          />

                          <button
                            type="button"
                            disabled={
                              subiendo
                            }
                            onClick={() =>
                              quitarArchivo(
                                indice
                              )
                            }
                            className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-bold text-red-600 shadow"
                          >
                            ✕
                          </button>

                          <p className="truncate p-2 text-xs font-semibold">
                            {
                              item.archivo
                                .name
                            }
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={subiendo}
                    onClick={
                      subirArchivos
                    }
                    className="mt-5 w-full rounded-xl bg-[#F97316] px-5 py-4 font-semibold text-white disabled:opacity-50"
                  >
                    {subiendo
                      ? "Subiendo imágenes..."
                      : `Subir ${archivos.length} imagen(es)`}
                  </button>
                </>
              )}
            </div>
          </div>

          <GaleriaMultimedia
            multimedia={multimedia}
            productoNombre={
              producto.nombre
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
            onMarcarPrincipal={
              marcarPrincipal
            }
            onEliminar={
              eliminarMultimedia
            }
            onGuardarOrden={
              guardarOrden
            }
          />
        </section>
      </div>
    </main>
  );
}