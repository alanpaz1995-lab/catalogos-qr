"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, FileUp, Loader2 } from "lucide-react";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";
import { supabase } from "@/lib/supabase";

type ProductoPDF = {
  id: number;
  nombre: string;
  cantidad: number;
  lista: string;
  tipo_precio: "minorista" | "mayorista";
  precio_unitario: number;
};
type PresupuestoPDF = {
  formato: string;
  empresa_id: number;
  cliente: string;
  mensaje: string;
  subtotal: number;
  descuento_tipo: "ninguno" | "porcentaje" | "fijo";
  descuento_valor: number;
  total: number;
  productos: ProductoPDF[];
};
const dinero = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

// Lectura de la tabla «Mi cálculo de compra» exportada por el catálogo.
// Se emplean las posiciones reales de las celdas, no el texto plano de la página.
type PiezaCalculo = { x: number; y: number; texto: string };
type FilaCalculo = { codigo: string; nombre: string; cantidad: number; precio: number };
type ProductoActual = { id: number; nombre: string; codigo: string | null; precio: number | null; precio_mayorista: number | null };
type ListaActual = { id: number };
type PrecioActual = { producto_id: number; lista_id: number; precio_minorista: number | null; precio_mayorista: number | null; visible: boolean };

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
}
function numeroImporte(valor: string) {
  const limpio = valor.replace(/[^\d.,-]/g, "");
  if (!limpio) return NaN;
  const coma = limpio.lastIndexOf(",");
  const punto = limpio.lastIndexOf(".");
  if (coma > punto) return Number(limpio.replace(/\./g, "").replace(",", "."));
  if (punto >= 0 && limpio.length - punto - 1 <= 2) return Number(limpio.replace(/,/g, ""));
  return Number(limpio.replace(/[.,]/g, ""));
}
function extraerCalculo(piezasPorPagina: PiezaCalculo[][]): { filas: FilaCalculo[]; cliente: string } {
  const filas: FilaCalculo[] = [];
  let cliente = "";
  for (const piezas of piezasPorPagina) {
    const lineas: PiezaCalculo[][] = [];
    for (const pieza of [...piezas].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const linea = lineas.find(l => Math.abs(l[0].y - pieza.y) < 2.5);
      if (linea) linea.push(pieza); else lineas.push([pieza]);
    }
    let columnas: number[] | null = null;
    for (const linea of lineas) {
      linea.sort((a, b) => a.x - b.x);
      const texto = linea.map(p => p.texto).join(" ").replace(/\s+/g, " ").trim();
      if (!cliente) {
        const coincidencia = texto.match(/Cliente:\s*(.+?)\s*[·•]\s*Tel\.?\s*:/i);
        if (coincidencia) cliente = coincidencia[1].trim();
      }
      const etiquetas = linea.map(p => normalizar(p.texto));
      const encabezado = (valor: string) => {
        const i = etiquetas.findIndex(e => e === valor || e.startsWith(valor + " "));
        return i < 0 ? -1 : linea[i].x;
      };
      const codigoX = encabezado("codigo");
      const productoX = encabezado("producto");
      const cantidadX = encabezado("cantidad");
      const precioX = encabezado("precio unitario");
      const subtotalX = encabezado("subtotal");
      if (codigoX >= 0 && productoX > codigoX && cantidadX > productoX && precioX > cantidadX && subtotalX > precioX) {
        columnas = [codigoX, productoX, cantidadX, precioX, subtotalX];
        continue;
      }
      if (!columnas) continue;
      if (/^(total estimado|este calculo|calculo informativo|no constituye)/i.test(normalizar(texto))) {
        columnas = null;
        continue;
      }
      // En PDFs del navegador las cantidades y los importes pueden estar alineados
      // a la derecha. Los puntos medios entre encabezados los clasifican mal.
      const limites = [columnas[1] - 3, columnas[2] - 3, columnas[3] - 3, columnas[4] - 3];
      const celdas: string[][] = [[], [], [], [], []];
      for (const parte of linea) {
        const indice = limites.findIndex(limite => parte.x < limite);
        celdas[indice === -1 ? 4 : indice].push(parte.texto);
      }
      const [codigo, nombre, cantidadTexto, precioTexto, subtotalTexto] = celdas.map(c => c.join(" ").replace(/\s+/g, " ").trim());
      const cantidad = Number(cantidadTexto);
      const precio = numeroImporte(precioTexto);
      const subtotal = numeroImporte(subtotalTexto);
      if (nombre && Number.isSafeInteger(cantidad) && cantidad > 0 && cantidad <= 100000 &&
          Number.isFinite(precio) && precio >= 0 && precio <= 999999999 &&
          Number.isFinite(subtotal) && Math.abs(cantidad * precio - subtotal) <= 0.02) {
        filas.push({ codigo, nombre, cantidad, precio });
      } else if (filas.length && (codigo || nombre) && !cantidadTexto && !precioTexto && !subtotalTexto) {
        const anterior = filas[filas.length - 1];
        anterior.codigo += codigo ? ` ${codigo}` : "";
        anterior.nombre += nombre ? ` ${nombre}` : "";
      }
    }
  }
  return { filas, cliente };
}

