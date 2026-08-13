"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EmpresaSuscripcion = {
  id: number;
  nombre: string;
  email?: string | null;
  plan: string;
  estado_suscripcion: string;
  prueba_inicio?: string | null;
  prueba_fin?: string | null;
  suscripcion_activa: boolean;
};

type PagoSuscripcion = {
  id: number;
  empresa_id: number;
  importe: number;
  fecha_pago: string;
  periodo: string;
  estado: string;
  medio_pago?: string | null;
  referencia_pago?: string | null;
};

export default function SuperAdminComerSysPage() {
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [error, setError] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaSuscripcion[]>([]);
  const [pagos, setPagos] = useState<PagoSuscripcion[]>([]);

  useEffect(() => {
    cargarSuperAdmin();
  }, []);

  async function cargarSuperAdmin() {
    setCargando(true);
    setError("");

    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
      setError("Tu sesión no está activa.");
      setCargando(false);
      return;
    }

    const { data: superadmin, error: errorSuperadmin } = await supabase
      .from("superadmins")
      .select("id, activo")
      .eq("auth_user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorSuperadmin) {
      setError(`No se pudo verificar el acceso: ${errorSuperadmin.message}`);
      setCargando(false);
      return;
    }

    if (!superadmin) {
      setAutorizado(false);
      setCargando(false);
      return;
    }

    setAutorizado(true);

    const { data: empresasData, error: errorEmpresas } = await supabase
      .from("empresas")
      .select(
        "id, nombre, email, plan, estado_suscripcion, prueba_inicio, prueba_fin, suscripcion_activa"
      )
      .order("created_at", { ascending: false });

    if (errorEmpresas) {
      setError(`No se pudieron cargar los suscriptores: ${errorEmpresas.message}`);
      setCargando(false);
      return;
    }

    const empresasCargadas =
      (empresasData as EmpresaSuscripcion[]) || [];

    setEmpresas(empresasCargadas);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data: pagosData, error: errorPagos } = await supabase
      .from("pagos_suscripcion")
      .select(
        "id, empresa_id, importe, fecha_pago, periodo, estado, medio_pago, referencia_pago"
      )
      .gte("fecha_pago", inicioMes.toISOString())
      .order("fecha_pago", { ascending: false });

    if (errorPagos) {
      setError(
        `No se pudieron cargar los pagos: ${errorPagos.message}`
      );
      setCargando(false);
      return;
    }

    setPagos((pagosData as PagoSuscripcion[]) || []);
    setCargando(false);
  }

  const resumen = useMemo(() => {
    const suscriptoresActivos = empresas.filter(
      (empresa) => empresa.plan === "profesional" && empresa.suscripcion_activa
    ).length;

    const pruebasActivas = empresas.filter((empresa) => {
      if (empresa.plan !== "prueba" || !empresa.prueba_fin) return false;
      return new Date(empresa.prueba_fin).getTime() > Date.now();
    }).length;

    const pendientes = empresas.filter(
      (empresa) => empresa.plan === "profesional" && !empresa.suscripcion_activa
    ).length;

    return {
      suscriptoresActivos,
      pruebasActivas,
      pendientes,
      totalEmpresas: empresas.length,
    };
  }, [empresas]);

  const resumenPagos = useMemo(() => {
    const aprobados = pagos.filter(
      (pago) => pago.estado.toLowerCase() === "aprobado"
    );

    return {
      cantidad: aprobados.length,
      total: aprobados.reduce(
        (acumulado, pago) => acumulado + Number(pago.importe),
        0
      ),
    };
  }, [pagos]);

  const nombreEmpresaPorId = useMemo(() => {
    return new Map(
      empresas.map((empresa) => [empresa.id, empresa.nombre])
    );
  }, [empresas]);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
          <p className="mt-4 font-semibold text-slate-500">
            Cargando SuperAdmin de ComerSys...
          </p>
        </div>
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <section className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-5 text-3xl font-black">Acceso restringido</h1>
          <p className="mt-3 text-slate-500">
            Esta sección está disponible únicamente para el SuperAdmin de ComerSys.
          </p>

          {error && (
            <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <Link
            href="/admin"
            className="mt-7 inline-flex rounded-xl bg-[#2563EB] px-6 py-3 font-black text-white"
          >
            Volver
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-5 text-[#1E293B] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl bg-gradient-to-r from-[#0868F7] via-[#4C49F4] to-[#7412F4] p-7 text-white shadow-lg">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">
                Control privado
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                SuperAdmin ComerSys
              </h1>
              <p className="mt-2 text-blue-100">
                Control simple de suscriptores y pagos.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarSuperAdmin}
              className="rounded-xl bg-white px-5 py-3 font-black text-slate-900 shadow-md"
            >
              Actualizar
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPI titulo="Suscriptores activos" valor={resumen.suscriptoresActivos} detalle="Plan Profesional activo" icono="✅" />
          <KPI titulo="Pruebas activas" valor={resumen.pruebasActivas} detalle="Dentro de los 7 días" icono="🎁" />
          <KPI titulo="Pendientes de pago" valor={resumen.pendientes} detalle="Profesional sin activar" icono="⏳" />
          <KPI titulo="Empresas registradas" valor={resumen.totalEmpresas} detalle="Total en ComerSys" icono="🏪" />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black">Suscriptores y pruebas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Estado actual de las empresas registradas en ComerSys.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Negocio</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fin de prueba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empresas.map((empresa) => (
                  <tr key={empresa.id}>
                    <td className="px-6 py-4">
                      <p className="font-black">{empresa.nombre}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {empresa.email || "Sin email"}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-semibold capitalize">
                      {empresa.plan}
                    </td>
                    <td className="px-6 py-4">
                      <EstadoSuscripcion empresa={empresa} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {empresa.prueba_fin ? formatearFecha(empresa.prueba_fin) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Pagos recibidos este mes
            </p>
            <p className="mt-2 text-4xl font-black">
              {resumenPagos.cantidad}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Pagos aprobados
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Total recaudado este mes
            </p>
            <p className="mt-2 text-4xl font-black text-green-700">
              {formatearPrecio(resumenPagos.total)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Suscripciones cobradas
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black">
              Pagos del mes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fecha, negocio, importe y medio de pago de cada suscripción.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Negocio</th>
                  <th className="px-6 py-4">Importe</th>
                  <th className="px-6 py-4">Medio</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td className="px-6 py-4 text-slate-600">
                      {formatearFecha(pago.fecha_pago)}
                    </td>
                    <td className="px-6 py-4 font-black">
                      {nombreEmpresaPorId.get(pago.empresa_id) ||
                        `Empresa #${pago.empresa_id}`}
                    </td>
                    <td className="px-6 py-4 font-black">
                      {formatearPrecio(Number(pago.importe))}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {pago.medio_pago || "Sin informar"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          pago.estado.toLowerCase() === "aprobado"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {pago.estado}
                      </span>
                    </td>
                  </tr>
                ))}

                {pagos.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      Todavía no hay pagos registrados este mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            Cuenta de destino
          </h2>
          <p className="mt-2 text-slate-500">
            Cuando conectemos el proveedor de pagos mostraremos acá la cuenta
            donde se depositan las suscripciones, sin guardar datos sensibles
            de tarjetas.
          </p>
        </section>
      </div>
    </main>
  );
}

function KPI({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  icono: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{titulo}</p>
          <p className="mt-2 text-3xl font-black">{valor}</p>
          <p className="mt-2 text-xs text-slate-400">{detalle}</p>
        </div>
        <span className="text-3xl">{icono}</span>
      </div>
    </article>
  );
}

function EstadoSuscripcion({ empresa }: { empresa: EmpresaSuscripcion }) {
  if (empresa.suscripcion_activa) {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
        Activa
      </span>
    );
  }

  if (empresa.plan === "prueba" && empresa.prueba_fin) {
    const vencida = new Date(empresa.prueba_fin).getTime() <= Date.now();

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          vencida
            ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        {vencida ? "Prueba vencida" : "En prueba"}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
      Pendiente
    </span>
  );
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fecha));
}

function formatearPrecio(importe: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(importe);
}