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
  mercado_pago_suscripcion_id?: string | null;
  proximo_pago?: string | null;
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
  const [procesandoEmpresaId, setProcesandoEmpresaId] = useState<number | null>(null);
  const [empresaDetalle, setEmpresaDetalle] = useState<EmpresaSuscripcion | null>(null);

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
        "id, nombre, email, plan, estado_suscripcion, prueba_inicio, prueba_fin, suscripcion_activa, mercado_pago_suscripcion_id, proximo_pago"
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

  const ultimoPagoPorEmpresaId = useMemo(() => {
    const mapa = new Map<number, PagoSuscripcion>();

    for (const pago of pagos) {
      if (pago.estado.toLowerCase() !== "aprobado") {
        continue;
      }

      const actual = mapa.get(pago.empresa_id);

      if (
        !actual ||
        new Date(pago.fecha_pago).getTime() >
          new Date(actual.fecha_pago).getTime()
      ) {
        mapa.set(pago.empresa_id, pago);
      }
    }

    return mapa;
  }, [pagos]);


  async function actualizarEmpresa(
    empresaId: number,
    cambios: Partial<EmpresaSuscripcion> & {
      aviso_vencimiento_enviado?: boolean;
    }
  ) {
    setProcesandoEmpresaId(empresaId);
    setError("");

    const { error: errorActualizacion } = await supabase
      .from("empresas")
      .update(cambios)
      .eq("id", empresaId);

    if (errorActualizacion) {
      setError(
        `No se pudo actualizar la empresa: ${errorActualizacion.message}`
      );
      setProcesandoEmpresaId(null);
      return false;
    }

    await cargarSuperAdmin();
    setProcesandoEmpresaId(null);
    return true;
  }

  async function activarProfesional(empresa: EmpresaSuscripcion) {
    const confirmado = window.confirm(
      `ATENCIÓN: esta acción activará manualmente el Plan Profesional para ${empresa.nombre} SIN registrar ningún pago.\n\n¿Querés continuar?`
    );

    if (!confirmado) return;

    await actualizarEmpresa(empresa.id, {
      plan: "profesional",
      estado_suscripcion: "activa",
      suscripcion_activa: true,
    });
  }

  async function pausarSuscripcion(empresa: EmpresaSuscripcion) {
    const confirmado = window.confirm(
      `ATENCIÓN: esta acción pausará manualmente el acceso de ${empresa.nombre} dentro de ComerSys.\n\nNo cancela ningún débito ni suscripción en Mercado Pago.\n\n¿Querés continuar?`
    );

    if (!confirmado) return;

    await actualizarEmpresa(empresa.id, {
      estado_suscripcion: "pausada",
      suscripcion_activa: false,
    });
  }

  async function extenderPrueba(empresa: EmpresaSuscripcion) {
    const base =
      empresa.prueba_fin && new Date(empresa.prueba_fin).getTime() > Date.now()
        ? new Date(empresa.prueba_fin)
        : new Date();

    base.setDate(base.getDate() + 7);

    const confirmado = window.confirm(
      `ATENCIÓN: esta acción extenderá manualmente 7 días la prueba gratuita de ${empresa.nombre}.\n\nNo genera ningún cobro ni modifica Mercado Pago.\n\n¿Querés continuar?`
    );

    if (!confirmado) return;

    await actualizarEmpresa(empresa.id, {
      plan: "prueba",
      estado_suscripcion: "prueba",
      suscripcion_activa: false,
      prueba_inicio: empresa.prueba_inicio || new Date().toISOString(),
      prueba_fin: base.toISOString(),
      aviso_vencimiento_enviado: false,
    });
  }

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
                  <th className="px-6 py-4">Último pago</th>
                  <th className="px-6 py-4">Próximo pago</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
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
                    <td className="px-6 py-4">
                      {ultimoPagoPorEmpresaId.get(empresa.id) ? (
                        <div>
                          <p className="font-black text-green-700">
                            {formatearPrecio(
                              Number(
                                ultimoPagoPorEmpresaId.get(empresa.id)?.importe || 0
                              )
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatearFecha(
                              ultimoPagoPorEmpresaId.get(empresa.id)!.fecha_pago
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Sin pagos</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {empresa.proximo_pago ? formatearFecha(empresa.proximo_pago) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEmpresaDetalle(empresa)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                          Ver
                        </button>

                        {!empresa.suscripcion_activa ? (
                          <button
                            type="button"
                            onClick={() => activarProfesional(empresa)}
                            disabled={procesandoEmpresaId === empresa.id}
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Activar manualmente
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => pausarSuscripcion(empresa)}
                            disabled={procesandoEmpresaId === empresa.id}
                            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-white hover:bg-amber-600 disabled:opacity-50"
                          >
                            Pausar manualmente
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => extenderPrueba(empresa)}
                          disabled={procesandoEmpresaId === empresa.id}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Extender prueba +7 días
                        </button>
                      </div>
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

      {empresaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  Suscriptor
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {empresaDetalle.nombre}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {empresaDetalle.email || "Sin email"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEmpresaDetalle(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 font-black text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DatoDetalle titulo="Plan" valor={empresaDetalle.plan} />
              <DatoDetalle titulo="Estado" valor={empresaDetalle.estado_suscripcion} />
              <DatoDetalle
                titulo="Prueba hasta"
                valor={empresaDetalle.prueba_fin ? formatearFecha(empresaDetalle.prueba_fin) : "—"}
              />
              <DatoDetalle
                titulo="Próximo pago"
                valor={empresaDetalle.proximo_pago ? formatearFecha(empresaDetalle.proximo_pago) : "—"}
              />
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                ID suscripción Mercado Pago
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-700">
                {empresaDetalle.mercado_pago_suscripcion_id || "Todavía no vinculada"}
              </p>
            </div>

            {!empresaDetalle.suscripcion_activa ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                ⚠️ Activar manualmente habilita el Plan Profesional sin registrar ningún pago.
                Usalo solamente para cortesías, pruebas internas o casos especiales.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                ⚠️ Pausar manualmente solo bloquea el acceso dentro de ComerSys.
                No cancela cobros ni suscripciones en Mercado Pago.
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
              ℹ️ Extender prueba +7 días es una acción manual de cortesía.
              No genera cobros ni modifica la suscripción en Mercado Pago.
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {!empresaDetalle.suscripcion_activa ? (
                <button
                  type="button"
                  onClick={async () => {
                    await activarProfesional(empresaDetalle);
                    setEmpresaDetalle(null);
                  }}
                  className="rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                >
                  Activar manualmente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await pausarSuscripcion(empresaDetalle);
                    setEmpresaDetalle(null);
                  }}
                  className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white"
                >
                  Pausar manualmente
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  await extenderPrueba(empresaDetalle);
                  setEmpresaDetalle(null);
                }}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
              >
                Extender prueba +7 días
              </button>
            </div>
          </section>
        </div>
      )}
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

function DatoDetalle({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-2 font-black capitalize text-slate-800">
        {valor}
      </p>
    </div>
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