"use client";

import { usePathname } from "next/navigation";
import BotonInicio from "@/components/dashboard/BotonInicio";

export default function BotonInicioFlotante() {
  const pathname = usePathname();

  if (!pathname.startsWith("/admin")) {
    return null;
  }

  if (pathname === "/admin") {
    return null;
  }

  return <BotonInicio />;
}