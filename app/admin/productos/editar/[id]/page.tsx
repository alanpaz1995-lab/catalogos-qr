"use client";

import Link from "next/link";

import {

  FormEvent,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

type OperacionCalculadora = "+" | "−" | "×" | "÷";
type CalculoGuardado = { id: string; operacion: string; resultado: number; fecha: string };

function formatearNumeroCalculadora(valor: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 10 }).format(valor);
}

function calcularOperacion(a: number, b: number, operacion: OperacionCalculadora): number | null {
  if (operacion === "+") return a + b;
  if (operacion === "−") return a - b;
  if (operacion === "×") return a * b;
  if (b === 0) return null;
  return a / b;
}


type Producto = {

  id: number;

  empresa_id: number;

  nombre: string;

  codigo: string | null;

  categoria: string | null;

  precio: number;

  costo: number;

  precio_mayorista: number | null;

  cantidad_minima_mayorista: number;

  stock: number;

  stock_minimo: number;

  descripcion: string | null;

  imaguen: string | null;

  estado: string;

  visible_catalogo: boolean;

  nuevo_ingreso: boolean;

  oferta: boolean;

  destacado: boolean;

  controlar_stock: boolean;

  actualizado_at?: string | null;

};

type ListaCatalogo = { id: number; nombre: string; activa: boolean };

type PrecioPorLista = { visible: boolean; minorista: string; mayorista: string };

type PreciosPorLista = Record<number, PrecioPorLista>;

type PrecioGuardado = {

  lista_id: number;

  precio_minorista: number | null;

  precio_mayorista: number | null;

  visible: boolean;

};

