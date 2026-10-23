"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Atajos de navegación exclusivos de Catálogos Externos.
 * Guardar como app/admin-comersys/catalogos-externos/layout.tsx
 * No modifica el layout general de /admin ni los controles de suscripción.
 */
export default function CatalogosExternosLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const modificadoRef = useRef(false);

  // Al cambiar de página, no heredamos el aviso de cambios de la anterior.
  useEffect(() => {
    modificadoRef.current = false;
  }, [pathname]);

  useEffect(() => {
    function detectarCambio(event: Event) {
      const elemento = event.target;
      if (!(elemento instanceof HTMLElement)) return;
      if (
        elemento.closest("form") &&
        elemento.matches('input:not([type="search"]):not([type="hidden"]), textarea, select')
      ) {
        modificadoRef.current = true;
      }
    }

    document.addEventListener("input", detectarCambio, true);
    document.addEventListener("change", detectarCambio, true);
    return () => {
      document.removeEventListener("input", detectarCambio, true);
      document.removeEventListener("change", detectarCambio, true);
    };
  }, []);

  useEffect(() => {
    function manejarAtajos(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      const modalAbierto = Boolean(document.querySelector('[role="dialog"], [aria-modal="true"], dialog[open]'));

      if (event.key === "Escape" && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        // Los diálogos administran su propio Escape.
        if (modalAbierto) return;
        const inicio = "/admin-comersys/catalogos-externos";
        const destino = pathname === inicio ? "/admin" : inicio;

        if (modificadoRef.current && !window.confirm("Hay cambios que podrían no estar guardados. ¿Querés salir de esta página?")) return;
        event.preventDefault();
        router.push(destino);
        return;
      }

      const ctrlEnter = event.key === "Enter" && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      if (!ctrlEnter && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;

      const objetivo = event.target;
      // Igual que el panel original: no interrumpimos a alguien que está escribiendo.
      if (
        objetivo instanceof HTMLElement &&
        (objetivo.isContentEditable || objetivo.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [aria-modal="true"]'))
      ) return;
      if (modalAbierto) return;

      if (ctrlEnter) {
        if (modificadoRef.current && !window.confirm("Hay cambios que podrían no estar guardados. ¿Querés volver al inicio de ComerSys?")) return;
        event.preventDefault();
        router.push("/admin");
        return;
      }

      const destinos: Record<string, string> = {
        F2: "/admin/perfil",
        F6: "/admin/productos",
        F7: "/admin/clientes",
        F8: "/admin/pedidos",
        F9: "/admin/caja",
        F11: "/admin/ganancias",
        F12: "/admin/productos/actualizacion-masiva",
      };
      const destino = destinos[event.key];
      if (!destino) return;
      if (modificadoRef.current && !window.confirm("Hay cambios que podrían no estar guardados. ¿Querés salir de esta página?")) return;
      event.preventDefault();
      router.push(destino);
    }

    window.addEventListener("keydown", manejarAtajos);
    return () => window.removeEventListener("keydown", manejarAtajos);
  }, [pathname, router]);

  return <>{children}</>;
}
