import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABLA = "presupuestos_alaan";
const BUCKET = "presupuestos-alaan-privado";
const EMPRESA_ID = 1;
const LIMITE_PDF = 10 * 1024 * 1024;
const CABECERAS = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

type Concepto = { id: number; descripcion: string; precio: number; costo: number; cantidad: number };
type Tipo = "Presupuesto" | "Remito";
type DescuentoTipo = "importe" | "porcentaje";
type DocumentoEntrada = {
  tipo: Tipo;
  cliente_nombre: string;
  cliente_empresa: string;
  cliente_telefono: string;
  conceptos: Concepto[];
  observaciones: string;
  descuento_habilitado: boolean;
  descuento_tipo: DescuentoTipo;
  descuento_valor: number;
  subtotal: number;
  descuento_calculado: number;
  total: number;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CABECERAS });
}

async function comprobarAcceso(request: Request): Promise<
  | { autorizado: true }
  | { autorizado: false; status: number; mensaje: string }
> {
  const cabecera = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(cabecera)?.[1]?.trim();
  if (!token) return { autorizado: false, status: 401, mensaje: "Iniciá sesión para continuar." };

  const { data: { user }, error: errorUsuario } = await supabaseAdmin.auth.getUser(token);
  if (errorUsuario || !user) return { autorizado: false, status: 401, mensaje: "Tu sesión no es válida." };

  const [superadmin, empresa] = await Promise.all([
    supabaseAdmin.from("superadmins").select("id").eq("auth_user_id", user.id).eq("activo", true).maybeSingle(),
    supabaseAdmin.from("empresas").select("id").eq("id", EMPRESA_ID).eq("auth_user_id", user.id).maybeSingle(),
  ]);
  if (superadmin.error || empresa.error) {
    console.error("Error de autorización de Presupuestos Alaan:", superadmin.error?.message, empresa.error?.message);
    return { autorizado: false, status: 500, mensaje: "No se pudo verificar el acceso." };
  }
  if (!superadmin.data || !empresa.data) return { autorizado: false, status: 403, mensaje: "Acceso restringido." };
  return { autorizado: true };
}

function idValido(entrada: unknown): number | null {
  if (typeof entrada !== "number" && typeof entrada !== "string") return null;
  const id = Number(entrada);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function numeroNoNegativo(valor: unknown, maximo = 999_999_999_999): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 || valor > maximo) return null;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function validarDocumento(entrada: unknown): { datos: DocumentoEntrada } | { error: string } {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return { error: "Documento no válido." };
  const d = entrada as Record<string, unknown>;
  if (d.tipo !== "Presupuesto" && d.tipo !== "Remito") return { error: "Seleccioná Presupuesto o Remito." };
  if (typeof d.cliente_nombre !== "string" || !d.cliente_nombre.trim() || d.cliente_nombre.trim().length > 160) {
    return { error: "Ingresá el nombre del cliente (hasta 160 caracteres)." };
  }
  if (typeof d.cliente_empresa !== "string" || d.cliente_empresa.trim().length > 160) return { error: "El nombre de la empresa no es válido." };
  if (typeof d.cliente_telefono !== "string" || d.cliente_telefono.length > 60) return { error: "El teléfono no es válido." };
  if (typeof d.observaciones !== "string" || d.observaciones.length > 40_000) return { error: "Las observaciones son demasiado extensas." };
  if (!Array.isArray(d.conceptos) || d.conceptos.length < 1 || d.conceptos.length > 100) {
    return { error: "Agregá entre 1 y 100 servicios." };
  }

  const conceptos: Concepto[] = [];
  for (let i = 0; i < d.conceptos.length; i++) {
    const item = d.conceptos[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) return { error: `El servicio ${i + 1} no es válido.` };
    const c = item as Record<string, unknown>;
    if (typeof c.descripcion !== "string" || !c.descripcion.trim() || c.descripcion.length > 20_000) {
      return { error: `Ingresá la descripción del servicio ${i + 1} (hasta 20.000 caracteres).` };
    }
    const precio = numeroNoNegativo(c.precio);
    const costo = numeroNoNegativo(c.costo);
    const cantidad = c.cantidad;
    if (precio === null || costo === null || typeof cantidad !== "number" || !Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 999_999) {
      return { error: `Revisá el precio, costo o cantidad del servicio ${i + 1}.` };
    }
    conceptos.push({ id: i + 1, descripcion: c.descripcion.trim(), precio, costo, cantidad });
  }
  if (typeof d.descuento_habilitado !== "boolean" ||
      (d.descuento_tipo !== "importe" && d.descuento_tipo !== "porcentaje")) {
    return { error: "Configuración de descuento incorrecta." };
  }
  const descuentoValor = numeroNoNegativo(d.descuento_valor);
  if (descuentoValor === null || (d.descuento_tipo === "porcentaje" && descuentoValor > 100)) {
    return { error: "Valor de descuento no válido." };
  }
  const subtotalCentavos = conceptos.reduce((s, c) => s + Math.round(c.precio * 100) * c.cantidad, 0);
  if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos > 99_999_999_999_999) {
    return { error: "El subtotal supera el importe permitido." };
  }
  const descuentoCentavos = d.descuento_habilitado
    ? Math.min(subtotalCentavos, d.descuento_tipo === "porcentaje"
      ? Math.round(subtotalCentavos * descuentoValor / 100)
      : Math.round(descuentoValor * 100))
    : 0;
  const datos: DocumentoEntrada = {
    tipo: d.tipo, cliente_nombre: d.cliente_nombre.trim(), cliente_empresa: d.cliente_empresa.trim(), cliente_telefono: d.cliente_telefono.trim(),
    conceptos, observaciones: d.observaciones,
    descuento_habilitado: d.descuento_habilitado, descuento_tipo: d.descuento_tipo,
    descuento_valor: descuentoValor,
    subtotal: subtotalCentavos / 100,
    descuento_calculado: descuentoCentavos / 100,
    total: (subtotalCentavos - descuentoCentavos) / 100,
  };
  return { datos };
}

