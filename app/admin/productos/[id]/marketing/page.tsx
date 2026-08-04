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
  imaguen: string | null;
  oferta: boolean;
  nuevo_ingreso: boolean;
  destacado: boolean;
};

type Plataforma =
  | "Instagram"
  | "Facebook"
  | "WhatsApp";

type Tono =
  | "Profesional"
  | "Cercano"
  | "Entusiasta"
  | "Elegante";

export default function MarketingProductoPage() {
  const params = useParams();

  const idParametro = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const productoId = Number(idParametro);

  const [producto, setProducto] =
    useState<Producto | null>(null);
  const [plataforma, setPlataforma] =
    useState<Plataforma>("Instagram");
  const [tono, setTono] =
    useState<Tono>("Cercano");
  const [incluirPrecio, setIncluirPrecio] =
    useState(true);
  const [incluirHashtags, setIncluirHashtags] =
    useState(true);
  const [textoGenerado, setTextoGenerado] =
    useState("");
  const [cargando, setCargando] =
    useState(true);
  const [generando, setGenerando] =
    useState(false);
  const [copiado, setCopiado] =
    useState(false);
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
          imaguen,
          oferta,
          nuevo_ingreso,
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
      setError(
        "No encontramos ese producto."
      );
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

  function encabezadoPorTono() {
    if (!producto) return "";

    const nombre = producto.nombre;

    const encabezados: Record<Tono, string> = {
      Profesional:
        `Conocé ${nombre}, una nueva opción disponible en nuestro catálogo.`,
      Cercano:
        `¡Mirá lo que tenemos para vos! ${nombre} ya está disponible.`,
      Entusiasta:
        `🔥 ¡Llegó ${nombre}! Una incorporación que no te podés perder.`,
      Elegante:
        `${nombre}: una propuesta pensada para quienes valoran cada detalle.`,
    };

    return encabezados[tono];
  }

  function hashtagsProducto() {
    if (!producto) return "";

    const palabras = [
      producto.categoria || "Producto",
      producto.nombre,
      "ComerSys",
      producto.nuevo_ingreso
        ? "NuevoIngreso"
        : "",
      producto.oferta ? "Oferta" : "",
      producto.destacado
        ? "Destacado"
        : "",
    ]
      .filter(Boolean)
      .flatMap((texto) =>
        texto
          .split(/\s+/)
          .map((palabra) =>
            palabra.replace(
              /[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g,
              ""
            )
          )
      )
      .filter((palabra) => palabra.length > 2)
      .slice(0, 7)
      .map((palabra) => `#${palabra}`);

    return hashtags.join(" ");
  }

  function construirTextoDesarrollo() {
    if (!producto) return "";

    const descripcion =
      producto.descripcion?.trim() ||
      "Un producto pensado para sumar calidad, utilidad y estilo a tu día a día.";

    const lineaPrecio = incluirPrecio
      ? `\n💰 Precio: ${precioFormateado}`
      : "";

    const lineaStock =
      Number(producto.stock) > 0
        ? "\n✅ Disponible"
        : "\n⚠️ Consultar disponibilidad";

    const llamadaAccion: Record<
      Plataforma,
      string
    > = {
      Instagram:
        "\n\n📩 Escribinos para más información o para hacer tu pedido.",
      Facebook:
        "\n\nConsultanos por mensaje privado y reservá el tuyo.",
      WhatsApp:
        "\n\nRespondé este mensaje y te ayudamos con tu pedido.",
    };

    const inicio = encabezadoPorTono();

    const textoBase = `${inicio}

${descripcion}${lineaPrecio}${lineaStock}${llamadaAccion[plataforma]}`;

    if (!incluirHashtags) {
      return textoBase;
    }

    return `${textoBase}

${hashtagsProducto()}`;
  }

  async function generarPublicacion() {
    if (!producto) return;

    setGenerando(true);
    setError("");
    setCopiado(false);

    try {
      /*
       * Por ahora usamos generación local en modo desarrollo.
       * Después este mismo botón llamará al endpoint de OpenAI
       * sin cambiar la interfaz.
       */
      await new Promise((resolve) =>
        window.setTimeout(resolve, 700)
      );

      setTextoGenerado(
        construirTextoDesarrollo()
      );
    } catch {
      setError(
        "No se pudo generar la publicación."
      );
    } finally {
      setGenerando(false);
    }
  }

  async function copiarTexto() {
    if (!textoGenerado) return;

    try {
      await navigator.clipboard.writeText(
        textoGenerado
      );
      setCopiado(true);

      window.setTimeout(() => {
        setCopiado(false);
      }, 2000);
    } catch {
      setError(
        "No se pudo copiar el texto automáticamente."
      );
    }
  }

  function abrirWhatsApp() {
    if (!textoGenerado) return;

    const enlace = `https://wa.me/?text=${encodeURIComponent(
      textoGenerado
    )}`;

    window.open(
      enlace,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p className="mt-4 text-slate-500">
            Cargando Marketing PRO...
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
            No se pudo abrir Marketing PRO
          </h1>

          <p className="mt-3 text-red-600">
            {error || "Producto no encontrado."}
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
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/productos"
              className="font-semibold text-[#2563EB]"
            >
              ← Volver a Productos PRO
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              Marketing PRO
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Crear publicación
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Prepará contenido para redes sociales y
              WhatsApp usando la información del producto.
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
              href={`/admin/productos/${producto.id}/multimedia`}
              className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700"
            >
              Multimedia
            </Link>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {producto.imaguen ? (
                <img
                  src={producto.imaguen}
                  alt={producto.nombre}
                  className="h-72 w-full rounded-2xl border border-slate-200 object-contain"
                />
              ) : (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  Sin imagen
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

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Precio
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {precioFormateado}
                </p>
              </div>
            </article>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Configuración
              </h2>

              <div className="mt-5">
                <label className="mb-2 block font-semibold">
                  Plataforma
                </label>

                <select
                  value={plataforma}
                  onChange={(event) =>
                    setPlataforma(
                      event.target
                        .value as Plataforma
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option>Instagram</option>
                  <option>Facebook</option>
                  <option>WhatsApp</option>
                </select>
              </div>

              <div className="mt-5">
                <label className="mb-2 block font-semibold">
                  Tono
                </label>

                <select
                  value={tono}
                  onChange={(event) =>
                    setTono(
                      event.target.value as Tono
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option>Profesional</option>
                  <option>Cercano</option>
                  <option>Entusiasta</option>
                  <option>Elegante</option>
                </select>
              </div>

              <div className="mt-5 space-y-3">
                <Opcion
                  label="Incluir precio"
                  checked={incluirPrecio}
                  onChange={setIncluirPrecio}
                />

                <Opcion
                  label="Incluir hashtags"
                  checked={incluirHashtags}
                  onChange={setIncluirHashtags}
                />
              </div>

              <button
                type="button"
                disabled={generando}
                onClick={generarPublicacion}
                className="mt-6 w-full rounded-xl bg-[#F97316] px-5 py-4 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {generando
                  ? "Generando publicación..."
                  : "✨ Generar publicación"}
              </button>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
                Resultado
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Publicación para {plataforma}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Podés editar el contenido antes de
                copiarlo o compartirlo.
              </p>
            </div>

            <textarea
              rows={18}
              value={textoGenerado}
              onChange={(event) =>
                setTextoGenerado(
                  event.target.value
                )
              }
              placeholder="La publicación generada aparecerá acá..."
              className="mt-6 w-full resize-none rounded-2xl border border-slate-300 px-5 py-4 leading-7 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!textoGenerado}
                onClick={copiarTexto}
                className="rounded-xl bg-[#2563EB] px-5 py-4 font-semibold text-white disabled:opacity-50"
              >
                {copiado
                  ? "✓ Texto copiado"
                  : "📋 Copiar texto"}
              </button>

              <button
                type="button"
                disabled={!textoGenerado}
                onClick={abrirWhatsApp}
                className="rounded-xl bg-green-600 px-5 py-4 font-semibold text-white disabled:opacity-50"
              >
                📲 Compartir por WhatsApp
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-700">
              <p className="font-bold">
                Modo Desarrollo
              </p>

              <p className="mt-1">
                El contenido se genera con plantillas
                locales. Cuando OpenAI tenga créditos,
                conectaremos este mismo botón con IA real
                sin cambiar la pantalla.
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Opcion({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-5 w-5 rounded border-slate-300"
      />

      <span className="text-sm font-semibold">
        {label}
      </span>
    </label>
  );
}