async function convertirCalculoEnPedido(filas: FilaCalculo[], cliente: string, empresaId: number): Promise<PresupuestoPDF> {
  if (!filas.length || filas.length > 100) throw new Error("El PDF no contiene una cantidad válida de productos.");
  const [respuestaProductos, respuestaListas] = await Promise.all([
    supabase.from("productos").select("id,nombre,codigo,precio,precio_mayorista").eq("empresa_id", empresaId),
    supabase.from("listas_catalogos").select("id").eq("empresa_id", empresaId).eq("activa", true),
  ]);
  if (respuestaProductos.error) throw respuestaProductos.error;
  if (respuestaListas.error) throw respuestaListas.error;
  const productos = (respuestaProductos.data || []) as ProductoActual[];
  const listas = (respuestaListas.data || []) as ListaActual[];
  const precios: PrecioActual[] = [];
  // Consultar únicamente las listas de la empresa actual.
  for (let i = 0; i < listas.length; i += 40) {
    const ids = listas.slice(i, i + 40).map(l => l.id);
    let desde = 0;
    while (ids.length) {
      const respuesta = await supabase.from("lista_productos")
        .select("producto_id,lista_id,precio_minorista,precio_mayorista,visible")
        .in("lista_id", ids).order("producto_id").order("lista_id").range(desde, desde + 499);
      if (respuesta.error) throw respuesta.error;
      const lote = (respuesta.data || []) as PrecioActual[];
      precios.push(...lote);
      if (lote.length < 500) break;
      desde += 500;
    }
  }
  const productosPDF: ProductoPDF[] = [];
  const problemas: string[] = [];
  for (const fila of filas) {
    const codigo = normalizar(fila.codigo);
    const nombre = normalizar(fila.nombre);
    const porCodigo = codigo && codigo !== "sin codigo" ? productos.filter(p => normalizar(p.codigo || "") === codigo) : [];
    const porNombre = productos.filter(p => normalizar(p.nombre) === nombre);
    let candidatos = porCodigo.length ? porCodigo : porNombre;
    if (candidatos.length > 1) {
      const exactos = candidatos.filter(p => normalizar(p.nombre) === nombre);
      if (exactos.length) candidatos = exactos;
    }
    const opcionesDe = (p: ProductoActual) => {
      const opciones: { lista: string; tipo_precio: "minorista" | "mayorista"; precio: number }[] = [];
      if (p.precio !== null) opciones.push({ lista: "principal", tipo_precio: "minorista", precio: Number(p.precio) });
      if (p.precio_mayorista !== null) opciones.push({ lista: "principal", tipo_precio: "mayorista", precio: Number(p.precio_mayorista) });
      for (const dato of precios) {
        if (dato.producto_id !== p.id || !dato.visible) continue;
        if (dato.precio_minorista !== null) opciones.push({ lista: String(dato.lista_id), tipo_precio: "minorista", precio: Number(dato.precio_minorista) });
        if (dato.precio_mayorista !== null) opciones.push({ lista: String(dato.lista_id), tipo_precio: "mayorista", precio: Number(dato.precio_mayorista) });
      }
      return opciones.filter(o => Number.isFinite(o.precio) && Math.abs(o.precio - fila.precio) < 0.011);
    };
    if (candidatos.length > 1) {
      const porPrecio = candidatos.filter(p => opcionesDe(p).length);
      if (porPrecio.length === 1) candidatos = porPrecio;
    }
    if (candidatos.length !== 1) {
      problemas.push(`«${fila.nombre}» (${fila.codigo || "sin código"}): ${candidatos.length ? "hay varios productos posibles" : "no se encontró en los productos de la empresa"}.`);
      continue;
    }
    const producto = candidatos[0];
    if (productosPDF.some(p => p.id === producto.id)) {
      problemas.push(`«${fila.nombre}»: aparece más de una vez o comparte producto con otro renglón.`);
      continue;
    }
    const opciones = opcionesDe(producto);
    if (!opciones.length) {
      problemas.push(`«${fila.nombre}»: el precio del PDF (${dinero(fila.precio)}) no coincide con una lista vigente.`);
      continue;
    }
    const opcion = opciones.find(o => o.lista === "principal") || opciones[0];
    productosPDF.push({ id: producto.id, nombre: producto.nombre, cantidad: fila.cantidad,
      lista: opcion.lista, tipo_precio: opcion.tipo_precio, precio_unitario: fila.precio });
  }
  // No crear un pedido parcial sin que el usuario pueda advertir los productos faltantes.
  if (problemas.length) throw new Error(`No se pudo importar el cálculo completo: ${problemas.slice(0, 5).join(" ")}${problemas.length > 5 ? ` Y ${problemas.length - 5} problema(s) más.` : ""}`);
  const subtotal = productosPDF.reduce((acumulado, p) => acumulado + p.cantidad * p.precio_unitario, 0);
  return { formato: "COMERSYS_PRESUPUESTO_V1", empresa_id: empresaId, cliente, mensaje: "",
    subtotal, descuento_tipo: "ninguno", descuento_valor: 0, total: subtotal, productos: productosPDF };
}