// GET /api/presupuestos-alaan?pagina=1 -> historial
// GET /api/presupuestos-alaan?id=12 -> documento editable
// GET /api/presupuestos-alaan?id=12&pdf=1 -> PDF guardado (descarga autenticada)
export async function GET(request: Request) {
  try {
    const acceso = await comprobarAcceso(request);
    if (!acceso.autorizado) return json({ ok: false, error: acceso.mensaje }, acceso.status);
    const url = new URL(request.url);
    if (url.searchParams.get("proximo") === "1") {
      // Número de vista previa: orientativo, no reserva el ID de la secuencia.
      const { data: ultimo, error: errorUltimo } = await supabaseAdmin.from(TABLA)
        .select("id").eq("empresa_id", EMPRESA_ID)
        .order("id", { ascending: false }).limit(1).maybeSingle();
      if (errorUltimo) throw errorUltimo;
      return json({ ok: true, siguiente_id: (ultimo?.id ?? 0) + 1 });
    }
    const idTexto = url.searchParams.get("id");
    if (idTexto !== null) {
      const id = idValido(idTexto);
      if (!id) return json({ ok: false, error: "Número de documento inválido." }, 400);
      const { data, error } = await supabaseAdmin.from(TABLA).select("*").eq("empresa_id", EMPRESA_ID).eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return json({ ok: false, error: "No encontramos el documento." }, 404);
      if (url.searchParams.get("pdf") === "1") {
        if (!data.pdf_path || typeof data.pdf_path !== "string" || data.pdf_path !== `${id}/documento.pdf`) {
          return json({ ok: false, error: "Este documento todavía no tiene un PDF guardado." }, 404);
        }
        const { data: archivo, error: errorArchivo } = await supabaseAdmin.storage.from(BUCKET).download(data.pdf_path);
        if (errorArchivo || !archivo) throw errorArchivo ?? new Error("No se pudo leer el PDF.");
        return new Response(archivo, {
          headers: {
            ...CABECERAS,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${data.tipo === "Remito" ? "Remito" : "Presupuesto"}-Alaan-${id}.pdf"`,
          },
        });
      }
      return json({ ok: true, documento: data });
    }
    const paginaTexto = url.searchParams.get("pagina") ?? "1";
    const pagina = idValido(paginaTexto);
    if (!pagina || pagina > 100_000) return json({ ok: false, error: "Página inválida." }, 400);
    const inicio = (pagina - 1) * 30;
    const { data, error, count } = await supabaseAdmin.from(TABLA)
      .select("id,tipo,cliente_nombre,cliente_empresa,cliente_telefono,subtotal,total,creado_en,actualizado_en,pdf_path", { count: "exact" })
      .eq("empresa_id", EMPRESA_ID).order("creado_en", { ascending: false }).order("id", { ascending: false })
      .range(inicio, inicio + 29);
    if (error) throw error;
    return json({ ok: true, documentos: data ?? [], total: count ?? 0, pagina, por_pagina: 30 });
  } catch (error) {
    console.error("Error consultando Presupuestos Alaan:", error);
    return json({ ok: false, error: "No pudimos consultar los presupuestos." }, 500);
  }
}

// POST: crear nuevo documento. Los importes se recalculan en el servidor.
export async function POST(request: Request) {
  try {
    const acceso = await comprobarAcceso(request);
    if (!acceso.autorizado) return json({ ok: false, error: acceso.mensaje }, acceso.status);
    if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ ok: false, error: "Enviá datos JSON." }, 415);
    const cuerpo = await request.json().catch(() => null);
    const resultado = validarDocumento(cuerpo);
    if ("error" in resultado) return json({ ok: false, error: resultado.error }, 400);
    const { data, error } = await supabaseAdmin.from(TABLA)
      .insert({ ...resultado.datos, empresa_id: EMPRESA_ID })
      .select("id,creado_en").single();
    if (error) throw error;
    return json({ ok: true, id: data.id, creado_en: data.creado_en }, 201);
  } catch (error) {
    console.error("Error guardando Presupuestos Alaan:", error);
    return json({ ok: false, error: "No pudimos guardar el documento." }, 500);
  }
}

