"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Producto = { id: number; catalogo_id: number; nombre: string; codigo: string | null; imagen_url: string | null; precio: number; precio_mayorista: number | null };
type Catalogo = { id: number; nombre: string };
type Campo = "precio" | "precio_mayorista";
type Seleccion = { precio: boolean; precio_mayorista: boolean };
type Cambio = { id: number; nombre: string; campo: Campo; anterior: number; nuevo: number };
const dinero = (numero: number | null) => numero === null ? "Sin precio" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(numero);
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function ActualizacionMasivaExternaPage() {
  const params = useParams();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const catalogoId = Number(idParam);
  const idValido = Number.isSafeInteger(catalogoId) && catalogoId > 0;
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [autorizado, setAutorizado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [operacion, setOperacion] = useState<"aumentar" | "disminuir">("aumentar");
  const [metodo, setMetodo] = useState<"porcentaje" | "importe">("porcentaje");
  const [cantidad, setCantidad] = useState("10");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Record<number, Seleccion>>({});
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modoOscuro, setModoOscuro] = useState(false);

  useEffect(() => {
    const aplicarTema = () => setModoOscuro(window.localStorage.getItem("comersys-modo-oscuro") === "true");
    aplicarTema();
    window.addEventListener("storage", aplicarTema);
    window.addEventListener("focus", aplicarTema);
    window.addEventListener("comersys-modo-oscuro-cambio", aplicarTema);
    return () => {
      window.removeEventListener("storage", aplicarTema);
      window.removeEventListener("focus", aplicarTema);
      window.removeEventListener("comersys-modo-oscuro-cambio", aplicarTema);
    };
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true); setError(""); setConfirmando(false); setSeleccion({});
    try {
      if (!idValido) throw new Error("El identificador del catálogo no es válido.");
      const { data: auth, error: errorAuth } = await supabase.auth.getUser();
      if (errorAuth || !auth.user) throw new Error("Iniciá sesión para continuar.");
      const [superadmin, propietario] = await Promise.all([
        supabase.from("superadmins").select("id").eq("auth_user_id", auth.user.id).eq("activo", true).maybeSingle(),
        supabase.from("empresas").select("id").eq("id", 1).eq("auth_user_id", auth.user.id).maybeSingle(),
      ]);
      if (superadmin.error) throw superadmin.error;
      if (propietario.error) throw propietario.error;
      if (!superadmin.data || !propietario.data) throw new Error("Acceso restringido al propietario de ComerSys.");
      setAutorizado(true);
      const { data: info, error: errorCatalogo } = await supabase.from("catalogos_externos")
        .select("id,nombre").eq("id", catalogoId).maybeSingle();
      if (errorCatalogo) throw errorCatalogo;
      if (!info) throw new Error("No se encontró este catálogo externo.");
      // Paginación para no limitar la actualización a los primeros 1000 productos.
      const todos: Producto[] = [];
      let offset = 0;
      while (true) {
        const { data, error: fallo } = await supabase.from("productos_externos")
          .select("id,catalogo_id,nombre,codigo,imagen_url,precio,precio_mayorista")
          .eq("catalogo_id", catalogoId).order("id", { ascending: true })
          .range(offset, offset + 499);
        if (fallo) throw fallo;
        todos.push(...((data || []) as Producto[]));
        if (!data || data.length < 500) break;
        offset += 500;
      }
      setCatalogo(info as Catalogo);
      setProductos(todos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los productos.");
    } finally { setCargando(false); }
  }, [catalogoId, idValido]);
  useEffect(() => { void cargar(); }, [cargar]);

  const numero = Number(cantidad.trim().replace(",", "."));
  const valorValido = cantidad.trim() !== "" && Number.isFinite(numero) && numero > 0 && (metodo !== "porcentaje" || numero <= 100);
  const calcular = (precio: number) => redondear(metodo === "porcentaje"
    ? precio * (1 + (operacion === "aumentar" ? 1 : -1) * numero / 100)
    : precio + (operacion === "aumentar" ? numero : -numero));
  const visibles = useMemo(() => productos.filter((p) => [p.nombre, p.codigo].some((s) => (s || "").toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es")))), [productos, busqueda]);
  const cambios = useMemo<Cambio[]>(() => {
    if (!valorValido) return [];
    const resultado: Cambio[] = [];
    for (const producto of productos) {
      const s = seleccion[producto.id];
      if (!s) continue;
      for (const campo of ["precio", "precio_mayorista"] as const) {
        const anterior = producto[campo];
        if (!s[campo] || anterior === null || !Number.isFinite(Number(anterior))) continue;
        const nuevo = calcular(Number(anterior));
        if (nuevo < 0 || !Number.isFinite(nuevo) || !Number.isSafeInteger(Math.round(nuevo * 100))) continue;
        if (nuevo !== Number(anterior)) resultado.push({ id: producto.id, nombre: producto.nombre, campo, anterior: Number(anterior), nuevo });
      }
    }
    return resultado;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, seleccion, numero, metodo, operacion, valorValido]);
  const invalidos = useMemo(() => valorValido && productos.some(p => {
    const s = seleccion[p.id];
    return (["precio", "precio_mayorista"] as const).some(campo => s?.[campo] && p[campo] !== null && calcular(Number(p[campo])) < 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [productos, seleccion, numero, metodo, operacion, valorValido]);
  const todosMarcados = visibles.length > 0 && visibles.every(p => !!seleccion[p.id]?.precio && (p.precio_mayorista === null || !!seleccion[p.id]?.precio_mayorista));
  function seleccionarTodos(marcar: boolean) {
    setConfirmando(false);
    setSeleccion(prev => {
      const siguiente = { ...prev };
      for (const p of visibles) siguiente[p.id] = { precio: marcar, precio_mayorista: marcar && p.precio_mayorista !== null };
      return siguiente;
    });
  }
  function seleccionarCampo(p: Producto, campo: Campo, marcar: boolean) {
    setConfirmando(false);
    setSeleccion(prev => ({ ...prev, [p.id]: { precio: prev[p.id]?.precio || false, precio_mayorista: prev[p.id]?.precio_mayorista || false, [campo]: marcar } }));
  }
  async function guardar() {
    if (!autorizado || guardando || !confirmando || !valorValido || invalidos || !cambios.length) return;
    setGuardando(true); setError(""); setMensaje("");
    let aplicados = 0;
    try {
      // Cada actualización valida catálogo, producto y precio previo para evitar cambios de otra pantalla.
      for (const cambio of cambios) {
        const { data, error: fallo } = await supabase.from("productos_externos")
          .update({ [cambio.campo]: cambio.nuevo, actualizado_en: new Date().toISOString() })
          .eq("id", cambio.id).eq("catalogo_id", catalogoId)
          .eq(cambio.campo, cambio.anterior).select("id");
        if (fallo) throw fallo;
        if (data?.length !== 1) throw new Error(`El precio de «${cambio.nombre}» cambió o no pudo actualizarse. Recargá los productos antes de reintentar.`);
        aplicados++;
      }
      await cargar();
      setMensaje(`Se actualizaron correctamente ${aplicados} precios del catálogo.`);
    } catch (e) {
      setConfirmando(false);
      setError(`${e instanceof Error ? e.message : "No se pudo guardar."} Se aplicaron ${aplicados} de ${cambios.length} cambios. Recargá y revisá los precios antes de volver a intentar.`);
    } finally { setGuardando(false); }
  }
  const pagina = modoOscuro ? "bg-black text-slate-100" : "bg-[#F8FAFC] text-slate-800";
  const tarjeta = modoOscuro ? "border-[#353535] bg-[#171717]" : "border-slate-200 bg-white";
  const campo = modoOscuro ? "border-[#454545] bg-[#252525] text-slate-100" : "border-slate-300 bg-white text-slate-800";
  const tenue = modoOscuro ? "text-slate-400" : "text-slate-500";
  const regresar = `/admin-comersys/catalogos-externos/${catalogoId}/productos`;
  if (cargando && !catalogo) return <main className={`min-h-screen p-8 ${pagina}`}>Cargando precios del catálogo...</main>;
  if (!autorizado || !catalogo) return <main className={`min-h-screen p-8 ${pagina}`}><h1 className="text-2xl font-bold">Acceso restringido</h1><p className="mt-3 text-red-500">{error || "No se encontró el catálogo."}</p><Link href="/admin-comersys/catalogos-externos" className="mt-5 block text-blue-500 underline">Volver</Link></main>;

  return <main className={`min-h-screen px-4 py-8 sm:px-8 ${pagina}`}><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><Link href={regresar} className="text-sm font-semibold text-blue-500">← Volver a productos · {catalogo.nombre}</Link>
        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-blue-500">Catálogos externos · Solo administración</p>
        <h1 className="mt-2 text-3xl font-black">Actualización masiva de precios</h1>
        <p className={`mt-2 text-sm ${tenue}`}>Los cambios afectan únicamente a los productos de {catalogo.nombre}.</p></div>
      <button type="button" disabled={cargando || guardando} onClick={() => void cargar()} className={`rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50 ${tarjeta}`}>↻ Actualizar productos</button>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-500 bg-red-950/30 p-4 text-red-400">{error}</div>}
    {mensaje && <div role="status" className="rounded-xl border border-green-500 p-4 text-green-500">✓ {mensaje}</div>}
    <section className={`rounded-3xl border p-5 sm:p-6 ${tarjeta}`}><h2 className="text-xl font-bold">Configurar actualización</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[160px_180px_160px_1fr]">
        <label className="text-sm font-semibold">Operación<select disabled={guardando} value={operacion} onChange={e => {setOperacion(e.target.value as typeof operacion);setConfirmando(false);}} className={`mt-2 w-full rounded-xl border p-3 ${campo}`}><option value="aumentar">Aumentar</option><option value="disminuir">Disminuir</option></select></label>
        <label className="text-sm font-semibold">Método<select disabled={guardando} value={metodo} onChange={e => {setMetodo(e.target.value as typeof metodo);setConfirmando(false);}} className={`mt-2 w-full rounded-xl border p-3 ${campo}`}><option value="porcentaje">Porcentaje (%)</option><option value="importe">Importe fijo ($)</option></select></label>
        <label className="text-sm font-semibold">{metodo === "porcentaje" ? "Porcentaje (%)" : "Importe ($)"}<input disabled={guardando} inputMode="decimal" value={cantidad} onChange={e => {setCantidad(e.target.value);setConfirmando(false);}} className={`mt-2 w-full rounded-xl border p-3 ${campo}`} /></label>
        <label className="text-sm font-semibold">Buscar producto<input disabled={guardando} value={busqueda} placeholder="Nombre o código" onChange={e => setBusqueda(e.target.value)} className={`mt-2 w-full rounded-xl border p-3 ${campo}`} /></label>
      </div>
      {!valorValido && <p className="mt-3 text-sm font-semibold text-red-500">Ingresá un importe mayor a 0{metodo === "porcentaje" ? " y un porcentaje de hasta 100" : ""}.</p>}
      {invalidos && <p className="mt-3 text-sm font-semibold text-red-500">La disminución dejaría algún precio por debajo de $0. Reducí el importe o desmarcá esos precios.</p>}
    </section>
    <section className={`overflow-hidden rounded-3xl border ${tarjeta}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-500/20 px-5 py-4"><div><h2 className="text-xl font-bold">Lista de productos</h2><p className={`mt-1 text-xs ${tenue}`}>{visibles.length} visibles de {productos.length} · {cambios.length} precios para modificar</p></div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-500/40 px-3 py-2 text-sm font-semibold text-blue-500"><input type="checkbox" disabled={guardando} checked={todosMarcados} onChange={e => seleccionarTodos(e.target.checked)} /> Seleccionar todos los visibles</label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-500/20 text-xs uppercase"><tr><th className="px-4 py-3">Producto y precios actuales</th><th className="px-4 py-3">Modificar</th><th className="px-4 py-3">Precios actualizados (vista previa)</th></tr></thead><tbody className="divide-y divide-slate-500/20">
        {visibles.map(p => { const s=seleccion[p.id]; const min=!!s?.precio; const may=!!s?.precio_mayorista && p.precio_mayorista !== null;
          return <tr key={p.id} className="align-middle"><td className="px-4 py-3"><div className="flex items-center gap-3"><input disabled={guardando} type="checkbox" aria-label={`Seleccionar precios de ${p.nombre}`} checked={min && (p.precio_mayorista===null || may)} onChange={e => {setConfirmando(false);setSeleccion(prev=>({...prev,[p.id]:{precio:e.target.checked,precio_mayorista:e.target.checked && p.precio_mayorista !== null}}));}} />{p.imagen_url ? <img src={p.imagen_url} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="text-2xl">📦</span>}<div><p className="font-bold">{p.nombre}</p>{p.codigo && <p className={`text-xs ${tenue}`}>Código: {p.codigo}</p>}<p className={`text-xs ${tenue}`}>Minorista: {dinero(Number(p.precio))}</p><p className={`text-xs ${tenue}`}>Mayorista: {dinero(p.precio_mayorista)}</p></div></div></td>
          <td className="px-4 py-3"><div className="space-y-2"><label className="flex items-center gap-2 text-xs"><input disabled={guardando} type="checkbox" checked={min} onChange={e => seleccionarCampo(p,"precio",e.target.checked)} /> Minorista</label><label className="flex items-center gap-2 text-xs"><input disabled={guardando || p.precio_mayorista===null} type="checkbox" checked={may} onChange={e => seleccionarCampo(p,"precio_mayorista",e.target.checked)} /> Mayorista</label></div></td>
          <td className="px-4 py-3"><p className={min && valorValido ? "font-semibold text-green-500" : tenue}>Minorista: {dinero(min && valorValido ? calcular(Number(p.precio)) : Number(p.precio))}</p><p className={may && valorValido ? "font-semibold text-green-500" : tenue}>Mayorista: {dinero(may && valorValido ? calcular(Number(p.precio_mayorista)) : p.precio_mayorista)}</p></td></tr>;})}
      </tbody></table></div>{visibles.length===0 && <p className={`p-8 text-center ${tenue}`}>No se encontraron productos.</p>}
    </section>
    <section className={`rounded-3xl border p-5 sm:p-6 ${tarjeta}`}><h2 className="text-xl font-bold">Confirmación de precios</h2><p className={`mt-2 text-sm ${tenue}`}>Se modificarán <strong>{cambios.length}</strong> precios. No se cambiarán costos, stock ni otros valores comerciales.</p>
      {confirmando && <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-slate-500/20 p-4 text-xs"><p className="mb-3 font-bold">Revisá cada cambio:</p>{cambios.map(c => <p key={`${c.id}-${c.campo}`} className="border-b border-slate-500/20 py-1.5">{c.nombre} · {c.campo === "precio" ? "Minorista" : "Mayorista"}: {dinero(c.anterior)} → <strong className="text-green-500">{dinero(c.nuevo)}</strong></p>)}</div>}
      <div className="mt-4 flex flex-wrap gap-3">{!confirmando ? <button type="button" disabled={!valorValido || invalidos || cambios.length===0 || guardando || cargando} onClick={()=>setConfirmando(true)} className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">Revisar y confirmar</button> : <><button type="button" disabled={guardando || !valorValido || invalidos} onClick={()=>void guardar()} className="rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Actualizando..." : `Confirmar ${cambios.length} cambios`}</button><button type="button" disabled={guardando} onClick={()=>setConfirmando(false)} className={`rounded-xl border px-6 py-3 text-sm font-bold ${tarjeta}`}>Volver a editar</button></>}</div>
      <p className="mt-4 text-xs text-amber-500">Importante: el guardado se realiza precio por precio. Si hay una interrupción, pueden aplicarse solo algunos cambios. En ese caso, recargá y revisá los valores antes de reintentar.</p>
    </section>
  </div></main>;
}
