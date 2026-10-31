"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { crearCliente } from "@/services/clientes";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

type Producto = {
  id: number;
  nombre: string;
  codigo: string | null;
  categoria: string | null;
  descripcion: string | null;
  precio: number | null;
  precio_mayorista: number | null;
  imaguen: string | null;
  estado: string;
};

type Lista = { id: number; nombre: string; activa: boolean };
type PrecioLista = { producto_id: number; lista_id: number; precio_minorista: number | null; precio_mayorista: number | null; visible: boolean };
type Seleccion = { cantidad: number | ""; lista: string; tipoPrecio: "minorista" | "mayorista" };
type DescuentoTipo = "ninguno" | "porcentaje" | "fijo";
type TipoDocumento = "presupuesto" | "remito";
type Cliente = {
  id: number;
  empresa_id: number;
  nombre: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  observaciones: string | null;
  activo: boolean;
};
type FormCliente = { nombre: string; telefono: string; email: string; direccion: string; observaciones: string };
const CLIENTE_VACIO: FormCliente = { nombre: "", telefono: "", email: "", direccion: "", observaciones: "" };
const inputCliente = "mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 font-normal outline-none focus:border-blue-500";

const MONEDA = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const pesos = (n: number) => MONEDA.format(n);
const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter] || caracter);
const numeroSeguro = (valor: unknown) => { const n = Number(valor); return Number.isFinite(n) && n >= 0 ? n : 0; };


// Importación de documentos PDF generados por «Calcular mi compra».
// PDF.js se carga bajo demanda: no requiere modificar package.json ni otro archivo.
type TextoPDF = { str: string; transform: number[]; width?: number };
type LineaPDF = { y: number; piezas: { x: number; texto: string }[] };
type FilaCalculoPDF = { codigo: string; nombre: string; cantidad: number; precio: number };

type PDFJsMinimo = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (datos: { data: Uint8Array }) => { promise: Promise<{
    numPages: number;
    getPage: (numero: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }>;
    destroy: () => Promise<void>;
  }> };
};

declare global {
  interface Window { pdfjsLib?: PDFJsMinimo }
}

const PDF_JS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let promesaPDFJS: Promise<PDFJsMinimo> | null = null;
function obtenerPDFJS(): Promise<PDFJsMinimo> {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!promesaPDFJS) {
    promesaPDFJS = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDF_JS_CDN;
      script.async = true;
      script.onload = () => {
        if (!window.pdfjsLib) { reject(new Error("No se pudo iniciar el lector de PDF.")); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("No se pudo descargar el lector de PDF. Revisá la conexión a Internet."));
      document.head.appendChild(script);
    }).catch((error) => { promesaPDFJS = null; throw error; });
  }
  return promesaPDFJS;
}

function normalizarCoincidencia(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
}
function precioExtraido(texto: string) {
  const limpio = texto.replace(/[^\d,.-]/g, "");
  if (!limpio) return NaN;
  const ultimaComa = limpio.lastIndexOf(",");
  const ultimoPunto = limpio.lastIndexOf(".");
  const separadorDecimal = ultimaComa > ultimoPunto ? "," : ultimoPunto > ultimaComa ? "." : "";
  const num = separadorDecimal === ","
    ? limpio.replace(/\./g, "").replace(",", ".")
    : separadorDecimal === "." && (limpio.length - ultimoPunto - 1) <= 2
      ? limpio.replace(/,/g, "")
      : limpio.replace(/[.,]/g, "");
  return Number(num);
}

// Se identifican las columnas por su posición en el PDF. No se interpreta
// texto libre como si fueran productos: únicamente tablas con ese encabezado.
function extraerFilasCalculo(lineas: LineaPDF[]): FilaCalculoPDF[] {
  const filas: FilaCalculoPDF[] = [];
  let columnas: number[] | null = null;
  let filaActual: { codigo: string; nombre: string; cantidad: number; precio: number } | null = null;
  const finalizar = () => {
    if (filaActual) {
      if (filaActual.nombre && Number.isInteger(filaActual.cantidad) && filaActual.cantidad > 0 && Number.isFinite(filaActual.precio)) {
        filas.push(filaActual);
      }
      filaActual = null;
    }
  };
  for (const linea of lineas) {
    const piezas = [...linea.piezas].sort((a, b) => a.x - b.x);
    const completo = piezas.map(p => p.texto).join(" ").replace(/\s+/g, " ").trim();
    if (!completo) continue;
    const etiquetas = piezas.map(p => normalizarCoincidencia(p.texto));
    const buscarX = (textos: string[]) => {
      const i = etiquetas.findIndex(t => textos.some(v => t === v || t.startsWith(v + " ")));
      return i >= 0 ? piezas[i].x : -1;
    };
    // El encabezado tiene las 5 columnas del PDF del catálogo.
    const xCodigo = buscarX(["codigo"]), xProducto = buscarX(["producto"]);
    const xCantidad = buscarX(["cantidad"]), xPrecio = buscarX(["precio unitario", "precio"]);
    const xSubtotal = buscarX(["subtotal"]);
    if (xCodigo >= 0 && xProducto > xCodigo && xCantidad > xProducto && xPrecio > xCantidad && xSubtotal > xPrecio) {
      finalizar();
      columnas = [xCodigo, xProducto, xCantidad, xPrecio, xSubtotal];
      continue;
    }
    if (!columnas) continue;
    if (/^total estimado\s*:/i.test(normalizarCoincidencia(completo)) ||
        /^(este calculo|calculo informativo|no constituye)/i.test(normalizarCoincidencia(completo))) {
      finalizar();
      columnas = null;
      continue;
    }
    const limites = [
      (columnas[0] + columnas[1]) / 2,
      (columnas[1] + columnas[2]) / 2,
      (columnas[2] + columnas[3]) / 2,
      (columnas[3] + columnas[4]) / 2,
    ];
    const celdas: string[][] = [[], [], [], [], []];
    for (const p of piezas) {
      const indice = limites.findIndex(limite => p.x < limite);
      celdas[indice === -1 ? 4 : indice].push(p.texto);
    }
    const c = celdas.map(partes => partes.join(" ").replace(/\s+/g, " ").trim());
    const cantidad = Number(c[2].replace(/\D/g, ""));
    const precio = precioExtraido(c[3]);
    const subtotal = precioExtraido(c[4]);
    const esRenglon = Number.isInteger(cantidad) && cantidad > 0 && c[2] !== "" &&
      Number.isFinite(precio) && Number.isFinite(subtotal);
    if (esRenglon) {
      finalizar();
      filaActual = { codigo: c[0], nombre: c[1], cantidad, precio };
    } else if (filaActual && (c[0] || c[1]) && !c[2] && !c[3] && !c[4]) {
      // Nombre o código largo repartido en más de una línea.
      filaActual.codigo += c[0] ? ` ${c[0]}` : "";
      filaActual.nombre += c[1] ? ` ${c[1]}` : "";
    }
  }
  finalizar();
  return filas;
}

