"use client";



import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import { supabase } from "@/lib/supabase";

import { useEmpresa } from "@/lib/empresa/EmpresaProvider";



import HeaderProductos from "@/components/productos/HeaderProductos";

import ResumenProductos, {

  type ResumenProductoItem,

} from "@/components/productos/ResumenProductos";



import TablaProductos, {

  type CampoBooleanoProducto,

  type ProductoListado,
  type ListaPrecioCatalogo,
  type PrecioProductoLista,

} from "@/components/productos/TablaProductos";

import TarjetaProducto from "@/components/productos/TarjetaProducto";





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

type VistaProductos =

  | "lista"

  | "tarjetas";



export default function ProductosPage() {

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

  const [listasPrecio, setListasPrecio] = useState<ListaPrecioCatalogo[]>([]);
  const [preciosPorProducto, setPreciosPorProducto] = useState<Record<number, Record<number, PrecioProductoLista>>>({});

  const [productos, setProductos] =

    useState<ProductoListado[]>([]);

  const [busqueda, setBusqueda] =

    useState("");

  const [filtro, setFiltro] = useState("__todas__");
  const [categorias, setCategorias] = useState<string[]>([]);

  // La selección se guarda por empresa y sobrevive a la navegación de edición.
  useEffect(() => {
    if (!empresa?.id) return;
    const clave = `comersys-productos-categoria-${empresa.id}`;
    setFiltro(window.localStorage.getItem(clave) || "__todas__");
  }, [empresa?.id]);

  function cambiarFiltro(categoria: string) {
    setFiltro(categoria);
    if (empresa?.id) {
      window.localStorage.setItem(`comersys-productos-categoria-${empresa.id}`, categoria);
    }
  }

  const [vista, setVista] =

    useState<VistaProductos>("lista");



  useEffect(() => {

    const vistaGuardada = window.localStorage.getItem(

      "comersys-productos-vista"

    );



    if (vistaGuardada === "lista" || vistaGuardada === "tarjetas") {

      setVista(vistaGuardada);

    }

  }, []);



  function cambiarVista(nuevaVista: VistaProductos) {

    setVista(nuevaVista);

    window.localStorage.setItem(

      "comersys-productos-vista",

      nuevaVista

    );

  }

  const [cargando, setCargando] =

    useState(true);

  const [actualizandoId, setActualizandoId] =

    useState<number | null>(null);

  const [eliminandoId, setEliminandoId] =

    useState<number | null>(null);

  const [error, setError] =

    useState("");

  const [mensaje, setMensaje] =

    useState("");



  const cargarProductos = useCallback(async () => {
    if (!empresa?.id) return;
    setCargando(true);
    setError("");
    try {
      const [resultadoProductos, resultadoCategorias, resultadoListas] = await Promise.all([
        supabase.from("productos").select("*").eq("empresa_id", empresa.id).order("id", { ascending: false }),
        supabase.from("categorias").select("nombre, orden").eq("empresa_id", empresa.id)
          .order("orden", { ascending: true }).order("nombre", { ascending: true }),
        supabase.from("listas_catalogos").select("id, nombre, activa")
          .eq("empresa_id", empresa.id).order("created_at", { ascending: true }),
      ]);
      if (resultadoProductos.error) throw resultadoProductos.error;
      if (resultadoCategorias.error) throw resultadoCategorias.error;
      if (resultadoListas.error) throw resultadoListas.error;

      const listasActivas = ((resultadoListas.data || []) as Array<{ id: number; nombre: string; activa: boolean }>).filter((lista) => lista.activa);
      const precios: Record<number, Record<number, PrecioProductoLista>> = {};
      const idsListas = listasActivas.map((lista) => lista.id);
      // Paginación: Supabase puede limitar la cantidad de registros por consulta.
      for (let i = 0; i < idsListas.length; i += 50) {
        const grupo = idsListas.slice(i, i + 50);
        let pagina = 0;
        while (true) {
          const { data: filas, error: errorPrecios } = await supabase
            .from("lista_productos")
            .select("lista_id, producto_id, precio_minorista, precio_mayorista, visible")
            .in("lista_id", grupo)
            .order("producto_id", { ascending: true })
            .order("lista_id", { ascending: true })
            .range(pagina * 500, pagina * 500 + 499);
          if (errorPrecios) throw errorPrecios;
          for (const fila of (filas || []) as Array<PrecioProductoLista & { lista_id: number; producto_id: number }>) {
            (precios[fila.producto_id] ??= {})[fila.lista_id] = {
              precio_minorista: fila.precio_minorista,
              precio_mayorista: fila.precio_mayorista,
              visible: fila.visible,
            };
          }
          if (!filas || filas.length < 500) break;
          pagina++;
        }
      }
      const productosCargados = (resultadoProductos.data || []) as ProductoListado[];
      const ordenCategorias = new Map(
        ((resultadoCategorias.data || []) as Array<{ nombre: string; orden?: number | null }>).map(
          (categoria, indice) => [categoria.nombre, Number(categoria.orden ?? indice + 1)]
        )
      );
      const nombresCategoria = ((resultadoCategorias.data || []) as Array<{ nombre: string }>).map((c) => c.nombre);
      const categoriasUsadas = productosCargados.map((p) => p.categoria || "");
      setCategorias(Array.from(new Set([...nombresCategoria, ...categoriasUsadas].map((c) => c.trim()).filter(Boolean)))
        .sort((a, b) => (ordenCategorias.get(a) ?? Number.MAX_SAFE_INTEGER) - (ordenCategorias.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b, "es")));
      setProductos([...productosCargados].sort((a, b) => {
        const ordenA = ordenCategorias.get(a.categoria || "") ?? Number.MAX_SAFE_INTEGER;
        const ordenB = ordenCategorias.get(b.categoria || "") ?? Number.MAX_SAFE_INTEGER;
        return ordenA !== ordenB ? ordenA - ordenB : b.id - a.id;
      }));
      setListasPrecio(listasActivas.map(({ id, nombre }) => ({ id, nombre })));
      setPreciosPorProducto(precios);
    } catch (errorDesconocido) {
      console.error("Error al cargar productos y precios:", errorDesconocido);
      setError(errorDesconocido instanceof Error ? errorDesconocido.message : "No se pudieron cargar los precios.");
    } finally {
      setCargando(false);
    }
  }, [empresa?.id]);

  useEffect(() => {

    if (!empresa?.id) return;



    cargarProductos();

  }, [empresa?.id, cargarProductos]);



  const resumen = useMemo(() => {

    const activos = productos.filter(

      (producto) =>

        producto.estado === "Activo"

    );



    return {

      total: productos.length,

      activos: activos.length,

      stockBajo: activos.filter(

        (producto) =>

          Number(producto.stock) <=

          Number(

            producto.stock_minimo

          )

      ).length,

      nuevos: activos.filter(

        (producto) =>

          producto.nuevo_ingreso

      ).length,

      ofertas: activos.filter(

        (producto) =>

          producto.oferta

      ).length,

      ocultos: activos.filter(

        (producto) =>

          !producto.visible_catalogo

      ).length,

    };

  }, [productos]);



  const resumenItems: ResumenProductoItem[] =

    [

      {

        titulo: "Total",

        valor: resumen.total,

        icono: "📦",

        variante: "normal",

      },

      {

        titulo: "Activos",

        valor: resumen.activos,

        icono: "✅",

        variante: "verde",

      },

      {

        titulo: "Stock bajo",

        valor: resumen.stockBajo,

        icono: "⚠️",

        variante: "naranja",

      },

      {

        titulo: "Nuevos",

        valor: resumen.nuevos,

        icono: "🆕",

        variante: "azul",

      },

      {

        titulo: "Ofertas",

        valor: resumen.ofertas,

        icono: "🔥",

        variante: "violeta",

      },

      {

        titulo: "Ocultos",

        valor: resumen.ocultos,

        icono: "🚫",

        variante: "gris",

      },

    ];



  const productosFiltrados =

    useMemo(() => {

      const texto = busqueda

        .trim()

        .toLowerCase();



      return productos.filter(

        (producto) => {

          const coincideBusqueda =

            producto.nombre

              .toLowerCase()

              .includes(texto) ||

            (

              producto.categoria || ""

            )

              .toLowerCase()

              .includes(texto) ||

            (

              producto.descripcion || ""

            )

              .toLowerCase()

              .includes(texto) ||

            (

              (producto as ProductoListado & { codigo?: string | null }).codigo || ""

            )

              .toLowerCase()

              .includes(texto);



          const coincideFiltro = filtro === "__todas__" || (producto.categoria || "").trim() === filtro;

          return (

            coincideBusqueda &&

            coincideFiltro

          );

        }

      );

    }, [

      productos,

      busqueda,

      filtro,

    ]);



  async function actualizarCampoBooleano(

    producto: ProductoListado,

    campo: CampoBooleanoProducto

  ) {

    if (!empresa?.id) {

      setError("No encontramos la empresa actual.");

      return;

    }



    if (actualizandoId !== null) {

      return;

    }



    const nuevoValor =

      !producto[campo];



    setActualizandoId(producto.id);

    setError("");

    setMensaje("");



    const {

      error: errorActualizacion,

    } = await supabase

      .from("productos")

      .update({

        [campo]: nuevoValor,

        actualizado_at:

          new Date().toISOString(),

      })

      .eq("id", producto.id)

      .eq("empresa_id", empresa.id);



    if (errorActualizacion) {

      setError(

        `No se pudo actualizar el producto: ${errorActualizacion.message}`

      );



      setActualizandoId(null);

      return;

    }



    setProductos(

      (productosActuales) =>

        productosActuales.map(

          (productoActual) =>

            productoActual.id ===

            producto.id

              ? {

                  ...productoActual,

                  [campo]:

                    nuevoValor,

                  actualizado_at:

                    new Date().toISOString(),

                }

              : productoActual

        )

    );



    setMensaje(

      "Producto actualizado correctamente."

    );



    setActualizandoId(null);

  }



  async function cambiarEstado(

    producto: ProductoListado

  ) {

    if (!empresa?.id) {

      setError("No encontramos la empresa actual.");

      return;

    }



    if (actualizandoId !== null) {

      return;

    }



    const nuevoEstado =

      producto.estado === "Activo"

        ? "Inactivo"

        : "Activo";



    setActualizandoId(producto.id);

    setError("");

    setMensaje("");



    const {

      error: errorActualizacion,

    } = await supabase

      .from("productos")

      .update({

        estado: nuevoEstado,

        actualizado_at:

          new Date().toISOString(),

      })

      .eq("id", producto.id)

      .eq("empresa_id", empresa.id);



    if (errorActualizacion) {

      setError(

        `No se pudo cambiar el estado: ${errorActualizacion.message}`

      );



      setActualizandoId(null);

      return;

    }



    setProductos(

      (productosActuales) =>

        productosActuales.map(

          (productoActual) =>

            productoActual.id ===

            producto.id

              ? {

                  ...productoActual,

                  estado: nuevoEstado,

                  actualizado_at:

                    new Date().toISOString(),

                }

              : productoActual

        )

    );



    setMensaje(

      nuevoEstado === "Activo"

        ? "Producto activado."

        : "Producto desactivado."

    );



    setActualizandoId(null);

  }



  async function eliminarProducto(

    producto: ProductoListado

  ) {

    if (!empresa?.id) {

      setError("No encontramos la empresa actual.");

      return;

    }



    if (eliminandoId !== null) {

      return;

    }



    const confirmar =

      window.confirm(

        `¿Seguro que querés eliminar "${producto.nombre}"?\n\nEsta acción también eliminará su contenido multimedia relacionado.`

      );



    if (!confirmar) {

      return;

    }



    setEliminandoId(producto.id);

    setError("");

    setMensaje("");



    const {

      error: errorEliminacion,

    } = await supabase

      .from("productos")

      .delete()

      .eq("id", producto.id)

      .eq("empresa_id", empresa.id);



    if (errorEliminacion) {

      setError(

        `No se pudo eliminar el producto: ${errorEliminacion.message}`

      );



      setEliminandoId(null);

      return;

    }



    setProductos(

      (productosActuales) =>

        productosActuales.filter(

          (productoActual) =>

            productoActual.id !==

            producto.id

        )

    );



    setMensaje(

      "Producto eliminado correctamente."

    );



    setEliminandoId(null);

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
      <div className="mx-auto max-w-7xl space-y-8">

        <div className="relative">
          <HeaderProductos
            totalProductos={productos.length}
            cargando={cargandoEmpresa || cargando}
            onActualizar={cargarProductos}
          />
          {!calculadoraVisible && (
            <div className="mt-3 flex flex-col items-end gap-1 min-[900px]:absolute min-[900px]:bottom-4 min-[900px]:right-4 min-[900px]:mt-0">
              <button type="button" onClick={alternarCalculadora}
                aria-expanded={false} aria-controls="panel-calculadora-comersys"
                className="rounded-lg border border-blue-500/40 bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-md transition hover:bg-blue-700">
                🧮 Mostrar calculadora e historial
              </button>
              <span className="text-[10px] text-slate-500" title="Atajo de teclado para mostrar u ocultar ambos paneles">
                Ctrl + Alt + (+)
              </span>
            </div>
          )}
        </div>



        <ResumenProductos

          items={resumenItems}

        />

        {/* En pantallas medianas y pequeñas, no se tapan los productos. */}
        {calculadoraVisible && (
          <div className="grid gap-4 md:grid-cols-2 min-[1900px]:hidden">
            {panelCalculadora}
            {panelHistorial}
          </div>
        )}



        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,290px)_auto] md:items-end">
            <label className="block text-sm font-semibold text-slate-800">
              Buscar producto
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre, código, categoría o descripción"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              Categoría
              <select
                value={filtro}
                onChange={(event) => cambiarFiltro(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="__todas__">Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={cargarProductos}
              disabled={cargandoEmpresa || cargando}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              ↻ Actualizar
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
            <span className="mr-2 text-sm font-semibold text-slate-600">Vista</span>
            <button type="button" onClick={() => cambiarVista("lista")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${vista === "lista" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-800"}`}>
              ☰ Lista
            </button>
            <button type="button" onClick={() => cambiarVista("tarjetas")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${vista === "tarjetas" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-800"}`}>
              ▣ Tarjetas
            </button>
          </div>
        </section>



        {(errorEmpresa || error) && (

          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">

            {errorEmpresa || error}

          </div>

        )}



        {mensaje && (

          <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-700">

            ✓ {mensaje}

          </div>

        )}



        {vista === "lista" ? (

          <TablaProductos
              listasPrecio={listasPrecio}
              preciosPorProducto={preciosPorProducto}

            productos={

              productosFiltrados

            }

            cargando={cargandoEmpresa || cargando}

            actualizandoId={

              actualizandoId

            }

            eliminandoId={

              eliminandoId

            }

            onActualizarCampo={

              actualizarCampoBooleano

            }

            onCambiarEstado={

              cambiarEstado

            }

            onEliminar={

              eliminarProducto

            }

          />

        ) : (

          <VistaTarjetas
              listasPrecio={listasPrecio}
              preciosPorProducto={preciosPorProducto}

            productos={

              productosFiltrados

            }

            cargando={cargandoEmpresa || cargando}

            actualizandoId={

              actualizandoId

            }

            eliminandoId={

              eliminandoId

            }

            onActualizarCampo={

              actualizarCampoBooleano

            }

            onCambiarEstado={

              cambiarEstado

            }

            onEliminar={

              eliminarProducto

            }

          />

        )}

      </div>

    </main>

  );

}



function VistaTarjetas({
  listasPrecio,
  preciosPorProducto,

  productos,

  cargando,

  actualizandoId,

  eliminandoId,

  onActualizarCampo,

  onCambiarEstado,

  onEliminar,

}: {

  listasPrecio: ListaPrecioCatalogo[];
  preciosPorProducto: Record<number, Record<number, PrecioProductoLista>>;
  productos: ProductoListado[];

  cargando: boolean;

  actualizandoId: number | null;

  eliminandoId: number | null;

  onActualizarCampo: (

    producto: ProductoListado,

    campo: CampoBooleanoProducto

  ) => void;

  onCambiarEstado: (

    producto: ProductoListado

  ) => void;

  onEliminar: (

    producto: ProductoListado

  ) => void;

}) {

  if (cargando) {

    return (

      <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">

        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />



        <p className="mt-4 text-slate-500">

          Cargando productos...

        </p>

      </section>

    );

  }



  if (productos.length === 0) {

    return (

      <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">

        <p className="font-semibold text-slate-700">

          No se encontraron productos

        </p>



        <p className="mt-2 text-sm text-slate-500">

          Probá con otra búsqueda o cambiá el filtro.

        </p>

      </section>

    );

  }



  return (

    <section>

      <div className="mb-4">

        <h2 className="text-xl font-bold">

          Vista en tarjetas

        </h2>



        <p className="mt-1 text-sm text-slate-500">

          {productos.length} producto(s) encontrados

        </p>

      </div>



      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {productos.map((producto) => (

          <TarjetaProducto
            listasPrecio={listasPrecio}
            preciosLista={preciosPorProducto[producto.id] || {}}

            key={producto.id}

            producto={producto}

            actualizando={

              actualizandoId === producto.id

            }

            eliminando={

              eliminandoId === producto.id

            }

            onActualizarCampo={

              onActualizarCampo

            }

            onCambiarEstado={

              onCambiarEstado

            }

            onEliminar={onEliminar}

          />

        ))}

      </div>

    </section>

  );

}