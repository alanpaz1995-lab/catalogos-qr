"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

const EMPRESA_ID = 1;

type Producto = {
  id: number;
  empresa_id: number;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  precio: number;
  stock: number;
  stock_minimo: number;
  imaguen: string | null;
  estado: string;
  visible_catalogo: boolean;
  nuevo_ingreso: boolean;
  oferta: boolean;
  destacado: boolean;
};

type AccionIA =
  | "mejorar_descripcion"
  | "generar_titulo"
  | "generar_palabras_clave"
  | "detectar_categoria"
  | "sugerir_precio"
  | "crear_publicacion"
  | "traducir_descripcion"
  | "analizar_imagen";

type ResultadoIA = {
  titulo?: string;
  categoria?: string;
  descripcion?: string;
  palabrasClave?: string[];
  precioSugerido?: number;
  publicacion?: string;
  traduccion?: string;
  observaciones?: string[];
};

export default function CentroIAProductoPage() {
  const params = useParams();

  const idParametro = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const productoId = Number(idParametro);

  const [producto, setProducto] =
    useState<Producto | null>(null);

  const [accionActiva, setAccionActiva] =
    useState<AccionIA | null>(null);

  const [resultado, setResultado] =
    useState<ResultadoIA | null>(null);

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargarProducto = useCallback(async () => {
    if (!productoId || Number.isNaN(productoId)) {
      setError(
        "El identificador del producto no es válido."
      );
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    const { data, error: errorConsulta } =
      await supabase
        .from("productos")
        .select(
          `
          id,
          empresa_id,
          nombre,
          categoria,
          descripcion,
          precio,
          stock,
          stock_minimo,
          imaguen,
          estado,
          visible_catalogo,
          nuevo_ingreso,
          oferta,
          destacado
          `
        )
        .eq("id", productoId)
        .eq("empresa_id", EMPRESA_ID)
        .maybeSingle();

    if (errorConsulta) {
      setError(
        `No se pudo cargar el producto: ${errorConsulta.message}`
      );
      setCargando(false);
      return;
    }

    if (!data) {
      setError("No encontramos ese producto.");
      setCargando(false);
      return;
    }

    setProducto(data as Producto);
    setCargando(false);
  }, [productoId]);

  useEffect(() => {
    cargarProducto();
  }, [cargarProducto]);

  const precioFormateado = useMemo(() => {
    if (!producto) return "";

    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(producto.precio));
  }, [producto]);

  function crearResultadoDesarrollo(
    accion: AccionIA
  ): ResultadoIA {
    if (!producto) return {};

    const nombre = producto.nombre;
    const categoria =
      producto.categoria || "Sin categoría";

    const descripcionBase =
      producto.descripcion?.trim() ||
      `${nombre} disponible en nuestro catálogo.`;

    const resultados: Record<
      AccionIA,
      ResultadoIA
    > = {
      mejorar_descripcion: {
        descripcion: `${nombre} es una propuesta pensada para quienes buscan calidad, practicidad y una presentación cuidada. Ideal para sumar a tu día a día o para regalar. Consultanos por disponibilidad y más detalles.`,
        observaciones: [
          "Descripción más comercial.",
          "Texto más claro y atractivo.",
          "Preparado para catálogo y redes.",
        ],
      },

      generar_titulo: {
        titulo: `${nombre} Premium`,
        observaciones: [
          "Título breve.",
          "Mantiene el nombre original.",
          "Agrega un enfoque comercial.",
        ],
      },

      generar_palabras_clave: {
        palabrasClave: [
          categoria,
          nombre,
          "calidad",
          "producto",
          "nuevo ingreso",
        ],
        observaciones: [
          "Palabras útiles para búsqueda.",
          "Preparadas para catálogo y redes.",
        ],
      },

      detectar_categoria: {
        categoria:
          categoria === "Sin categoría"
            ? "Productos"
            : categoria,
        observaciones: [
          "Categoría sugerida en modo desarrollo.",
          "Revisala antes de guardar.",
        ],
      },

      sugerir_precio: {
        precioSugerido:
          Number(producto.precio) > 0
            ? Math.round(
                Number(producto.precio) * 1.1
              )
            : 10000,
        observaciones: [
          "Sugerencia calculada en modo desarrollo.",
          "No reemplaza un análisis real de costos y mercado.",
        ],
      },

      crear_publicacion: {
        publicacion: `✨ ${nombre}

${descripcionBase}

💰 Precio: ${precioFormateado}
✅ Consultanos por disponibilidad.

#${categoria.replace(/\s+/g, "")} #ComerSys #NuevoIngreso`,
        observaciones: [
          "Texto listo para Instagram, Facebook o WhatsApp.",
          "Podés editarlo antes de copiar.",
        ],
      },

      traducir_descripcion: {
        traduccion: `${nombre} is available in our catalog. A practical and attractive option for everyday use. Contact us for more information and availability.`,
        observaciones: [
          "Traducción al inglés en modo desarrollo.",
        ],
      },

      analizar_imagen: {
        observaciones: producto.imaguen
          ? [
              "La imagen principal está disponible.",
              "El producto puede analizarse cuando OpenAI tenga créditos.",
              "La foto se encuentra lista para futuras mejoras.",
            ]
          : [
              "El producto todavía no tiene imagen principal.",
              "Agregá una imagen desde Multimedia PRO.",
            ],
      },
    };

    return resultados[accion];
  }

  async function ejecutarAccion(
    accion: AccionIA
  ) {
    if (!producto || procesando) return;

    setAccionActiva(accion);
    setProcesando(true);
    setResultado(null);
    setError("");
    setMensaje("");

    try {
      await new Promise((resolve) =>
        window.setTimeout(resolve, 750)
      );

      setResultado(
        crearResultadoDesarrollo(accion)
      );
    } catch {
      setError(
        "No se pudo ejecutar la acción seleccionada."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function aplicarResultado() {
    if (!producto || !resultado) return;

    const cambios: Record<
      string,
      string | number | null
    > = {
      actualizado_at: new Date().toISOString(),
    };

    if (resultado.titulo) {
      cambios.nombre = resultado.titulo;
    }

    if (resultado.categoria) {
      cambios.categoria = resultado.categoria;
    }

    if (resultado.descripcion) {
      cambios.descripcion = resultado.descripcion;
    }

    if (resultado.precioSugerido !== undefined) {
      cambios.precio =
        resultado.precioSugerido;
    }

    const tieneCambios =
      "nombre" in cambios ||
      "categoria" in cambios ||
      "descripcion" in cambios ||
      "precio" in cambios;

    if (!tieneCambios) {
      setMensaje(
        "Este resultado no modifica campos del producto. Podés copiarlo o usarlo como referencia."
      );
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const { error: errorActualizacion } =
      await supabase
        .from("productos")
        .update(cambios)
        .eq("id", producto.id)
        .eq("empresa_id", EMPRESA_ID);

    if (errorActualizacion) {
      setError(
        `No se pudo aplicar el resultado: ${errorActualizacion.message}`
      );
      setGuardando(false);
      return;
    }

    setProducto((actual) =>
      actual
        ? {
            ...actual,
            nombre:
              resultado.titulo ??
              actual.nombre,
            categoria:
              resultado.categoria ??
              actual.categoria,
            descripcion:
              resultado.descripcion ??
              actual.descripcion,
            precio:
              resultado.precioSugerido ??
              actual.precio,
          }
        : actual
    );

    setMensaje(
      "Resultado aplicado correctamente al producto."
    );
    setGuardando(false);
  }

  async function copiarResultado() {
    if (!resultado) return;

    const texto =
      resultado.publicacion ||
      resultado.traduccion ||
      resultado.descripcion ||
      resultado.titulo ||
      resultado.categoria ||
      resultado.palabrasClave?.join(", ") ||
      resultado.observaciones?.join("\n") ||
      "";

    if (!texto) return;

    try {
      await navigator.clipboard.writeText(texto);
      setMensaje("Resultado copiado.");
    } catch {
      setError(
        "No se pudo copiar el resultado automáticamente."
      );
    }
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
          <p className="mt-4 text-slate-500">
            Cargando Centro IA...
          </p>
        </div>
      </main>
    );
  }

  if (!producto) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            No se pudo abrir el Centro IA
          </h1>

          <p className="mt-3 text-red-600">
            {error || "Producto no encontrado."}
          </p>

          <Link
            href="/admin/productos"
            className="mt-6 inline-flex rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
          >
            Volver a Productos PRO
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
              Centro IA
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {producto.nombre}
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Usá herramientas inteligentes para mejorar,
              analizar y promocionar este producto.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/productos/editar/${producto.id}`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold shadow-sm"
            >
              Editar producto
            </Link>

            <Link
              href={`/admin/productos/${producto.id}/marketing`}
              className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 font-semibold text-orange-700"
            >
              Marketing PRO
            </Link>

            <Link
              href={`/admin/productos/${producto.id}/multimedia`}
              className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700"
            >
              Multimedia PRO
            </Link>
          </div>
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
          <aside className="space-y-6">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {producto.imaguen ? (
                <img
                  src={producto.imaguen}
                  alt={producto.nombre}
                  className="h-72 w-full rounded-2xl border border-slate-200 object-contain"
                />
              ) : (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  Sin imagen principal
                </div>
              )}

              <h2 className="mt-5 text-xl font-bold">
                {producto.nombre}
              </h2>

              <p className="mt-1 text-sm font-semibold text-[#2563EB]">
                {producto.categoria ||
                  "Sin categoría"}
              </p>

              <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-500">
                {producto.descripcion ||
                  "Sin descripción cargada."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Dato
                  titulo="Precio"
                  valor={precioFormateado}
                />

                <Dato
                  titulo="Stock"
                  valor={String(producto.stock)}
                />
              </div>
            </article>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-sm leading-6 text-blue-700">
              <p className="font-bold">
                Modo Desarrollo IA
              </p>

              <p className="mt-2">
                Las herramientas funcionan con resultados
                locales de prueba. Cuando OpenAI tenga
                créditos, conectaremos las mismas acciones
                con IA real.
              </p>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
                Herramientas
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                ¿Qué querés hacer?
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Accion
                  icono="🖼️"
                  titulo="Analizar imagen"
                  descripcion="Revisa la imagen principal y prepara observaciones."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "analizar_imagen"
                    )
                  }
                />

                <Accion
                  icono="📝"
                  titulo="Mejorar descripción"
                  descripcion="Genera una descripción más clara y comercial."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "mejorar_descripcion"
                    )
                  }
                />

                <Accion
                  icono="🏷️"
                  titulo="Generar título"
                  descripcion="Propone un nombre comercial más atractivo."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "generar_titulo"
                    )
                  }
                />

                <Accion
                  icono="🔑"
                  titulo="Palabras clave"
                  descripcion="Prepara términos para catálogo y redes."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "generar_palabras_clave"
                    )
                  }
                />

                <Accion
                  icono="📦"
                  titulo="Detectar categoría"
                  descripcion="Sugiere una categoría para organizar el producto."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "detectar_categoria"
                    )
                  }
                />

                <Accion
                  icono="💰"
                  titulo="Sugerir precio"
                  descripcion="Calcula una referencia de precio en modo desarrollo."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "sugerir_precio"
                    )
                  }
                />

                <Accion
                  icono="📱"
                  titulo="Crear publicación"
                  descripcion="Genera contenido listo para redes y WhatsApp."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "crear_publicacion"
                    )
                  }
                />

                <Accion
                  icono="🌐"
                  titulo="Traducir descripción"
                  descripcion="Prepara una versión en inglés."
                  disabled={procesando}
                  onClick={() =>
                    ejecutarAccion(
                      "traducir_descripcion"
                    )
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
                    Resultado
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {accionActiva
                      ? "Sugerencia generada"
                      : "Esperando una acción"}
                  </h2>
                </div>

                {procesando && (
                  <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
                    Procesando...
                  </span>
                )}
              </div>

              {!resultado ? (
                <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-2xl bg-slate-50 p-8 text-center text-slate-400">
                  Seleccioná una herramienta para ver el
                  resultado.
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  {resultado.titulo && (
                    <BloqueResultado
                      titulo="Título sugerido"
                      contenido={resultado.titulo}
                    />
                  )}

                  {resultado.categoria && (
                    <BloqueResultado
                      titulo="Categoría sugerida"
                      contenido={resultado.categoria}
                    />
                  )}

                  {resultado.descripcion && (
                    <BloqueResultado
                      titulo="Descripción mejorada"
                      contenido={resultado.descripcion}
                    />
                  )}

                  {resultado.precioSugerido !==
                    undefined && (
                    <BloqueResultado
                      titulo="Precio sugerido"
                      contenido={new Intl.NumberFormat(
                        "es-AR",
                        {
                          style: "currency",
                          currency: "ARS",
                          maximumFractionDigits: 0,
                        }
                      ).format(
                        resultado.precioSugerido
                      )}
                    />
                  )}

                  {resultado.publicacion && (
                    <BloqueResultado
                      titulo="Publicación"
                      contenido={resultado.publicacion}
                      multilinea
                    />
                  )}

                  {resultado.traduccion && (
                    <BloqueResultado
                      titulo="Traducción"
                      contenido={resultado.traduccion}
                      multilinea
                    />
                  )}

                  {resultado.palabrasClave && (
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Palabras clave
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {resultado.palabrasClave.map(
                          (palabra) => (
                            <span
                              key={palabra}
                              className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600"
                            >
                              {palabra}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {resultado.observaciones && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                      <p className="font-bold text-blue-800">
                        Observaciones
                      </p>

                      <div className="mt-3 space-y-2 text-sm text-blue-700">
                        {resultado.observaciones.map(
                          (observacion) => (
                            <p key={observacion}>
                              ✓ {observacion}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={copiarResultado}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-4 font-semibold"
                    >
                      📋 Copiar resultado
                    </button>

                    <button
                      type="button"
                      disabled={guardando}
                      onClick={aplicarResultado}
                      className="rounded-xl bg-[#2563EB] px-5 py-4 font-semibold text-white disabled:opacity-60"
                    >
                      {guardando
                        ? "Aplicando..."
                        : "Aplicar al producto"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 font-bold">{valor}</p>
    </div>
  );
}

function Accion({
  icono,
  titulo,
  descripcion,
  disabled,
  onClick,
}: {
  icono: string;
  titulo: string;
  descripcion: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-1 hover:border-violet-300 hover:bg-violet-50 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-3xl">{icono}</span>

      <h3 className="mt-4 font-bold">
        {titulo}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>
    </button>
  );
}

function BloqueResultado({
  titulo,
  contenido,
  multilinea = false,
}: {
  titulo: string;
  contenido: string;
  multilinea?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-500">
        {titulo}
      </p>

      <div
        className={`mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 ${
          multilinea
            ? "whitespace-pre-wrap leading-7"
            : "font-semibold"
        }`}
      >
        {contenido}
      </div>
    </div>
  );
}