async function leerCalculoPDF(archivo: File) {
  if (!archivo.name.toLowerCase().endsWith(".pdf") || archivo.size > 15 * 1024 * 1024) {
    throw new Error("Seleccioná un PDF válido de hasta 15 MB.");
  }
  const datos = new Uint8Array(await archivo.arrayBuffer());
  if (new TextDecoder().decode(datos.slice(0, 5)) !== "%PDF-") {
    throw new Error("El archivo seleccionado no es un PDF válido.");
  }
  const lector = await obtenerPDFJS();
  const pdf = await lector.getDocument({ data: datos }).promise;
  const lineas: LineaPDF[] = [];
  let clientePDF: { nombre: string; telefono: string } | null = null;
  try {
    if (pdf.numPages > 30) throw new Error("El PDF tiene demasiadas páginas para importar.");
    for (let numero = 1; numero <= pdf.numPages; numero++) {
      const pagina = await pdf.getPage(numero);
      const contenido = await pagina.getTextContent();
      const agrupadas: LineaPDF[] = [];
      for (const elemento of contenido.items as TextoPDF[]) {
        if (typeof elemento.str !== "string" || !Array.isArray(elemento.transform)) continue;
        const texto = elemento.str.trim();
        if (!texto) continue;
        const x = Number(elemento.transform[4]);
        const y = Number(elemento.transform[5]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        let linea = agrupadas.find(l => Math.abs(l.y - y) < 2.8);
        if (!linea) { linea = { y, piezas: [] }; agrupadas.push(linea); }
        linea.piezas.push({ x, texto });
      }
      agrupadas.sort((a,b) => b.y - a.y);
      for (const linea of agrupadas) {
        linea.piezas.sort((a,b) => a.x - b.x);
        const texto = linea.piezas.map(p => p.texto).join(" ");
        const encontrado = texto.match(/Cliente:\s*(.*?)\s*[·•]\s*Tel\.?\s*:\s*(.+)$/i);
        if (encontrado) clientePDF = { nombre: encontrado[1].trim(), telefono: encontrado[2].trim() };
      }
      lineas.push(...agrupadas);
    }
  } finally { await pdf.destroy(); }
  const filas = extraerFilasCalculo(lineas);
  if (!filas.length) throw new Error("No encontré la tabla de «Mi cálculo de compra». Usá el PDF generado desde el catálogo y no una fotografía o un PDF escaneado.");
  return { filas, clientePDF };
}

export default function PresupuestoClientePage() {
  const { empresa, cargandoEmpresa, errorEmpresa } = useEmpresa();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [precios, setPrecios] = useState<Record<number, Record<number, PrecioLista>>>({});
  const [seleccion, setSeleccion] = useState<Record<number, Seleccion>>({});
  const [busqueda, setBusqueda] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("presupuesto");
  const [fotosOcultas, setFotosOcultas] = useState<Record<number, boolean>>({});
  const [incluirFotos, setIncluirFotos] = useState(true);
  const [mostrarPrecios, setMostrarPrecios] = useState(true);
  const [categoria, setCategoria] = useState("__todas__");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteElegidoId, setClienteElegidoId] = useState<number | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [modoCliente, setModoCliente] = useState<"buscar" | "nuevo">("buscar");
  const [formCliente, setFormCliente] = useState<FormCliente>({ ...CLIENTE_VACIO });
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState("");
  const [avisoCliente, setAvisoCliente] = useState("");
  const clienteElegido = clientes.find(c => c.id === clienteElegidoId) || null;
  const cliente = clienteElegido?.nombre || "";
  const [mensaje, setMensaje] = useState("");
  const [descuentoTipo, setDescuentoTipo] = useState<DescuentoTipo>("ninguno");
  const [descuentoValor, setDescuentoValor] = useState("0");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const selectorPDF = useRef<HTMLInputElement>(null);
  const [importandoPDF, setImportandoPDF] = useState(false);
  const [resultadoPDF, setResultadoPDF] = useState("");
  const [advertenciasPDF, setAdvertenciasPDF] = useState<string[]>([]);

  const cargarDatos = useCallback(async () => {
    if (!empresa?.id) return;
    setCargando(true);
    setError("");
    try {
      const [rProductos, rListas, rClientes] = await Promise.all([
        supabase.from("productos").select("id,nombre,codigo,categoria,descripcion,precio,precio_mayorista,imaguen,estado").eq("empresa_id", empresa.id).order("nombre"),
        supabase.from("listas_catalogos").select("id,nombre,activa").eq("empresa_id", empresa.id).eq("activa", true).order("created_at"),
        supabase.from("clientes").select("id,empresa_id,nombre,telefono,email,direccion,observaciones,activo").eq("empresa_id", empresa.id).eq("activo", true).order("nombre"),
      ]);
      if (rProductos.error) throw rProductos.error;
      if (rListas.error) throw rListas.error;
      if (rClientes.error) throw rClientes.error;
      setClientes((rClientes.data || []) as Cliente[]);
      const items = (rProductos.data || []) as Producto[];
      const listasActivas = (rListas.data || []) as Lista[];
      setProductos(items);
      setListas(listasActivas);
      const mapa: Record<number, Record<number, PrecioLista>> = {};
      const ids = listasActivas.map((lista) => lista.id);
      for (let i = 0; i < ids.length; i += 40) {
        const lote = ids.slice(i, i + 40);
        let pagina = 0;
        while (true) {
          const { data, error: errorPrecios } = await supabase.from("lista_productos")
            .select("producto_id,lista_id,precio_minorista,precio_mayorista,visible")
            .in("lista_id", lote).order("producto_id").order("lista_id").range(pagina * 500, pagina * 500 + 499);
          if (errorPrecios) throw errorPrecios;
          const filas = (data || []) as PrecioLista[];
          filas.forEach((fila) => { (mapa[fila.producto_id] ??= {})[fila.lista_id] = fila; });
          if (filas.length < 500) break;
          pagina++;
        }
      }
      setPrecios(mapa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar los productos y listas.");
    } finally { setCargando(false); }
  }, [empresa?.id]);

  useEffect(() => { void cargarDatos(); }, [cargarDatos]);

  const clientesFiltrados = useMemo(() => {
    const termino = busquedaCliente.trim().toLocaleLowerCase("es");
    if (!termino) return clientes.slice(0, 15);
    return clientes.filter(c => [c.nombre, c.telefono, c.email || "", c.direccion || ""]
      .some(v => v.toLocaleLowerCase("es").includes(termino))).slice(0, 25);
  }, [clientes, busquedaCliente]);

  function actualizarFormCliente(campo: keyof FormCliente, valor: string) {
    setFormCliente(prev => ({ ...prev, [campo]: valor }));
    setErrorCliente("");
    setAvisoCliente("");
  }

  function elegirCliente(item: Cliente) {
    setClienteElegidoId(item.id);
    setModoCliente("buscar");
    setBusquedaCliente("");
    setErrorCliente("");
    setAvisoCliente("");
  }

  async function guardarClienteNuevo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresa?.id || guardandoCliente) return;
    const nombre = formCliente.nombre.trim();
    const telefono = formCliente.telefono.trim();
    const email = formCliente.email.trim();
    const direccion = formCliente.direccion.trim();
    const observaciones = formCliente.observaciones.trim();
    if (!nombre || !telefono) {
      setErrorCliente("Nombre y teléfono son obligatorios.");
      return;
    }
    const telefonoNormalizado = telefono.replace(/\D/g, "");
    const repetido = clientes.find(c =>
      (telefonoNormalizado && c.telefono.replace(/\D/g, "") === telefonoNormalizado) ||
      (email && c.email?.toLocaleLowerCase("es") === email.toLocaleLowerCase("es"))
    );
    if (repetido) {
      setErrorCliente(`Ya hay un cliente registrado con ese teléfono o correo: ${repetido.nombre}. Seleccionalo en «Buscar cliente» para evitar duplicados.`);
      return;
    }
    setGuardandoCliente(true);
    setErrorCliente("");
    setAvisoCliente("");
    try {
      const creado = await crearCliente({
        empresa_id: empresa.id,
        nombre,
        telefono,
        email: email || null,
        direccion: direccion || null,
        observaciones: observaciones || null,
        activo: true,
      });
      const nuevo: Cliente = {
        id: creado.id, empresa_id: empresa.id, nombre, telefono,
        email: email || null, direccion: direccion || null, observaciones: observaciones || null, activo: true,
      };
      setClientes(prev => [...prev, nuevo].sort((a,b) => a.nombre.localeCompare(b.nombre, "es")));
      setClienteElegidoId(nuevo.id);
      setFormCliente({ ...CLIENTE_VACIO });
      setModoCliente("buscar");
      setBusquedaCliente("");
      setAvisoCliente("Cliente creado, guardado en Clientes PRO y seleccionado para este documento.");
    } catch (e) {
      setErrorCliente(e instanceof Error ? e.message : "No se pudo crear el cliente.");
    } finally {
      setGuardandoCliente(false);
    }
  }

  const categorias = useMemo(() => [...new Set(productos.map(p => (p.categoria || "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,"es")), [productos]);
  const visibles = useMemo(() => productos.filter(p =>
    (categoria === "__todas__" || p.categoria?.trim() === categoria) &&
    [p.nombre, p.codigo || "", p.categoria || "", p.descripcion || ""].join(" ").toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es"))
  ), [productos, categoria, busqueda]);

  function opcionesPrecio(producto: Producto) {
    const opciones: { clave: string; etiqueta: string; tipo: "minorista" | "mayorista"; precio: number }[] = [];

    // Si la lista ofrece un solo precio, mostrar "Precio" sin clasificarlo
    // como minorista o mayorista. Las claves internas no cambian.
    const agregarPrecios = (
      listaClave: string,
      listaNombre: string,
      minorista: number | null,
      mayorista: number | null
    ) => {
      const tieneMinorista = minorista !== null;
      const tieneMayorista = mayorista !== null;
      const dosPrecios = tieneMinorista && tieneMayorista;
      if (tieneMinorista) {
        opciones.push({
          clave: `${listaClave}:minorista`,
          etiqueta: `${listaNombre} · ${dosPrecios ? "Minorista" : "Precio"}`,
          tipo: "minorista",
          precio: numeroSeguro(minorista),
        });
      }
      if (tieneMayorista) {
        opciones.push({
          clave: `${listaClave}:mayorista`,
          etiqueta: `${listaNombre} · ${dosPrecios ? "Mayorista" : "Precio"}`,
          tipo: "mayorista",
          precio: numeroSeguro(mayorista),
        });
      }
    };

    agregarPrecios("principal", "Lista principal", producto.precio, producto.precio_mayorista);
    for (const lista of listas) {
      const dato = precios[producto.id]?.[lista.id];
      if (!dato?.visible) continue;
      agregarPrecios(String(lista.id), lista.nombre, dato.precio_minorista, dato.precio_mayorista);
    }
    return opciones;
  }

  function cambiarSeleccion(producto: Producto, activo: boolean) {
    setSeleccion(actual => {
      const nuevo = { ...actual };
      if (!activo) delete nuevo[producto.id];
      else { const primera = opcionesPrecio(producto)[0]; if (primera) nuevo[producto.id] = { cantidad: 1, lista: primera.clave.split(":")[0], tipoPrecio: primera.tipo }; }
      return nuevo;
    });
  }

  const renglones = useMemo(() => productos.flatMap(producto => {
    const sel = seleccion[producto.id];
    if (!sel) return [];
    const opcion = opcionesPrecio(producto).find(item => item.clave === `${sel.lista}:${sel.tipoPrecio}`);
    if (!opcion) return [];
    return [{ producto, seleccion: sel, opcion, subtotal: opcion.precio * Number(sel.cantidad) }];
  }), [productos, seleccion, listas, precios]);
  const subtotal = renglones.reduce((total, renglon) => total + renglon.subtotal, 0);
  const valorD = numeroSeguro(descuentoValor.replace(",", "."));
  const descuento = descuentoTipo === "porcentaje" ? subtotal * Math.min(100, valorD) / 100 : descuentoTipo === "fijo" ? Math.min(subtotal, valorD) : 0;
  const total = Math.max(0, subtotal - descuento);

  async function importarPDF(archivo: File | undefined) {
    if (!archivo || !empresa?.id || importandoPDF) return;
    if (Object.keys(seleccion).length && !window.confirm("Al cargar el PDF se reemplazará la selección actual de productos. ¿Querés continuar?")) return;
    setImportandoPDF(true);
    setResultadoPDF("");
    setAdvertenciasPDF([]);
    setError("");
    try {
      const { filas, clientePDF } = await leerCalculoPDF(archivo);
      const nuevaSeleccion: Record<number, Seleccion> = {};
      const advertencias: string[] = [];
      let importados = 0;
      for (const fila of filas) {
        const codigo = normalizarCoincidencia(fila.codigo);
        let coincidencias = codigo && codigo !== "sin codigo"
          ? productos.filter(p => normalizarCoincidencia(p.codigo || "") === codigo)
          : [];
        if (coincidencias.length === 0) coincidencias = productos.filter(p => normalizarCoincidencia(p.nombre) === normalizarCoincidencia(fila.nombre));
        if (coincidencias.length !== 1) {
          advertencias.push(`«${fila.nombre}» (${fila.codigo || "sin código"}): ${coincidencias.length ? "coincidencia ambigua" : "no existe en el catálogo"}. No se importó.`);
          continue;
        }
        const producto = coincidencias[0];
        if (nuevaSeleccion[producto.id]) {
          advertencias.push(`«${fila.nombre}»: aparece más de una vez en el PDF; revisalo manualmente.`);
          continue;
        }
        const opciones = opcionesPrecio(producto);
        // Nunca inventar ni sobrescribir precios: deben coincidir con una lista actual.
        const coincidentes = opciones.filter(o => Math.abs(o.precio - fila.precio) < 0.011);
        if (!coincidentes.length) {
          advertencias.push(`«${fila.nombre}»: el PDF indica ${pesos(fila.precio)} por unidad, pero ese precio no está disponible en las listas actuales. No se importó; revisá el precio antes de presupuestar.`);
          continue;
        }
        let elegida = coincidentes[0];
        if (coincidentes.length > 1) {
          // Priorizar la lista principal si los precios coinciden; dejar constancia.
          elegida = coincidentes.find(o => o.clave.startsWith("principal:")) || elegida;
          advertencias.push(`«${fila.nombre}»: el mismo precio existe en varias listas. Se seleccionó «${elegida.etiqueta}»; podés cambiarlo.`);
        }
        nuevaSeleccion[producto.id] = {
          cantidad: fila.cantidad,
          lista: elegida.clave.split(":")[0],
          tipoPrecio: elegida.tipo,
        };
        importados++;
      }
      if (!importados) throw new Error(`No se pudieron asociar productos del PDF con los precios actuales.${advertencias.length ? " Revisá los avisos: " + advertencias.slice(0, 3).join(" ") : ""}`);
      setSeleccion(nuevaSeleccion);
      setTipoDocumento("presupuesto");
      setMostrarPrecios(true);
      setDescuentoTipo("ninguno");
      setDescuentoValor("0");
      setBusqueda("");
      setCategoria("__todas__");
      if (clientePDF?.nombre) {
        const nombre = normalizarCoincidencia(clientePDF.nombre);
        const telefono = clientePDF.telefono.replace(/\D/g, "");
        const existente = clientes.find(c => telefono && c.telefono.replace(/\D/g, "") === telefono)
          || clientes.find(c => normalizarCoincidencia(c.nombre) === nombre);
        if (existente) {
          elegirCliente(existente);
        } else {
          setClienteElegidoId(null);
          setFormCliente({ ...CLIENTE_VACIO, nombre: clientePDF.nombre, telefono: clientePDF.telefono });
          setModoCliente("nuevo");
          advertencias.push("El cliente del PDF no está registrado. Completá sus datos y presioná «Guardar y seleccionar cliente» antes de generar el presupuesto.");
        }
      }
      setAdvertenciasPDF(advertencias);
      setResultadoPDF(`Se importaron ${importados} de ${filas.length} productos. Revisá precios, listas, cantidades y datos del cliente antes de generar el PDF.`);
    } catch (errorDesconocido) {
      setError(errorDesconocido instanceof Error ? errorDesconocido.message : "No se pudo leer el PDF.");
    } finally {
      setImportandoPDF(false);
      if (selectorPDF.current) selectorPDF.current.value = "";
    }
  }

  function imprimirDocumento() {
    if (!renglones.length) { setError("Seleccioná al menos un producto con un precio válido."); return; }
    if (renglones.some(({ seleccion: item }) => item.cantidad === "")) { setError("Completá las cantidades antes de generar el documento."); return; }
    setError("");
    const ventana = window.open("", "_blank");
    if (!ventana) { setError("El navegador bloqueó la vista de impresión. Habilitá las ventanas emergentes y volvé a intentar."); return; }
    const esRemito = tipoDocumento === "remito";
    const titulo = esRemito ? "REMITO" : "PRESUPUESTO";
    const hoy = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date());
    const logo = (empresa as { logo?: string | null })?.logo;
    const empresaNombre = (empresa as { nombre?: string })?.nombre || "ComerSys";
    const descuentoNombre = descuentoTipo === "porcentaje" ? `Descuento (${valorD}%)` : "Descuento ($)";
    const conFotos = incluirFotos && renglones.some(({ producto }) => !!producto.imaguen && !fotosOcultas[producto.id]);
    const conPrecios = mostrarPrecios;
    const datosCliente = clienteElegido ? [
      `<strong>Cliente:</strong> ${escapar(clienteElegido.nombre)}`,
      `<strong>Teléfono:</strong> ${escapar(clienteElegido.telefono)}`,
      clienteElegido.email ? `<strong>Email:</strong> ${escapar(clienteElegido.email)}` : "",
      clienteElegido.direccion ? `<strong>Dirección:</strong> ${escapar(clienteElegido.direccion)}` : "",
      clienteElegido.observaciones ? `<strong>Observaciones:</strong> ${escapar(clienteElegido.observaciones)}` : "",
    ].filter(Boolean).map(c => `<span>${c}</span>`).join("") : "";
    const filas = renglones.map(({ producto, seleccion: item, opcion, subtotal: parcial }) => {
      const foto = conFotos ? `<td class="foto">${producto.imaguen && !fotosOcultas[producto.id] ? `<img src="${escapar(producto.imaguen)}" alt=""/>` : ""}</td>` : "";
      return `<tr>${foto}<td class="producto"><strong>${escapar(producto.nombre)}</strong><div class="codigo">Código: ${escapar(producto.codigo?.trim() || "Sin código")}</div></td><td class="cantidad">${item.cantidad}</td>${conPrecios ? `<td class="dinero">${pesos(opcion.precio)}</td><td class="dinero">${pesos(parcial)}</td>` : ""}</tr>`;
    }).join("");
    const datosImportacion = {
      formato: "COMERSYS_PRESUPUESTO_V1", fecha: new Date().toISOString(), empresa_id: empresa?.id,
      cliente, cliente_id: clienteElegidoId, mensaje, subtotal, descuento_tipo: descuentoTipo, descuento_valor: valorD, descuento, total,
      productos: renglones.map(({ producto, seleccion: item, opcion }) => ({ id: producto.id, nombre: producto.nombre, cantidad: item.cantidad, lista: item.lista, tipo_precio: item.tipoPrecio, precio_unitario: opcion.precio }))
    };
    // Mantener el marcador de importación original solamente en presupuestos.
    const referencia = !esRemito ? btoa(unescape(encodeURIComponent(JSON.stringify(datosImportacion)))) : "";
    const totales = conPrecios ? `<div class="totales"><div class="linea"><span>Subtotal</span><b>${pesos(subtotal)}</b></div>${descuentoTipo !== "ninguno" ? `<div class="linea"><span>${escapar(descuentoNombre)}</span><b>− ${pesos(descuento)}</b></div>` : ""}<div class="linea final"><span>Total</span><b>${pesos(total)}</b></div></div>` : `<div class="unidades">Total de unidades: ${renglones.reduce((acumulado, renglon) => acumulado + Number(renglon.seleccion.cantidad), 0)}</div>`;
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo} - ${escapar(cliente || empresaNombre)}</title>
      <style>
        @page { size:A4; margin:10mm; } * { box-sizing:border-box; }
        body { font-family:Arial,Helvetica,sans-serif; color:#243247; margin:0; font-size:10px; }
        .acciones { display:flex; gap:10px; margin-bottom:14px; }
        .acciones button { background:#2563eb; color:#fff; padding:10px 16px; border:0; border-radius:7px; cursor:pointer; }
        header { display:flex; justify-content:space-between; align-items:center; gap:14px; padding-bottom:10px; border-bottom:2px solid #2563eb; margin-bottom:10px; }
        .empresa { display:flex; align-items:center; gap:10px; min-width:0; }
        header img { width:46px; height:46px; object-fit:contain; }
        .empresa strong { font-size:17px; } h1 { font-size:20px; margin:0; text-align:right; letter-spacing:.06em; }
        .fecha { text-align:right; color:#64748b; margin-top:4px; }
        .datos { display:flex; flex-wrap:wrap; gap:7px 20px; margin:0 0 12px; font-size:13px; line-height:1.4; }
        .mensaje { white-space:pre-wrap; margin-bottom:9px; padding:6px 9px; background:#f1f5f9; border-radius:5px; }
        table { border-collapse:collapse; width:100%; table-layout:fixed; }
        thead { display:table-header-group; } th { background:#eaf0f8; text-align:left; padding:6px 5px; border:1px solid #bac5d3; font-size:9px; }
        td { border:1px solid #cbd5e1; padding:5px; vertical-align:middle; line-height:1.3; }
        tr { break-inside:avoid; page-break-inside:avoid; }
        th.foto,td.foto { width:45px; } .foto img { width:34px; height:34px; object-fit:contain; display:block; margin:auto; }
        .producto strong { font-size:10px; } .codigo { font-size:9px; margin-top:2px; color:#475569; }
        th.cantidad,td.cantidad { width:48px; text-align:center; } th.dinero,td.dinero { width:83px; text-align:right; white-space:nowrap; }
        .totales { width:240px; max-width:100%; margin:12px 0 0 auto; break-inside:avoid; }
        .linea { display:flex; justify-content:space-between; gap:14px; padding:5px 2px; border-bottom:1px solid #d8e0e9; }
        .final { color:#1d4ed8; font-size:13px; font-weight:bold; } .unidades { margin-top:10px; text-align:right; font-weight:bold; }
        .firma { display:flex; justify-content:flex-end; margin-top:35px; font-size:10px; break-inside:avoid; }
        .nota { margin-top:14px; font-size:14px; font-weight:600; color:#334155; } .datos-importacion { font-size:1px; color:#fff; overflow-wrap:anywhere; line-height:1px; }
        @media screen { body { padding:20px; max-width:790px; margin:auto; background:white; } }
        @media print { .acciones { display:none; } }
      </style></head><body>
      <div class="acciones"><button onclick="window.print()">Guardar / imprimir PDF</button><button onclick="window.close()">Cerrar</button></div>
      <header><div class="empresa">${logo ? `<img src="${escapar(logo)}" alt="Logo"/>` : ""}<strong>${escapar(empresaNombre)}</strong></div><div><h1>${titulo}</h1><div class="fecha">${escapar(hoy)}</div></div></header>
      ${datosCliente ? `<div class="datos">${datosCliente}</div>` : ""}
      ${mensaje.trim() ? `<div class="mensaje">${escapar(mensaje)}</div>` : ""}
      <table><thead><tr>${conFotos ? '<th class="foto">Foto</th>' : ""}<th>Producto / código</th><th class="cantidad">Cant.</th>${conPrecios ? '<th class="dinero">Unitario</th><th class="dinero">Subtotal</th>' : ""}</tr></thead><tbody>${filas}</tbody></table>
      ${totales}
      ${esRemito ? '<div class="firma">Firma y aclaración de recepción: __________________________</div>' : '<p class="nota">Presupuesto válido por 10 días.</p>'}
      ${!esRemito ? `<div class="datos-importacion">COMERSYS_PRESUPUESTO_V1:${referencia}:FIN_COMERSYS_PRESUPUESTO</div>` : ""}
      </body></html>`;
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
  }

  if (cargandoEmpresa || cargando) return <main className="min-h-screen bg-slate-50 p-10 text-center text-slate-600">Cargando productos y precios...</main>;
  if (errorEmpresa) return <main className="p-8 text-red-700">{errorEmpresa}</main>;

  return <main className="min-h-screen bg-[#F8FAFC] p-5 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Link href="/admin" className="font-semibold text-blue-600">← Volver al panel</Link><h1 className="mt-4 text-3xl font-bold">Presupuestos y Remitos</h1>
          <p className="mt-2 text-slate-500">Elegí el tipo de documento, buscá por nombre o código y seleccioná la lista y el precio de cada producto.</p></div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <input ref={selectorPDF} type="file" accept=".pdf,application/pdf" className="hidden"
            aria-label="Elegir PDF de cálculo de compra" onChange={evento => { void importarPDF(evento.target.files?.[0]); }} />
          <button type="button" disabled={importandoPDF || cargando} onClick={() => selectorPDF.current?.click()}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
            {importandoPDF ? "Leyendo PDF..." : "📄 Cargar PDF"}
          </button>
          <p className="max-w-64 text-xs text-slate-500 sm:text-right">Importá el PDF «Mi cálculo de compra» descargado desde tu catálogo o una lista de precios.</p>
        </div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {resultadoPDF && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">{resultadoPDF}</div>}
      {advertenciasPDF.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-bold">Revisá estos detalles antes de continuar:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">{advertenciasPDF.map((aviso, indice) => <li key={indice}>{aviso}</li>)}</ul>
      </div>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Seleccionar productos</h2><span className="text-xs text-slate-500">Cada producto puede tener su propia lista y precio</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Buscar producto
            <input className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Nombre, código o descripción" /></label>
            <label className="text-sm font-semibold">Categoría<select className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="__todas__">Todas las categorías</option>{categorias.map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
          <div className="mt-4 space-y-3">{visibles.map(producto=>{
            const opciones = opcionesPrecio(producto);
            const actual = seleccion[producto.id];
            const elegido = actual ? `${actual.lista}:${actual.tipoPrecio}` : opciones[0]?.clave || "";
            return <article key={producto.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3"><input aria-label={`Seleccionar ${producto.nombre}`} type="checkbox" className="mt-2 h-5 w-5 shrink-0" checked={Boolean(actual)} disabled={!opciones.length} onChange={e=>cambiarSeleccion(producto,e.target.checked)} />
                {producto.imaguen ? <div className="relative h-20 w-20 shrink-0">{!fotosOcultas[producto.id] ? <img src={producto.imaguen} alt="" className="h-full w-full rounded-lg border object-contain" /> : <div className="flex h-full items-center justify-center rounded-lg border bg-slate-50 text-center text-[10px] text-slate-500">Foto excluida</div>}{actual && <button type="button" title={fotosOcultas[producto.id] ? "Volver a incluir foto" : "Quitar foto del documento"} aria-label={fotosOcultas[producto.id] ? `Incluir foto de ${producto.nombre}` : `Quitar foto de ${producto.nombre}`} onClick={() => setFotosOcultas(prev => ({ ...prev, [producto.id]: !prev[producto.id] }))} className="absolute -right-2 -top-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs font-bold text-white shadow">{fotosOcultas[producto.id] ? "+" : "×"}</button>}</div> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">Sin foto</div>}
                <div className="min-w-0 flex-1"><h3 className="font-bold">{producto.nombre}</h3>{producto.codigo?.trim() && <p className="mt-1 text-xs font-semibold text-slate-600">Código: {producto.codigo}</p>}<p className="text-xs text-slate-500">{producto.categoria || "Sin categoría"}{producto.estado !== "Activo" ? " · Inactivo" : ""}</p>
                {!opciones.length && <p className="mt-1 text-xs text-amber-700">Sin precio disponible para presupuestar</p>}</div></div>
              {actual && <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px]">
                <label className="text-sm font-semibold">Lista y precio<select value={elegido} className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-normal" onChange={e=>{ const [lista,tipoPrecio]=e.target.value.split(":");setSeleccion(prev=>({...prev,[producto.id]:{...prev[producto.id],lista,tipoPrecio:tipoPrecio as Seleccion["tipoPrecio"]}})); }}>
                  {opciones.map(o=><option key={o.clave} value={o.clave}>{o.etiqueta} — {pesos(o.precio)}</option>)}
                </select></label>
                <label className="text-sm font-semibold">Cantidad<input className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-normal" type="number" min="1" step="1" value={actual.cantidad} onChange={e=>{const valor=e.target.value;setSeleccion(prev=>({...prev,[producto.id]:{...prev[producto.id],cantidad:valor==="" ? "" : Number.isFinite(Number(valor)) ? Math.max(1,Math.floor(Number(valor))) : 1}}));}} onBlur={()=>setSeleccion(prev=>{const actual=prev[producto.id];return actual && actual.cantidad==="" ? {...prev,[producto.id]:{...actual,cantidad:1}} : prev;})} /></label>
                <div className="text-sm font-semibold sm:col-span-2">Subtotal: {pesos((opciones.find(o=>o.clave===elegido)?.precio||0)*Number(actual.cantidad))}</div>
              </div>}</article>;
          })}{!visibles.length && <p className="py-8 text-center text-slate-500">No hay productos para esta búsqueda.</p>}</div>
        </section>
        <aside className="space-y-4 xl:sticky xl:top-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Tipo de documento</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setTipoDocumento("presupuesto"); setIncluirFotos(true); setMostrarPrecios(true); }} className={`rounded-xl border px-3 py-3 text-sm font-bold ${tipoDocumento === "presupuesto" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-700"}`}>Presupuesto</button>
              <button type="button" onClick={() => { setTipoDocumento("remito"); setIncluirFotos(false); setMostrarPrecios(true); }} className={`rounded-xl border px-3 py-3 text-sm font-bold ${tipoDocumento === "remito" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-700"}`}>Remito</button>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={incluirFotos} onChange={e=>setIncluirFotos(e.target.checked)} /> Incluir fotos en el PDF</label>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={mostrarPrecios} onChange={e=>setMostrarPrecios(e.target.checked)} /> Mostrar precios y totales en el PDF</label>
            <p className="mt-3 text-xs text-slate-500">La X de cada foto la excluye solo del documento. No borra la fotografía del catálogo.</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Datos del {tipoDocumento === "remito" ? "remito" : "presupuesto"}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setModoCliente("buscar"); setErrorCliente(""); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${modoCliente === "buscar" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Buscar cliente</button>
              <button type="button" onClick={() => { setModoCliente("nuevo"); setErrorCliente(""); setAvisoCliente(""); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${modoCliente === "nuevo" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>+ Nuevo cliente</button>
            </div>
            {modoCliente === "buscar" ? <div className="mt-4 space-y-3">
              {clienteElegido ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-2"><strong className="text-emerald-800">{clienteElegido.nombre}</strong><button type="button" onClick={() => setClienteElegidoId(null)} className="text-xs font-bold text-blue-700 underline">Cambiar</button></div>
                <p className="mt-1">Teléfono: {clienteElegido.telefono}</p>
                {clienteElegido.email && <p className="break-all">Email: {clienteElegido.email}</p>}
                {clienteElegido.direccion && <p>Dirección: {clienteElegido.direccion}</p>}
                {clienteElegido.observaciones && <p className="whitespace-pre-wrap">Observaciones: {clienteElegido.observaciones}</p>}
              </div> : <>
                <label className="block text-sm font-semibold">Buscar por nombre, teléfono o email
                  <input type="search" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} className={inputCliente} placeholder="Escribí para encontrar un cliente" />
                </label>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
                  {clientesFiltrados.map(c => <button key={c.id} type="button" onClick={() => elegirCliente(c)} className="block w-full rounded-lg p-2 text-left text-sm hover:bg-blue-50">
                    <span className="block font-bold">{c.nombre}</span>
                    <span className="block text-xs text-slate-500">{c.telefono}{c.email ? ` · ${c.email}` : ""}</span>
                  </button>)}
                  {!clientesFiltrados.length && <p className="p-3 text-sm text-slate-500">No encontramos clientes. Podés crear uno nuevo.</p>}
                </div>
              </>}
            </div> : <form id="form-nuevo-cliente-documento" onSubmit={guardarClienteNuevo} className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">Los mismos datos de Nuevo cliente. Al guardar, quedará registrado y seleccionado.</p>
              <label className="block text-sm font-semibold">Nombre *<input required maxLength={200} value={formCliente.nombre} onChange={e => actualizarFormCliente("nombre", e.target.value)} className={inputCliente} placeholder="Nombre y apellido" /></label>
              <label className="block text-sm font-semibold">Teléfono *<input required type="tel" value={formCliente.telefono} onChange={e => actualizarFormCliente("telefono", e.target.value)} className={inputCliente} placeholder="Ej.: 11 5555-5555" /></label>
              <label className="block text-sm font-semibold">Email<input type="email" value={formCliente.email} onChange={e => actualizarFormCliente("email", e.target.value)} className={inputCliente} placeholder="cliente@email.com" /></label>
              <label className="block text-sm font-semibold">Dirección<input value={formCliente.direccion} onChange={e => actualizarFormCliente("direccion", e.target.value)} className={inputCliente} placeholder="Calle, número y localidad" /></label>
              <label className="block text-sm font-semibold">Observaciones<textarea rows={3} value={formCliente.observaciones} onChange={e => actualizarFormCliente("observaciones", e.target.value)} className={inputCliente + " resize-y"} placeholder="Notas del cliente" /></label>
              <button type="submit" disabled={guardandoCliente} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{guardandoCliente ? "Guardando cliente..." : "Guardar y seleccionar cliente"}</button>
            </form>}
            {errorCliente && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorCliente}</p>}
            {avisoCliente && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{avisoCliente}</p>}
            {!clienteElegido && <p className="mt-3 text-xs text-amber-700">Seleccioná o creá un cliente para incluir sus datos en el documento.</p>}
            <label className="mt-4 block text-sm font-semibold">Mensaje para el cliente<textarea value={mensaje} onChange={e=>setMensaje(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder="Te compartimos estas opciones..." /></label></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Resumen y descuento</h2>
            <p className="mt-2 text-sm text-slate-500">{renglones.length} producto(s) seleccionado(s)</p>
            <div className="mt-4 flex justify-between"><span>Subtotal</span><strong>{pesos(subtotal)}</strong></div>
            <label className="mt-4 block text-sm font-semibold">Descuento<select value={descuentoTipo} onChange={e=>setDescuentoTipo(e.target.value as DescuentoTipo)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"><option value="ninguno">Sin descuento</option><option value="porcentaje">Porcentaje (%)</option><option value="fijo">Importe fijo ($)</option></select></label>
            {descuentoTipo !== "ninguno" && <label className="mt-3 block text-sm font-semibold">Valor<input type="number" min="0" max={descuentoTipo==="porcentaje"?100:undefined} step="any" value={descuentoValor} onChange={e=>setDescuentoValor(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>}
            {descuentoTipo !== "ninguno" && <div className="mt-4 flex justify-between text-green-700"><span>Descuento</span><strong>− {pesos(descuento)}</strong></div>}
            <div className="mt-4 flex justify-between border-t pt-4 text-xl font-bold"><span>Total</span><span>{pesos(total)}</span></div>
            <button type="button" onClick={imprimirDocumento} disabled={!renglones.length || guardandoCliente} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Generar / descargar PDF</button>
            <p className="mt-3 text-xs leading-5 text-slate-500">Se abrirá una vista A4 lista para imprimir o guardar como PDF. No se genera un pedido ni se descuenta stock.</p>
          </section>
        </aside>
      </div>
    </div>
  </main>;
}
