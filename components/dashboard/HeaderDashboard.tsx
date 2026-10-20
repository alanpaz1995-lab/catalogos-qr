"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
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

type Lista = { id: number; nombre: string; slug: string; activa: boolean };
type Accion = "ver" | "copiar" | "qr";
type Catalogo = { nombre: string; ruta: string; slugArchivo: string };

function nombreArchivo(texto: string) {
  return texto.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "catalogo";
}

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
  const [accion, setAccion] = useState<Accion | null>(null);
  const [listas, setListas] = useState<Lista[]>([]);
  const [cargandoListas, setCargandoListas] = useState(false);
  const [errorListas, setErrorListas] = useState("");
  const [procesando, setProcesando] = useState(false);

  const catalogoHref = slugEmpresa ? `/catalogo/${encodeURIComponent(slugEmpresa)}` : undefined;
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : undefined;
  const ubicacion = [direccion, ciudad, provincia].filter(Boolean).join(", ");
  const comoLlegarHref = ubicacion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacion)}`
    : undefined;

  const cargarListas = useCallback(async () => {
    if (!slugEmpresa) return;
    setCargandoListas(true);
    setErrorListas("");
    setListas([]);
    try {
      const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
      if (errorUsuario || !user) throw new Error("Iniciá sesión para consultar tus listas.");

      const { data: empresa, error: errorEmpresa } = await supabase
        .from("empresas")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("slug", slugEmpresa)
        .maybeSingle();
      if (errorEmpresa) throw errorEmpresa;
      if (!empresa) throw new Error("No encontramos la empresa asociada a tu sesión.");

      const { data, error } = await supabase
        .from("listas_catalogos")
        .select("id, nombre, slug, activa")
        .eq("empresa_id", empresa.id)
        .eq("activa", true)
        .order("nombre", { ascending: true });
      if (error) throw error;
      setListas((data || []) as Lista[]);
    } catch (e) {
      setErrorListas(e instanceof Error ? e.message : "No se pudieron cargar las listas.");
    } finally {
      setCargandoListas(false);
    }
  }, [slugEmpresa]);

  useEffect(() => {
    if (accion) void cargarListas();
  }, [accion, cargarListas]);

  function abrirSelector(tipo: Accion) {
    if (!slugEmpresa) {
      window.alert("La empresa todavía no tiene un catálogo público disponible.");
      return;
    }
    setAccion(tipo);
  }

  // Atajos únicamente en el dashboard, usando los mismos selectores de los botones.
  useEffect(() => {
    function manejarAtajos(event: KeyboardEvent) {
      if (event.key !== "F3" && event.key !== "F4") return;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (!slugEmpresa || accion || procesando) return;
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;

      const objetivo = event.target;
      if (objetivo instanceof HTMLElement && (
        objetivo.isContentEditable ||
        Boolean(objetivo.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
      )) return;

      event.preventDefault();
      setAccion(event.key === "F3" ? "ver" : "copiar");
    }

    window.addEventListener("keydown", manejarAtajos);
    return () => window.removeEventListener("keydown", manejarAtajos);
  }, [slugEmpresa, accion, procesando]);

  const catalogos: Catalogo[] = slugEmpresa
    ? [
        {
          nombre: "Catálogo principal",
          ruta: `/catalogo/${encodeURIComponent(slugEmpresa)}`,
          slugArchivo: "principal",
        },
        ...listas.map((lista) => ({
          nombre: lista.nombre,
          ruta: `/catalogo/${encodeURIComponent(slugEmpresa)}/${encodeURIComponent(lista.slug)}`,
          slugArchivo: nombreArchivo(lista.nombre) + "-" + lista.id,
        })),
      ]
    : [];

  async function ejecutar(catalogo: Catalogo) {
    if (!accion || procesando) return;
    const tipo = accion;
    // Abrir desde el clic del usuario para evitar bloqueos de ventanas emergentes.
    if (tipo === "ver") {
      window.open(catalogo.ruta, "_blank", "noopener,noreferrer");
      setAccion(null);
      return;
    }
    setProcesando(true);
    try {
      const enlace = `${window.location.origin}${catalogo.ruta}`;
      if (tipo === "copiar") {
        await navigator.clipboard.writeText(enlace);
        window.alert(`Enlace de "${catalogo.nombre}" copiado.`);
      } else {
        const qrDataUrl = await QRCode.toDataURL(enlace, {
          errorCorrectionLevel: "H",
          width: 1200,
          margin: 4,
          color: { dark: "#020817", light: "#FFFFFF" },
        });
        const descarga = document.createElement("a");
        descarga.href = qrDataUrl;
        descarga.download = `qr-catalogo-${nombreArchivo(nombreEmpresa || slugEmpresa || "comersys")}-${catalogo.slugArchivo}.png`;
        document.body.appendChild(descarga);
        descarga.click();
        descarga.remove();
      }
      setAccion(null);
    } catch (e) {
      console.error("Error en la acción del catálogo:", e);
      window.alert(tipo === "copiar" ? "No se pudo copiar el enlace." : "No se pudo generar el QR.");
    } finally {
      setProcesando(false);
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
        onVerCatalogo={() => abrirSelector("ver")}
        onCopiar={() => abrirSelector("copiar")}
        onDescargarQR={() => abrirSelector("qr")}
      />

      {accion && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Seleccionar catálogo">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">
                {accion === "ver" ? "Ver catálogo" : accion === "copiar" ? "Copiar enlace" : "Descargar QR"}
              </h2>
              <button type="button" onClick={() => setAccion(null)} disabled={procesando} className="rounded-lg bg-slate-100 px-3 py-2 font-semibold">Cerrar ✕</button>
            </div>
            <p className="mt-2 text-sm text-slate-600">Elegí qué catálogo querés utilizar.</p>
            {cargandoListas && <p className="mt-5 text-sm text-slate-500">Cargando listas...</p>}
            {errorListas && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No pudimos cargar las listas: {errorListas}
                <button type="button" className="ml-2 font-bold underline" onClick={() => void cargarListas()}>Reintentar</button>
              </div>
            )}
            {!cargandoListas && (
              <div className="mt-5 space-y-3">
                {catalogos.map((catalogo) => (
                  <button
                    key={catalogo.ruta}
                    type="button"
                    disabled={procesando}
                    onClick={() => void ejecutar(catalogo)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left font-semibold transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
                  >
                    <span>{catalogo.nombre}</span>
                    <span className="text-xs text-blue-700">{accion === "ver" ? "Abrir ↗" : accion === "copiar" ? "Copiar" : "Generar QR"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
