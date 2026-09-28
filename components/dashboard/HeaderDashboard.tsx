"use client";

import QRCode from "qrcode";

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
    if (!slugEmpresa) {
      window.alert(
        "La empresa todavía no tiene un catálogo público disponible."
      );
      return;
    }

    try {
      const enlace = `${window.location.origin}/catalogo/${slugEmpresa}`;

      await navigator.clipboard.writeText(enlace);

      window.alert("Enlace del catálogo copiado.");
    } catch (error) {
      console.error(
        "Error al copiar el enlace del catálogo:",
        error
      );

      window.alert(
        "No se pudo copiar el enlace del catálogo."
      );
    }
  }

  async function descargarQR() {
    if (!slugEmpresa) {
      window.alert(
        "La empresa todavía no tiene un catálogo público disponible."
      );
      return;
    }

    try {
      const enlaceCatalogo =
        `${window.location.origin}/catalogo/${slugEmpresa}`;

      const qrDataUrl = await QRCode.toDataURL(
        enlaceCatalogo,
        {
          errorCorrectionLevel: "H",
          width: 1200,
          margin: 4,
          color: {
            dark: "#020817",
            light: "#FFFFFF",
          },
        }
      );

      const enlaceDescarga =
        document.createElement("a");

      const nombreArchivo = nombreEmpresa
        ? nombreEmpresa
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : slugEmpresa;

      enlaceDescarga.href = qrDataUrl;
      enlaceDescarga.download =
        `qr-catalogo-${nombreArchivo || "comersys"}.png`;

      document.body.appendChild(enlaceDescarga);
      enlaceDescarga.click();
      document.body.removeChild(enlaceDescarga);
    } catch (error) {
      console.error(
        "Error al generar el código QR:",
        error
      );

      window.alert(
        "No se pudo generar el código QR del catálogo."
      );
    }
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