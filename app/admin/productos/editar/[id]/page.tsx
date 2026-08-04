"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Producto = {
  id: number;
  empresa_id: number;
  nombre: string;
  categoria: string | null;
  precio: number;
  stock: number;
  stock_minimo: number;
  descripcion: string | null;
  imaguen: string | null;
  estado: string;
  visible_catalogo: boolean;
  nuevo_ingreso: boolean;
  oferta: boolean;
  destacado: boolean;
  actualizado_at?: string | null;
};

const EMPRESA_ID = 1;

export default function EditarProductoPage() {
  const params = useParams();
  const router = useRouter();

  const idParametro = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const id = Number(idParametro);

  const [productoOriginal, setProductoOriginal] =
    useState<Producto | null>(null);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [descripcion, setDescripcion] = useState("");
  const [imagen, setImagen] = useState("");
  const [estado, setEstado] = useState("Activo");

  const [visibleCatalogo, setVisibleCatalogo] =
    useState(true);
  const [nuevoIngreso, setNuevoIngreso] =
    useState(false);
  const [oferta, setOferta] = useState(false);
  const [destacado, setDestacado] =
    useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] =
    useState<"exito" | "error" | "">("");

  useEffect(() => {
    async function cargarProducto() {
      if (!id || Number.isNaN(id)) {
        setMensaje(
          "El identificador del producto no es válido."
        );
        setTipoMensaje("error");
        setCargando(false);
        return;
      }

      const { data, error } = await supabase
        .from("productos")
        .select(
          `
          id,
          empresa_id,
          nombre,
          categoria,
          precio,
          stock,
          stock_minimo,
          descripcion,
          imaguen,
          estado,
          visible_catalogo,
          nuevo_ingreso,
          oferta,
          destacado,
          actualizado_at
          `
        )
        .eq("id", id)
        .eq("empresa_id", EMPRESA_ID)
        .maybeSingle();

      if (error) {
        console.error(
          "Error al cargar el producto:",
          error
        );

        setMensaje(
          `No se pudo cargar el producto: ${error.message}`
        );
        setTipoMensaje("error");
        setCargando(false);
        return;
      }

      if (!data) {
        setMensaje(
          "No encontramos ese producto. Puede haber sido eliminado o pertenecer a otra empresa."
        );
        setTipoMensaje("error");
        setCargando(false);
        return;
      }

      const producto = data as Producto;

      setProductoOriginal(producto);
      setNombre(producto.nombre || "");
      setCategoria(producto.categoria || "");
      setPrecio(String(producto.precio ?? ""));
      setStock(String(producto.stock ?? 0));
      setStockMinimo(
        String(producto.stock_minimo ?? 0)
      );
      setDescripcion(producto.descripcion || "");
      setImagen(producto.imaguen || "");
      setEstado(producto.estado || "Activo");
      setVisibleCatalogo(
        producto.visible_catalogo ?? true
      );
      setNuevoIngreso(
        producto.nuevo_ingreso ?? false
      );
      setOferta(producto.oferta ?? false);
      setDestacado(producto.destacado ?? false);
      setCargando(false);
    }

    cargarProducto();
  }, [id]);

  const stockBajo = useMemo(() => {
    const stockNumero = Number(stock);
    const minimoNumero = Number(stockMinimo);

    if (
      Number.isNaN(stockNumero) ||
      Number.isNaN(minimoNumero)
    ) {
      return false;
    }

    return stockNumero <= minimoNumero;
  }, [stock, stockMinimo]);

  function convertirNumero(valor: string) {
    return Number(
      valor
        .trim()
        .replace(/\./g, "")
        .replace(",", ".")
    );
  }

  async function actualizarProducto(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setGuardando(true);
    setMensaje("");
    setTipoMensaje("");

    const nombreLimpio = nombre.trim();
    const categoriaLimpia = categoria.trim();
    const descripcionLimpia = descripcion.trim();
    const imagenLimpia = imagen.trim();

    const precioNumero = convertirNumero(precio);
    const stockNumero = convertirNumero(stock);
    const stockMinimoNumero =
      convertirNumero(stockMinimo);

    if (!nombreLimpio || !categoriaLimpia) {
      setMensaje(
        "Completá el nombre y la categoría."
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    if (
      !Number.isFinite(precioNumero) ||
      precioNumero < 0
    ) {
      setMensaje("Ingresá un precio válido.");
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    if (
      !Number.isInteger(stockNumero) ||
      stockNumero < 0
    ) {
      setMensaje(
        "El stock debe ser un número entero igual o mayor que cero."
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    if (
      !Number.isInteger(stockMinimoNumero) ||
      stockMinimoNumero < 0
    ) {
      setMensaje(
        "El stock mínimo debe ser un número entero igual o mayor que cero."
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    const actualizadoAt = new Date().toISOString();

    const { error } = await supabase
      .from("productos")
      .update({
        nombre: nombreLimpio,
        categoria: categoriaLimpia,
        precio: precioNumero,
        stock: stockNumero,
        stock_minimo: stockMinimoNumero,
        descripcion: descripcionLimpia || null,
        imaguen: imagenLimpia || null,
        estado,
        visible_catalogo: visibleCatalogo,
        nuevo_ingreso: nuevoIngreso,
        oferta,
        destacado,
        actualizado_at: actualizadoAt,
      })
      .eq("id", id)
      .eq("empresa_id", EMPRESA_ID);

    if (error) {
      console.error(
        "Error al actualizar el producto:",
        error
      );

      setMensaje(
        `No se pudo actualizar el producto: ${error.message}`
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    setProductoOriginal((productoActual) =>
      productoActual
        ? {
            ...productoActual,
            nombre: nombreLimpio,
            categoria: categoriaLimpia,
            precio: precioNumero,
            stock: stockNumero,
            stock_minimo: stockMinimoNumero,
            descripcion: descripcionLimpia || null,
            imaguen: imagenLimpia || null,
            estado,
            visible_catalogo: visibleCatalogo,
            nuevo_ingreso: nuevoIngreso,
            oferta,
            destacado,
            actualizado_at: actualizadoAt,
          }
        : productoActual
    );

    setMensaje(
      "Producto actualizado correctamente."
    );
    setTipoMensaje("exito");
    setGuardando(false);
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p className="mt-4 text-slate-500">
            Cargando producto...
          </p>
        </div>
      </main>
    );
  }

  if (!productoOriginal) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8 text-[#1E293B]">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">
              No se pudo abrir el producto
            </h1>

            <p className="mt-3 text-red-600">
              {mensaje}
            </p>

            <Link
              href="/admin/productos"
              className="mt-6 inline-flex rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
            >
              Volver a Productos PRO
            </Link>
          </div>
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

            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
              Productos PRO
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Editar producto
            </h1>

            <p className="mt-2 text-slate-500">
              Modificá la información comercial, el stock y
              la visibilidad del producto.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/productos/${id}/multimedia`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold shadow-sm"
            >
              🖼 Multimedia
            </Link>

            <Link
              href={`/admin/productos/nuevo/ia`}
              className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700"
            >
              🤖 Crear otro con IA
            </Link>
          </div>
        </header>

        <form
          onSubmit={actualizarProducto}
          className="mt-8"
        >
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">
                Información del producto
              </h2>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <CampoTexto
                    id="nombre"
                    label="Nombre del producto"
                    value={nombre}
                    onChange={setNombre}
                    placeholder="Nombre del producto"
                  />
                </div>

                <CampoTexto
                  id="categoria"
                  label="Categoría"
                  value={categoria}
                  onChange={setCategoria}
                  placeholder="Ejemplo: Mates"
                />

                <CampoTexto
                  id="precio"
                  label="Precio"
                  value={precio}
                  onChange={setPrecio}
                  placeholder="Ejemplo: 25000"
                  numerico
                />

                <CampoTexto
                  id="stock"
                  label="Stock actual"
                  value={stock}
                  onChange={setStock}
                  placeholder="Ejemplo: 10"
                  numerico
                />

                <CampoTexto
                  id="stock-minimo"
                  label="Stock mínimo"
                  value={stockMinimo}
                  onChange={setStockMinimo}
                  placeholder="Ejemplo: 2"
                  numerico
                />

                <div className="md:col-span-2">
                  <label
                    htmlFor="descripcion"
                    className="mb-2 block font-semibold"
                  >
                    Descripción
                  </label>

                  <textarea
                    id="descripcion"
                    rows={6}
                    value={descripcion}
                    onChange={(event) =>
                      setDescripcion(event.target.value)
                    }
                    placeholder="Descripción comercial del producto..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <CampoTexto
                    id="imagen"
                    label="URL de la imagen principal"
                    value={imagen}
                    onChange={setImagen}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Vista previa
                </h2>

                {imagen ? (
                  <img
                    src={imagen}
                    alt={nombre || "Producto"}
                    className="mt-5 h-72 w-full rounded-2xl border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="mt-5 flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-center text-slate-400">
                    Sin imagen principal
                  </div>
                )}

                <div
                  className={`mt-5 rounded-2xl border p-4 ${
                    stockBajo
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  <p className="font-bold">
                    {stockBajo
                      ? "⚠️ Stock bajo"
                      : "✓ Stock correcto"}
                  </p>

                  <p className="mt-1 text-sm">
                    Stock actual: {stock || 0} · Mínimo:{" "}
                    {stockMinimo || 0}
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Publicación y estado
                </h2>

                <div className="mt-5">
                  <label
                    htmlFor="estado"
                    className="mb-2 block font-semibold"
                  >
                    Estado
                  </label>

                  <select
                    id="estado"
                    value={estado}
                    onChange={(event) =>
                      setEstado(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">
                      Inactivo
                    </option>
                  </select>
                </div>

                <div className="mt-5 space-y-3">
                  <Opcion
                    label="Visible en el catálogo"
                    descripcion="El público puede ver y comprar el producto."
                    checked={visibleCatalogo}
                    onChange={setVisibleCatalogo}
                  />

                  <Opcion
                    label="Nuevo ingreso"
                    descripcion="Muestra la etiqueta Nuevo."
                    checked={nuevoIngreso}
                    onChange={setNuevoIngreso}
                  />

                  <Opcion
                    label="Oferta"
                    descripcion="Muestra la etiqueta Oferta."
                    checked={oferta}
                    onChange={setOferta}
                  />

                  <Opcion
                    label="Destacado"
                    descripcion="Da prioridad al producto en el catálogo."
                    checked={destacado}
                    onChange={setDestacado}
                  />
                </div>
              </section>
            </div>
          </div>

          {mensaje && (
            <div
              className={`mt-6 rounded-2xl border px-5 py-4 ${
                tipoMensaje === "exito"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {mensaje}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/productos"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Recargar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-[#2563EB] px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando
                ? "Guardando cambios..."
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function CampoTexto({
  id,
  label,
  value,
  onChange,
  placeholder,
  numerico = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  numerico?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-semibold"
      >
        {label}
      </label>

      <input
        id={id}
        type="text"
        inputMode={numerico ? "decimal" : "text"}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function Opcion({
  label,
  descripcion,
  checked,
  onChange,
}: {
  label: string;
  descripcion: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 h-5 w-5 rounded border-slate-300"
      />

      <span>
        <span className="block font-semibold">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {descripcion}
        </span>
      </span>
    </label>
  );
}