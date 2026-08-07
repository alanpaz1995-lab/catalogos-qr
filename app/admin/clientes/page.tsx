"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useEmpresa } from "@/lib/empresa/EmpresaProvider";

type ClienteResumen = {
  id: number;
  empresa_id: number;
  nombre: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  cantidad_pedidos: number;
  total_comprado: number;
  total_pagado: number;
  saldo_pendiente: number;
  ultima_compra?: string | null;
};


export default function ClientesPage() {
  const {
    empresa,
    cargandoEmpresa,
    errorEmpresa,
  } = useEmpresa();

  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<
    "Todos" | "Con deuda" | "Sin deuda" | "Inactivos"
  >("Todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!empresa?.id) return;

    cargarClientes();
  }, [empresa?.id]);

  async function cargarClientes() {
    if (!empresa?.id) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    const { data, error: errorConsulta } = await supabase
      .from("clientes_resumen")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("nombre", { ascending: true });

    if (errorConsulta) {
      console.error("Error al cargar clientes:", errorConsulta);
      setError(
        `No se pudieron cargar los clientes: ${errorConsulta.message}`
      );
      setCargando(false);
      return;
    }

    setClientes((data as ClienteResumen[]) || []);
    setCargando(false);
  }

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const coincideBusqueda =
        cliente.nombre.toLowerCase().includes(texto) ||
        cliente.telefono.toLowerCase().includes(texto) ||
        (cliente.email || "").toLowerCase().includes(texto) ||
        (cliente.direccion || "").toLowerCase().includes(texto);

      const saldo = Number(cliente.saldo_pendiente || 0);

      const coincideFiltro =
        filtro === "Todos" ||
        (filtro === "Con deuda" && cliente.activo && saldo > 0) ||
        (filtro === "Sin deuda" && cliente.activo && saldo <= 0) ||
        (filtro === "Inactivos" && !cliente.activo);

      return coincideBusqueda && coincideFiltro;
    });
  }, [clientes, busqueda, filtro]);

  const resumen = useMemo(() => {
    const clientesActivos = clientes.filter((cliente) => cliente.activo);

    return {
      totalClientes: clientesActivos.length,
      conDeuda: clientesActivos.filter(
        (cliente) => Number(cliente.saldo_pendiente || 0) > 0
      ).length,
      saldoTotal: clientesActivos.reduce(
        (total, cliente) =>
          total + Number(cliente.saldo_pendiente || 0),
        0
      ),
      totalComprado: clientesActivos.reduce(
        (total, cliente) =>
          total + Number(cliente.total_comprado || 0),
        0
      ),
    };
  }, [clientes]);

  function formatearPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(precio);
  }

  function formatearFecha(fecha?: string | null) {
    if (!fecha) return "Sin compras";

    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(fecha));
  }

  function estadoCuenta(cliente: ClienteResumen) {
    if (!cliente.activo) {
      return {
        texto: "Inactivo",
        clases: "bg-slate-100 text-slate-600",
      };
    }

    if (Number(cliente.saldo_pendiente || 0) > 0) {
      return {
        texto: "Con saldo pendiente",
        clases: "bg-red-100 text-red-700",
      };
    }

    if (Number(cliente.cantidad_pedidos || 0) === 0) {
      return {
        texto: "Sin pedidos",
        clases: "bg-amber-100 text-amber-700",
      };
    }

    return {
      texto: "Cuenta al día",
      clases: "bg-green-100 text-green-700",
    };
  }

  if (cargandoEmpresa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p className="mt-4 text-slate-500">
            Cargando empresa...
          </p>
        </div>
      </main>
    );
  }

  if (errorEmpresa || !empresa?.id) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8 text-[#1E293B]">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            No se pudo cargar la empresa
          </h1>
          <p className="mt-3 text-red-600">
            {errorEmpresa ||
              "No encontramos la empresa asociada a tu cuenta."}
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-[#2563EB] px-5 py-3 font-semibold text-white"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
            Administración
          </p>

          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                Clientes PRO
              </h1>

              <p className="mt-2 max-w-2xl text-slate-500">
                Buscá un cliente y accedé a sus compras, pagos y
                estado de cuenta desde un solo lugar.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarClientes}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Clientes activos
            </p>
            <p className="mt-2 text-3xl font-bold">
              {resumen.totalClientes}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm text-red-700">
              Clientes con deuda
            </p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {resumen.conDeuda}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm text-amber-700">
              Saldo total pendiente
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {formatearPrecio(resumen.saldoTotal)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total histórico comprado
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatearPrecio(resumen.totalComprado)}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <div>
              <label
                htmlFor="buscar-cliente"
                className="mb-2 block text-sm font-semibold"
              >
                Buscar cliente
              </label>

              <input
                id="buscar-cliente"
                type="search"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Nombre, teléfono, email o dirección..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="filtro-clientes"
                className="mb-2 block text-sm font-semibold"
              >
                Estado de cuenta
              </label>

              <select
                id="filtro-clientes"
                value={filtro}
                onChange={(event) =>
                  setFiltro(
                    event.target.value as
                      | "Todos"
                      | "Con deuda"
                      | "Sin deuda"
                      | "Inactivos"
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              >
                <option value="Todos">Todos</option>
                <option value="Con deuda">Con deuda</option>
                <option value="Sin deuda">Sin deuda</option>
                <option value="Inactivos">Inactivos</option>
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Lista de clientes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {clientesFiltrados.length} cliente(s) encontrados
              </p>
            </div>
          </div>

          {cargando ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
              <p className="mt-4 text-slate-500">
                Cargando clientes...
              </p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-slate-700">
                No encontramos clientes
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Probá con otra búsqueda o cambiá el filtro.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clientesFiltrados.map((cliente) => {
                const estado = estadoCuenta(cliente);

                return (
                  <article
                    key={cliente.id}
                    className="p-6 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-[#2563EB]">
                            {cliente.nombre
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <h3 className="text-xl font-bold">
                              {cliente.nombre}
                            </h3>

                            <span
                              className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${estado.clases}`}
                            >
                              {estado.texto}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Teléfono
                            </p>
                            <p className="mt-1 font-medium">
                              {cliente.telefono}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Dirección
                            </p>
                            <p className="mt-1 font-medium">
                              {cliente.direccion ||
                                "No informada"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Pedidos
                            </p>
                            <p className="mt-1 font-medium">
                              {Number(
                                cliente.cantidad_pedidos || 0
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Última compra
                            </p>
                            <p className="mt-1 font-medium">
                              {formatearFecha(
                                cliente.ultima_compra
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Comprado
                          </p>
                          <p className="mt-2 font-bold">
                            {formatearPrecio(
                              Number(
                                cliente.total_comprado || 0
                              )
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-green-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                            Pagado
                          </p>
                          <p className="mt-2 font-bold text-green-700">
                            {formatearPrecio(
                              Number(
                                cliente.total_pagado || 0
                              )
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-amber-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                            Pendiente
                          </p>
                          <p className="mt-2 font-bold text-amber-700">
                            {formatearPrecio(
                              Number(
                                cliente.saldo_pendiente || 0
                              )
                            )}
                          </p>
                        </div>

                        <Link
                          href={`/admin/clientes/${cliente.id}`}
                          className="rounded-xl bg-[#2563EB] px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700 sm:col-span-3"
                        >
                          Ver ficha completa
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}