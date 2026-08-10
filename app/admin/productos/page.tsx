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
import FiltrosProductos, {
  type FiltroProducto,
} from "@/components/productos/FiltrosProductos";
import TablaProductos, {
  type CampoBooleanoProducto,
  type ProductoListado,
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

  const [productos, setProductos] =
    useState<ProductoListado[]>([]);
  const [busqueda, setBusqueda] =
    useState("");
  const [filtro, setFiltro] =
    useState<FiltroProducto>("Todos");
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

  const cargarProductos =
    useCallback(async () => {
      if (!empresa?.id) return;

      setCargando(true);
      setError("");

      const [
        { data, error: errorConsulta },
        { data: categoriasData, error: categoriasError },
      ] = await Promise.all([
        supabase
          .from("productos")
          .select("*")
          .eq("empresa_id", empresa.id)
          .order("id", {
            ascending: false,
          }),
        supabase
          .from("categorias")
          .select("nombre, orden")
          .eq("empresa_id", empresa.id)
          .order("orden", { ascending: true })
          .order("nombre", { ascending: true }),
      ]);

      if (errorConsulta) {
        console.error(
          "Error al cargar productos:",
          errorConsulta
        );

        setError(
          `No se pudieron cargar los productos: ${errorConsulta.message}`
        );

        setCargando(false);
        return;
      }

      if (categoriasError) {
        console.error(
          "Error al cargar categorías:",
          categoriasError
        );

        setError(
          `No se pudieron cargar las categorías: ${categoriasError.message}`
        );

        setCargando(false);
        return;
      }

      const productosCargados =
        (data as ProductoListado[]) || [];

      const ordenCategorias = new Map(
        (
          (categoriasData as Array<{
            nombre: string;
            orden?: number | null;
          }>) || []
        ).map((categoria, indice) => [
          categoria.nombre,
          Number(categoria.orden ?? indice + 1),
        ])
      );

      setProductos(
        [...productosCargados].sort((a, b) => {
          const ordenA =
            ordenCategorias.get(a.categoria || "") ??
            Number.MAX_SAFE_INTEGER;
          const ordenB =
            ordenCategorias.get(b.categoria || "") ??
            Number.MAX_SAFE_INTEGER;

          if (ordenA !== ordenB) {
            return ordenA - ordenB;
          }

          return b.id - a.id;
        })
      );

      setCargando(false);
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

          const stockBajo =
            Number(producto.stock) <=
            Number(
              producto.stock_minimo
            );

          const coincideFiltro =
            filtro === "Todos" ||
            (filtro === "Stock bajo" &&
              producto.estado ===
                "Activo" &&
              stockBajo) ||
            (filtro === "Nuevos" &&
              producto.estado ===
                "Activo" &&
              producto.nuevo_ingreso) ||
            (filtro === "Ofertas" &&
              producto.estado ===
                "Activo" &&
              producto.oferta) ||
            (filtro ===
              "Destacados" &&
              producto.estado ===
                "Activo" &&
              producto.destacado) ||
            (filtro === "Ocultos" &&
              producto.estado ===
                "Activo" &&
              !producto.visible_catalogo) ||
            (filtro === "Inactivos" &&
              producto.estado !==
                "Activo");

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

        <FiltrosProductos
          busqueda={busqueda}
          filtro={filtro}
          cargando={cargandoEmpresa || cargando}
          vista={vista}
          onBusqueda={setBusqueda}
          onFiltro={setFiltro}
          onVista={cambiarVista}
          onActualizar={
            cargarProductos
          }
        />

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
  productos,
  cargando,
  actualizandoId,
  eliminandoId,
  onActualizarCampo,
  onCambiarEstado,
  onEliminar,
}: {
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

      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {productos.map((producto) => (
          <TarjetaProducto
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