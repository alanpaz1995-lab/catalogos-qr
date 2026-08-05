"use client";

import ActionBar from "@/components/ui/ActionBar";
import HeroEmpresa from "@/components/ui/HeroEmpresa";

type HeaderDashboardProps = {
  fecha: string;
  cargando?: boolean;
  onActualizar: () => void;
  nombreEmpresa?: string | null;
  descripcionEmpresa?: string | null;
  rubroEmpresa?: string | null;
  logo?: string | null;
  portada?: string | null;
  colorPrincipal?: string;
  colorSecundario?: string;
  slugEmpresa?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  horariosSemana?: unknown;
};

export default function HeaderDashboard({
  fecha,
  cargando = false,
  onActualizar,
  nombreEmpresa,
  descripcionEmpresa,
  rubroEmpresa,
  logo,
  portada,
  colorPrincipal = "#2563EB",
  colorSecundario = "#7C3AED",
  slugEmpresa,
  whatsapp,
  direccion,
  ciudad,
  provincia,
  horariosSemana,
}: HeaderDashboardProps) {
  const catalogoHref = slugEmpresa
    ? `/catalogo/${slugEmpresa}`
    : undefined;

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : undefined;

  const ubicacion = [
    direccion,
    ciudad,
    provincia,
  ]
    .filter(Boolean)
    .join(", ");

  const comoLlegarHref = ubicacion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        ubicacion
      )}`
    : undefined;

  async function copiarEnlaceCatalogo() {
    if (!slugEmpresa) return;

    const enlace = `${window.location.origin}/catalogo/${slugEmpresa}`;

    await navigator.clipboard.writeText(enlace);
    window.alert("Enlace del catálogo copiado.");
  }

  function descargarQR() {
    if (!slugEmpresa) {
      window.alert(
        "La empresa todavía no tiene un catálogo público disponible."
      );
      return;
    }

    window.alert(
      "La descarga del QR se conectará en el próximo paso."
    );
  }

  return (
    <div className="space-y-5">
      <HeroEmpresa
        nombre={nombreEmpresa}
        rubro={rubroEmpresa}
        descripcion={descripcionEmpresa}
        logo={logo}
        portada={portada}
        direccion={direccion}
        ciudad={ciudad}
        provincia={provincia}
        fecha={fecha}
        horariosSemana={horariosSemana}
        colorPrincipal={colorPrincipal}
        colorSecundario={colorSecundario}
        cargando={cargando}
        onActualizar={onActualizar}
      />

      <ActionBar
        editarHref="/admin/perfil"
        catalogoHref={catalogoHref}
        whatsappHref={whatsappHref}
        comoLlegarHref={comoLlegarHref}
        onCopiar={copiarEnlaceCatalogo}
        onDescargarQR={descargarQR}
      />
    </div>
  );
}