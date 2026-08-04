"use client";

export type AlertaDashboard = {
  id: string;
  titulo: string;
  descripcion: string;
  tipo?: "error" | "warning" | "info" | "success";
};

type AlertsPanelProps = {
  alertas: AlertaDashboard[];
};

export default function AlertsPanel({ alertas }: AlertsPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          Alertas
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Requieren atención
        </h2>
      </div>

      {alertas.length === 0 ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">
          ✅ No hay alertas pendientes.
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => (
            <Item key={a.id} {...a} />
          ))}
        </div>
      )}
    </section>
  );
}

function Item({ titulo, descripcion, tipo = "info" }: AlertaDashboard) {
  const estilos = {
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-green-200 bg-green-50 text-green-700",
  };

  const iconos = {
    error: "⛔",
    warning: "⚠️",
    info: "ℹ️",
    success: "✅",
  };

  return (
    <article className={`rounded-2xl border p-4 ${estilos[tipo]}`}>
      <div className="flex gap-3">
        <div className="text-2xl">{iconos[tipo]}</div>
        <div>
          <h3 className="font-bold">{titulo}</h3>
          <p className="mt-1 text-sm opacity-90">{descripcion}</p>
        </div>
      </div>
    </article>
  );
}