// PATCH: editar el documento existente, sin cambiar su número.
// Se invalida el PDF anterior hasta que se suba su nueva versión.
export async function PATCH(request: Request) {
  try {
    const acceso = await comprobarAcceso(request);
    if (!acceso.autorizado) return json({ ok: false, error: acceso.mensaje }, acceso.status);
    if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ ok: false, error: "Enviá datos JSON." }, 415);
    const cuerpo = await request.json().catch(() => null);
    const id = idValido(cuerpo?.id);
    if (!id) return json({ ok: false, error: "Número de documento inválido." }, 400);
    const resultado = validarDocumento(cuerpo);
    if ("error" in resultado) return json({ ok: false, error: resultado.error }, 400);
    const { data, error } = await supabaseAdmin.from(TABLA)
      .update({ ...resultado.datos, pdf_path: null, actualizado_en: new Date().toISOString() })
      .eq("empresa_id", EMPRESA_ID).eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return json({ ok: false, error: "Documento no encontrado." }, 404);
    return json({ ok: true, id });
  } catch (error) {
    console.error("Error editando Presupuestos Alaan:", error);
    return json({ ok: false, error: "No pudimos actualizar el documento." }, 500);
  }
}

// PUT /api/presupuestos-alaan?id=12: subir PDF real con FormData campo "archivo".
// Requiere primero guardar el documento JSON vía POST/PATCH.
export async function PUT(request: Request) {
  try {
    const acceso = await comprobarAcceso(request);
    if (!acceso.autorizado) return json({ ok: false, error: acceso.mensaje }, acceso.status);
    const id = idValido(new URL(request.url).searchParams.get("id"));
    if (!id) return json({ ok: false, error: "Número de documento inválido." }, 400);
    if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      return json({ ok: false, error: "Enviá un archivo PDF." }, 415);
    }
    const { data: documento, error: errorDoc } = await supabaseAdmin.from(TABLA)
      .select("id").eq("empresa_id", EMPRESA_ID).eq("id", id).maybeSingle();
    if (errorDoc) throw errorDoc;
    if (!documento) return json({ ok: false, error: "Documento no encontrado." }, 404);
    const formulario = await request.formData();
    const archivo = formulario.get("archivo");
    if (!(archivo instanceof File) || archivo.size < 8 || archivo.size > LIMITE_PDF || archivo.type !== "application/pdf") {
      return json({ ok: false, error: "Adjuntá un PDF válido de hasta 10 MB." }, 400);
    }
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const cabecera = new TextDecoder("ascii").decode(bytes.subarray(0, 5));
    if (cabecera !== "%PDF-") return json({ ok: false, error: "El archivo no es un PDF válido." }, 400);
    const ruta = `${id}/documento.pdf`;
    const { error: errorSubida } = await supabaseAdmin.storage.from(BUCKET)
      .upload(ruta, bytes, { contentType: "application/pdf", upsert: true, cacheControl: "0" });
    if (errorSubida) throw errorSubida;
    const { error: errorActualizacion } = await supabaseAdmin.from(TABLA)
      .update({ pdf_path: ruta, actualizado_en: new Date().toISOString() })
      .eq("empresa_id", EMPRESA_ID).eq("id", id);
    if (errorActualizacion) throw errorActualizacion;
    return json({ ok: true, id, pdf_guardado: true });
  } catch (error) {
    console.error("Error almacenando PDF de Presupuestos Alaan:", error);
    return json({ ok: false, error: "No pudimos almacenar el PDF." }, 500);
  }
}

// DELETE /api/presupuestos-alaan?id=12: eliminación explícita.
export async function DELETE(request: Request) {
  try {
    const acceso = await comprobarAcceso(request);
    if (!acceso.autorizado) return json({ ok: false, error: acceso.mensaje }, acceso.status);
    const id = idValido(new URL(request.url).searchParams.get("id"));
    if (!id) return json({ ok: false, error: "Número de documento inválido." }, 400);
    const { data: documento, error: errorConsulta } = await supabaseAdmin.from(TABLA)
      .select("id,pdf_path").eq("empresa_id", EMPRESA_ID).eq("id", id).maybeSingle();
    if (errorConsulta) throw errorConsulta;
    if (!documento) return json({ ok: false, error: "Documento no encontrado." }, 404);
    const { error: errorBorrado } = await supabaseAdmin.from(TABLA)
      .delete().eq("empresa_id", EMPRESA_ID).eq("id", id);
    if (errorBorrado) throw errorBorrado;
    if (documento.pdf_path === `${id}/documento.pdf`) {
      const { error: errorArchivo } = await supabaseAdmin.storage.from(BUCKET).remove([documento.pdf_path]);
      if (errorArchivo) console.error("Documento eliminado; falló limpieza de PDF:", errorArchivo.message);
    }
    return json({ ok: true, id });
  } catch (error) {
    console.error("Error eliminando Presupuestos Alaan:", error);
    return json({ ok: false, error: "No pudimos eliminar el documento." }, 500);
  }
}
