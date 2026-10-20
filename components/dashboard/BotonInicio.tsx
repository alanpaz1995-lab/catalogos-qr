"use client";

import Link from "next/link";

export default function BotonInicio() {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2">
      <Link
        href="/admin"
        title="Ir al Inicio (Ctrl + Enter)"
        aria-label="Ir al inicio"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-2xl text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-blue-700 active:scale-95"
      >
        🏠
      </Link>
      <span className="pointer-events-none rounded-lg border border-neutral-700 bg-[#171717] px-2 py-1 text-[11px] font-semibold text-neutral-200 shadow-md">
        Ctrl + Enter
      </span>
    </div>
  );
}
