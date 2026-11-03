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


type ColorEmpresa = { id: number; nombre: string; codigo_hex: string | null };

function claveColor(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}

function claveCategoria(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}


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
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  // Los colores se guardan en productos.colores y el catálogo se comparte por empresa.
  const [coloresProducto, setColoresProducto] = useState<string[]>([]);
  const [coloresEmpresa, setColoresEmpresa] = useState<ColorEmpresa[]>([]);
  const [cargandoColores, setCargandoColores] = useState(true);
  const [errorColores, setErrorColores] = useState("");
  const [mostrarNuevoColor, setMostrarNuevoColor] = useState(false);
  const [nombreNuevoColor, setNombreNuevoColor] = useState("");
  const [hexNuevoColor, setHexNuevoColor] = useState("#808080");
  const [guardandoColor, setGuardandoColor] = useState(false);
  const [mensajeColores, setMensajeColores] = useState("");

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
    if (!empresaId) return;
    const idEmpresa = Number(empresaId);
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
  }, [empresaId]);

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
    if (empresaId) {
      try {
        window.localStorage.setItem(`comersys-calculadora-tamano-${empresaId}-${tipo}`, JSON.stringify(siguiente));
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
    if (!calculadoraVisible || !empresaId || tamanosCargadosEmpresa !== Number(empresaId)) return;
    const idEmpresa = Number(empresaId);
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
  }, [calculadoraVisible, empresaId, tamanosCargadosEmpresa]);


  useEffect(() => {
    if (!empresaId) return;
    const idEmpresa = Number(empresaId);
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
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId || historialCargadoEmpresa !== Number(empresaId)) return;
    try {
      window.localStorage.setItem(`comersys-calculadora-historial-${empresaId}`, JSON.stringify(historialCalculos));
    } catch { /* El cálculo sigue funcionando aunque el navegador limite el almacenamiento. */ }
  }, [empresaId, historialCargadoEmpresa, historialCalculos]);

  function alternarCalculadora() {
    const siguiente = !calculadoraVisible;
    setCalculadoraVisible(siguiente);
    if (empresaId) {
      try { window.localStorage.setItem(`comersys-calculadora-visible-${empresaId}`, String(siguiente)); }
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
    if (empresaId) {
      try { window.localStorage.setItem(`comersys-calculadora-visible-${empresaId}`, "true"); } catch { /* opcional */ }
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
  // Escape vuelve al Centro de Productos incluso si hay un campo del formulario enfocado.
  // Los diálogos y el guardado activo tienen prioridad para evitar perder información.
  useEffect(() => {
    function manejarEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat) return;
      // Sin un campo enfocado, Escape pertenece a la calculadora (tecla C).
      const foco = event.target;
      if (calculadoraVisible && foco instanceof HTMLElement &&
          !foco.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      if (guardando || productoGuardado) return;

      const hayCambios =
        nombre.trim() !== "" ||
        codigo.trim() !== "" ||
        categoria !== "" ||
        descripcion.trim() !== "" ||
        precio.trim() !== "" ||
        costo.trim() !== "" ||
        precioMayorista.trim() !== "" ||
        cantidadMinimaMayorista !== "10" ||
        stock.trim() !== "" ||
        stockMinimo !== "0" ||
        estado !== "Activo" ||
        !visibleCatalogo ||
        !nuevoIngreso ||
        oferta ||
        destacado ||
        !controlarStock ||
        coloresProducto.length > 0 ||
        mostrarNuevoColor ||
        archivo !== null ||
        imagenSubida !== null ||
        Object.values(preciosPorLista).some(
          (valor) => valor.visible || valor.minorista.trim() !== "" || valor.mayorista.trim() !== ""
        );

      event.preventDefault();
      event.stopPropagation();

      if (hayCambios && !window.confirm("Tenés cambios sin guardar. ¿Querés salir y volver al Centro de Productos?")) {
        return;
      }

      router.push("/admin/productos");
    }

    // La captura permite manejar Esc aun cuando el foco está en inputs o selects.
    window.addEventListener("keydown", manejarEscape, true);
    return () => window.removeEventListener("keydown", manejarEscape, true);
  }, [
    router, guardando, productoGuardado, calculadoraVisible, nombre, codigo, categoria, descripcion, precio, costo,
    precioMayorista, cantidadMinimaMayorista, stock, stockMinimo, estado,
    visibleCatalogo, nuevoIngreso, oferta, destacado, controlarStock, archivo,
    imagenSubida, preciosPorLista, coloresProducto, mostrarNuevoColor,
  ]);

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
  useEffect(() => {
    if (!empresaId) return;
    let vigente = true;
    setCargandoColores(true);
    setErrorColores("");
    supabase.from("colores_empresa")
      .select("id, nombre, codigo_hex")
      .eq("empresa_id", empresaId)
      .order("nombre", { ascending: true })
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error) setErrorColores(`No se pudieron cargar los colores: ${error.message}`);
        else setColoresEmpresa((data || []) as ColorEmpresa[]);
        setCargandoColores(false);
      });
    return () => { vigente = false; };
  }, [empresaId]);

  function alternarColor(nombre: string) {
    setColoresProducto(actual => actual.some(c => claveColor(c) === claveColor(nombre))
      ? actual.filter(c => claveColor(c) !== claveColor(nombre))
      : [...actual, nombre]);
    setMensajeColores("");
  }

  async function crearColorDesdeProducto() {
    if (!empresaId || guardandoColor) return;
    const nombreNuevo = nombreNuevoColor.trim().replace(/\s+/g, " ");
    if (!nombreNuevo) {
      setMensajeColores("Ingresá un nombre para el color.");
      return;
    }
    if (nombreNuevo.length > 80) {
      setMensajeColores("El nombre del color no puede superar 80 caracteres.");
      return;
    }
    setGuardandoColor(true);
    setMensajeColores("");
    try {
      // Volver a consultar impide crear un duplicado que haya agregado otra pestaña.
      const { data, error } = await supabase.from("colores_empresa")
        .select("id, nombre, codigo_hex")
        .eq("empresa_id", empresaId)
        .order("nombre", { ascending: true });
      if (error) throw error;
      const lista = (data || []) as ColorEmpresa[];
      let encontrado = lista.find(item => claveColor(item.nombre) === claveColor(nombreNuevo));
      if (!encontrado) {
        const { data: creado, error: errorCreacion } = await supabase.from("colores_empresa")
          .insert({ empresa_id: empresaId, nombre: nombreNuevo, codigo_hex: hexNuevoColor })
          .select("id, nombre, codigo_hex")
          .single();
        if (errorCreacion) {
          if (errorCreacion.code !== "23505") throw errorCreacion;
          const { data: recarga, error: errorRecarga } = await supabase.from("colores_empresa")
            .select("id, nombre, codigo_hex").eq("empresa_id", empresaId);
          if (errorRecarga) throw errorRecarga;
          const recargados = (recarga || []) as ColorEmpresa[];
          encontrado = recargados.find(item => claveColor(item.nombre) === claveColor(nombreNuevo));
          if (!encontrado) throw new Error("El color ya existe. Actualizá la página para seleccionarlo.");
          setColoresEmpresa(recargados.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
        } else {
          encontrado = creado as ColorEmpresa;
          setColoresEmpresa([...lista, encontrado].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
        }
      } else {
        setColoresEmpresa(lista);
      }
      const nombreElegido = encontrado.nombre;
      setColoresProducto(actual => actual.some(c => claveColor(c) === claveColor(nombreElegido))
        ? actual : [...actual, nombreElegido]);
      setMostrarNuevoColor(false);
      setNombreNuevoColor("");
      setHexNuevoColor("#808080");
      setMensajeColores(`Color «${nombreElegido}» seleccionado. Guardá el producto para asociarlo.`);
    } catch (desconocido) {
      setMensajeColores(desconocido instanceof Error ? desconocido.message : "No se pudo crear el color.");
    } finally {
      setGuardandoColor(false);
    }
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
    if (cargandoColores || guardandoColor || mostrarNuevoColor || errorColores) {
      setError(errorColores || "Terminá de cargar o agregar el color antes de guardar el producto.");
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
      const codigoLimpio = codigo.trim();
      if (codigoLimpio.length > 80) {
        throw new Error("El código del producto no puede superar los 80 caracteres.");
      }
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
          codigo: codigoLimpio || null,
          categoria: categoriaLimpia,
          colores: coloresProducto,
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
                <div className="md:col-span-2">
                  <label className="mb-2 block font-semibold text-slate-800">Colores disponibles (opcional)</label>
                  <p className="mb-3 text-xs text-slate-500">Seleccioná todos los colores del producto. Si no elegís ninguno, no aparecerá la información de colores en su ficha.</p>
                  {cargandoColores ? (
                    <p className="text-sm text-slate-500">Cargando colores...</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {coloresEmpresa.map(color => {
                        const seleccionado = coloresProducto.some(c => claveColor(c) === claveColor(color.nombre));
                        return (
                          <button key={color.id} type="button" onClick={() => alternarColor(color.nombre)}
                            aria-pressed={seleccionado}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${seleccionado ? "border-blue-500 bg-blue-50 font-semibold text-blue-800 ring-1 ring-blue-300" : "border-slate-300 bg-white text-slate-700 hover:border-blue-300"}`}>
                            <span className="h-4 w-4 shrink-0 rounded-full border border-slate-400/60"
                              style={{ backgroundColor: color.codigo_hex || "#CBD5E1" }} aria-hidden="true" />
                            {color.nombre}
                            {seleccionado && <span aria-hidden="true" className="text-blue-600">✓</span>}
                          </button>
                        );
                      })}
                      {coloresProducto.filter(c => !coloresEmpresa.some(item => claveColor(item.nombre) === claveColor(c))).map(c => (
                        <button key={c} type="button" onClick={() => alternarColor(c)} aria-pressed="true"
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          {c} (color anterior) ×
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    {!mostrarNuevoColor ? (
                      <button type="button" onClick={() => { setMostrarNuevoColor(true); setMensajeColores(""); }}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                        ＋ Agregar nuevo color
                      </button>
                    ) : (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <label htmlFor="nuevo-color-nombre" className="block text-sm font-semibold text-slate-800">Nombre del nuevo color</label>
                        <div className="mt-2 flex flex-wrap items-end gap-3">
                          <input id="nuevo-color-nombre" type="text" value={nombreNuevoColor}
                            onChange={evento => setNombreNuevoColor(evento.target.value)}
                            onKeyDown={evento => { if (evento.key === "Enter") { evento.preventDefault(); void crearColorDesdeProducto(); } }}
                            placeholder="Ej.: Bordó, Suela, Habano" maxLength={80}
                            className="min-w-44 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
                          <label htmlFor="nuevo-color-hex" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            Círculo <input id="nuevo-color-hex" type="color" value={hexNuevoColor}
                              onChange={evento => setHexNuevoColor(evento.target.value)}
                              className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1" />
                          </label>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" disabled={guardandoColor || !nombreNuevoColor.trim()}
                            onClick={() => void crearColorDesdeProducto()}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            {guardandoColor ? "Guardando..." : "Crear y seleccionar"}
                          </button>
                          <button type="button" disabled={guardandoColor}
                            onClick={() => { setMostrarNuevoColor(false); setNombreNuevoColor(""); setMensajeColores(""); }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {errorColores && <p className="mt-2 text-sm text-red-600" role="alert">{errorColores}</p>}
                  {mensajeColores && <p className="mt-2 text-xs text-slate-600" role="status">{mensajeColores}</p>}
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
                    Escribí el código tal como lo usa el negocio. No se genera ni modifica automáticamente.
                  </p>
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
              disabled={guardando || !empresaId || cargandoListas || Boolean(errorListas) || productoGuardado || cargandoColores || guardandoColor || mostrarNuevoColor || Boolean(errorColores)}
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
