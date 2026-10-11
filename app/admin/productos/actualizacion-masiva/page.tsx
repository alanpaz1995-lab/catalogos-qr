"use client";



import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import { useEmpresa } from "@/lib/empresa/EmpresaProvider";



type Producto = { id: number; nombre: string; imaguen: string | null; precio: number; precio_mayorista: number | null };

type Lista = { id: number; nombre: string; activa: boolean };

type PrecioLista = { lista_id: number; producto_id: number; precio_minorista: number | null; precio_mayorista: number | null; visible: boolean };

type Seleccion = { minorista: boolean; mayorista: boolean };

type PrecioDisponible = { id: string; listaId: number | null; nombre: string; minorista: number | null; mayorista: number | null };

type Cambio = { clave: string; productoId: number; listaId: number | null; producto: string; lista: string; campo: "minorista" | "mayorista"; anterior: number; nuevo: number };



const GENERAL = "general";

const clave = (productoId: number, listaId: number | null) => `${productoId}:${listaId ?? GENERAL}`;

const dinero = (valor: number | null) => valor === null ? "Sin precio" : valor.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;



export default function ActualizacionMasivaPage() {

  const { empresa, cargandoEmpresa, errorEmpresa } = useEmpresa();

  const [productos, setProductos] = useState<Producto[]>([]);

  const [listas, setListas] = useState<Lista[]>([]);

  const [precios, setPrecios] = useState<PrecioLista[]>([]);

  const [seleccionados, setSeleccionados] = useState<Record<string, Seleccion>>({});

  const [busqueda, setBusqueda] = useState("");

  const [operacion, setOperacion] = useState<"aumentar" | "disminuir">("aumentar");

  const [porcentaje, setPorcentaje] = useState("2");

  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const [confirmando, setConfirmando] = useState(false);

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");



  const cargar = useCallback(async () => {

    if (!empresa?.id) return;

    setCargando(true); setError(""); setMensaje(""); setConfirmando(false); setSeleccionados({});

    try {

      const [resultadoProductos, resultadoListas] = await Promise.all([

        supabase.from("productos").select("id,nombre,imaguen,precio,precio_mayorista").eq("empresa_id", empresa.id).order("nombre"),

        supabase.from("listas_catalogos").select("id,nombre,activa").eq("empresa_id", empresa.id).order("created_at"),

      ]);

      if (resultadoProductos.error) throw resultadoProductos.error;

      if (resultadoListas.error) throw resultadoListas.error;

      const catalogos = (resultadoListas.data || []) as Lista[];

      const ids = catalogos.map((l) => l.id);

      const filas: PrecioLista[] = [];

      for (let i = 0; i < ids.length; i += 50) {

        let pagina = 0;

        while (true) {

          const { data, error: fallo } = await supabase.from("lista_productos")

            .select("lista_id,producto_id,precio_minorista,precio_mayorista,visible")

            .in("lista_id", ids.slice(i, i + 50))

            .order("producto_id", { ascending: true })

            .order("lista_id", { ascending: true })

            .range(pagina * 500, pagina * 500 + 499);

          if (fallo) throw fallo;

          filas.push(...((data || []) as PrecioLista[]));

          if (!data || data.length < 500) break;

          pagina++;

        }

      }

      setProductos((resultadoProductos.data || []) as Producto[]);

      setListas(catalogos); setPrecios(filas);

    } catch (e) {

      setError(e instanceof Error ? e.message : "No se pudieron cargar los precios.");

    } finally { setCargando(false); }

  }, [empresa?.id]);



  useEffect(() => { void cargar(); }, [cargar]);



  const porcentajeNumero = Number(porcentaje.replace(",", "."));

  const porcentajeValido = porcentaje.trim() !== "" && Number.isFinite(porcentajeNumero) && porcentajeNumero > 0 && porcentajeNumero <= 100;

  const calcular = (n: number) => redondear(n * (1 + (operacion === "aumentar" ? 1 : -1) * porcentajeNumero / 100));

  const mapaPrecios = useMemo(() => new Map(precios.map((p) => [clave(p.producto_id, p.lista_id), p])), [precios]);

  const opciones = useMemo(() => [{ id: GENERAL, nombre: "Precios generales" }, ...listas.filter((l) => l.activa).map((l) => ({ id: String(l.id), nombre: l.nombre }))], [listas]);

  const visibles = useMemo(() => productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())), [productos, busqueda]);



  const preciosPorProducto = useMemo(() => new Map(visibles.map((producto) => {

    const disponibles: PrecioDisponible[] = opciones.flatMap<PrecioDisponible>(({ id }) => {

      if (id === GENERAL) return [{ id, listaId: null, nombre: "Generales", minorista: producto.precio, mayorista: producto.precio_mayorista }];

      const listaId = Number(id);

      const registro = mapaPrecios.get(clave(producto.id, listaId));

      if (!registro?.visible) return [{ id, listaId, nombre: opciones.find((o) => o.id === id)?.nombre || "Lista", minorista: null, mayorista: null }];

      return [{ id, listaId, nombre: opciones.find((o) => o.id === id)?.nombre || "Lista", minorista: registro.precio_minorista, mayorista: registro.precio_mayorista }];

    });

    return [producto.id, disponibles] as const;

  })), [visibles, mapaPrecios, opciones]);



  const cambios = useMemo<Cambio[]>(() => {

    if (!porcentajeValido) return [];

    const resultado: Cambio[] = [];

    for (const producto of visibles) {

      for (const precio of preciosPorProducto.get(producto.id) || []) {

        const k = clave(producto.id, precio.listaId);

        const seleccion = seleccionados[k];

        if (!seleccion) continue;

        for (const campo of ["minorista", "mayorista"] as const) {

          const anterior = precio[campo];

          if (!seleccion[campo] || anterior === null || !Number.isFinite(anterior)) continue;

          const nuevo = calcular(anterior);

          if (nuevo !== anterior) resultado.push({ clave: k, productoId: producto.id, listaId: precio.listaId, producto: producto.nombre, lista: precio.nombre, campo, anterior, nuevo });

        }

      }

    }

    return resultado;

  }, [visibles, preciosPorProducto, seleccionados, porcentajeValido, porcentajeNumero, operacion]);



  const cambiarListaProducto = (productoId: number, precio: PrecioDisponible, valor: boolean) => {

    setConfirmando(false);

    setSeleccionados((prev) => ({ ...prev, [clave(productoId, precio.listaId)]: {

      minorista: valor && precio.minorista !== null,

      mayorista: valor && precio.mayorista !== null,

    } }));

  };

  const cambiarCampoProducto = (productoId: number, campo: keyof Seleccion, valor: boolean) => {

    setConfirmando(false);

    setSeleccionados((prev) => {

      const siguiente = { ...prev };

      for (const precio of preciosPorProducto.get(productoId) || []) {

        const k = clave(productoId, precio.listaId);

        const actual = prev[k];

        if (!actual?.minorista && !actual?.mayorista) continue;

        siguiente[k] = { ...actual, [campo]: valor && precio[campo] !== null };

      }

      return siguiente;

    });

  };

  const cambiarProductoCompleto = (productoId: number, valor: boolean) => {

    setConfirmando(false);

    setSeleccionados((prev) => {

      const siguiente = { ...prev };

      for (const precio of preciosPorProducto.get(productoId) || []) {

        siguiente[clave(productoId, precio.listaId)] = { minorista: valor && precio.minorista !== null, mayorista: valor && precio.mayorista !== null };

      }

      return siguiente;

    });

  };

  const seleccionarTodos = (valor: boolean) => {

    setConfirmando(false);

    setSeleccionados((prev) => {

      const siguiente = { ...prev };

      for (const producto of visibles) for (const precio of preciosPorProducto.get(producto.id) || []) {

        siguiente[clave(producto.id, precio.listaId)] = { minorista: valor && precio.minorista !== null, mayorista: valor && precio.mayorista !== null };

      }

      return siguiente;

    });

  };

  const todosMarcados = visibles.length > 0 && visibles.every((producto) => {

    const disponibles = preciosPorProducto.get(producto.id) || [];

    return disponibles.some((p) => p.minorista !== null || p.mayorista !== null) && disponibles.every((p) => {

      const s = seleccionados[clave(producto.id, p.listaId)];

      return (p.minorista === null || !!s?.minorista) && (p.mayorista === null || !!s?.mayorista);

    });

  });



  async function guardar() {

    if (!empresa?.id || guardando || !confirmando || !porcentajeValido || cambios.length === 0) return;

    setGuardando(true); setError(""); setMensaje("");

    let aplicados = 0;

    try {

      for (const cambio of cambios) {

        const columna = cambio.listaId === null

          ? (cambio.campo === "minorista" ? "precio" : "precio_mayorista")

          : (cambio.campo === "minorista" ? "precio_minorista" : "precio_mayorista");

        if (cambio.listaId === null) {

          const { data, error: fallo } = await supabase.from("productos")

            .update({ [columna]: cambio.nuevo }).eq("id", cambio.productoId).eq("empresa_id", empresa.id)

            .eq(columna, cambio.anterior).select("id");

          if (fallo) throw fallo;

          if (data?.length !== 1) throw new Error(`El precio de ${cambio.producto} cambió desde la vista previa. Recargá para evitar sobrescribirlo.`);

        } else {

          const { data, error: fallo } = await supabase.from("lista_productos")

            .update({ [columna]: cambio.nuevo }).eq("lista_id", cambio.listaId).eq("producto_id", cambio.productoId)

            .eq("visible", true).eq(columna, cambio.anterior).select("producto_id");

          if (fallo) throw fallo;

          if (data?.length !== 1) throw new Error(`No se pudo confirmar el precio de ${cambio.producto} en ${cambio.lista}. Recargá antes de reintentar.`);

        }

        aplicados++;

      }

      await cargar();

      setMensaje(`Se actualizaron correctamente ${aplicados} precios.`);

    } catch (e) {

      setError(`${e instanceof Error ? e.message : "Error al actualizar."} Se aplicaron ${aplicados} de ${cambios.length} cambios. Recargá y revisá los precios antes de volver a guardar.`);

      setConfirmando(false);

    } finally { setGuardando(false); }

  }



  return (

    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link href="/admin/productos" className="text-sm font-semibold text-[#2563EB] hover:underline">← Volver a Productos PRO</Link>

            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#2563EB]">Productos PRO</p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Actualización masiva de precios</h1>

            <p className="mt-2 text-sm text-slate-500">Un producto por fila. Elegí listas y precios antes de confirmar.</p>

          </div>

          <button type="button" onClick={() => void cargar()} disabled={guardando || cargando}

            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-50 disabled:opacity-50">↻ Actualizar productos</button>

        </header>



        {(errorEmpresa || error) && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorEmpresa || error}</div>}

        {mensaje && <div role="status" className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">✓ {mensaje}</div>}



        {(cargandoEmpresa || cargando) ? (

          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

            <p className="mt-4 text-sm text-slate-500">Cargando productos y listas...</p>

          </section>

        ) : (

          <>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <h2 className="text-xl font-bold">Configurar actualización</h2>

              <div className="mt-4 flex flex-wrap items-end gap-4">

                <label className="text-sm font-semibold">Operación

                  <select value={operacion} onChange={(e) => { setOperacion(e.target.value as typeof operacion); setConfirmando(false); }}

                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100">

                    <option value="aumentar">Aumentar</option><option value="disminuir">Disminuir</option>

                  </select>

                </label>

                <label className="text-sm font-semibold">Porcentaje (%)

                  <input type="text" inputMode="decimal" value={porcentaje} onChange={(e) => { setPorcentaje(e.target.value); setConfirmando(false); }}

                    className="mt-2 block w-32 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" />

                </label>

                <label className="min-w-52 flex-1 text-sm font-semibold">Buscar producto

                  <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setConfirmando(false); }} placeholder="Nombre del producto"

                    className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" />

                </label>

              </div>

              {!porcentajeValido && <p className="mt-3 text-sm font-semibold text-red-600">Ingresá un porcentaje mayor que 0 y hasta 100.</p>}

            </section>



            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">

                <div>

                  <h2 className="text-xl font-bold">Lista de productos</h2>

                  <p className="mt-1 text-xs text-slate-500">{visibles.length} producto(s) · {cambios.length} precio(s) para cambiar</p>

                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">

                  <input type="checkbox" checked={todosMarcados} onChange={(e) => seleccionarTodos(e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />Seleccionar todos los visibles

                </label>

              </div>

              <p className="px-5 pt-3 text-xs text-slate-500">Las listas aparecen dentro de cada producto. Si una está deshabilitada, el producto no tiene precios publicados en ella.</p>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] border-collapse text-sm">

                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    <tr><th className="px-3 py-3">Producto y precios actuales</th><th className="px-3 py-3">Listas para modificar</th><th className="px-3 py-3">Modificar</th><th className="px-3 py-3">Precios actualizados</th></tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {visibles.map((producto) => {

                      const disponibles = preciosPorProducto.get(producto.id) || [];

                      const activos = disponibles.filter((p) => {

                        const s = seleccionados[clave(producto.id, p.listaId)];

                        return !!s?.minorista || !!s?.mayorista;

                      });

                      const completo = disponibles.some((p) => p.minorista !== null || p.mayorista !== null) && disponibles.every((p) => {

                        const s = seleccionados[clave(producto.id, p.listaId)];

                        return (p.minorista === null || !!s?.minorista) && (p.mayorista === null || !!s?.mayorista);

                      });

                      const algunMinorista = activos.some((p) => !!seleccionados[clave(producto.id, p.listaId)]?.minorista);

                      const algunMayorista = activos.some((p) => !!seleccionados[clave(producto.id, p.listaId)]?.mayorista);

                      return (

                        <tr key={producto.id} className="align-middle transition hover:bg-slate-50">

                          <td className="px-3 py-2">

                            <div className="flex items-center gap-2">

                              <input type="checkbox" aria-label={`Seleccionar todas las listas y precios de ${producto.nombre}`}

                                title="Marcar ambos precios en todas las listas disponibles" disabled={!disponibles.some((p) => p.minorista !== null || p.mayorista !== null)}

                                checked={completo} onChange={(e) => cambiarProductoCompleto(producto.id, e.target.checked)}

                                className="h-4 w-4 shrink-0 accent-[#2563EB]" />

                              {producto.imaguen ? <img src={producto.imaguen} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover" />

                                : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">📦</span>}

                              <div className="min-w-0">

                                <p className="font-bold text-slate-800">{producto.nombre}</p>

                                <p className="text-xs text-slate-600">Minorista: {dinero(producto.precio)}</p>

                                <p className="text-xs text-slate-600">Mayorista: {dinero(producto.precio_mayorista)}</p>

                              </div>

                            </div>

                          </td>

                          <td className="px-3 py-2">

                            <div className="space-y-1.5">

                              {disponibles.map((p) => {

                                const s = seleccionados[clave(producto.id, p.listaId)];

                                const activo = !!s?.minorista || !!s?.mayorista;

                                const habilitado = p.minorista !== null || p.mayorista !== null;

                                return <label key={p.id} className={`flex items-center gap-2 text-xs font-medium ${habilitado ? "cursor-pointer" : "cursor-not-allowed text-slate-400"}`}>

                                  <input type="checkbox" disabled={!habilitado} checked={activo}

                                    onChange={(e) => cambiarListaProducto(producto.id, p, e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />

                                  <span className="truncate" title={habilitado ? p.nombre : `${p.nombre}: producto no publicado o sin precios`}>{p.nombre}</span>

                                </label>;

                              })}



                            </div>

                          </td>

                          <td className="px-3 py-2">

                            <div className="space-y-2">

                              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">

                                <input type="checkbox" disabled={!activos.some((p) => p.minorista !== null)} checked={algunMinorista}

                                  onChange={(e) => cambiarCampoProducto(producto.id, "minorista", e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />Minorista

                              </label>

                              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">

                                <input type="checkbox" disabled={!activos.some((p) => p.mayorista !== null)} checked={algunMayorista}

                                  onChange={(e) => cambiarCampoProducto(producto.id, "mayorista", e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />Mayorista

                              </label>

                            </div>

                          </td>

                          <td className="px-3 py-2">

                            <div className="space-y-1.5">

                              {activos.map((p) => {

                                const s = seleccionados[clave(producto.id, p.listaId)];

                                const minNuevo = p.minorista !== null && s?.minorista && porcentajeValido ? calcular(p.minorista) : p.minorista;

                                const mayNuevo = p.mayorista !== null && s?.mayorista && porcentajeValido ? calcular(p.mayorista) : p.mayorista;

                                return <div key={p.id} className="border-l-2 border-blue-200 pl-2 text-xs">

                                  <p className="font-semibold text-blue-700">{p.nombre}</p>

                                  <p className={s?.minorista && porcentajeValido ? "font-semibold text-green-700" : "text-slate-500"}>Minorista: {dinero(minNuevo)}</p>

                                  <p className={s?.mayorista && porcentajeValido ? "font-semibold text-green-700" : "text-slate-500"}>Mayorista: {dinero(mayNuevo)}</p>

                                </div>;

                              })}

                              {activos.length === 0 && <span className="text-xs text-slate-400">Seleccioná una lista</span>}

                            </div>

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>

              {visibles.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No hay productos que coincidan con la búsqueda.</p>}

            </section>



            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <h2 className="text-xl font-bold">Confirmación de precios</h2>

              <p className="mt-2 text-sm text-slate-600">Se modificarán <strong>{cambios.length}</strong> precios. No se cambiarán costos, stock ni otros campos.</p>

              {confirmando && <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">

                <p className="mb-2 font-bold">Revisá los cambios detallados:</p>

                {cambios.map((c) => <p key={`${c.clave}:${c.campo}`} className="border-b border-slate-100 py-1.5">{c.producto} · {c.lista} · {c.campo}: {dinero(c.anterior)} → <strong className="text-green-700">{dinero(c.nuevo)}</strong></p>)}

              </div>}

              <div className="mt-4 flex flex-wrap gap-3">

                {!confirmando ? <button type="button" disabled={!porcentajeValido || cambios.length === 0 || guardando} onClick={() => setConfirmando(true)}

                  className="rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Revisar y confirmar</button>

                  : <>

                    <button type="button" disabled={guardando} onClick={() => void guardar()}

                      className="rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50">{guardando ? "Actualizando..." : `Confirmar ${cambios.length} cambios`}</button>

                    <button type="button" disabled={guardando} onClick={() => setConfirmando(false)}

                      className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Volver a editar</button>

                  </>}

              </div>

              <p className="mt-4 text-xs text-amber-700">Importante: el guardado se realiza precio por precio. Si hay un error de conexión, algunos cambios podrían haberse aplicado; revisá el mensaje y recargá antes de reintentar.</p>

            </section>

          </>

        )}

      </div>

    </main>

  );

}
