"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  eliminarImagen,
  subirImagenProducto,
  validarImagen,
} from "@/lib/storage";
import { convertirPrecio } from "@/lib/formatearPrecio";
import {
  validarStock,
  validarTexto,
} from "@/lib/validaciones";
type Categoria = {
  id: number;
  nombre: string;
};
type ListaCatalogo = {
  id: number;
  nombre: string;
  activa: boolean;
};
type PrecioPorLista = {
  visible: boolean;
  minorista: string;
  mayorista: string;
};
type PreciosPorLista = Record<number, PrecioPorLista>;
type FilaPrecioLista = {
  lista_id: number;
  producto_id: number;
  precio_minorista: number;
  precio_mayorista: number | null;
  visible: boolean;
};
type ImagenSubida = {
  ruta: string;
  url: string;
};
export default function NuevoProductoManualPage() {
  const router = useRouter();
  const inputImagenRef = useRef<HTMLInputElement>(null);
  const [empresaId, setEmpresaId] =
    useState<number | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [listas, setListas] = useState<ListaCatalogo[]>([]);
  const [preciosPorLista, setPreciosPorLista] = useState<PreciosPorLista>({});
  const [cargandoListas, setCargandoListas] = useState(true);
  const [errorListas, setErrorListas] = useState("");
  const [productoGuardado, setProductoGuardado] = useState(false);
  const [cargandoCategorias, setCargandoCategorias] =
    useState(true);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [precioMayorista, setPrecioMayorista] = useState("");
  const [cantidadMinimaMayorista, setCantidadMinimaMayorista] =
    useState("10");
  const [stock, setStock] = useState("");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [estado, setEstado] = useState("Activo");
  const [visibleCatalogo, setVisibleCatalogo] = useState(true);
  const [nuevoIngreso, setNuevoIngreso] = useState(true);
  const [oferta, setOferta] = useState(false);
  const [destacado, setDestacado] = useState(false);
  const [controlarStock, setControlarStock] = useState(true);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [imagenSubida, setImagenSubida] =
    useState<ImagenSubida | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  useEffect(() => {
    async function cargarEmpresaYCategorias() {
      setCargandoCategorias(true);
      setError("");
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();
      if (errorUsuario || !user) {
        setError(
          errorUsuario?.message ||
            "Tu sesión no está activa. Iniciá sesión nuevamente."
        );
        setCategorias([]);
        setCargandoCategorias(false);
        return;
      }
      const {
        data: empresaData,
        error: errorEmpresa,
      } = await supabase
        .from("empresas")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (errorEmpresa || !empresaData) {
        setError(
          errorEmpresa?.message ||
            "No encontramos una empresa asociada a tu cuenta."
        );
        setCategorias([]);
        setCargandoCategorias(false);
        return;
      }
      const idEmpresa = Number(empresaData.id);
      setEmpresaId(idEmpresa);
      // Consultamos listas aparte: los negocios sin listas siguen igual.
      const { data: listasData, error: consultaListasError } = await supabase
        .from("listas_catalogos")
        .select("id, nombre, activa")
        .eq("empresa_id", idEmpresa)
        .order("created_at", { ascending: true });
      if (consultaListasError) {
        setErrorListas(consultaListasError.message);
        setListas([]);
      } else {
        const listasDisponibles = (listasData || []) as ListaCatalogo[];
        setListas(listasDisponibles);
        const valores: PreciosPorLista = {};
        for (const lista of listasDisponibles) {
          valores[lista.id] = { visible: false, minorista: "", mayorista: "" };
        }
        setPreciosPorLista(valores);
        setErrorListas("");
      }
      setCargandoListas(false);
      const { data, error: errorCategorias } =
        await supabase
          .from("categorias")
          .select("id, nombre")
          .eq("empresa_id", idEmpresa)
          .order("nombre", { ascending: true });
      if (errorCategorias) {
        console.warn(
          "No se pudieron cargar las categorías:",
          errorCategorias
        );
        setCategorias([]);
        setCargandoCategorias(false);
        return;
      }
      setCategorias((data as Categoria[]) || []);
      setCargandoCategorias(false);
    }
    cargarEmpresaYCategorias();
  }, []);
  useEffect(() => {
    if (!archivo) {
      setVistaPrevia("");
      return;
    }
    const urlTemporal = URL.createObjectURL(archivo);
    setVistaPrevia(urlTemporal);
    return () => URL.revokeObjectURL(urlTemporal);
  }, [archivo]);
  function actualizarPrecioLista(
    listaId: number,
    campo: keyof PrecioPorLista,
    valor: string | boolean
  ) {
    setPreciosPorLista((actuales) => ({
      ...actuales,
      [listaId]: {
        ...(actuales[listaId] || { visible: false, minorista: "", mayorista: "" }),
        [campo]: valor,
      },
    }));
  }
  function seleccionarImagen(event: ChangeEvent<HTMLInputElement>) {
    const archivoSeleccionado = event.target.files?.[0];
    setError("");
    setMensaje("");
    if (!archivoSeleccionado) return;
    try {
      validarImagen(archivoSeleccionado);
      setArchivo(archivoSeleccionado);
      setImagenSubida(null);
    } catch (errorDesconocido) {
      setArchivo(null);
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "La imagen seleccionada no es válida."
      );
    }
  }
  async function quitarImagen() {
    if (guardando) return;
    setError("");
    setMensaje("");
    if (imagenSubida?.ruta) {
      try {
        await eliminarImagen(imagenSubida.ruta);
      } catch (errorDesconocido) {
        console.warn("No se pudo eliminar la imagen:", errorDesconocido);
      }
    }
    setArchivo(null);
    setImagenSubida(null);
    if (inputImagenRef.current) {
      inputImagenRef.current.value = "";
    }
  }
  function convertirEntero(valor: string, nombreCampo: string) {
    const numero = Number(valor.trim());
    if (!Number.isInteger(numero) || numero < 0) {
      throw new Error(
        `${nombreCampo} debe ser un número entero igual o mayor que cero.`
      );
    }
    return numero;
  }
  async function guardarProducto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guardando || productoGuardado) return;
    if (cargandoListas || errorListas) {
      setError("No pudimos verificar las listas de catálogos. Recargá la página antes de guardar.");
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    let imagenActual: ImagenSubida | null = imagenSubida;
    try {
      if (!empresaId) {
        throw new Error(
          "No encontramos la empresa asociada a tu cuenta."
        );
      }
      const nombreLimpio = nombre.trim();
      const categoriaLimpia = categoria.trim();
      const descripcionLimpia = descripcion.trim();
      validarTexto(nombreLimpio, "El nombre", 2, 120);
      validarTexto(categoriaLimpia, "La categoría", 2, 80);
      if (descripcionLimpia) {
        validarTexto(descripcionLimpia, "La descripción", 2, 1500);
      }
      const precioNumero = convertirPrecio(precio);
      const costoNumero = costo.trim() ? convertirPrecio(costo) : 0;
      const precioMayoristaNumero =
        precioMayorista.trim()
          ? convertirPrecio(precioMayorista)
          : null;
      // Si el producto no controla stock, no exigimos campos de inventario
      // ni cantidad mínima mayorista. Conservamos el umbral habitual de 10
      // unidades para mayorista y guardamos stock en cero.
      const cantidadMinimaMayoristaNumero = controlarStock
        ? convertirEntero(cantidadMinimaMayorista, "La cantidad mínima mayorista")
        : 10;
      const stockNumero = controlarStock
        ? convertirEntero(stock, "El stock")
        : 0;
      const stockMinimoNumero = controlarStock
        ? convertirEntero(stockMinimo, "El stock mínimo")
        : 0;
      if (controlarStock) {
        validarStock(stockNumero);
        validarStock(stockMinimoNumero);
      }
      if (costoNumero < 0) {
        throw new Error("El costo del producto no puede ser negativo.");
      }
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
      // Validamos todos los precios ANTES de crear el producto.
      const filasPendientes: Omit<FilaPrecioLista, "producto_id">[] = [];
      for (const lista of listas) {
        const datos = preciosPorLista[lista.id];
        if (!datos?.visible) continue;
        if (!lista.activa) {
          throw new Error(`La lista "${lista.nombre}" está inactiva. Desmarcala para continuar.`);
        }
        if (!datos.minorista.trim()) {
          throw new Error(`Ingresá el precio minorista de "${lista.nombre}".`);
        }
        const minorista = convertirPrecio(datos.minorista);
        const mayorista = datos.mayorista.trim()
          ? convertirPrecio(datos.mayorista)
          : null;
        if (!Number.isFinite(minorista) || minorista < 0 ||
            (mayorista !== null && (!Number.isFinite(mayorista) || mayorista < 0))) {
          throw new Error(`Revisá los precios de "${lista.nombre}".`);
        }
        filasPendientes.push({
          lista_id: lista.id,
          precio_minorista: minorista,
          precio_mayorista: mayorista,
          visible: true,
        });
      }
      if (archivo && !imagenActual) {
        imagenActual = await subirImagenProducto(archivo, empresaId);
        setImagenSubida(imagenActual);
      }
      const { data: productoCreado, error: errorProducto } = await supabase
        .from("productos")
        .insert({
          empresa_id: empresaId,
          nombre: nombreLimpio,
          categoria: categoriaLimpia,
          descripcion: descripcionLimpia || null,
          precio: precioNumero,
          costo: costoNumero,
          precio_mayorista:
            precioMayoristaNumero,
          cantidad_minima_mayorista:
            cantidadMinimaMayoristaNumero,
          stock: stockNumero,
          stock_minimo: stockMinimoNumero,
          imaguen: imagenActual?.url || null,
          estado,
          visible_catalogo: visibleCatalogo,
          nuevo_ingreso: nuevoIngreso,
          en_oferta: oferta,
          destacado,
          controlar_stock: controlarStock,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (errorProducto) {
        throw new Error(errorProducto.message);
      }
      const productoId = Number(productoCreado.id);
      // Evita que otro clic cree un segundo producto si falla el guardado de listas.
      setProductoGuardado(true);
      if (filasPendientes.length > 0) {
        const { error: errorPrecios } = await supabase
          .from("lista_productos")
          .insert(filasPendientes.map((fila) => ({ ...fila, producto_id: productoId })));
        if (errorPrecios) {
          throw new Error(
            `El producto se creó (ID ${productoId}), pero NO se pudieron guardar sus precios por lista: ${errorPrecios.message}. No vuelvas a guardar este formulario para evitar duplicados. Revisaremos este producto desde la administración.`
          );
        }
      }
      if (imagenActual) {
        const { error: errorMultimedia } = await supabase
          .from("producto_multimedia")
          .insert({
            empresa_id: empresaId,
            producto_id: productoId,
            tipo: "Original",
            url: imagenActual.url,
            nombre_archivo: archivo?.name || null,
            descripcion:
              "Imagen principal cargada desde el formulario manual.",
            es_principal: true,
            activo: true,
          });
        if (errorMultimedia) {
          console.error(
            "El producto se creó, pero no se pudo registrar la imagen en multimedia:",
            errorMultimedia
          );
        }
      }
      setMensaje("Producto creado correctamente.");
      window.setTimeout(() => {
        router.push("/admin/productos");
        router.refresh();
      }, 900);
    } catch (errorDesconocido) {
      console.error("Error al crear el producto:", errorDesconocido);
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo crear el producto."
      );
    } finally {
      setGuardando(false);
    }
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
              ← Volver
            </Link>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
              Productos PRO
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Crear producto
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Completá la información comercial, el stock y la imagen principal
              del producto.
            </p>
          </div>
        </header>
        <form onSubmit={guardarProducto} className="mt-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">Información del producto</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <CampoTexto
                    id="nombre"
                    label="Nombre del producto"
                    value={nombre}
                    onChange={setNombre}
                    placeholder="Ejemplo: Mate imperial premium"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="categoria"
                    className="mb-2 block font-semibold"
                  >
                    Categoría
                  </label>
                  {categorias.length > 0 ? (
                    <select
                      id="categoria"
                      value={categoria}
                      onChange={(event) => setCategoria(event.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        {cargandoCategorias
                          ? "Cargando categorías..."
                          : "Seleccionar categoría"}
                      </option>
                      {categorias.map((categoriaItem) => (
                        <option
                          key={categoriaItem.id}
                          value={categoriaItem.nombre}
                        >
                          {categoriaItem.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="categoria"
                      type="text"
                      value={categoria}
                      onChange={(event) => setCategoria(event.target.value)}
                      placeholder="Ejemplo: Mates"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                  {!cargandoCategorias && categorias.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No se encontraron categorías. Podés escribir una
                      manualmente.
                    </p>
                  )}
                </div>
                <CampoTexto
                  id="precio"
                  label="Precio minorista"
                  value={precio}
                  onChange={setPrecio}
                  placeholder="Ejemplo: 25000"
                  inputMode="decimal"
                  required
                />
                <CampoTexto
                  id="costo"
                  label="Costo del producto"
                  value={costo}
                  onChange={setCosto}
                  placeholder="Ejemplo: 15000"
                  inputMode="decimal"
                  required
                />
                <CampoTexto
                  id="precio-mayorista"
                  label="Precio mayorista"
                  value={precioMayorista}
                  onChange={setPrecioMayorista}
                  placeholder="Opcional. Ejemplo: 22000"
                  inputMode="decimal"
                />
                {controlarStock && (
                  <CampoTexto
                    id="cantidad-minima-mayorista"
                    label="Mayorista desde"
                    value={cantidadMinimaMayorista}
                    onChange={setCantidadMinimaMayorista}
                    placeholder="Ejemplo: 10"
                    inputMode="numeric"
                    required
                  />
                )}
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700">
                  Si dejás vacío el precio mayorista,
                  el producto utilizará siempre el precio
                  minorista. {controlarStock
                    ? "El beneficio se aplica por producto cuando alcanza la cantidad mínima configurada."
                    : "Podés configurar precios sin llevar control de inventario."}
                </div>
                {controlarStock && (
                  <>
                    <CampoTexto
                      id="stock"
                      label="Stock actual"
                      value={stock}
                      onChange={setStock}
                      placeholder="Ejemplo: 10"
                      inputMode="numeric"
                      required
                    />
                    <CampoTexto
                      id="stock-minimo"
                      label="Stock mínimo"
                      value={stockMinimo}
                      onChange={setStockMinimo}
                      placeholder="Ejemplo: 2"
                      inputMode="numeric"
                      required
                    />
                  </>
                )}
                <div>
                  <label htmlFor="estado" className="mb-2 block font-semibold">
                    Estado
                  </label>
                  <select
                    id="estado"
                    value={estado}
                    onChange={(event) => setEstado(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
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
                    onChange={(event) => setDescripcion(event.target.value)}
                    placeholder="Descripción comercial del producto..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-2 text-right text-xs text-slate-400">
                    {descripcion.length}/1500
                  </p>
                </div>
              </div>
            </section>
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">Imagen principal</h2>
                <input
                  ref={inputImagenRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={seleccionarImagen}
                  className="hidden"
                />
                {vistaPrevia ? (
                  <>
                    <img
                      src={vistaPrevia}
                      alt="Vista previa del producto"
                      className="mt-5 h-72 w-full rounded-2xl border border-slate-200 object-contain"
                    />
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="truncate font-semibold">{archivo?.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {archivo
                          ? (archivo.size / 1024 / 1024).toFixed(2)
                          : "0"}{" "}
                        MB
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={quitarImagen}
                      className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-600 disabled:opacity-50"
                    >
                      Quitar o cambiar imagen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => inputImagenRef.current?.click()}
                    className="mt-5 flex h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-[#2563EB] hover:bg-blue-50 disabled:opacity-50"
                  >
                    <span className="text-5xl">🖼️</span>
                    <span className="mt-4 font-semibold">
                      Seleccionar imagen
                    </span>
                    <span className="mt-2 text-xs text-slate-400">
                      JPG, PNG o WEBP · Máximo 10 MB
                    </span>
                  </button>
                )}
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="font-semibold text-slate-800">✨ Mejorar foto con ChatGPT</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Es opcional. Abrí ChatGPT, adjuntá tu foto y pedile que mejore
                    la iluminación y el fondo sin cambiar el producto. Después
                    descargá la imagen mejorada y seleccionala acá.
                  </p>
                  <a
                    href="https://chatgpt.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
                  >
                    Abrir ChatGPT para mejorar foto ↗
                  </a>
                  <p className="mt-2 text-xs text-slate-500">
                    Se abre en otra pestaña. La foto no se envía automáticamente.
                    Podés usar tu propia cuenta gratuita o de pago.
                  </p>
                </div>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">Publicación y etiquetas</h2>
                <div className="mt-5 space-y-3">
                  <Opcion
                    label="Controlar stock disponible"
                    descripcion="Activado: limita y descuenta stock. Desactivado: permite vender cualquier cantidad y no descuenta stock."
                    checked={controlarStock}
                    onChange={setControlarStock}
                  />
                  <Opcion
                    label="Visible en catálogo"
                    descripcion="El público podrá ver este producto."
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
                    descripcion="Da prioridad en el catálogo."
                    checked={destacado}
                    onChange={setDestacado}
                  />
                </div>
              </section>
            </div>
          </div>
          {listas.length > 0 && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">Precios por lista de catálogo</h2>
              <p className="mt-2 text-sm text-slate-500">
                {controlarStock
                  ? "Un solo producto y un solo stock para todas las listas. "
                  : "Un solo producto para todas las listas, sin control de stock. "}
                Marcá dónde querés mostrarlo y asigná los precios de cada lista.
                Si no cargás mayorista, se utilizará el minorista.
              </p>
              <div className="mt-6 space-y-4">
                {listas.map((lista) => {
                  const valores = preciosPorLista[lista.id] || {
                    visible: false, minorista: "", mayorista: "",
                  };
                  return (
                    <div key={lista.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <label className="flex items-center gap-3 font-bold">
                        <input
                          type="checkbox"
                          checked={valores.visible}
                          disabled={!lista.activa}
                          onChange={(event) => actualizarPrecioLista(lista.id, "visible", event.target.checked)}
                          className="h-5 w-5 rounded border-slate-300"
                        />
                        Mostrar en {lista.nombre}
                        {!lista.activa && <span className="text-xs font-normal text-slate-500">(Inactiva)</span>}
                      </label>
                      {valores.visible && (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <CampoTexto
                            id={`minorista-lista-${lista.id}`}
                            label="Precio minorista"
                            value={valores.minorista}
                            onChange={(valor) => actualizarPrecioLista(lista.id, "minorista", valor)}
                            placeholder="Ejemplo: 25000"
                            inputMode="decimal"
                            required
                          />
                          <CampoTexto
                            id={`mayorista-lista-${lista.id}`}
                            label="Precio mayorista (opcional)"
                            value={valores.mayorista}
                            onChange={(valor) => actualizarPrecioLista(lista.id, "mayorista", valor)}
                            placeholder="Sin mayorista: usar minorista"
                            inputMode="decimal"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {errorListas && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              No se pudieron cargar las listas: {errorListas}. Recargá la página antes de guardar.
            </div>
          )}
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
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/productos"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-600"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={guardando || !empresaId || cargandoListas || Boolean(errorListas) || productoGuardado}
              className="rounded-xl bg-[#2563EB] px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!empresaId
                ? "Cargando empresa..."
                : guardando
                  ? archivo
                    ? "Subiendo y guardando..."
                    : "Guardando producto..."
                  : "Guardar producto"}
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
  inputMode = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  inputMode?: "text" | "numeric" | "decimal";
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
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
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-slate-300"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {descripcion}
        </span>
      </span>
    </label>
  );
}
