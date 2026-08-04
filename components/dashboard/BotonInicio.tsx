"use client";

import Link from "next/link";

export default function BotonInicio() {
  return (
    <Link
      href="/admin"
      title="Ir al Inicio"
      className="
        fixed
        bottom-6
        left-6
        z-50
        flex
        h-14
        w-14
        items-center
        justify-center
        rounded-full
        bg-[#2563EB]
        text-2xl
        text-white
        shadow-xl
        transition-all
        duration-200
        hover:scale-110
        hover:bg-blue-700
        active:scale-95
      "
    >
      🏠
    </Link>
  );
}