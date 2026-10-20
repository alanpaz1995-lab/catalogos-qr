
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

import HeaderBibliotecaMultimedia from "@/components/productos/HeaderBibliotecaMultimedia";
import ResumenBibliotecaMultimedia from "@/components/productos/ResumenBibliotecaMultimedia";
import BuscadorBibliotecaMultimedia from "@/components/productos/BuscadorBibliotecaMultimedia";
import GridBibliotecaMultimedia, {
  type MultimediaBiblioteca,
} from "@/components/productos/GridBibliotecaMultimedia";

type ProductoResumen = {
  id: number;
  nombre: string;
};

export default function BibliotecaMultimediaPage() {
  const {
    empresa,
    cargandoEmpresa,
    errorEmpresa,
  } = useEmpresa();

  const empresaId = empresa?.id;

  const [multimedia, setMultimedia] =
    useState<MultimediaBiblioteca[]>([]);

  const [bibliotecaEmpresaId, setBibliotecaEmpresaId] =
    useState<number | null>(null);

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargarBiblioteca() {
      if (!empresaId) {
        setMultimedia([]);
        setBibliotecaEmpresaId(null);
        setCargando(false);
        return;
      }

      setCargando(true);
      setError("");
      setMultimedia([]);
      setBibliotecaEmpresaId(null);
      setBusqueda("");

      try {
        const {
          data: multimediaData,
          error: multimediaError,
        } = await supabase
          .from("producto_multimedia")
          .select("*")
          .eq("empresa_id", empresaId)
          .eq("activo", true)
          .order("created_at", {
            ascending: false,
          });

        if (multimediaError) {
          throw new Error(
            multimediaError.message
          );
        }

        if (!activo) return;

        const registros =
          (multimediaData || []) as Omit<
            MultimediaBiblioteca,
            "producto_nombre"
          >[];

        const productosIds = Array.from(
          new Set(
            registros.map(
              (item) => item.producto_id
            )
          )
        );

        let productos: ProductoResumen[] = [];

        if (productosIds.length > 0) {
          const {
            data: productosData,
            error: productosError,
          } = await supabase
            .from("productos")
            .select("id, nombre")
            .eq("empresa_id", empresaId)
            .in("id", productosIds);

          if (productosError) {
            throw new Error(
              productosError.message
            );
          }

          if (!activo) return;

          productos =
            (productosData || []) as ProductoResumen[];
        }

        const nombresProductos = new Map(
          productos.map((producto) => [
            producto.id,
            producto.nombre,
          ])
        );

        const registrosCompletos =
          registros.map((item) => ({
            ...item,
            producto_nombre:
              nombresProductos.get(
                item.producto_id
              ) || "Producto no encontrado",
          }));

        if (!activo) return;

        setMultimedia(registrosCompletos);
        setBibliotecaEmpresaId(empresaId);
      } catch (errorDesconocido) {
        if (!activo) return;

        console.error(
          "Error al cargar la biblioteca multimedia:",
          errorDesconocido
        );

        setMultimedia([]);
        setBibliotecaEmpresaId(null);

        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : "No se pudo cargar la biblioteca multimedia."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    if (!cargandoEmpresa) {
      cargarBiblioteca();
    }

    return () => {
      activo = false;
    };
  }, [empresaId, cargandoEmpresa]);

  const multimediaEmpresa = useMemo(() => {
    if (
      !empresaId ||
      bibliotecaEmpresaId !== empresaId
    ) {
      return [];
    }

    return multimedia;
  }, [
    multimedia,
    bibliotecaEmpresaId,
    empresaId,
  ]);

  const resultados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return multimediaEmpresa;
    }

    return multimediaEmpresa.filter((item) => {
      const nombreArchivo =
        item.nombre_archivo?.toLowerCase() || "";

      const producto =
        item.producto_nombre.toLowerCase();

      const descripcion =
        item.descripcion?.toLowerCase() || "";

      return (
        nombreArchivo.includes(texto) ||
        producto.includes(texto) ||
        descripcion.includes(texto)
      );
    });
  }, [busqueda, multimediaEmpresa]);

  const imagenesPrincipales = useMemo(
    () =>
      multimediaEmpresa.filter(
        (item) => item.es_principal
      ).length,
    [multimediaEmpresa]
  );

  const productosConImagenes = useMemo(
    () =>
      new Set(
        multimediaEmpresa.map(
          (item) => item.producto_id
        )
      ).size,
    [multimediaEmpresa]
  );

  const cargandoBiblioteca =
    cargandoEmpresa ||
    cargando ||
    Boolean(
      empresaId &&
      bibliotecaEmpresaId !== empresaId &&
      !error &&
      !errorEmpresa
    );

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <HeaderBibliotecaMultimedia
          totalImagenes={multimediaEmpresa.length}
        />

        {errorEmpresa && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            No se pudo cargar la empresa: {errorEmpresa}
          </div>
        )}

        {!cargandoEmpresa &&
          !errorEmpresa &&
          !empresaId && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
              No encontramos una empresa activa.
              Seleccioná un comercio para consultar
              su biblioteca multimedia.
            </div>
          )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <ResumenBibliotecaMultimedia
          totalImagenes={multimediaEmpresa.length}
          imagenesPrincipales={imagenesPrincipales}
          productosConImagenes={productosConImagenes}
          resultadosVisibles={resultados.length}
        />

        <BuscadorBibliotecaMultimedia
          valor={busqueda}
          onChange={setBusqueda}
        />

        <GridBibliotecaMultimedia
          items={resultados}
          cargando={cargandoBiblioteca}
          tieneBusqueda={
            busqueda.trim().length > 0
          }
        />
      </div>
    </main>
  );
}