export default function EditarProductoPage() {

  const params = useParams();

  const router = useRouter();

  const {

    empresa,

    cargandoEmpresa,

    errorEmpresa,

  } = useEmpresa();

  // Calculadora comercial local: cada empresa conserva únicamente su propio historial.
  const [calculadoraVisible, setCalculadoraVisible] = useState(true);
  const [pantallaCalculadora, setPantallaCalculadora] = useState("0");
  const [valorAnterior, setValorAnterior] = useState<number | null>(null);
  const [operacionPendiente, setOperacionPendiente] = useState<OperacionCalculadora | null>(null);
  const [iniciarNuevaCifra, setIniciarNuevaCifra] = useState(true);
  const [detallePorcentaje, setDetallePorcentaje] = useState<string | null>(null);
  const [historialCalculos, setHistorialCalculos] = useState<CalculoGuardado[]>([]);
  const [historialCargadoEmpresa, setHistorialCargadoEmpresa] = useState<number | null>(null);
  const [confirmarBorradoHistorial, setConfirmarBorradoHistorial] = useState(false);

  // Los tamaños se guardan por empresa y dispositivo; el historial sigue siendo compartido.
  type TamanoPanel = { ancho: number; alto: number };
  const [tamanosPaneles, setTamanosPaneles] = useState<{
    calculadora: TamanoPanel;
    historial: TamanoPanel;
  }>({ calculadora: { ancho: 340, alto: 510 }, historial: { ancho: 340, alto: 510 } });
  const [tamanosCargadosEmpresa, setTamanosCargadosEmpresa] = useState<number | null>(null);
  const calculadoraPanelRef = useRef<HTMLElement | null>(null);
  const historialPanelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!empresa?.id) return;
    const idEmpresa = Number(empresa.id);
    const leerTamano = (panel: "calculadora" | "historial"): TamanoPanel => {
      const inicial = { ancho: 340, alto: 510 };
      try {
        const valor = window.localStorage.getItem(`comersys-calculadora-tamano-${idEmpresa}-${panel}`);
        if (!valor) return inicial;
        const dato: unknown = JSON.parse(valor);
        if (!dato || typeof dato !== "object") return inicial;
        const tamano = dato as Partial<TamanoPanel>;
        return {
          ancho: typeof tamano.ancho === "number" && Number.isFinite(tamano.ancho) ? Math.max(240, Math.min(850, tamano.ancho)) : inicial.ancho,
          alto: typeof tamano.alto === "number" && Number.isFinite(tamano.alto) ? Math.max(240, Math.min(1200, tamano.alto)) : inicial.alto,
        };
      } catch { return inicial; }
    };
    setTamanosCargadosEmpresa(null);
    setTamanosPaneles({ calculadora: leerTamano("calculadora"), historial: leerTamano("historial") });
    setTamanosCargadosEmpresa(idEmpresa);
  }, [empresa?.id]);

  function ajustarTamanoPanel(tipo: "calculadora" | "historial", cambio: number) {
    const elemento = tipo === "calculadora" ? calculadoraPanelRef.current : historialPanelRef.current;
    const anchoActual = elemento?.getBoundingClientRect().width ?? tamanosPaneles[tipo].ancho;
    const altoActual = elemento?.getBoundingClientRect().height ?? tamanosPaneles[tipo].alto;
    const maximoAncho = Math.max(240, (window.innerWidth - 1280) / 2 - 32);
    const siguiente = {
      ancho: Math.max(240, Math.min(850, maximoAncho, Math.round(anchoActual + cambio))),
      alto: Math.max(240, Math.min(1200, window.innerHeight - 80, Math.round(altoActual + cambio))),
    };
    // El navegador controla el tamaño de los paneles y guarda cada ajuste.
    if (elemento) {
      elemento.style.width = `${siguiente.ancho}px`;
      elemento.style.height = `${siguiente.alto}px`;
    }
    setTamanosPaneles(previo => ({ ...previo, [tipo]: siguiente }));
    if (empresa?.id) {
      try {
        window.localStorage.setItem(`comersys-calculadora-tamano-${empresa.id}-${tipo}`, JSON.stringify(siguiente));
      } catch { /* Se mantiene durante esta sesión. */ }
    }
  }

  function ControlesTamano({ tipo }: { tipo: "calculadora" | "historial" }) {
    return (
      <div className="hidden items-center gap-1 min-[1900px]:flex" aria-label={`Cambiar tamaño de ${tipo}`}>
        <span className="mr-1 text-[10px] text-neutral-400">Tamaño</span>
        <button type="button" onClick={() => ajustarTamanoPanel(tipo, -70)}
          className="rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs text-white hover:bg-neutral-700"
          title="Achicar panel" aria-label={`Achicar ${tipo}`}>−</button>
        <button type="button" onClick={() => ajustarTamanoPanel(tipo, 70)}
          className="rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs text-white hover:bg-neutral-700"
          title="Agrandar panel" aria-label={`Agrandar ${tipo}`}>+</button>
      </div>
    );
  }

  // El usuario cambia el ancho y alto desde la esquina inferior de cada panel.
  // ResizeObserver persiste esos cambios sin intervenir en la lógica de la calculadora.
  useEffect(() => {
    if (!calculadoraVisible || !empresa?.id || tamanosCargadosEmpresa !== Number(empresa.id)) return;
    const idEmpresa = Number(empresa.id);
    const observadores: ResizeObserver[] = [];
    for (const [tipo, elemento] of ([
      ["calculadora", calculadoraPanelRef.current],
      ["historial", historialPanelRef.current],
    ] as const)) {
      if (!elemento) continue;
      const observador = new ResizeObserver(() => {
        const ancho = Math.round(elemento.getBoundingClientRect().width);
        const alto = Math.round(elemento.getBoundingClientRect().height);
        if (ancho < 240 || alto < 240) return;
        try {
          window.localStorage.setItem(
            `comersys-calculadora-tamano-${idEmpresa}-${tipo}`,
            JSON.stringify({ ancho, alto })
          );
        } catch { /* El redimensionamiento sigue funcionando. */ }
      });
      observador.observe(elemento);
      observadores.push(observador);
    }
    return () => observadores.forEach(observador => observador.disconnect());
  }, [calculadoraVisible, empresa?.id, tamanosCargadosEmpresa]);


  useEffect(() => {
    if (!empresa?.id) return;
    const idEmpresa = Number(empresa.id);
    setHistorialCargadoEmpresa(null);
    try {
      const guardado = window.localStorage.getItem(`comersys-calculadora-historial-${idEmpresa}`);
      const leido: unknown = guardado ? JSON.parse(guardado) : [];
      setHistorialCalculos(Array.isArray(leido) ? leido.filter((entrada): entrada is CalculoGuardado =>
        entrada != null && typeof entrada === "object" &&
        typeof entrada.operacion === "string" && typeof entrada.resultado === "number" &&
        Number.isFinite(entrada.resultado) && typeof entrada.fecha === "string" &&
        typeof entrada.id === "string").slice(0, 60) : []);
      setCalculadoraVisible(window.localStorage.getItem(`comersys-calculadora-visible-${idEmpresa}`) !== "false");
    } catch {
      setHistorialCalculos([]);
    }
    setPantallaCalculadora("0");
    setValorAnterior(null);
    setOperacionPendiente(null);
    setIniciarNuevaCifra(true);
    setDetallePorcentaje(null);
    setHistorialCargadoEmpresa(idEmpresa);
  }, [empresa?.id]);

  useEffect(() => {
    if (!empresa?.id || historialCargadoEmpresa !== Number(empresa.id)) return;
    try {
      window.localStorage.setItem(`comersys-calculadora-historial-${empresa.id}`, JSON.stringify(historialCalculos));
    } catch { /* El cálculo sigue funcionando aunque el navegador limite el almacenamiento. */ }
  }, [empresa?.id, historialCargadoEmpresa, historialCalculos]);

  function alternarCalculadora() {
    const siguiente = !calculadoraVisible;
    setCalculadoraVisible(siguiente);
    if (empresa?.id) {
      try { window.localStorage.setItem(`comersys-calculadora-visible-${empresa.id}`, String(siguiente)); }
      catch { /* Preferencia solo durante esta sesión. */ }
    }
  }

  // Atajo global: Ctrl + Alt + signo + (incluye el + del teclado numérico).
  // Se mantiene activo aunque la calculadora y el historial estén ocultos.
  useEffect(() => {
    function manejarAtajoCalculadora(evento: KeyboardEvent) {
      const esMas = evento.key === "+" || evento.code === "NumpadAdd";
      if (!evento.ctrlKey || !evento.altKey || evento.metaKey || !esMas) return;
      evento.preventDefault();
      alternarCalculadora();
    }

    window.addEventListener("keydown", manejarAtajoCalculadora);
    return () => window.removeEventListener("keydown", manejarAtajoCalculadora);
  });

  function ingresarDigito(digito: string) {
    setDetallePorcentaje(null);
    if (iniciarNuevaCifra || pantallaCalculadora === "Error") {
      setPantallaCalculadora(digito === "." ? "0." : digito);
      setIniciarNuevaCifra(false);
      return;
    }
    if (digito === "." && pantallaCalculadora.includes(".")) return;
    if (pantallaCalculadora.replace(/[^0-9]/g, "").length >= 13) return;
    setPantallaCalculadora(actual => actual === "0" && digito !== "." ? digito : actual + digito);
  }

  function limpiarCalculadora() {
    setPantallaCalculadora("0");
    setValorAnterior(null);
    setOperacionPendiente(null);
    setIniciarNuevaCifra(true);
    setDetallePorcentaje(null);
  }

  function retrocederCalculadora() {
    if (iniciarNuevaCifra || pantallaCalculadora === "Error") return;
    setDetallePorcentaje(null);
    setPantallaCalculadora(actual => actual.length <= 1 || (actual.length === 2 && actual.startsWith("-")) ? "0" : actual.slice(0, -1));
  }

  function invertirSigno() {
    if (pantallaCalculadora === "0" || pantallaCalculadora === "Error") return;
    setDetallePorcentaje(null);
    setPantallaCalculadora(actual => actual.startsWith("-") ? actual.slice(1) : "-" + actual);
  }

  function porcentajeCalculadora() {
    const actual = Number(pantallaCalculadora);
    if (!Number.isFinite(actual)) return;
    const base = valorAnterior;
    const esDescuentoOSuma = base !== null && (operacionPendiente === "−" || operacionPendiente === "+");
    const porcentaje = esDescuentoOSuma ? base * actual / 100 : actual / 100;
    setPantallaCalculadora(String(Number(porcentaje.toFixed(10))));
    setDetallePorcentaje(esDescuentoOSuma ? `${formatearNumeroCalculadora(actual)}%` : null);
    setIniciarNuevaCifra(false);
  }

  function elegirOperacion(operacion: OperacionCalculadora) {
    const actual = Number(pantallaCalculadora);
    if (!Number.isFinite(actual)) return;
    let siguiente = actual;
    if (valorAnterior !== null && operacionPendiente !== null && !iniciarNuevaCifra) {
      const resultado = calcularOperacion(valorAnterior, actual, operacionPendiente);
      if (resultado === null || !Number.isFinite(resultado)) {
        setPantallaCalculadora("Error"); setValorAnterior(null); setOperacionPendiente(null);
        setIniciarNuevaCifra(true); return;
      }
      siguiente = Number(resultado.toFixed(10));
      setPantallaCalculadora(String(siguiente));
    } else if (valorAnterior !== null && iniciarNuevaCifra) {
      siguiente = valorAnterior;
    }
    setValorAnterior(siguiente);
    setOperacionPendiente(operacion);
    setIniciarNuevaCifra(true);
    setDetallePorcentaje(null);
  }

  function confirmarResultado() {
    if (valorAnterior === null || operacionPendiente === null) return;
    const actual = Number(pantallaCalculadora);
    if (!Number.isFinite(actual)) return;
    const resultado = calcularOperacion(valorAnterior, actual, operacionPendiente);
    if (resultado === null || !Number.isFinite(resultado)) {
      setPantallaCalculadora("Error"); setValorAnterior(null); setOperacionPendiente(null);
      setIniciarNuevaCifra(true); setDetallePorcentaje(null); return;
    }
    const redondeado = Number(resultado.toFixed(10));
    const expresion = `${formatearNumeroCalculadora(valorAnterior)} ${operacionPendiente} ${detallePorcentaje ?? formatearNumeroCalculadora(actual)}`;
    setHistorialCalculos(anterior => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, operacion: expresion, resultado: redondeado, fecha: new Date().toISOString() }, ...anterior].slice(0, 60));
    setPantallaCalculadora(String(redondeado));
    setValorAnterior(null);
    setOperacionPendiente(null);
    setIniciarNuevaCifra(true);
    setDetallePorcentaje(null);
  }

  function reutilizarResultado(resultado: number) {
    setPantallaCalculadora(String(resultado));
    setValorAnterior(null);
    setOperacionPendiente(null);
    setIniciarNuevaCifra(true);
    setDetallePorcentaje(null);
    setCalculadoraVisible(true);
    if (empresa?.id) {
      try { window.localStorage.setItem(`comersys-calculadora-visible-${empresa.id}`, "true"); } catch { /* opcional */ }
    }
  }

  function borrarHistorial() {
    setHistorialCalculos([]);
    setConfirmarBorradoHistorial(false);
  }

  // Teclado físico y teclado numérico. No capturar teclas mientras se escriben
  // búsquedas, formularios o contenidos editables del resto de ComerSys.
  useEffect(() => {
    if (!calculadoraVisible) return;

    function manejarTecladoCalculadora(evento: KeyboardEvent) {
      if (evento.ctrlKey || evento.altKey || evento.metaKey) return;
      const destino = evento.target;
      if (destino instanceof HTMLElement) {
        if (destino.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
        // Enter sobre otro botón debe seguir activando ese botón normalmente.
        if (evento.key === "Enter" && destino.closest("button, a")) return;
      }

      const tecla = evento.key;
      if (/^[0-9]$/.test(tecla)) {
        evento.preventDefault();
        ingresarDigito(tecla);
      } else if (tecla === "." || tecla === "," || evento.code === "NumpadDecimal") {
        evento.preventDefault();
        ingresarDigito(".");
      } else if (tecla === "+") {
        evento.preventDefault();
        elegirOperacion("+");
      } else if (tecla === "-") {
        evento.preventDefault();
        elegirOperacion("−");
      } else if (tecla === "*" || tecla.toLowerCase() === "x") {
        evento.preventDefault();
        elegirOperacion("×");
      } else if (tecla === "/") {
        evento.preventDefault();
        elegirOperacion("÷");
      } else if (tecla === "Enter" || tecla === "=") {
        evento.preventDefault();
        confirmarResultado();
      } else if (tecla === "Backspace") {
        evento.preventDefault();
        retrocederCalculadora();
      } else if (tecla === "Escape" || tecla === "Delete") {
        evento.preventDefault();
        limpiarCalculadora();
      } else if (tecla === "%") {
        evento.preventDefault();
        porcentajeCalculadora();
      }
    }

    window.addEventListener("keydown", manejarTecladoCalculadora);
    return () => window.removeEventListener("keydown", manejarTecladoCalculadora);
  // El controlador se renueva al cambiar los valores para usar el estado actual.
  });



  const idParametro = Array.isArray(params.id)

    ? params.id[0]

    : params.id;

  const id = Number(idParametro);

  const [productoOriginal, setProductoOriginal] =

    useState<Producto | null>(null);

  const [nombre, setNombre] = useState("");

  const [codigo, setCodigo] = useState("");

  const [categoria, setCategoria] = useState("");

  const [precio, setPrecio] = useState("");

  const [costo, setCosto] = useState("");

  const [precioMayorista, setPrecioMayorista] = useState("");

  const [cantidadMinimaMayorista, setCantidadMinimaMayorista] = useState("10");

  const [stock, setStock] = useState("");

  const [stockMinimo, setStockMinimo] = useState("0");

  const [descripcion, setDescripcion] = useState("");

  const [imagen, setImagen] = useState("");

  const [imagenAmpliada, setImagenAmpliada] = useState(false);

  const [estado, setEstado] = useState("Activo");

  const [visibleCatalogo, setVisibleCatalogo] =

    useState(true);

  const [nuevoIngreso, setNuevoIngreso] =

    useState(false);

  const [oferta, setOferta] = useState(false);

  const [destacado, setDestacado] =

    useState(false);

  const [controlarStock, setControlarStock] =

    useState(true);

  const [listas, setListas] = useState<ListaCatalogo[]>([]);

  const [preciosPorLista, setPreciosPorLista] = useState<PreciosPorLista>({});

  const [errorListas, setErrorListas] = useState("");

  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");

  const [tipoMensaje, setTipoMensaje] =

    useState<"exito" | "error" | "">("");

  useEffect(() => {

    async function cargarProducto() {

      if (!empresa?.id) return;

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

            codigo,

          categoria,

          precio,

          costo,

          precio_mayorista,

          cantidad_minima_mayorista,

          stock,

          stock_minimo,

          descripcion,

          imaguen,

          estado,

          visible_catalogo,

          nuevo_ingreso,

          oferta,

          destacado,

          controlar_stock,

          actualizado_at

          `

        )

        .eq("id", id)

        .eq("empresa_id", empresa.id)

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

        setCodigo(producto.codigo || "");

      setCategoria(producto.categoria || "");

      setPrecio(String(producto.precio ?? ""));

      setCosto(String(producto.costo ?? 0));

      setPrecioMayorista(

        producto.precio_mayorista == null

          ? ""

          : String(producto.precio_mayorista)

      );

      setCantidadMinimaMayorista(

        String(producto.cantidad_minima_mayorista ?? 10)

      );

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

      setControlarStock(producto.controlar_stock ?? true);

      // Cargamos todas las listas y los precios de este producto.

      const { data: listasData, error: errorConsultaListas } = await supabase

        .from("listas_catalogos")

        .select("id, nombre, activa")

        .eq("empresa_id", empresa.id)

        .order("created_at", { ascending: true });

      if (errorConsultaListas) {

        setErrorListas(`No se pudieron cargar las listas: ${errorConsultaListas.message}`);

        setCargando(false);

        return;

      }

      const listasDisponibles = (listasData || []) as ListaCatalogo[];

      setListas(listasDisponibles);

      if (listasDisponibles.length > 0) {

        const { data: preciosData, error: errorConsultaPrecios } = await supabase

          .from("lista_productos")

          .select("lista_id, precio_minorista, precio_mayorista, visible")

          .eq("producto_id", id)

          .in("lista_id", listasDisponibles.map((lista) => lista.id));

        if (errorConsultaPrecios) {

          setErrorListas(`No se pudieron cargar los precios: ${errorConsultaPrecios.message}`);

          setCargando(false);

          return;

        }

        const porId = new Map((preciosData || []).map((fila) => {

          const precio = fila as PrecioGuardado;

          return [precio.lista_id, precio] as const;

        }));

        const valores: PreciosPorLista = {};

        for (const lista of listasDisponibles) {

          const fila = porId.get(lista.id);

          valores[lista.id] = {

            visible: fila?.visible ?? false,

            minorista: fila?.precio_minorista == null ? "" : String(fila.precio_minorista),

            mayorista: fila?.precio_mayorista == null ? "" : String(fila.precio_mayorista),

          };

        }

        setPreciosPorLista(valores);

      }

      setErrorListas("");

      setCargando(false);

    }

    cargarProducto();

  }, [empresa?.id, id]);

  useEffect(() => {

    if (!imagenAmpliada) return;

    function cerrarConEscape(event: KeyboardEvent) {

      if (event.key === "Escape") setImagenAmpliada(false);

    }

    window.addEventListener("keydown", cerrarConEscape);

    return () => window.removeEventListener("keydown", cerrarConEscape);

  }, [imagenAmpliada]);

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

  function actualizarPrecioLista(listaId: number, campo: keyof PrecioPorLista, valor: string | boolean) {

    setPreciosPorLista((actuales) => ({

      ...actuales,

      [listaId]: {

        ...(actuales[listaId] || { visible: false, minorista: "", mayorista: "" }),

        [campo]: valor,

      },

    }));

  }

  async function actualizarProducto(

    event: FormEvent<HTMLFormElement>

  ) {

    event.preventDefault();

    if (!empresa?.id) {

      setMensaje(

        "No encontramos la empresa asociada a tu cuenta."

      );

      setTipoMensaje("error");

      return;

    }

    if (errorListas) {

      setMensaje(errorListas + ". Recargá la página antes de guardar.");

      setTipoMensaje("error");

      return;

    }

    setGuardando(true);

    setMensaje("");

    setTipoMensaje("");

    const nombreLimpio = nombre.trim();

    const codigoLimpio = codigo.trim();

    if (codigoLimpio.length > 80) {

      setMensaje("El código del producto no puede superar los 80 caracteres.");

      setTipoMensaje("error");

      setGuardando(false);

      return;

    }

    const categoriaLimpia = categoria.trim();

    const descripcionLimpia = descripcion.trim();

    const imagenLimpia = imagen.trim();

    const precioNumero = convertirNumero(precio);

    const costoNumero = convertirNumero(costo);

    const precioMayoristaNumero =

      precioMayorista.trim() === ""

        ? null

        : convertirNumero(precioMayorista);

    const cantidadMinimaMayoristaNumero =

      convertirNumero(cantidadMinimaMayorista);

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

      !Number.isFinite(costoNumero) ||

      costoNumero < 0

    ) {

      setMensaje("Ingresá un costo de producto válido.");

      setTipoMensaje("error");

      setGuardando(false);

      return;

    }

    if (

      precioMayoristaNumero !== null &&

      (

        !Number.isFinite(precioMayoristaNumero) ||

        precioMayoristaNumero < 0

      )

    ) {

      setMensaje(

        "Ingresá un precio mayorista válido o dejalo vacío."

      );

      setTipoMensaje("error");

      setGuardando(false);

      return;

    }

    if (controlarStock) {

    if (

      !Number.isInteger(cantidadMinimaMayoristaNumero) ||

      cantidadMinimaMayoristaNumero < 1

    ) {

      setMensaje(

        "La cantidad mínima mayorista debe ser un número entero de al menos 1."

      );

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

    }

    // Validamos los precios de las listas antes de modificar el producto.

    const filasPrecios: {

      lista_id: number; producto_id: number;

      precio_minorista: number | null; precio_mayorista: number | null;

      visible: boolean;

    }[] = [];

    for (const lista of listas) {

      const valores = preciosPorLista[lista.id] || { visible: false, minorista: "", mayorista: "" };

      if (valores.visible && !lista.activa) {

        setMensaje(`La lista "${lista.nombre}" está inactiva. Desmarcala antes de guardar.`);

        setTipoMensaje("error"); setGuardando(false); return;

      }

      if (valores.visible && !valores.minorista.trim()) {

        setMensaje(`Ingresá el precio minorista de "${lista.nombre}".`);

        setTipoMensaje("error"); setGuardando(false); return;

      }

      const minorista = valores.minorista.trim() ? convertirNumero(valores.minorista) : null;

      const mayorista = valores.mayorista.trim() ? convertirNumero(valores.mayorista) : null;

      if ((minorista !== null && (!Number.isFinite(minorista) || minorista < 0)) ||

          (mayorista !== null && (!Number.isFinite(mayorista) || mayorista < 0))) {

        setMensaje(`Revisá los precios de "${lista.nombre}".`);

        setTipoMensaje("error"); setGuardando(false); return;

      }

      filasPrecios.push({

        lista_id: lista.id, producto_id: id,

        precio_minorista: minorista,

        precio_mayorista: mayorista,

        visible: valores.visible,

      });

    }

    const actualizadoAt = new Date().toISOString();

    const { error } = await supabase

      .from("productos")

      .update({

        nombre: nombreLimpio,

        codigo: codigoLimpio || null,

        categoria: categoriaLimpia,

        precio: precioNumero,

        costo: costoNumero,

        precio_mayorista: precioMayoristaNumero,

        cantidad_minima_mayorista:

          cantidadMinimaMayoristaNumero,

        stock: stockNumero,

        stock_minimo: stockMinimoNumero,

        descripcion: descripcionLimpia || null,

        imaguen: imagenLimpia || null,

        estado,

        visible_catalogo: visibleCatalogo,

        nuevo_ingreso: nuevoIngreso,

        oferta,

        destacado,

        controlar_stock: controlarStock,

        actualizado_at: actualizadoAt,

      })

      .eq("id", id)

      .eq("empresa_id", empresa.id);

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

    // Upsert mantiene una fila por producto y lista; también permite ocultarlo.

    if (filasPrecios.length > 0) {

      const { error: errorPrecios } = await supabase

        .from("lista_productos")

        .upsert(filasPrecios, { onConflict: "lista_id,producto_id" });

      if (errorPrecios) {

        setMensaje(`Los datos generales del producto se actualizaron, pero los precios por lista NO se pudieron guardar: ${errorPrecios.message}. Volvé a abrir el producto para revisar antes de intentar de nuevo.`);

        setTipoMensaje("error");

        setGuardando(false);

        return;

      }

    }

    setProductoOriginal((productoActual) =>

      productoActual

        ? {

            ...productoActual,

            nombre: nombreLimpio,

            codigo: codigoLimpio || null,

            categoria: categoriaLimpia,

            precio: precioNumero,

            costo: costoNumero,

            precio_mayorista: precioMayoristaNumero,

            cantidad_minima_mayorista:

              cantidadMinimaMayoristaNumero,

            stock: stockNumero,

            stock_minimo: stockMinimoNumero,

            descripcion: descripcionLimpia || null,

            imaguen: imagenLimpia || null,

            estado,

            visible_catalogo: visibleCatalogo,

            nuevo_ingreso: nuevoIngreso,

            oferta,

            destacado,

            controlar_stock: controlarStock,

            actualizado_at: actualizadoAt,

          }

        : productoActual

    );

    setMensaje(

      "Producto actualizado correctamente."

    );

    setTipoMensaje("exito");

    setGuardando(false);

    router.push("/admin/productos");

    router.refresh();

  }

  if (cargandoEmpresa || cargando) {

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

  if (errorEmpresa) {

    return (

      <main className="min-h-screen bg-[#F8FAFC] p-8 text-[#1E293B]">

        <div className="mx-auto max-w-3xl">

          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">

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

              Volver a Productos PRO

            </Link>

          </div>

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

  const botonCalculadora = (
    <button type="button" onClick={alternarCalculadora}
      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
      aria-expanded={calculadoraVisible} aria-controls="panel-calculadora-comersys">
      {calculadoraVisible ? "Ocultar" : "Mostrar"}
    </button>
  );

  const panelCalculadora = (
    <section id="panel-calculadora-comersys" className="rounded-2xl border border-neutral-700 bg-[#171717] p-4 text-white shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Herramientas</p>
          <h2 className="mt-1 text-base font-bold">🧮 Calculadora</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          {botonCalculadora}
          <ControlesTamano tipo="calculadora" />
          <span className="text-[10px] text-neutral-400" title="Atajo de teclado para mostrar u ocultar ambos paneles">
            Ctrl + Alt + (+)
          </span>
        </div>
      </div>
      <div className="mt-4">
          <div className="rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-3 text-right">
            <p className="min-h-4 truncate text-[11px] text-neutral-400">
              {valorAnterior !== null && operacionPendiente ? `${formatearNumeroCalculadora(valorAnterior)} ${operacionPendiente} ${detallePorcentaje ?? ""}` : "Calculadora comercial"}
            </p>
            <p className="mt-1 break-all text-2xl font-bold tabular-nums" aria-live="polite">
              {pantallaCalculadora === "Error" ? "Error" : formatearNumeroCalculadora(Number(pantallaCalculadora)) + (pantallaCalculadora.endsWith(".") ? "," : "")}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {(["C", "⌫", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "±", "0", ".", "="] as const).map(tecla => (
              <button key={tecla} type="button"
                onClick={() => {
                  if (tecla === "C") limpiarCalculadora();
                  else if (tecla === "⌫") retrocederCalculadora();
                  else if (tecla === "%") porcentajeCalculadora();
                  else if (tecla === "±") invertirSigno();
                  else if (tecla === "=") confirmarResultado();
                  else if (tecla === "+" || tecla === "−" || tecla === "×" || tecla === "÷") elegirOperacion(tecla);
                  else ingresarDigito(tecla);
                }}
                className={`min-h-10 rounded-lg px-1 py-2 text-sm font-bold transition hover:brightness-125 ${
                  tecla === "=" ? "bg-blue-600 text-white" :
                  ["+", "−", "×", "÷", "%"].includes(tecla) ? "bg-[#303e5c] text-blue-100" :
                  tecla === "C" ? "bg-rose-950 text-rose-200" : "bg-neutral-800 text-white"
                }`}
                aria-label={tecla === "⌫" ? "Borrar último dígito" : tecla === "C" ? "Limpiar calculadora" : tecla}>
                {tecla}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-neutral-400">Usá el teclado o el teclado numérico: 0–9, +, −, *, /, punto o coma, %, Enter (=), Backspace (⌫) y Escape (C). No interfiere al escribir en los formularios.</p>
          <p className="mt-2 hidden text-[11px] leading-4 text-blue-300 min-[1900px]:block">↘ Arrastrá la esquina inferior derecha del panel para cambiar su tamaño.</p>
          <p className="mt-2 text-[11px] leading-4 text-neutral-400">Descuentos: ingresá el importe, presioná −, el porcentaje, % y =. Por ejemplo, 15000 − 10 % = 13500.</p>
      </div>
    </section>
  );

  const panelHistorial = (
    <section className="rounded-2xl border border-neutral-700 bg-[#171717] p-4 text-white shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Resultados guardados</p>
          <h2 className="mt-1 text-base font-bold">🕘 Historial de cálculos</h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ControlesTamano tipo="historial" />
        {historialCalculos.length > 0 && (
          <button type="button" onClick={() => setConfirmarBorradoHistorial(true)}
            className="rounded-lg border border-neutral-600 px-2 py-1.5 text-[11px] font-semibold text-neutral-300 hover:bg-neutral-800">
            Borrar
          </button>
        )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">Se guarda en este navegador, separado por empresa. Tocá un resultado para reutilizarlo.</p>
      <p className="mt-1 hidden text-[11px] text-blue-300 min-[1900px]:block">↘ Arrastrá la esquina inferior derecha para agrandar o achicar el historial.</p>
      {confirmarBorradoHistorial && (
        <div className="mt-3 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-xs">
          <p>¿Borrar todos los cálculos guardados de esta empresa?</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={borrarHistorial} className="rounded-md bg-rose-700 px-3 py-1.5 font-bold text-white">Sí, borrar</button>
            <button type="button" onClick={() => setConfirmarBorradoHistorial(false)} className="rounded-md bg-neutral-700 px-3 py-1.5 font-bold">Cancelar</button>
          </div>
        </div>
      )}
      {historialCalculos.length === 0 ? (
        <p className="mt-4 rounded-lg bg-neutral-800 p-3 text-center text-xs text-neutral-400">Todavía no hay cálculos. Los resultados aparecerán acá al presionar =.</p>
      ) : (
        <div className="mt-3 max-h-[65vh] space-y-2 overflow-y-auto pr-1">
          {historialCalculos.map(entrada => (
            <button type="button" key={entrada.id} onClick={() => reutilizarResultado(entrada.resultado)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-left transition hover:border-blue-500 hover:bg-neutral-800"
              title="Usar este resultado en la calculadora">
              <span className="block break-words text-[11px] text-neutral-300">{entrada.operacion} =</span>
              <span className="mt-1 block break-all text-lg font-bold tabular-nums text-emerald-400">{formatearNumeroCalculadora(entrada.resultado)}</span>
              <span className="mt-1 block text-[10px] text-neutral-500">{new Date(entrada.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );


  return (

    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      {/* Ambos paneles se muestran y se ocultan juntos. */}
      {calculadoraVisible && (
        <>
          <aside ref={calculadoraPanelRef}
            className="fixed left-4 top-16 z-20 hidden resize overflow-auto rounded-2xl min-[1900px]:block"
            style={{
              width: `min(${tamanosPaneles.calculadora.ancho}px, calc((100vw - 1280px) / 2 - 32px))`,
              height: `min(${tamanosPaneles.calculadora.alto}px, calc(100vh - 5rem))`,
              minWidth: 240,
              maxWidth: "calc((100vw - 1280px) / 2 - 32px)",
              minHeight: 240,
              maxHeight: "calc(100vh - 5rem)",
            }} aria-label="Calculadora comercial redimensionable">
            {panelCalculadora}
          </aside>
          <aside ref={historialPanelRef}
            className="fixed right-4 top-16 z-20 hidden resize overflow-auto rounded-2xl min-[1900px]:block"
            style={{
              width: `min(${tamanosPaneles.historial.ancho}px, calc((100vw - 1280px) / 2 - 32px))`,
              height: `min(${tamanosPaneles.historial.alto}px, calc(100vh - 5rem))`,
              minWidth: 240,
              maxWidth: "calc((100vw - 1280px) / 2 - 32px)",
              minHeight: 240,
              maxHeight: "calc(100vh - 5rem)",
            }} aria-label="Historial de cálculos redimensionable">
            {panelHistorial}
          </aside>
        </>
      )}


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

          <div className="flex flex-wrap items-center gap-3">
            {!calculadoraVisible && (
              <div className="flex flex-col items-end gap-1">
                <button type="button" onClick={alternarCalculadora}
                  className="rounded-xl border border-blue-200 bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                  🧮 Mostrar calculadora e historial
                </button>
                <span className="text-[10px] text-slate-500">Ctrl + Alt + (+)</span>
              </div>
            )}

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

        {calculadoraVisible && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 min-[1900px]:hidden">
            {panelCalculadora}
            {panelHistorial}
          </div>
        )}

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

                <div className="md:col-span-2">

                  <CampoTexto

                    id="codigo"

                    label="Código del producto (opcional)"

                    value={codigo}

                    onChange={setCodigo}

                    placeholder="Ejemplo: 000125 o MAT-001"

                  />

                  <p className="mt-2 text-xs text-slate-500">

                    Se conserva el código original, incluidos los ceros iniciales.

                  </p>

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

                  label="Precio minorista"

                  value={precio}

                  onChange={setPrecio}

                  placeholder="Ejemplo: 25000"

                  numerico

                />

                <CampoTexto

                  id="costo"

                  label="Costo del producto"

                  value={costo}

                  onChange={setCosto}

                  placeholder="Ejemplo: 15000"

                  numerico

                />

                <CampoTexto

                  id="precio-mayorista"

                  label="Precio mayorista"

                  value={precioMayorista}

                  onChange={setPrecioMayorista}

                  placeholder="Opcional. Ejemplo: 22000"

                  numerico

                />

                {controlarStock && (

                  <>

                <CampoTexto

                  id="cantidad-minima-mayorista"

                  label="Mayorista desde"

                  value={cantidadMinimaMayorista}

                  onChange={setCantidadMinimaMayorista}

                  placeholder="Ejemplo: 10"

                  numerico

                />

                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700">

                  El precio mayorista se aplica por producto

                  cuando alcanza esta cantidad. Si dejás vacío

                  el precio mayorista, se utiliza siempre el

                  precio minorista.

                </div>

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

                  </>

                )}

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

                  <button

                    type="button"

                    onClick={() => setImagenAmpliada(true)}

                    title="Hacer clic para ampliar la fotografía"

                    aria-label={`Ampliar fotografía de ${nombre || "producto"}`}

                    className="mt-5 block w-full cursor-zoom-in rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-blue-300"

                  >

                    <img

                      src={imagen}

                      alt={nombre || "Producto"}

                      className="h-72 w-full rounded-2xl border border-slate-200 object-contain"

                    />

                    <span className="mt-2 block text-center text-xs text-blue-600">

                      Tocá la imagen para verla en grande

                    </span>

                  </button>

                ) : (

                  <div className="mt-5 flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-center text-slate-400">

                    Sin imagen principal

                  </div>

                )}

                {controlarStock && (

                <div

                  className={`mt-5 rounded-2xl border p-4 ${

                    !controlarStock

                      ? "border-blue-200 bg-blue-50 text-blue-700"

                      : stockBajo

                        ? "border-amber-200 bg-amber-50 text-amber-700"

                        : "border-green-200 bg-green-50 text-green-700"

                  }`}

                >

                  <p className="font-bold">

                    {!controlarStock

                      ? "∞ Venta sin límite de stock"

                      : stockBajo

                        ? "⚠️ Stock bajo"

                        : "✓ Stock correcto"}

                  </p>

                  <p className="mt-1 text-sm">

                    {!controlarStock

                      ? "El producto puede venderse aunque el stock cargado llegue a cero."

                      : `Stock actual: ${stock || 0} · Mínimo: ${stockMinimo || 0}`}

                  </p>

                </div>

                )}

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

                    label="Controlar stock disponible"

                    descripcion="Activado: limita y descuenta stock. Desactivado: permite vender cualquier cantidad y no descuenta stock."

                    checked={controlarStock}

                    onChange={setControlarStock}

                  />

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

          {listas.length > 0 && (

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <h2 className="text-xl font-bold">Precios por lista de catálogo</h2>

              <p className="mt-2 text-sm text-slate-500">

                Cada lista tiene sus precios y visibilidad. {controlarStock ? "El stock sigue siendo único." : "Este producto no controla stock."}

                Si dejás vacío el precio mayorista, se utilizará el minorista.

              </p>

              <div className="mt-6 space-y-4">

                {listas.map((lista) => {

                  const valores = preciosPorLista[lista.id] || { visible: false, minorista: "", mayorista: "" };

                  return (

                    <div key={lista.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                      <label className="flex items-center gap-3 font-bold">

                        <input type="checkbox" checked={valores.visible}

                          onChange={(event) => actualizarPrecioLista(lista.id, "visible", event.target.checked)}

                          className="h-5 w-5 rounded border-slate-300" />

                        Mostrar en {lista.nombre}

                        {!lista.activa && <span className="text-xs font-normal text-slate-500">(Lista inactiva)</span>}

                      </label>

                      {valores.visible && (

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">

                          <CampoTexto id={`minorista-lista-${lista.id}`} label="Precio minorista"

                            value={valores.minorista}

                            onChange={(valor) => actualizarPrecioLista(lista.id, "minorista", valor)}

                            placeholder="Ejemplo: 25000" numerico />

                          <CampoTexto id={`mayorista-lista-${lista.id}`} label="Precio mayorista (opcional)"

                            value={valores.mayorista}

                            onChange={(valor) => actualizarPrecioLista(lista.id, "mayorista", valor)}

                            placeholder="Sin mayorista: usar minorista" numerico />

                        </div>

                      )}

                    </div>

                  );

                })}

              </div>

            </section>

          )}

          {errorListas && (

            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">

              {errorListas}. No guardes hasta resolver este error.

            </div>

          )}

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

              disabled={guardando || Boolean(errorListas)}

              className="rounded-xl bg-[#2563EB] px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"

            >

              {guardando

                ? "Guardando cambios..."

                : "Guardar cambios"}

            </button>

          </div>

        </form>

      </div>

      {imagenAmpliada && imagen && (

        <div

          role="dialog"

          aria-modal="true"

          aria-label={`Fotografía ampliada de ${nombre || "producto"}`}

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8"

          onClick={() => setImagenAmpliada(false)}

        >

          <button

            type="button"

            onClick={() => setImagenAmpliada(false)}

            aria-label="Cerrar fotografía ampliada"

            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-bold text-slate-900 shadow-lg hover:bg-slate-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-400"

          >

            ×

          </button>

          <img

            src={imagen}

            alt={nombre || "Producto"}

            onClick={(event) => event.stopPropagation()}

            className="max-h-[90vh] max-w-full object-contain"

          />

        </div>

      )}

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
