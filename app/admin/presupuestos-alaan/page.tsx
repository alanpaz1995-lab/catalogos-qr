"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
// Formato correlativo: 1 -> 00000-01, 99 -> 00000-99, 100 -> 00001-00.
function numeroDocumento(id: number): string {
  const numero = Math.max(1, Math.trunc(id));
  const digitos = String(numero).padStart(7, "0");
  return `${digitos.slice(0, -2)}-${digitos.slice(-2)}`;
}

type TipoDocumento = "Presupuesto" | "Remito";
type Concepto = {
  id: number;
  descripcion: string;
  precio: string;
  costo: string;
  cantidad: number;
};
const moneda = (importe: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(importe);
function numeroPositivo(texto: string) {
  const entrada = texto.trim().replace(/\s/g, "");
  const limpio = entrada.includes(",")
    ? entrada.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(entrada)
      ? entrada.replace(/\./g, "")
      : entrada;
  const valor = Number(limpio);
  return limpio !== "" && Number.isFinite(valor) && valor >= 0 ? valor : 0;
}
type DocumentoGuardado = {
  id: number; tipo: TipoDocumento; cliente_nombre: string; cliente_empresa: string; cliente_telefono: string;
  conceptos: Array<{ id: number; descripcion: string; precio: number; costo: number; cantidad: number }>;
  observaciones: string; descuento_habilitado: boolean; descuento_tipo: "importe" | "porcentaje";
  descuento_valor: number; total: number; subtotal: number; pdf_path: string | null;
  creado_en: string; actualizado_en: string;
};
type DocumentoListado = Pick<DocumentoGuardado, "id" | "tipo" | "cliente_nombre" | "cliente_empresa" | "cliente_telefono" | "subtotal" | "total" | "creado_en" | "actualizado_en" | "pdf_path">;
// PDF A4 vectorial, multipágina, con logotipo JPEG local y estilos Alan Paz.
async function generarPDF(documento: {
  id: number; fecha: string; tipo: TipoDocumento; nombre: string; empresa: string; telefono: string;
  conceptos: Concepto[]; subtotal: number; descuento: number; total: number; observaciones: string;
}): Promise<Blob> {
  const W = 595.28, H = 841.89, pink = [0.78, 0.02, 0.34], gray = [0.93, 0.93, 0.94];
  const pages: string[][] = [];
  const encoder = new TextEncoder();
  const hex = (value: string) => Array.from(value.normalize('NFC')).map((ch) => {
    const n = ch.codePointAt(0) ?? 63;
    const extras: Record<number, number> = { 8364: 128, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8211: 150, 8212: 151, 8230: 133, 8226: 149 };
    return (n <= 255 ? n : extras[n] ?? 63).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
  let y = 0;
  const cmds = () => pages[pages.length - 1];
  const rect = (x: number, yy: number, w: number, h: number, color: number[]) => cmds().push(`${color.join(' ')} rg ${x} ${yy} ${w} ${h} re f`);
  const line = (x1: number, y1: number, x2: number, y2: number, color = '0.75 0.75 0.75', weight = 0.5) => cmds().push(`${weight} w ${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
  const text = (value: string, x: number, yy: number, size = 10, bold = false, color = '0 0 0') => cmds().push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm <${hex(value)}> Tj ET`);
  const rightText = (value: string, xRight: number, yy: number, size = 10, bold = false, color = '0 0 0') => {
    const estimatedWidth = [...value].reduce((a, c) => a + ('.,:;iIl!| '.includes(c) ? .26 : 'WM@'.includes(c) ? .81 : .55), 0) * size;
    text(value, Math.max(40, xRight - estimatedWidth), yy, size, bold, color);
  };
  const wrap = (value: string, width: number, size = 10) => {
    const max = Math.max(9, Math.floor(width / (size * .54)));
    const output: string[] = [];
    for (const paragraph of value.replace(/\r/g, '').split('\n')) {
      let current = '';
      for (let word of paragraph.split(/\s+/).filter(Boolean)) {
        while (word.length > max) {
          if (current) { output.push(current); current = ''; }
          output.push(word.slice(0, max)); word = word.slice(max);
        }
        if (!current) current = word;
        else if ((current + ' ' + word).length <= max) current += ' ' + word;
        else { output.push(current); current = word; }
      }
      output.push(current);
    }
    return output;
  };
  const newPage = () => {
    pages.push([]);
    cmds().push('0 0 0 RG 3 w 15 15 565 812 re S');
    rect(19, 800, 557, 18, pink); rect(19, 24, 557, 9, pink);
    text('AP', 40, 738, 24, true, '0.78 0.02 0.34');
    text('Alan Paz', 40, 720, 12, true);
    line(165, 713, 165, 790, '0.78 0.02 0.34', 2);
    text(documento.tipo.toUpperCase(), 186, 758, 25, true);
    rect(389, 717, 165, 34, pink);
    text(`N.º ${numeroDocumento(documento.id)}`, 405, 729, 17, true, '1 1 1');
    rightText(`Fecha: ${documento.fecha}`, 550, 692, 10);
    rect(34, 632, 527, 47, gray);
    text(`Cliente: ${documento.nombre}`, 48, 661, 11, true);
    if (documento.empresa) text(`Empresa: ${documento.empresa}`, 48, 643, 10);
    text(`Teléfono: ${documento.telefono || '-'}`, 340, 652, 10);
    rect(34, 593, 527, 27, pink);
    text('Descripción del servicio', 43, 602, 11, true, '1 1 1');
    text('Cant.', 327, 602, 10, true, '1 1 1');
    text('Precio unit.', 385, 602, 10, true, '1 1 1');
    text('Subtotal', 485, 602, 10, true, '1 1 1');
    line(312, 593, 312, 620, '1 1 1');
    line(370, 593, 370, 620, '1 1 1');
    line(473, 593, 473, 620, '1 1 1');
    y = 579;
  };
  const ensure = (needed: number) => { if (y - needed < 195) newPage(); };
  newPage();
  documento.conceptos.forEach((item, i) => {
    const lines = wrap(item.descripcion.trim(), 257, 9);
    let used = 0;
    if (!lines.length) lines.push('Servicio');
    for (let j = 0; j < lines.length; j += 20) {
      const portion = lines.slice(j, j + 20);
      const height = Math.max(34, 15 + portion.length * 13);
      ensure(height + 8);
      const top = y + 11;
      text(j === 0 ? `SERVICIO ${i + 1}` : `SERVICIO ${i + 1} (cont.)`, 43, y, 10, true);
      portion.forEach((ln, k) => text(ln, 43, y - 15 - k * 13, 9));
      if (j === 0) {
        text(String(item.cantidad), 333, y - 8, 10);
        rightText(moneda(numeroPositivo(item.precio)), 466, y - 8, 9);
        rightText(moneda(numeroPositivo(item.precio) * item.cantidad), 554, y - 8, 9);
      }
      y -= height;
      line(34, y, 561, y);
      line(312, y, 312, top);
      line(370, y, 370, top);
      line(473, y, 473, top);
      y -= 11;
      used += portion.length;
    }
  });
  const notes = documento.observaciones.trim() ? wrap(documento.observaciones.trim(), 475, 9) : [];
  ensure(160 + Math.min(50, notes.length * 12));
  if (documento.descuento > 0) {
    text(`Subtotal: ${moneda(documento.subtotal)}`, 345, y, 10);
    y -= 17;
    text(`Descuento: -${moneda(documento.descuento)}`, 345, y, 10);
    y -= 20;
  }
  rect(34, y - 45, 527, 44, gray);
  text('TOTAL:', 312, y - 30, 20, true);
  rect(414, y - 41, 141, 36, pink);
  rightText(moneda(documento.total), 545, y - 29, 16, true, '1 1 1');
  y -= 62;
  // Los datos bancarios se mantienen fijos para no salir del área imprimible.
  if (y < 225) newPage();
  rect(34, y - 112, 527, 104, [0.99, 0.99, 0.99]);
  cmds().push('0.78 0.02 0.34 RG 1.2 w 34 ' + (y - 112) + ' 527 104 re S');
  text('DATOS BANCARIOS', 45, y - 31, 11, true, '0.78 0.02 0.34');
  line(180, y - 100, 180, y - 17, '0.78 0.02 0.34', 1.5);
  text('Titular: Alan Paz Jonatan', 193, y - 26, 10);
  text('CUIT: 20-39033950-0', 193, y - 43, 10);
  text('Banco: BBVA Argentina S.A.', 193, y - 60, 10);
  text('CBU: 0170376224000032353116', 193, y - 77, 10);
  text('Alias: ALANPAZ.OK', 193, y - 94, 10);
  y -= 130;
  if (notes.length) {
    text('OBSERVACIONES', 40, y, 10, true);
    y -= 15;
    for (const ln of notes) { if (y < 70) break; text(ln, 40, y, 9); y -= 12; }
  }
  if (y >= 95) {
    text(documento.tipo === 'Presupuesto' ? 'Presupuesto sujeto a modificaciones. Validez: 15 días.' : 'Documento de remito.', 40, y - 12, 9);
    text('¡Gracias por tu consulta!', 380, y - 34, 11, true, '0.78 0.02 0.34');
  }
  // Construcción PDF binaria (imagen JPEG incrustada como objeto DCTDecode).
  let jpeg: Uint8Array | null = null;
  try {
    const res = await fetch('/presupuestos-alaan/alan-paz-logo.jpg', { cache: 'force-cache' });
    if (res.ok) jpeg = new Uint8Array(await res.arrayBuffer());
  } catch { /* La generación continúa sin imagen si el recurso no está disponible. */ }
  const objects: Uint8Array[] = [];
  const bytes = (s: string) => encoder.encode(s);
  const concat = (chunks: Uint8Array[]) => {
    const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let pos = 0; chunks.forEach((chunk) => { out.set(chunk, pos); pos += chunk.length; }); return out;
  };
  const add = (parts: Uint8Array | string) => { objects.push(typeof parts === 'string' ? bytes(parts) : parts); return objects.length; };
  const catalog = add('');
  const pagesId = add('');
  const normalFont = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFont = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let imageId = 0;
  if (jpeg?.length) imageId = add(concat([bytes(`<< /Type /XObject /Subtype /Image /Width 282 /Height 265 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, bytes('\nendstream')]));
  const pageIds: number[] = [];
  pages.forEach((parts, index) => {
    parts.push(`0 0 0 rg BT /F1 8 Tf 1 0 0 1 40 45 Tm <${hex(`Página ${index + 1} de ${pages.length}`)}> Tj ET`);
    if (imageId) parts.push('q 104 0 0 98 40 698 cm /Logo Do Q');
    const stream = bytes(parts.join('\n') + '\n');
    const contentId = add(concat([bytes(`<< /Length ${stream.length} >>\nstream\n`), stream, bytes('endstream')]));
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${normalFont} 0 R /F2 ${boldFont} 0 R >> ${imageId ? `/XObject << /Logo ${imageId} 0 R >>` : ''} >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });
  objects[catalog - 1] = bytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects[pagesId - 1] = bytes(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const result: Uint8Array[] = [bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  const offsets = [0];
  let length = result[0].length;
  objects.forEach((obj, i) => {
    offsets.push(length);
    const part = concat([bytes(`${i + 1} 0 obj\n`), obj, bytes('\nendobj\n')]);
    result.push(part); length += part.length;
  });
  const xref = length;
  result.push(bytes(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((pos) => `${String(pos).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob([concat(result) as BlobPart], { type: 'application/pdf' });
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
type RevisionPendiente = {

  tipo: TipoDocumento;

  nombre: string;

  empresa: string;

  telefono: string;

  conceptos: Concepto[];

  observaciones: string;

  descuentoHabilitado: boolean;

  descuentoTipo: "porcentaje" | "importe";

  descuentoValor: string;

  subtotal: number;

  descuentoCalculado: number;

  total: number;

  idEnEdicion: number | null;

  fecha: string;

  firma: string;

};
function textoSeguro(texto: string) {

  return texto.replace(/[&<>"']/g, (c) =>

    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

}
const campoEstilo = "w-full rounded-xl border border-[#444] bg-[#262626] px-4 py-3 text-sm text-white outline-none placeholder:text-[#888] focus:border-[#00aa52]";
const etiquetaEstilo = "mb-2 block text-xs font-bold text-white";
export default function PresupuestosAlaanPage() {
  const [verificando, setVerificando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState("");
  const [nombre, setNombre] = useState("");

  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipo, setTipo] = useState<TipoDocumento>("Presupuesto");
  const [conceptos, setConceptos] = useState<Concepto[]>([
    { id: 1, descripcion: "", precio: "", costo: "", cantidad: 1 },
  ]);
  const [siguienteId, setSiguienteId] = useState(2);
  const [observaciones, setObservaciones] = useState("");
  const [descuentoHabilitado, setDescuentoHabilitado] = useState(false);
  const [descuentoTipo, setDescuentoTipo] = useState<"porcentaje" | "importe">("importe");
  const [descuentoValor, setDescuentoValor] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errorOperacion, setErrorOperacion] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [historial, setHistorial] = useState<DocumentoListado[]>([]);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [totalHistorial, setTotalHistorial] = useState(0);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState("");
  const [idEnEdicion, setIdEnEdicion] = useState<number | null>(null);
  const [fechaEnEdicion, setFechaEnEdicion] = useState("");

  const revisionRef = useRef<RevisionPendiente | null>(null);

  const [revisionLista, setRevisionLista] = useState(false);
  useEffect(() => {
    let activo = true;
    async function comprobar() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.access_token) throw new Error("Iniciá sesión para continuar.");
        const respuesta = await fetch("/api/admin-comersys/autorizacion", {
          method: "GET",
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!respuesta.ok) {
          throw new Error(respuesta.status === 403
            ? "Este módulo es exclusivo del propietario de ComerSys (empresa ID 1)."
            : respuesta.status === 401
              ? "Tu sesión expiró. Volvé a iniciar sesión."
              : "No pudimos verificar tu acceso. Intentá nuevamente.");
        }
        const datos: { autorizado?: boolean } = await respuesta.json();
        if (datos.autorizado !== true) throw new Error("Acceso no autorizado.");
        if (activo) setAutorizado(true);
      } catch (error) {
        if (activo) setErrorAcceso(error instanceof Error ? error.message : "No se pudo verificar el acceso.");
      } finally {
        if (activo) setVerificando(false);
      }
    }
    void comprobar();
    return () => { activo = false; };
  }, []);
  useEffect(() => {
    if (!autorizado) return;
    let activo = true;
    (async () => {
      setCargandoHistorial(true);
      try {
        const token = await tokenSesion();
        const respuesta = await fetch("/api/presupuestos-alaan?pagina=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const datos = await respuesta.json();
        if (!respuesta.ok || !datos.ok) throw new Error(datos.error || "No se pudo cargar el historial.");
        if (activo) { setHistorial(datos.documentos || []); setTotalHistorial(datos.total || 0); }
      } catch (error) { if (activo) { setMensaje(error instanceof Error ? error.message : "No se pudo cargar el historial."); setErrorOperacion(true); } }
      finally { if (activo) setCargandoHistorial(false); }
    })();
    return () => { activo = false; };
  }, [autorizado]);
  const subtotal = useMemo(() => conceptos.reduce((total, item) =>
    total + numeroPositivo(item.precio) * item.cantidad, 0), [conceptos]);
  const descuentoCalculado = descuentoHabilitado
    ? Math.min(subtotal, descuentoTipo === "porcentaje"
      ? subtotal * Math.min(numeroPositivo(descuentoValor), 100) / 100
      : numeroPositivo(descuentoValor))
    : 0;
  const total = Math.max(0, subtotal - descuentoCalculado);
  const unidades = conceptos.reduce((acumulado, item) => acumulado + item.cantidad, 0);
  function modificar(id: number, datos: Partial<Concepto>) {
    setConceptos((actuales) => actuales.map((item) => item.id === id ? { ...item, ...datos } : item));
    setMensaje("");
  }
  function agregar() {
    setConceptos((actuales) => [...actuales, { id: siguienteId, descripcion: "", precio: "", costo: "", cantidad: 1 }]);
    setSiguienteId((valor) => valor + 1);
    setMensaje("");
  }
  function quitar(id: number) {
    setConceptos((actuales) => actuales.filter((item) => item.id !== id));
    setMensaje("");
  }
  async function tokenSesion(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
    return session.access_token;
  }
  async function solicitar(ruta: string, metodo: string = "GET", cuerpo?: BodyInit, tipoContenido?: string): Promise<Response> {
    const token = await tokenSesion();
    return fetch(ruta, { method: metodo, headers: {
      Authorization: `Bearer ${token}`,
      ...(tipoContenido ? { "Content-Type": tipoContenido } : {}),
    }, body: cuerpo, cache: "no-store" });
  }
  async function obtenerJSON<T>(respuesta: Response): Promise<T> {
    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok || datos?.ok !== true) throw new Error(datos?.error || `Error al consultar ComerSys (${respuesta.status}).`);
    return datos as T;
  }
  async function cargarHistorial(pagina: number = 1) {
    if (!autorizado) return;
    setCargandoHistorial(true);
    try {
      const datos = await obtenerJSON<{ ok: true; documentos: DocumentoListado[]; total: number; pagina: number }>(
        await solicitar(`/api/presupuestos-alaan?pagina=${pagina}`));
      setHistorial(datos.documentos);
      setTotalHistorial(datos.total);
      setPaginaHistorial(datos.pagina);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo cargar el historial.");
      setErrorOperacion(true);
    } finally { setCargandoHistorial(false); }
  }
  function limpiar() {
    setNombre(""); setEmpresa(""); setTelefono(""); setTipo("Presupuesto");
    setConceptos([{ id: 1, descripcion: "", precio: "", costo: "", cantidad: 1 }]);
    setSiguienteId(2); setObservaciones(""); setDescuentoHabilitado(false);
    setDescuentoTipo("importe"); setDescuentoValor(""); setIdEnEdicion(null);
    setFechaEnEdicion(""); setMensaje("");
  }
  async function abrirGuardado(id: number, duplicar = false) {
    if (procesando) return;
    setProcesando(true); setMensaje("");
    try {
      const { documento } = await obtenerJSON<{ ok: true; documento: DocumentoGuardado }>(
        await solicitar(`/api/presupuestos-alaan?id=${id}`));
      const servicios: Concepto[] = documento.conceptos.map((item, indice) => ({
        id: indice+1, descripcion: item.descripcion,
        precio: String(item.precio), costo: String(item.costo), cantidad: item.cantidad,
      }));
      setNombre(documento.cliente_nombre); setEmpresa(documento.cliente_empresa || ""); setTelefono(documento.cliente_telefono);
      setTipo(documento.tipo); setConceptos(servicios);
      setSiguienteId(servicios.length+1); setObservaciones(documento.observaciones);
      setDescuentoHabilitado(documento.descuento_habilitado);
      setDescuentoTipo(documento.descuento_tipo); setDescuentoValor(String(documento.descuento_valor));
      setIdEnEdicion(duplicar ? null : documento.id);
      setFechaEnEdicion(duplicar ? "" : documento.creado_en);
      setErrorOperacion(false);
      setMensaje(duplicar ? "Se cargó una copia. Al guardar se creará un documento nuevo." : `Documento N.º ${documento.id} abierto para editar.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setErrorOperacion(true); setMensaje(error instanceof Error ? error.message : "No se pudo abrir el documento."); }
    finally { setProcesando(false); }
  }
  async function descargarGuardado(item: DocumentoListado) {
    if (procesando) return;
    setProcesando(true); setMensaje("");
    try {
      const respuesta = await solicitar(`/api/presupuestos-alaan?id=${item.id}&pdf=1`);
      if (!respuesta.ok) {
        const fallo = await respuesta.json().catch(() => null);
        throw new Error(fallo?.error || "No pudimos recuperar el PDF.");
      }
      descargarBlob(await respuesta.blob(), `${item.tipo}-Alaan-${item.id}.pdf`);
      setErrorOperacion(false); setMensaje(`PDF N.º ${item.id} descargado.`);
    } catch (error) { setErrorOperacion(true); setMensaje(error instanceof Error ? error.message : "No se pudo descargar."); }
    finally { setProcesando(false); }
  }
  async function borrarGuardado(item: DocumentoListado) {
    if (procesando || !window.confirm(`¿Eliminar definitivamente el ${item.tipo.toLowerCase()} N.º ${item.id} de ${item.cliente_nombre}?`)) return;
    setProcesando(true); setMensaje("");
    try {
      await obtenerJSON(await solicitar(`/api/presupuestos-alaan?id=${item.id}`, "DELETE"));
      if (idEnEdicion === item.id) limpiar();
      setErrorOperacion(false); setMensaje(`Documento N.º ${item.id} eliminado.`);
      await cargarHistorial(paginaHistorial);
    } catch (error) { setErrorOperacion(true); setMensaje(error instanceof Error ? error.message : "No se pudo eliminar."); }
    finally { setProcesando(false); }
  }
  // La huella impide archivar una versión diferente de la que fue revisada.

  const firmaActual = JSON.stringify({ nombre, empresa, telefono, tipo, conceptos, observaciones,

    descuentoHabilitado, descuentoTipo, descuentoValor, idEnEdicion });
  async function revisarPDF() {

    if (procesando) return;

    setMensaje(""); setErrorOperacion(false);

    revisionRef.current = null; setRevisionLista(false);

    const validos = conceptos.filter((item) => item.descripcion.trim());

    if (empresa.trim().length > 160) { setErrorOperacion(true); setMensaje("El nombre de la empresa no puede superar 160 caracteres."); return; }

    if (!nombre.trim()) { setErrorOperacion(true); setMensaje("Ingresá el nombre del cliente."); return; }

    if (!validos.length || validos.length !== conceptos.length) {

      setErrorOperacion(true); setMensaje("Todos los servicios deben tener una descripción. Eliminá los que estén vacíos."); return;

    }

    if (validos.length > 100 || validos.some((item) => item.descripcion.length > 20000)) {

      setErrorOperacion(true); setMensaje("Se permiten hasta 100 servicios de 20.000 caracteres cada uno."); return;

    }

    const valores = [...validos.map((item) => item.precio), ...validos.map((item) => item.costo), descuentoValor || "0"];

    if (valores.some((valor) => !Number.isFinite(numeroPositivo(valor)) || numeroPositivo(valor) > 999999999999) ||

      (descuentoHabilitado && descuentoTipo === "porcentaje" && numeroPositivo(descuentoValor) > 100)) {

      setErrorOperacion(true); setMensaje("Revisá los importes y el descuento."); return;

    }
    const ventana = window.open("", "_blank");

    if (!ventana) {

      setErrorOperacion(true);

      setMensaje("Chrome bloqueó la vista previa. Permití ventanas emergentes para este sitio.");

      return;

    }

    // El número preliminar se consulta sin crear un registro. El ID final se asigna al guardar.
    let numeroVista: number;
    try {
      if (idEnEdicion !== null) {
        numeroVista = idEnEdicion;
      } else {
        const siguiente = await obtenerJSON<{ ok: true; siguiente_id: number }>(
          await solicitar("/api/presupuestos-alaan?proximo=1"));
        if (!Number.isSafeInteger(siguiente.siguiente_id) || siguiente.siguiente_id < 1) {
          throw new Error("No se pudo obtener la numeración del presupuesto.");
        }
        numeroVista = siguiente.siguiente_id;
      }
    } catch (error) {
      ventana.close();
      setErrorOperacion(true);
      setMensaje(error instanceof Error ? error.message : "No se pudo consultar el próximo número.");
      return;
    }

    const revision: RevisionPendiente = {

      tipo, nombre: nombre.trim(), empresa: empresa.trim(), telefono: telefono.trim(),

      conceptos: validos.map((item) => ({ ...item })), observaciones,

      descuentoHabilitado, descuentoTipo, descuentoValor, subtotal,

      descuentoCalculado, total, idEnEdicion,

      fecha: fechaEnEdicion || new Date().toISOString(), firma: firmaActual,

    };
    const filas = revision.conceptos.map((item) => `<tr>

      <td><div class="descripcion">${textoSeguro(item.descripcion.trim())}</div></td>

      <td class="centrado">${item.cantidad}</td>

      <td class="derecha">${textoSeguro(moneda(numeroPositivo(item.precio)))}</td>

      <td class="derecha">${textoSeguro(moneda(numeroPositivo(item.precio) * item.cantidad))}</td>

    </tr>`).join("");

    const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

      .format(new Date(revision.fecha));

    const html = `<!doctype html><html lang="es"><head><meta charset="UTF-8" />

      <title>${revision.tipo} - ${textoSeguro(revision.nombre)}</title>

      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #151515; font: 12px Arial, Helvetica, sans-serif; background: white; }
        .sheet { min-height: 297mm; padding: 19mm 14mm 15mm; border: 4px solid #171717; position: relative; }
        .sheet:before { content: ''; position: absolute; left: 4px; right: 4px; top: 4px; height: 7px; background: #c70058; }
        .top { display: flex; align-items: center; gap: 24px; margin-bottom: 24px; }
        .brand { width: 115px; height: 112px; object-fit: contain; border: 2px solid #111; border-radius: 13px; }
        .heading { flex: 1; border-left: 3px solid #cf005b; padding-left: 20px; text-align: right; }
        .heading h1 { font-size: 29px; margin: 0 0 8px; color: #111; }
        .number { display: inline-block; font-weight: bold; font-size: 19px; background: #c70058; color: #fff; padding: 6px 19px; border-radius: 10px; }
        .date { margin-top: 12px; font-size: 12px; }
        .client { background: #efeff1; border-radius: 10px; padding: 14px 17px; display: grid; grid-template-columns: 1fr 0.8fr; gap: 14px; margin-bottom: 21px; }
        .client-left div { margin: 2px 0 7px; overflow-wrap: anywhere; }
        .client-right { border-left: 1px solid #aaa; padding-left: 17px; overflow-wrap: anywhere; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th { background: #c70058; color: white; padding: 11px 7px; font-size: 11px; text-align: left; }
        td { border: 1px solid #ccc; padding: 13px 7px; vertical-align: top; }
        th:first-child { width: 48%; } th:nth-child(2) { width: 10%; } th:nth-child(3),th:nth-child(4) { width: 21%; }
        .descripcion { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.55; }
        .derecha { text-align: right; overflow-wrap: anywhere; } .centrado { text-align: center; }
        .totales { margin: 23px 0 20px auto; background: #eeeeef; padding: 12px 14px; border-radius: 10px; }
        .totales div { display: flex; justify-content: flex-end; gap: 22px; padding: 4px; }
        .totales .final { font-weight: bold; font-size: 20px; align-items: center; }
        .totales .final span:last-child { background: #c70058; color: white; padding: 8px 12px; border-radius: 9px; }
        .bank { border: 1.5px solid #c70058; border-radius: 10px; padding: 13px 17px; display: grid; grid-template-columns: 30% 70%; gap: 6px; margin: 10px 0 22px; break-inside: avoid; }
        .bank-title { color: #c70058; font-weight: 800; font-size: 15px; align-self: center; }
        .bank-details { border-left: 2px solid #c70058; padding-left: 13px; line-height: 1.6; font-size: 11px; overflow-wrap: anywhere; }
        .notes { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.5; margin: 7px 0 17px; }
        .foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; font-size: 10px; }
        .thanks { text-align: right; color: #c70058; font-style: italic; font-size: 17px; margin-top: 17px; }
        tr, .bank, .client { break-inside: avoid; }
        @media screen { body { background: #ddd; padding: 20px; } .sheet { max-width: 210mm; margin: auto; background: white; box-shadow: 0 2px 15px #999; } }
      </style></head><body><main class="sheet">
      <section class="top"><img class="brand" src="/presupuestos-alaan/alan-paz-logo.jpg" alt="Alan Paz" />
      <div class="heading"><h1>${revision.tipo.toUpperCase()}</h1>
      <div class="number">N.º ${numeroDocumento(numeroVista)}</div>
      <div class="date">Fecha: ${fecha}</div></div></section>
      <section class="client"><div class="client-left"><div><strong>Cliente:</strong> ${textoSeguro(revision.nombre)}</div>
      ${revision.empresa ? `<div><strong>Empresa:</strong> ${textoSeguro(revision.empresa)}</div>` : ''}</div>
      <div class="client-right"><strong>Teléfono:</strong> ${textoSeguro(revision.telefono || '-')}</div></section>
      <table><thead><tr><th>Descripción del servicio</th><th class="centrado">Cantidad</th>
      <th class="derecha">Precio unitario</th><th class="derecha">Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
      <section class="totales"><div><span>Subtotal</span><strong>${textoSeguro(moneda(revision.subtotal))}</strong></div>
      ${revision.descuentoHabilitado ? `<div><span>Descuento</span><strong>− ${textoSeguro(moneda(revision.descuentoCalculado))}</strong></div>` : ''}
      <div class="final"><span>TOTAL:</span><span>${textoSeguro(moneda(revision.total))}</span></div></section>
      <section class="bank"><div class="bank-title">DATOS BANCARIOS</div><div class="bank-details">
      <strong>Titular:</strong> Alan Paz Jonatan<br /><strong>CUIT:</strong> 20-39033950-0<br />
      <strong>Banco:</strong> BBVA Argentina S.A.<br /><strong>CBU:</strong> 0170376224000032353116<br />
      <strong>Alias:</strong> ALANPAZ.OK</div></section>
      ${revision.observaciones.trim() ? `<strong>OBSERVACIONES</strong><div class="notes">${textoSeguro(revision.observaciones.trim())}</div>` : ''}
      <div class="foot"><span>${revision.tipo === 'Presupuesto' ? 'Presupuesto sujeto a modificaciones.' : 'Documento de remito.'}</span>
      ${revision.tipo === 'Presupuesto' ? '<strong>Validez del presupuesto: 15 días.</strong>' : ''}</div>
      <div class="thanks">¡Gracias por tu consulta!</div>
      </main>      </body></html>`;
    ventana.document.open(); ventana.document.write(html); ventana.document.close();

    revisionRef.current = revision;

    setRevisionLista(true);

    setMensaje("Revisá el documento en Chrome. En presupuestos nuevos, el número de la vista previa es provisional: el definitivo se asigna al guardar. Después confirmá si querés archivarlo en ComerSys.");

    ventana.focus();

    ventana.setTimeout(() => { if (!ventana.closed) ventana.print(); }, 400);

  }
  function descartarRevision() {

    revisionRef.current = null;

    setRevisionLista(false);

    setErrorOperacion(false);

    setMensaje("Revisión descartada: no se guardó nada en ComerSys.");

  }
  async function confirmarGuardado() {

    const revision = revisionRef.current;

    if (!revision || procesando) return;

    if (revision.firma !== firmaActual) {

      setErrorOperacion(true);

      setMensaje("Cambiaste el documento después de la vista previa. Volvé a revisarlo antes de guardar.");

      revisionRef.current = null; setRevisionLista(false);

      return;

    }

    setProcesando(true); setMensaje(""); setErrorOperacion(false);

    let guardadoId: number | null = null;

    try {

      const entrada = {

        tipo: revision.tipo, cliente_nombre: revision.nombre, cliente_empresa: revision.empresa, cliente_telefono: revision.telefono,

        conceptos: revision.conceptos.map((item, indice) => ({ id: indice + 1,

          descripcion: item.descripcion.trim(), precio: numeroPositivo(item.precio),

          costo: numeroPositivo(item.costo), cantidad: item.cantidad })),

        observaciones: revision.observaciones,

        descuento_habilitado: revision.descuentoHabilitado,

        descuento_tipo: revision.descuentoTipo,

        descuento_valor: revision.descuentoHabilitado ? numeroPositivo(revision.descuentoValor) : 0,

        subtotal: revision.subtotal, descuento_calculado: revision.descuentoCalculado, total: revision.total,

      };

      const datos = await obtenerJSON<{ ok: true; id: number; creado_en?: string }>(

        await solicitar("/api/presupuestos-alaan", revision.idEnEdicion === null ? "POST" : "PATCH",

          JSON.stringify(revision.idEnEdicion === null ? entrada : { ...entrada, id: revision.idEnEdicion }), "application/json"));

      guardadoId = datos.id;

      const archivo = await generarPDF({ id: datos.id,

        fecha: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

          .format(new Date(revision.fecha)),

        tipo: revision.tipo, nombre: revision.nombre, empresa: revision.empresa, telefono: revision.telefono,

        conceptos: revision.conceptos, subtotal: revision.subtotal,

        descuento: revision.descuentoCalculado, total: revision.total,

        observaciones: revision.observaciones,

      });

      if (archivo.size > 10 * 1024 * 1024) throw new Error("El PDF supera 10 MB. Acortá las descripciones.");

      const form = new FormData(); form.append("archivo", archivo, `Documento-Alaan-${datos.id}.pdf`);

      await obtenerJSON(await solicitar(`/api/presupuestos-alaan?id=${datos.id}`, "PUT", form));

      setIdEnEdicion(datos.id);

      setFechaEnEdicion(revision.fecha);

      revisionRef.current = null; setRevisionLista(false);

      setErrorOperacion(false);

      setMensaje(`✓ Documento N.º ${datos.id} archivado en ComerSys. El archivo local se guarda únicamente desde la ventana de Chrome.`);

      await cargarHistorial(1);

    } catch (error) {

      setErrorOperacion(true);

      setMensaje(`${error instanceof Error ? error.message : "No pudimos guardar el documento."}${guardadoId !== null ? ` Los datos del documento N.º ${guardadoId} podrían haberse guardado sin PDF. Revisá el historial antes de volver a intentar.` : ""}`);

    } finally { setProcesando(false); }

  }
  if (verificando) {
    return <main className="flex min-h-screen items-center justify-center bg-black p-8 text-white">Verificando acceso a Presupuestos Alaan...</main>;
  }
  if (!autorizado) {
    return <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="max-w-lg rounded-2xl border border-red-900 bg-[#191919] p-8 text-center">
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-3 text-red-300">{errorAcceso || "No tenés permiso para acceder a este módulo."}</p>
        <Link href="/admin" className="mt-6 inline-block rounded-xl bg-[#2563eb] px-5 py-3 font-bold text-white">Volver al panel</Link>
      </div>
    </main>;
  }
  return <main className="min-h-screen bg-black px-4 py-7 text-white sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-[#86b7ff] hover:underline">← Volver al Dashboard</Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Presupuestos Alaan</h1>
          {idEnEdicion !== null && <p className="mt-2 text-xs font-bold text-[#64c8a0]">Editando documento N.º {idEnEdicion} · Revisá y confirmá para actualizar el PDF</p>}
          <p className="mt-1 text-sm text-[#a3a3a3]">Presupuestos y remitos independientes · Uso privado</p>
        </div>
        <button type="button" onClick={limpiar} disabled={procesando} className="rounded-xl border border-[#454545] bg-[#202020] px-5 py-3 text-sm font-bold disabled:opacity-50">＋ Nuevo documento</button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(310px,1fr)]">
        <div className="space-y-5">
          <section className="min-h-[590px] rounded-2xl border border-[#2c2c2c] bg-[#191919] p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={etiquetaEstilo}>Nombre</span><input className={campoEstilo} value={nombre} maxLength={160} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" /></label>
              <label><span className={etiquetaEstilo}>Teléfono</span><input className={campoEstilo} type="tel" value={telefono} maxLength={60} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej.: 3444 123456" /></label>
              <label className="sm:col-span-2"><span className={etiquetaEstilo}>Empresa (opcional)</span><input className={campoEstilo} value={empresa} maxLength={160} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ej.: El Remanso" /></label>
            </div>
            <button type="button" onClick={agregar} className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-[#effdf4] px-4 py-4 text-base font-black text-[#00a84b] transition hover:bg-white">
              <span className="rounded-full bg-[#00aa50] px-2.5 py-1 text-lg text-white">+</span> Agregar servicio
            </button>
            <div className="mt-6 space-y-4">
              {conceptos.length === 0 && <div className="rounded-xl border border-dashed border-[#444] p-6 text-center text-[#aaa]">Agregá un servicio para comenzar.</div>}
              {conceptos.map((item, indice) => <article key={item.id} className="rounded-xl border border-[#6a8c74] bg-[#191919] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div><h2 className="text-sm font-black">Servicio {indice + 1}</h2><p className="mt-1 text-[11px] text-[#00b750]">Independiente del catálogo de productos</p></div>
                  <button type="button" onClick={() => quitar(item.id)} title="Eliminar servicio" aria-label={`Eliminar servicio ${indice + 1}`} className="rounded-lg border border-[#745050] px-3 py-2 text-red-400 hover:bg-[#302020]">✕</button>
                </div>
                <label className="block"><span className={etiquetaEstilo}>Descripción del servicio</span>
                  <textarea className={`${campoEstilo} min-h-[160px] resize-y leading-6`} rows={6} value={item.descripcion} onChange={(e) => modificar(item.id, { descripcion: e.target.value })} placeholder="Describí el trabajo en detalle: alcance, etapas, características, entregables..." />
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label><span className={etiquetaEstilo}>Precio unitario ($)</span><input className={campoEstilo} type="text" inputMode="decimal" value={item.precio} onChange={(e) => modificar(item.id, { precio: e.target.value })} placeholder="Ej.: 15000" /></label>
                  <label><span className={etiquetaEstilo}>Costo unitario ($) · Solo interno</span><input className={campoEstilo} type="text" inputMode="decimal" value={item.costo} onChange={(e) => modificar(item.id, { costo: e.target.value })} placeholder="Ej.: 10000" /></label>
                </div>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div><span className="mb-2 block text-xs font-semibold text-[#aaa]">Cantidad</span><div className="inline-flex items-center overflow-hidden rounded-lg border border-[#363636]"><button type="button" className="px-3 py-2 text-[#ddd] hover:bg-[#333]" onClick={() => modificar(item.id, { cantidad: Math.max(1, item.cantidad - 1) })} aria-label="Restar cantidad">−</button><span className="min-w-10 bg-[#292929] px-2 py-2 text-center text-sm font-bold">{item.cantidad}</span><button type="button" className="px-3 py-2 text-[#ddd] hover:bg-[#333]" onClick={() => modificar(item.id, { cantidad: Math.min(999999, item.cantidad + 1) })} aria-label="Sumar cantidad">+</button></div></div>
                  <div className="text-right"><span className="text-[10px] font-bold uppercase text-[#aaa]">Subtotal</span><div className="text-lg font-black">{moneda(numeroPositivo(item.precio) * item.cantidad)}</div></div>
                </div>
              </article>)}
            </div>
          </section>
          <section className="rounded-2xl border border-[#2c2c2c] bg-[#191919] p-5 sm:p-6">
            <label htmlFor="observaciones" className="mb-3 block text-base font-black">Observaciones</label>
            <textarea id="observaciones" className={`${campoEstilo} min-h-[120px] resize-y leading-6`} rows={4} placeholder="Aclaraciones, forma de entrega, condiciones de trabajo, referencias..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </section>
        </div>
        <aside className="space-y-2">
          <section className="rounded-2xl border border-[#303030] bg-[#191919] p-5">
            <h2 className="mb-4 text-xl font-black">Tipo de documento</h2>
            <div className="grid grid-cols-2 gap-2">{(["Presupuesto", "Remito"] as const).map((opcion) => <button type="button" key={opcion} onClick={() => setTipo(opcion)} aria-pressed={tipo === opcion} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${tipo === opcion ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-[#393939] bg-[#191919] text-[#ddd] hover:bg-[#252525]"}`}>{opcion}</button>)}</div>
          </section>
          <section className="rounded-2xl border border-[#303030] bg-[#191919] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b9b9b]">Resumen</p>
            <h2 className="mt-1 text-2xl font-black">Pedido actual</h2>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-[#aaa]">Servicios</span><strong>{conceptos.filter((item) => item.descripcion.trim()).length}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#aaa]">Unidades</span><strong>{unidades}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#aaa]">Cliente</span><strong className="max-w-[65%] break-words text-right">{nombre.trim() || "Sin seleccionar"}</strong></div>

                {empresa.trim() && <div className="flex justify-between gap-4"><span className="text-[#aaa]">Empresa</span><strong className="max-w-[65%] break-words text-right">{empresa.trim()}</strong></div>}
            </div>
            <div className="mt-6 space-y-3 border-t border-[#333] pt-6 text-sm">
              <div className="flex justify-between"><span className="text-[#aaa]">Subtotal</span><strong>{moneda(subtotal)}</strong></div>
              <div className="flex justify-between"><button type="button" className="font-semibold text-[#2975ff] hover:underline" onClick={() => setDescuentoHabilitado((v) => !v)}>{descuentoHabilitado ? "Quitar descuento" : "Agregar Descuento"}</button><strong>− {moneda(descuentoCalculado)}</strong></div>
              {descuentoHabilitado && <div className="space-y-2 rounded-xl bg-[#242424] p-3">
                <div className="grid grid-cols-2 gap-2"><button type="button" className={`rounded-lg px-2 py-2 text-xs font-bold ${descuentoTipo === "importe" ? "bg-[#2563eb]" : "bg-[#333]"}`} onClick={() => setDescuentoTipo("importe")}>Importe ($)</button><button type="button" className={`rounded-lg px-2 py-2 text-xs font-bold ${descuentoTipo === "porcentaje" ? "bg-[#2563eb]" : "bg-[#333]"}`} onClick={() => setDescuentoTipo("porcentaje")}>Porcentaje (%)</button></div>
                <input className={campoEstilo} value={descuentoValor} inputMode="decimal" placeholder={descuentoTipo === "importe" ? "Monto del descuento" : "Porcentaje (0 a 100)"} onChange={(e) => setDescuentoValor(e.target.value)} />
              </div>}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#333] pt-6"><span className="text-base font-bold text-[#aaa]">Total</span><strong className="text-3xl font-black">{moneda(total)}</strong></div>
          </section>
          <button type="button" onClick={() => void revisarPDF()} disabled={procesando} className="mx-auto mt-3 flex items-center justify-center rounded-xl bg-[#008a69] px-6 py-3 text-sm font-black text-white hover:bg-[#00a37b] disabled:opacity-50">📄 Revisar PDF en Chrome</button>

            {revisionLista && <div className="mt-3 space-y-3 rounded-xl border border-[#4b7458] bg-[#1c2922] p-4 text-sm">

              <p className="font-bold">¿Terminaste de revisar el documento?</p>

              <p className="text-[#c7d4ca]">Chrome no informa si elegiste Guardar o Cancelar. Confirmá aquí únicamente si querés archivarlo en ComerSys.</p>

              <button type="button" onClick={() => void confirmarGuardado()} disabled={procesando} className="w-full rounded-xl bg-[#008a69] px-4 py-3 font-black text-white disabled:opacity-50">{procesando ? "Archivando..." : "✓ Confirmar y archivar en ComerSys"}</button>

              <button type="button" onClick={descartarRevision} disabled={procesando} className="w-full rounded-xl border border-[#777] px-4 py-3 font-bold text-white disabled:opacity-50">Cancelar · No guardar en ComerSys</button>

            </div>}
          {mensaje && <p role="alert" className={`rounded-xl border p-3 text-sm ${errorOperacion ? "border-red-800 bg-[#301c1c] text-red-200" : "border-green-800 bg-[#173024] text-green-200"}`}>{mensaje}</p>}
          <p className="pt-3 text-center text-xs text-[#777]">Primero revisás el documento en Chrome. Solo después de tu confirmación se archiva en ComerSys. Chrome controla el guardado local.</p>
        </aside>
      </div>
      <section className="mt-8 rounded-2xl border border-[#303030] bg-[#191919] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-2xl font-black">Historial de presupuestos y remitos</h2>
            <p className="mt-1 text-sm text-[#aaa]">{totalHistorial} documento(s) archivado(s) en Supabase · Uso exclusivo ID 1</p></div>
          <button disabled={cargandoHistorial || procesando} onClick={() => void cargarHistorial(paginaHistorial)} type="button" className="rounded-xl border border-[#444] px-4 py-2 text-sm font-bold disabled:opacity-50">↻ Actualizar historial</button>
        </div>
        <input className={`${campoEstilo} mt-5`} value={filtroHistorial} onChange={e=>setFiltroHistorial(e.target.value)} placeholder="Buscar por nombre, teléfono, número o tipo en esta página" />
        <div className="mt-5 space-y-3">
          {cargandoHistorial && <p className="text-sm text-[#aaa]">Cargando documentos...</p>}
          {!cargandoHistorial && historial.filter(item => `${item.id} ${item.cliente_nombre} ${item.cliente_empresa || ""} ${item.cliente_telefono} ${item.tipo}`.toLowerCase().includes(filtroHistorial.toLowerCase())).map(item => (
            <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#404040] bg-[#232323] p-4">
              <div className="min-w-0"><p className="font-bold">{item.tipo} N.º {numeroDocumento(item.id)} · {item.cliente_nombre}{item.cliente_empresa ? ` · ${item.cliente_empresa}` : ""}</p>
                <p className="mt-1 text-xs text-[#aaa]">{new Date(item.creado_en).toLocaleDateString("es-AR")} · {moneda(Number(item.total))} · {item.pdf_path ? "PDF archivado" : "Pendiente de PDF"}</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={procesando} onClick={()=>void abrirGuardado(item.id)} className="rounded-lg bg-[#245fd2] px-3 py-2 text-xs font-bold disabled:opacity-50">Abrir y editar</button>
                <button type="button" disabled={procesando} onClick={()=>void abrirGuardado(item.id,true)} className="rounded-lg border border-[#666] px-3 py-2 text-xs font-bold disabled:opacity-50">Duplicar</button>
                <button type="button" disabled={procesando || !item.pdf_path} onClick={()=>void descargarGuardado(item)} className="rounded-lg bg-[#087e60] px-3 py-2 text-xs font-bold disabled:opacity-50">Descargar PDF</button>
                <button type="button" disabled={procesando} onClick={()=>void borrarGuardado(item)} className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50">Eliminar</button>
              </div>
            </article>
          ))}
          {!cargandoHistorial && historial.length===0 && <p className="rounded-xl border border-dashed border-[#444] p-6 text-center text-[#aaa]">Todavía no hay documentos guardados.</p>}
          {!cargandoHistorial && historial.length>0 && historial.filter(item => `${item.id} ${item.cliente_nombre} ${item.cliente_empresa || ""} ${item.cliente_telefono} ${item.tipo}`.toLowerCase().includes(filtroHistorial.toLowerCase())).length===0 && <p className="p-4 text-sm text-[#aaa]">No hay coincidencias en esta página.</p>}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 text-sm">
          <button disabled={paginaHistorial<=1 || procesando || cargandoHistorial} onClick={()=>void cargarHistorial(paginaHistorial-1)} className="rounded-lg border border-[#555] px-4 py-2 disabled:opacity-40">← Anterior</button>
          <span className="text-[#aaa]">Página {paginaHistorial} de {Math.max(1, Math.ceil(totalHistorial/30))}</span>
          <button disabled={paginaHistorial*30>=totalHistorial || procesando || cargandoHistorial} onClick={()=>void cargarHistorial(paginaHistorial+1)} className="rounded-lg border border-[#555] px-4 py-2 disabled:opacity-40">Siguiente →</button>
        </div>
      </section>
    </div>
  </main>;
}
