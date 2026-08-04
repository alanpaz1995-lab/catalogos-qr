"use client";

export type ActividadReciente={
  id:string;
  titulo:string;
  descripcion:string;
  fecha:string;
  icono?:string;
};

type Props={actividades:ActividadReciente[]};

export default function RecentActivity({actividades}:Props){
  return(
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">Actividad reciente</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Últimos movimientos</h2>
      </div>

      {actividades.length===0?(
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-500">
          Todavía no hay movimientos para mostrar.
        </div>
      ):(
        <div className="space-y-4">
          {actividades.map(a=>(
            <div key={a.id} className="flex gap-4 rounded-2xl border border-slate-100 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                {a.icono??"📌"}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{a.titulo}</h3>
                <p className="mt-1 text-sm text-slate-500">{a.descripcion}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{a.fecha}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}