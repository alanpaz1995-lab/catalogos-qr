"use client";



import {

  useCallback,

  useEffect,

  useMemo,

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





type VistaProductos =

  | "lista"

  | "tarjetas";



export default function ProductosPage() {

  const {

    empresa,

    cargandoEmpresa,

    errorEmpresa,

  } = useEmpresa();



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



  return (

    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">

      <div className="mx-auto max-w-7xl space-y-8">

        <HeaderProductos

          totalProductos={

            productos.length

          }

          cargando={cargandoEmpresa || cargando}

          onActualizar={

            cargarProductos

          }

        />



        <ResumenProductos

          items={resumenItems}

        />



        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,290px)_auto] md:items-end">
            <label className="block text-sm font-semibold text-slate-800">
              Buscar producto
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre, categoría o descripción"
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