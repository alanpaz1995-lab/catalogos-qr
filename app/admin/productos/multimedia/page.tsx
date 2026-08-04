"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

import HeaderBibliotecaMultimedia from "@/components/productos/HeaderBibliotecaMultimedia";
import ResumenBibliotecaMultimedia from "@/components/productos/ResumenBibliotecaMultimedia";
import BuscadorBibliotecaMultimedia from "@/components/productos/BuscadorBibliotecaMultimedia";
import GridBibliotecaMultimedia, {
  type MultimediaBiblioteca,
} from "@/components/productos/GridBibliotecaMultimedia";

const EMPRESA_ID = 1;

type ProductoResumen = {
  id: number;
  nombre: string;
};

export default function BibliotecaMultimediaPage() {
  const [multimedia, setMultimedia] =
    useState<MultimediaBiblioteca[]>([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const cargarBiblioteca =
    useCallback(async () => {
      setCargando(true);
      setError("");

      try {
        const {
          data: multimediaData,
          error: multimediaError,
        } = await supabase
          .from("producto_multimedia")
          .select("*")
          .eq("empresa_id", EMPRESA_ID)
          .eq("activo", true)
          .order("created_at", {
            ascending: false,
          });

        if (multimediaError) {
          throw new Error(
            multimediaError.message
          );
        }

        const registros =
          (multimediaData || []) as Omit<
            MultimediaBiblioteca,
            "producto_nombre"
          >[];

        const productosIds = Array.from(
          new Set(
            registros.map(
              (item) =>
                item.producto_id
            )
          )
        );

        let productos: ProductoResumen[] =
          [];

        if (productosIds.length > 0) {
          const {
            data: productosData,
            error: productosError,
          } = await supabase
            .from("productos")
            .select("id, nombre")
            .eq(
              "empresa_id",
              EMPRESA_ID
            )
            .in("id", productosIds);

          if (productosError) {
            throw new Error(
              productosError.message
            );
          }

          productos =
            (productosData ||
              []) as ProductoResumen[];
        }

        const nombresProductos =
          new Map(
            productos.map(
              (producto) => [
                producto.id,
                producto.nombre,
              ]
            )
          );

        const registrosCompletos =
          registros.map(
            (item) => ({
              ...item,
              producto_nombre:
                nombresProductos.get(
                  item.producto_id
                ) ||
                "Producto no encontrado",
            })
          );

        setMultimedia(
          registrosCompletos
        );
      } catch (
        errorDesconocido
      ) {
        console.error(
          "Error al cargar la biblioteca multimedia:",
          errorDesconocido
        );

        setError(
          errorDesconocido instanceof
            Error
            ? errorDesconocido.message
            : "No se pudo cargar la biblioteca multimedia."
        );
      } finally {
        setCargando(false);
      }
    }, []);

  useEffect(() => {
    cargarBiblioteca();
  }, [cargarBiblioteca]);

  const resultados = useMemo(() => {
    const texto =
      busqueda
        .trim()
        .toLowerCase();

    if (!texto) {
      return multimedia;
    }

    return multimedia.filter(
      (item) => {
        const nombreArchivo =
          item.nombre_archivo
            ?.toLowerCase() || "";

        const producto =
          item.producto_nombre.toLowerCase();

        const descripcion =
          item.descripcion
            ?.toLowerCase() || "";

        return (
          nombreArchivo.includes(
            texto
          ) ||
          producto.includes(texto) ||
          descripcion.includes(texto)
        );
      }
    );
  }, [busqueda, multimedia]);

  const imagenesPrincipales =
    useMemo(
      () =>
        multimedia.filter(
          (item) =>
            item.es_principal
        ).length,
      [multimedia]
    );

  const productosConImagenes =
    useMemo(
      () =>
        new Set(
          multimedia.map(
            (item) =>
              item.producto_id
          )
        ).size,
      [multimedia]
    );

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <HeaderBibliotecaMultimedia
          totalImagenes={
            multimedia.length
          }
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <ResumenBibliotecaMultimedia
          totalImagenes={
            multimedia.length
          }
          imagenesPrincipales={
            imagenesPrincipales
          }
          productosConImagenes={
            productosConImagenes
          }
          resultadosVisibles={
            resultados.length
          }
        />

        <BuscadorBibliotecaMultimedia
          valor={busqueda}
          onChange={setBusqueda}
        />

        <GridBibliotecaMultimedia
          items={resultados}
          cargando={cargando}
          tieneBusqueda={
            busqueda.trim().length > 0
          }
        />
      </div>
    </main>
  );
}