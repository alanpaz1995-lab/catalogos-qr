"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, FileUp, Loader2 } from "lucide-react";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

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
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size > 15 * 1024 * 1024) {
      setError("Seleccioná un PDF válido de hasta 15 MB."); return;
    }
    setLeyendo(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const documento = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      if (documento.numPages > 30) throw new Error("El PDF tiene demasiadas páginas.");
      let texto = "";
      for (let pagina = 1; pagina <= documento.numPages; pagina++) {
        const hoja = await documento.getPage(pagina);
        const contenido = await hoja.getTextContent();
        texto += "\n" + contenido.items.map((item) => "str" in item ? String(item.str) : "").join(" ");
      }
      await documento.cleanup();
      const match = texto.match(/COMERSYS_PRESUPUESTO_V1\s*:\s*([A-Za-z0-9+/=\s]+?)\s*:\s*FIN_COMERSYS_PRESUPUESTO/);
      if (!match) throw new Error("Este PDF no contiene los datos de un presupuesto de ComerSys. Generá el PDF desde Presupuesto para cliente.");
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
            !Number.isFinite(item.precio_unitario) || item.precio_unitario <= 0 || item.precio_unitario > 999999999 ||
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
        <p className="mt-3 text-slate-500">Seleccioná un presupuesto PDF generado en ComerSys. Podrás revisar y editar el pedido antes de guardarlo.</p>
        {(error || errorEmpresa) && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{errorEmpresa || error}</p>}
        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-8 text-center hover:bg-blue-100">
            <FileUp className="mx-auto mb-3 h-10 w-10 text-blue-600" />
            <span className="block text-lg font-bold text-blue-800">Seleccionar presupuesto PDF</span>
            <span className="mt-2 block text-sm text-slate-600">Máximo 15 MB · Sólo archivos generados por ComerSys</span>
            <input className="mt-5 block w-full text-sm" type="file" accept="application/pdf,.pdf"
              disabled={leyendo || cargandoEmpresa || !empresa?.id}
              onChange={e => void leerPDF(e.target.files?.[0])} />
          </label>
          {leyendo && <p className="mt-5 flex items-center gap-2 text-blue-700"><Loader2 className="h-5 w-5 animate-spin" /> Leyendo presupuesto...</p>}
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