export default function ImportarPedidoPDFPage() {
  const router = useRouter();
  const { empresa, cargandoEmpresa, errorEmpresa } = useEmpresa();
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState<PresupuestoPDF | null>(null);
  const [archivo, setArchivo] = useState("");

  async function leerPDF(file: File | undefined) {
    if (!file) return;
    setError("");
    setDatos(null);
    setArchivo("");
    if (!empresa?.id) { setError("No encontramos la empresa actual."); return; }
    // No bloquear archivos por superar 15 MB: la lectura se realiza localmente
    // en el navegador. Los límites prácticos dependen de la memoria del equipo.
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size === 0) {
      setError("Seleccioná un archivo PDF válido que no esté vacío."); return;
    }
    setLeyendo(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const documento = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      try {
        if (documento.numPages > 30) throw new Error("El PDF tiene demasiadas páginas (máximo 30).");
        let texto = "";
        const piezasPorPagina: PiezaCalculo[][] = [];
        for (let pagina = 1; pagina <= documento.numPages; pagina++) {
          const hoja = await documento.getPage(pagina);
          const contenido = await hoja.getTextContent();
          texto += "\n" + contenido.items.map((item) => "str" in item ? String(item.str) : "").join(" ");
          const piezas: PiezaCalculo[] = [];
          for (const item of contenido.items) {
            if (!( "str" in item && "transform" in item )) continue;
            const pos = item.transform;
            if (!Array.isArray(pos) || pos.length < 6 || typeof item.str !== "string") continue;
            if (item.str.trim() && Number.isFinite(pos[4]) && Number.isFinite(pos[5]))
              piezas.push({ x: pos[4], y: pos[5], texto: item.str.trim() });
          }
          piezasPorPagina.push(piezas);
          hoja.cleanup();
        }
        const match = texto.match(/COMERSYS_PRESUPUESTO_V1\s*:\s*([A-Za-z0-9+/=\s]+?)\s*:\s*FIN_COMERSYS_PRESUPUESTO/);
        if (!match) {
          const calculo = extraerCalculo(piezasPorPagina);
          if (!calculo.filas.length) throw new Error("No encontré la tabla de «Mi cálculo de compra» ni datos de un presupuesto de ComerSys. Seleccioná el PDF original generado desde el catálogo.");
          const pedido = await convertirCalculoEnPedido(calculo.filas, calculo.cliente, Number(empresa.id));
          setDatos(pedido);
          setArchivo(file.name);
          return;
        }
        const base64 = match[1].replace(/\s/g, "");
        const json = new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
        const presupuesto = JSON.parse(json) as PresupuestoPDF;
        if (presupuesto.formato !== "COMERSYS_PRESUPUESTO_V1" ||
            !Number.isSafeInteger(Number(presupuesto.empresa_id)) ||
            Number(presupuesto.empresa_id) !== Number(empresa.id)) {
          throw new Error("Este presupuesto pertenece a otra empresa. No se puede importar en la cuenta actual.");
        }
        if (!Array.isArray(presupuesto.productos) || !presupuesto.productos.length || presupuesto.productos.length > 100)
          throw new Error("El presupuesto no contiene una cantidad válida de productos.");
        for (const item of presupuesto.productos) {
          if (!Number.isSafeInteger(item.id) || item.id < 1 ||
              !Number.isSafeInteger(item.cantidad) || item.cantidad < 1 ||
              !Number.isFinite(item.precio_unitario) || item.precio_unitario < 0 || item.precio_unitario > 999999999 ||
              !["minorista", "mayorista"].includes(item.tipo_precio) ||
              !(item.lista === "principal" || (/^[0-9]+$/.test(item.lista) && Number(item.lista) > 0)))
            throw new Error("El presupuesto contiene un producto con datos inválidos.");
        }
        if (!["ninguno", "porcentaje", "fijo"].includes(presupuesto.descuento_tipo) ||
            !Number.isFinite(presupuesto.descuento_valor) || presupuesto.descuento_valor < 0 ||
            !Number.isFinite(presupuesto.total) || presupuesto.total < 0 ||
            (presupuesto.descuento_tipo === "porcentaje" && presupuesto.descuento_valor > 100))
          throw new Error("El presupuesto contiene un descuento o total inválido.");
        const subtotal = presupuesto.productos.reduce((n, item) => n + item.cantidad * item.precio_unitario, 0);
        const rebaja = presupuesto.descuento_tipo === "ninguno" ? 0 : presupuesto.descuento_tipo === "porcentaje"
          ? Math.round(subtotal * presupuesto.descuento_valor) / 100
          : presupuesto.descuento_valor;
        if (rebaja > subtotal || Math.abs(subtotal - Number(presupuesto.subtotal)) > 0.02 ||
            Math.abs(subtotal - rebaja - presupuesto.total) > 0.02)
          throw new Error("Los importes del presupuesto no coinciden con los productos y descuentos.");
        setDatos(presupuesto);
        setArchivo(file.name);
      } finally {
        documento.cleanup();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo PDF.");
    } finally {
      setLeyendo(false);
    }
  }

  function continuar() {
    if (!datos || !empresa?.id) return;
    try {
      window.sessionStorage.setItem("comersys_presupuesto_pdf_pendiente", JSON.stringify({ ...datos, archivo }));
      router.push("/admin/pedidos/nuevo");
    } catch {
      setError("El navegador no pudo preparar los datos del pedido. Probá nuevamente.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-2 font-semibold text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Volver a Pedidos
        </Link>
        <h1 className="mt-6 text-3xl font-black">Cargar pedido desde PDF</h1>
        <p className="mt-3 text-slate-500">Seleccioná «Mi cálculo de compra» del catálogo o un presupuesto PDF de ComerSys. Podrás revisar y editar el pedido antes de guardarlo.</p>
        {(error || errorEmpresa) && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{errorEmpresa || error}</p>}
        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-8 text-center hover:bg-blue-100">
            <FileUp className="mx-auto mb-3 h-10 w-10 text-blue-600" />
            <span className="block text-lg font-bold text-blue-800">Seleccionar cálculo de compra o presupuesto PDF</span>
            <span className="mt-2 block text-sm text-slate-600">Sin límite fijo de 15 MB · PDF de catálogo o Presupuesto para cliente · Hasta 30 páginas</span>
            <input className="mt-5 block w-full text-sm" type="file" accept="application/pdf,.pdf"
              disabled={leyendo || cargandoEmpresa || !empresa?.id}
              onChange={e => void leerPDF(e.target.files?.[0])} />
          </label>
          {leyendo && <p className="mt-5 flex items-center gap-2 text-blue-700"><Loader2 className="h-5 w-5 animate-spin" /> Leyendo PDF... Los archivos grandes pueden tardar un poco más.</p>}
          {datos && <div className="mt-7 space-y-4">
            <h2 className="text-xl font-black">Vista previa: {archivo}</h2>
            <p><strong>Cliente:</strong> {datos.cliente || "A completar"}</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead><tr className="border-b bg-slate-50"><th className="p-3">Producto</th><th className="p-3">Cantidad</th><th className="p-3">Precio acordado</th></tr></thead>
              <tbody>{datos.productos.map((item, index) => <tr key={index} className="border-b">
                <td className="p-3">{item.nombre} <span className="block text-xs text-slate-500">{item.tipo_precio} · {item.lista === "principal" ? "Lista principal" : `Lista ${item.lista}`}</span></td>
                <td className="p-3">{item.cantidad}</td><td className="p-3">{dinero(item.precio_unitario)}</td>
              </tr>)}</tbody>
            </table></div>
            <p className="text-right"><strong>Total presupuestado: {dinero(datos.total)}</strong></p>
            <button type="button" onClick={continuar} className="w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700">
              Continuar a Nuevo pedido para revisar y editar
            </button>
            <p className="text-xs text-slate-500">Importar no crea pedidos ni descuenta stock. Los precios deberán ser confirmados al guardar.</p>
          </div>}
        </section>
      </div>
    </main>
  );
}
