"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Empresa } from "@/types/empresa";
import { obtenerEmpresaActual } from "./obtenerEmpresaActual";

type EmpresaContextValue = {
  empresa: Empresa | null;
  cargandoEmpresa: boolean;
  errorEmpresa: string;
  recargarEmpresa: () => Promise<void>;
};

const EmpresaContext =
  createContext<EmpresaContextValue | null>(null);

export function EmpresaProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [empresa, setEmpresa] =
    useState<Empresa | null>(null);

  const [cargandoEmpresa, setCargandoEmpresa] =
    useState(true);

  const [errorEmpresa, setErrorEmpresa] =
    useState("");

  async function recargarEmpresa() {
    setCargandoEmpresa(true);
    setErrorEmpresa("");

    try {
      const empresaActual =
        await obtenerEmpresaActual();

      setEmpresa(empresaActual);
    } catch (errorDesconocido) {
      console.error(
        "Error al cargar la empresa actual:",
        errorDesconocido
      );

      setEmpresa(null);

      setErrorEmpresa(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo cargar la empresa."
      );
    } finally {
      setCargandoEmpresa(false);
    }
  }

  useEffect(() => {
    recargarEmpresa();
  }, []);

  const valor = useMemo(
    () => ({
      empresa,
      cargandoEmpresa,
      errorEmpresa,
      recargarEmpresa,
    }),
    [
      empresa,
      cargandoEmpresa,
      errorEmpresa,
    ]
  );

  return (
    <EmpresaContext.Provider value={valor}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const contexto = useContext(EmpresaContext);

  if (!contexto) {
    throw new Error(
      "useEmpresa debe utilizarse dentro de EmpresaProvider."
    );
  }

  return contexto;
}