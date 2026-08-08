"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";
import {
  eliminarImagen,
  subirImagenProducto,
  validarImagen,
} from "@/lib/storage";
import { ejecutarIA } from "@/lib/ia";
import { convertirPrecio } from "@/lib/formatearPrecio";
import {
  validarStock,
  validarTexto,
} from "@/lib/validaciones";


type ImagenSubida = {
  ruta: string;
  url: string;
};

type ProductoAnalizado = {
  nombre: string;
  categoria: string;
  descripcion: string;
  palabrasClave: string[];
  confianza: "alta" | "media" | "baja";
};

type EtapaProceso =
  | "inactivo"
  | "subiendo"
  | "analizando"
  | "completado";

export default function CrearProductoConIAPage() {
  const router = useRouter();
  const {
    empresa,
    cargandoEmpresa,
    errorEmpresa,
  } = useEmpresa();

  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const formularioRef = useRef<HTMLElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  const [etapa, setEtapa] =
    useState<EtapaProceso>("inactivo");

  const [imagenSubida, setImagenSubida] =
    useState<ImagenSubida | null>(null);

  const [productoAnalizado, setProductoAnalizado] =
    useState<ProductoAnalizado | null>(null);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioMayorista, setPrecioMayorista] = useState("");
  const [cantidadMinimaMayorista, setCantidadMinimaMayorista] = useState("10");
  const [stock, setStock] = useState("");
  const [stockMinimo, setStockMinimo] = useState("0");

  const [estado, setEstado] = useState("Activo");
  const [visibleCatalogo, setVisibleCatalogo] =
    useState(true);
  const [nuevoIngreso, setNuevoIngreso] = useState(true);
  const [oferta, setOferta] = useState(false);
  const [destacado, setDestacado] = useState(false);
  const [controlarStock, setControlarStock] = useState(true);

  const [guardando, setGuardando] = useState(false);
  const [productoCreadoId, setProductoCreadoId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const procesando =
    etapa === "subiendo" || etapa === "analizando";

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia("");
      return;
    }

    const urlTemporal = URL.createObjectURL(archivo);
    setVistaPrevia(urlTemporal);

    return () => {
      URL.revokeObjectURL(urlTemporal);
    };
  }, [archivo]);

  useEffect(() => {
    if (productoAnalizado) {
      window.setTimeout(() => {
        formularioRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [productoAnalizado]);

  function limpiarAnalisis() {
    setProductoAnalizado(null);
    setNombre("");
    setCategoria("");
    setDescripcion("");
    setPrecio("");
    setPrecioMayorista("");
    setCantidadMinimaMayorista("10");
    setStock("");
    setStockMinimo("0");
    setEstado("Activo");
    setVisibleCatalogo(true);
    setNuevoIngreso(true);
    setOferta(false);
    setDestacado(false);
    setControlarStock(true);
    setProductoCreadoId(null);
    setMensaje("");
  }

  function guardarArchivo(
    archivoSeleccionado?: File
  ) {
    setError("");
    setEtapa("inactivo");
    setImagenSubida(null);
    limpiarAnalisis();

    if (!archivoSeleccionado) return;

    try {
      validarImagen(archivoSeleccionado);
      setArchivo(archivoSeleccionado);
    } catch (errorDesconocido) {
      setArchivo(null);

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "La imagen seleccionada no es válida."
      );
    }
  }

  function seleccionarArchivo(
    event: ChangeEvent<HTMLInputElement>
  ) {
    guardarArchivo(event.target.files?.[0]);
  }

  function soltarArchivo(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setArrastrando(false);

    guardarArchivo(
      event.dataTransfer.files?.[0]
    );
  }

  async function quitarImagen() {
    if (procesando || guardando) return;

    setError("");
    setMensaje("");

    if (imagenSubida?.ruta && !productoCreadoId) {
      try {
        await eliminarImagen(imagenSubida.ruta);
      } catch (errorDesconocido) {
        console.warn(
          "No se pudo eliminar la imagen anterior:",
          errorDesconocido
        );
      }
    }

    setArchivo(null);
    setImagenSubida(null);
    setEtapa("inactivo");
    limpiarAnalisis();

    if (inputGaleriaRef.current) {
      inputGaleriaRef.current.value = "";
    }

    if (inputCamaraRef.current) {
      inputCamaraRef.current.value = "";
    }
  }

  async function continuarConImagen() {
    if (!empresa?.id) {
      setError(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    if (!archivo) {
      setError(
        "Primero tenés que seleccionar una imagen."
      );
      return;
    }

    if (procesando) return;

    setError("");
    setMensaje("");
    limpiarAnalisis();

    try {
      setEtapa("subiendo");

      const imagenActual =
        await subirImagenProducto(
          archivo,
          empresa.id
        );

      setImagenSubida(imagenActual);
      setEtapa("analizando");

      const respuesta = await ejecutarIA({
        accion: "analizar_producto",
        producto: {
          empresaId: empresa.id,
          nombre:
            archivo.name
              .replace(/\.[^/.]+$/, "")
              .replace(/[-_]+/g, " ")
              .trim() || "Producto nuevo",
          categoria: "",
          descripcion: "",
          imagenUrl: imagenActual.url,
        },
      });

      if (!respuesta.ok || !respuesta.resultado) {
        throw new Error(
          respuesta.error ||
            "No se pudo analizar la imagen."
        );
      }

      const resultado = respuesta.resultado;

      const producto: ProductoAnalizado = {
        nombre:
          resultado.nombre?.trim() ||
          "Producto nuevo",
        categoria:
          resultado.categoria?.trim() ||
          "Sin categoría",
        descripcion:
          resultado.descripcion?.trim() ||
          "Revisá y completá la descripción del producto.",
        palabrasClave:
          resultado.palabrasClave || [],
        confianza:
          resultado.confianza || "media",
      };

      setProductoAnalizado(producto);
      setNombre(producto.nombre);
      setCategoria(producto.categoria);
      setDescripcion(producto.descripcion);
      setEtapa("completado");

      setMensaje(
        respuesta.modo === "desarrollo"
          ? "Producto preparado en modo desarrollo IA."
          : "Producto analizado con IA."
      );
    } catch (errorDesconocido) {
      console.error(
        "Error al preparar el producto:",
        errorDesconocido
      );

      setEtapa("inactivo");

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo preparar el producto."
      );
    }
  }

  function convertirEntero(
    valor: string,
    nombreCampo: string
  ) {
    const numero = Number(valor.trim());

    if (
      !Number.isInteger(numero) ||
      numero < 0
    ) {
      throw new Error(
        `${nombreCampo} debe ser un número entero igual o mayor que cero.`
      );
    }

    return numero;
  }

  async function guardarProducto(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!empresa?.id) {
      setError(
        "No encontramos la empresa asociada a tu cuenta."
      );
      return;
    }

    if (!imagenSubida) {
      setError(
        "La imagen todavía no está subida."
      );
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const nombreLimpio = nombre.trim();
      const categoriaLimpia = categoria.trim();
      const descripcionLimpia =
        descripcion.trim();

      validarTexto(
        nombreLimpio,
        "El nombre",
        2,
        120
      );

      validarTexto(
        categoriaLimpia,
        "La categoría",
        2,
        80
      );

      if (descripcionLimpia) {
        validarTexto(
          descripcionLimpia,
          "La descripción",
          2,
          1500
        );
      }

      const precioNumero =
        convertirPrecio(precio);

      const precioMayoristaNumero =
        precioMayorista.trim()
          ? convertirPrecio(precioMayorista)
          : null;

      const cantidadMinimaMayoristaNumero =
        convertirEntero(
          cantidadMinimaMayorista,
          "La cantidad mínima mayorista"
        );

      const stockNumero = convertirEntero(
        stock,
        "El stock"
      );

      const stockMinimoNumero =
        convertirEntero(
          stockMinimo,
          "El stock mínimo"
        );

      validarStock(stockNumero);
      validarStock(stockMinimoNumero);

      if (precioNumero < 0) {
        throw new Error(
          "El precio minorista no puede ser negativo."
        );
      }

      if (
        precioMayoristaNumero !== null &&
        precioMayoristaNumero < 0
      ) {
        throw new Error(
          "El precio mayorista no puede ser negativo."
        );
      }

      if (cantidadMinimaMayoristaNumero < 1) {
        throw new Error(
          "La cantidad mínima mayorista debe ser al menos 1."
        );
      }

      const {
        data: productoData,
        error: productoError,
      } = await supabase
        .from("productos")
        .insert({
          empresa_id: empresa.id,
          nombre: nombreLimpio,
          categoria: categoriaLimpia,
          descripcion:
            descripcionLimpia || null,
          precio: precioNumero,
          precio_mayorista: precioMayoristaNumero,
          cantidad_minima_mayorista:
            cantidadMinimaMayoristaNumero,
          stock: stockNumero,
          stock_minimo: stockMinimoNumero,
          imaguen: imagenSubida.url,
          estado,
          visible_catalogo: visibleCatalogo,
          nuevo_ingreso: nuevoIngreso,
          oferta,
          destacado,
          controlar_stock: controlarStock,
          actualizado_at:
            new Date().toISOString(),
        })
        .select("id")
        .single();

      if (productoError) {
        throw new Error(productoError.message);
      }

      const productoId = Number(
        productoData.id
      );

      const { error: multimediaError } =
        await supabase
          .from("producto_multimedia")
          .insert({
            empresa_id: empresa.id,
            producto_id: productoId,
            tipo: "Original",
            url: imagenSubida.url,
            nombre_archivo:
              archivo?.name || null,
            descripcion:
              "Imagen original utilizada para crear el producto con IA.",
            es_principal: true,
            activo: true,
          });

      if (multimediaError) {
        console.error(
          "El producto se creó, pero falló multimedia:",
          multimediaError
        );
      }

      setProductoCreadoId(productoId);
      setMensaje(
        "Producto creado correctamente."
      );
    } catch (errorDesconocido) {
      console.error(
        "Error al guardar el producto:",
        errorDesconocido
      );

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo guardar el producto."
      );
    } finally {
      setGuardando(false);
    }
  }

  function crearOtroProducto() {
    setArchivo(null);
    setImagenSubida(null);
    setEtapa("inactivo");
    limpiarAnalisis();
    setError("");

    if (inputGaleriaRef.current) {
      inputGaleriaRef.current.value = "";
    }

    if (inputCamaraRef.current) {
      inputCamaraRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (cargandoEmpresa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p className="mt-4 text-slate-500">
            Cargando empresa...
          </p>
        </div>
      </main>
    );
  }

  if (errorEmpresa || !empresa?.id) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8 text-[#1E293B]">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">
              No se pudo cargar la empresa
            </h1>
            <p className="mt-3 text-red-600">
              {errorEmpresa ||
                "No encontramos la empresa asociada a tu cuenta."}
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
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]"
        >
          ← Volver
        </Link>

        <header className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
            Productos PRO + IA
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Creá un producto desde una foto
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Elegí una imagen y ComerSys preparará
            automáticamente el nombre, la categoría y la
            descripción.
          </p>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                disabled={procesando || guardando}
                onClick={() =>
                  inputCamaraRef.current?.click()
                }
                className="rounded-3xl border-2 border-[#F97316] bg-orange-50 p-6 text-left transition hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-4xl">
                  📷
                </span>

                <h2 className="mt-4 text-xl font-bold">
                  Sacar una foto
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Abrí la cámara del celular o dispositivo.
                </p>
              </button>

              <button
                type="button"
                disabled={procesando || guardando}
                onClick={() =>
                  inputGaleriaRef.current?.click()
                }
                className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-4xl">
                  📁
                </span>

                <h2 className="mt-4 text-xl font-bold">
                  Elegir imagen
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Seleccioná una imagen guardada.
                </p>
              </button>
            </div>

            <input
              ref={inputCamaraRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={seleccionarArchivo}
              className="hidden"
            />

            <input
              ref={inputGaleriaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={seleccionarArchivo}
              className="hidden"
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();

                if (!procesando && !guardando) {
                  setArrastrando(true);
                }
              }}
              onDragLeave={() =>
                setArrastrando(false)
              }
              onDrop={(event) => {
                if (!procesando && !guardando) {
                  soltarArchivo(event);
                }
              }}
              className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${
                arrastrando
                  ? "border-[#2563EB] bg-blue-50"
                  : "border-slate-300 bg-white"
              } ${
                procesando || guardando
                  ? "pointer-events-none opacity-60"
                  : ""
              }`}
            >
              <span className="text-4xl">
                🖼️
              </span>

              <p className="mt-4 font-semibold">
                También podés arrastrar una imagen acá
              </p>

              <p className="mt-2 text-sm text-slate-500">
                JPG, PNG o WEBP. Máximo 10 MB.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-bold text-blue-800">
                Consejos para un mejor resultado
              </h3>

              <div className="mt-3 space-y-2 text-sm leading-6 text-blue-700">
                <p>✓ Usá buena iluminación.</p>
                <p>✓ Mostrá el producto completo.</p>
                <p>✓ Evitá imágenes movidas.</p>
                <p>✓ Preferí un fondo simple.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Vista previa
            </h2>

            {!vistaPrevia || !archivo ? (
              <div className="mt-5 flex min-h-[420px] items-center justify-center rounded-3xl bg-slate-100 p-8 text-center">
                <div>
                  <span className="text-6xl">
                    📦
                  </span>

                  <p className="mt-5 font-semibold text-slate-600">
                    Todavía no seleccionaste una imagen
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    La fotografía aparecerá acá antes de
                    procesarla.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 overflow-hidden rounded-3xl bg-slate-100">
                  <img
                    src={vistaPrevia}
                    alt="Vista previa del producto"
                    className="h-[420px] w-full object-contain"
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="truncate font-semibold">
                    {archivo.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {(
                      archivo.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                </div>

                <button
                  type="button"
                  disabled={procesando || guardando}
                  onClick={quitarImagen}
                  className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-600 disabled:opacity-50"
                >
                  Cambiar o quitar imagen
                </button>
              </>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!productoAnalizado && (
              <button
                type="button"
                disabled={!archivo || procesando}
                onClick={continuarConImagen}
                className="mt-5 w-full rounded-xl bg-[#F97316] px-5 py-4 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {etapa === "subiendo"
                  ? "Subiendo imagen..."
                  : etapa === "analizando"
                    ? "Analizando con IA..."
                    : "Continuar con esta imagen"}
              </button>
            )}

            {procesando && (
              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-700">
                <p className="font-bold">
                  🤖 ComerSys está preparando el producto
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <PasoProceso
                    completado={
                      etapa === "analizando"
                    }
                    activo={
                      etapa === "subiendo"
                    }
                    texto="Subiendo imagen"
                  />

                  <PasoProceso
                    completado={false}
                    activo={
                      etapa === "analizando"
                    }
                    texto="Analizando la fotografía"
                  />

                  <PasoProceso
                    completado={false}
                    activo={
                      etapa === "analizando"
                    }
                    texto="Generando información comercial"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {productoAnalizado &&
          !productoCreadoId && (
            <section
              ref={formularioRef}
              className="mt-8 scroll-mt-6 rounded-3xl border border-violet-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
                    Producto preparado
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Revisá y completá los datos
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Confirmá la información antes de guardar.
                  </p>
                </div>

                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  Confianza{" "}
                  {productoAnalizado.confianza}
                </span>
              </div>

              {mensaje && (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {mensaje}
                </div>
              )}

              <form
                onSubmit={guardarProducto}
                className="mt-7"
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <CampoTexto
                    label="Nombre"
                    value={nombre}
                    onChange={setNombre}
                    placeholder="Nombre del producto"
                  />

                  <CampoTexto
                    label="Categoría"
                    value={categoria}
                    onChange={setCategoria}
                    placeholder="Categoría"
                  />

                  <CampoTexto
                    label="Precio minorista"
                    value={precio}
                    onChange={setPrecio}
                    placeholder="Ejemplo: 25000"
                    numerico
                  />

                  <CampoTexto
                    label="Precio mayorista"
                    value={precioMayorista}
                    onChange={setPrecioMayorista}
                    placeholder="Opcional. Ejemplo: 22000"
                    numerico
                  />

                  <CampoTexto
                    label="Mayorista desde"
                    value={cantidadMinimaMayorista}
                    onChange={setCantidadMinimaMayorista}
                    placeholder="Ejemplo: 10"
                    numerico
                  />

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700 lg:col-span-2">
                    Si dejás vacío el precio mayorista, el
                    producto utilizará siempre el precio
                    minorista. El precio mayorista se aplica
                    por producto al alcanzar la cantidad
                    mínima configurada.
                  </div>

                  <CampoTexto
                    label="Stock"
                    value={stock}
                    onChange={setStock}
                    placeholder="Ejemplo: 10"
                    numerico
                  />

                  <CampoTexto
                    label="Stock mínimo"
                    value={stockMinimo}
                    onChange={setStockMinimo}
                    placeholder="Ejemplo: 2"
                    numerico
                  />

                  <div>
                    <label className="mb-2 block font-semibold">
                      Estado
                    </label>

                    <select
                      value={estado}
                      onChange={(event) =>
                        setEstado(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      <option value="Activo">
                        Activo
                      </option>
                      <option value="Inactivo">
                        Inactivo
                      </option>
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block font-semibold">
                      Descripción
                    </label>

                    <textarea
                      rows={5}
                      value={descripcion}
                      onChange={(event) =>
                        setDescripcion(
                          event.target.value
                        )
                      }
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>
                </div>

                {productoAnalizado
                  .palabrasClave.length > 0 && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-500">
                      Palabras clave sugeridas
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {productoAnalizado.palabrasClave.map(
                        (palabra) => (
                          <span
                            key={palabra}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            {palabra}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Opcion
                    label="Controlar stock disponible"
                    checked={controlarStock}
                    onChange={setControlarStock}
                  />

                  <Opcion
                    label="Visible en catálogo"
                    checked={visibleCatalogo}
                    onChange={setVisibleCatalogo}
                  />

                  <Opcion
                    label="Nuevo ingreso"
                    checked={nuevoIngreso}
                    onChange={setNuevoIngreso}
                  />

                  <Opcion
                    label="Oferta"
                    checked={oferta}
                    onChange={setOferta}
                  />

                  <Opcion
                    label="Destacado"
                    checked={destacado}
                    onChange={setDestacado}
                  />
                </div>

                {error && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={guardando}
                  className="mt-7 w-full rounded-xl bg-[#2563EB] px-5 py-4 font-semibold text-white disabled:opacity-60"
                >
                  {guardando
                    ? "Guardando producto..."
                    : "Guardar producto"}
                </button>
              </form>
            </section>
          )}

        {productoCreadoId && (
          <section className="mt-8 rounded-3xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              ✓
            </div>

            <h2 className="mt-5 text-3xl font-bold">
              Producto creado
            </h2>

            <p className="mt-3 text-slate-500">
              {nombre} se guardó correctamente.
            </p>

            <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href={`/admin/productos/editar/${productoCreadoId}`}
                className="rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
              >
                Editar
              </Link>

              <Link
                href={`/admin/productos/${productoCreadoId}/multimedia`}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
              >
                Multimedia
              </Link>

              <button
                type="button"
                onClick={crearOtroProducto}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
              >
                Crear otro
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/admin/productos"
                  )
                }
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
              >
                Ver productos
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function PasoProceso({
  texto,
  activo,
  completado,
}: {
  texto: string;
  activo: boolean;
  completado: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          completado
            ? "bg-green-100 text-green-700"
            : activo
              ? "bg-violet-600 text-white"
              : "bg-violet-100 text-violet-500"
        }`}
      >
        {completado
          ? "✓"
          : activo
            ? "…"
            : "•"}
      </span>

      <span
        className={
          activo || completado
            ? "font-semibold"
            : "text-violet-500"
        }
      >
        {texto}
      </span>
    </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  numerico = false,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  numerico?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-semibold">
        {label}
      </label>

      <input
        type="text"
        inputMode={numerico ? "decimal" : "text"}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3"
      />
    </div>
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
        className="h-5 w-5 rounded"
      />

      <span className="text-sm font-semibold">
        {label}
      </span>
    </label>
  );
}