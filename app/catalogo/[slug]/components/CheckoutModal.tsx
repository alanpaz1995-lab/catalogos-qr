"use client";

import { FormEvent, useState } from "react";
import { Empresa } from "@/types/empresa";
import { ItemPedido } from "@/types/pedido";
import { crearPedido } from "@/services/pedidos";
import {
  crearEnlaceWhatsApp,
  generarMensajePedido,
} from "@/lib/whatsapp";

type CheckoutModalProps = {
  abierto: boolean;
  empresa: Empresa;
  items: ItemPedido[];
  total: number;
  formatearPrecio: (precio: number) => string;
  onCerrar: () => void;
  onPedidoCreado: () => void;
};

type AccionPedido = "solo-finalizar" | "finalizar-whatsapp";

export default function CheckoutModal({
  abierto,
  empresa,
  items,
  total,
  formatearPrecio,
  onCerrar,
  onPedidoCreado,
}: CheckoutModalProps) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [accionEnCurso, setAccionEnCurso] =
    useState<AccionPedido | null>(null);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  if (!abierto) return null;

  async function confirmarPedido(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const submitter = (
      event.nativeEvent as SubmitEvent
    ).submitter as HTMLButtonElement | null;

    const accion =
      (submitter?.value as AccionPedido | undefined) ??
      "solo-finalizar";

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();

    if (!nombreLimpio || !telefonoLimpio) {
      setError("Completá el nombre y el teléfono.");
      return;
    }

    if (items.length === 0) {
      setError("El carrito está vacío.");
      return;
    }

    if (
      accion === "finalizar-whatsapp" &&
      !empresa.whatsapp?.trim()
    ) {
      setError(
        "La empresa todavía no tiene un número de WhatsApp configurado."
      );
      return;
    }

    let ventanaWhatsApp: Window | null = null;

    if (accion === "finalizar-whatsapp") {
      // Se abre antes de la operación asíncrona para evitar
      // que el navegador bloquee la nueva pestaña.
      ventanaWhatsApp = window.open("", "_blank");
    }

    setEnviando(true);
    setAccionEnCurso(accion);
    setError("");
    setMensajeExito("");

    try {
      const resultado = await crearPedido({
        empresaId: empresa.id,
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        direccion: direccion.trim(),
        observaciones: observaciones.trim(),
        items: items.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad,
        })),
      });

      if (accion === "finalizar-whatsapp") {
        const mensaje = generarMensajePedido({
          empresaNombre: empresa.nombre,
          numeroPedido: resultado.numero_pedido,
          clienteNombre: nombreLimpio,
          clienteTelefono: telefonoLimpio,
          direccion: direccion.trim(),
          observaciones: observaciones.trim(),
          items,
          total: resultado.total_pedido,
          formatearPrecio,
        });

        const enlace = crearEnlaceWhatsApp(
          empresa.whatsapp || "",
          mensaje
        );

        if (ventanaWhatsApp) {
          ventanaWhatsApp.location.href = enlace;
        } else {
          window.location.href = enlace;
        }
      }

      setMensajeExito(
        `Pedido #${String(resultado.numero_pedido).padStart(
          6,
          "0"
        )} creado correctamente.`
      );

      setNombre("");
      setTelefono("");
      setDireccion("");
      setObservaciones("");

      onPedidoCreado();
    } catch (errorDesconocido) {
      if (ventanaWhatsApp) {
        ventanaWhatsApp.close();
      }

      console.error(
        "Error al crear el pedido:",
        errorDesconocido
      );

      const mensajeError =
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo crear el pedido.";

      setError(mensajeError);
    } finally {
      setEnviando(false);
      setAccionEnCurso(null);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar checkout"
        onClick={onCerrar}
        className="fixed inset-0 z-[60] bg-black/50"
      />

      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold">
                Finalizar pedido
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Completá tus datos para confirmar la compra.
              </p>
            </div>

            <button
              type="button"
              onClick={onCerrar}
              className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 hover:bg-slate-200"
              aria-label="Cerrar checkout"
            >
              ✕
            </button>
          </div>

          <form onSubmit={confirmarPedido} className="p-6">
            <div>
              <label
                htmlFor="cliente-nombre"
                className="mb-2 block font-semibold"
              >
                Nombre
              </label>

              <input
                id="cliente-nombre"
                type="text"
                value={nombre}
                onChange={(event) =>
                  setNombre(event.target.value)
                }
                required
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="cliente-telefono"
                className="mb-2 block font-semibold"
              >
                Teléfono
              </label>

              <input
                id="cliente-telefono"
                type="tel"
                value={telefono}
                onChange={(event) =>
                  setTelefono(event.target.value)
                }
                required
                placeholder="Ejemplo: 1123456789"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="cliente-direccion"
                className="mb-2 block font-semibold"
              >
                Dirección
                <span className="ml-1 text-sm font-normal text-slate-400">
                  (opcional)
                </span>
              </label>

              <input
                id="cliente-direccion"
                type="text"
                value={direccion}
                onChange={(event) =>
                  setDireccion(event.target.value)
                }
                placeholder="Calle, número y localidad"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="cliente-observaciones"
                className="mb-2 block font-semibold"
              >
                Observaciones
                <span className="ml-1 text-sm font-normal text-slate-400">
                  (opcional)
                </span>
              </label>

              <textarea
                id="cliente-observaciones"
                rows={4}
                value={observaciones}
                onChange={(event) =>
                  setObservaciones(event.target.value)
                }
                placeholder="Aclaraciones sobre el pedido..."
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">
                  Productos
                </span>

                <span className="font-semibold">
                  {items.reduce(
                    (totalItems, item) =>
                      totalItems + item.cantidad,
                    0
                  )}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-semibold">
                  Total
                </span>

                <span className="text-2xl font-bold">
                  {formatearPrecio(total)}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {mensajeExito && (
              <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                ✓ {mensajeExito}
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <button
                type="submit"
                name="accion"
                value="solo-finalizar"
                disabled={enviando}
                className="w-full rounded-xl bg-[#2563EB] px-5 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando &&
                accionEnCurso === "solo-finalizar"
                  ? "Finalizando pedido..."
                  : "Finalizar pedido"}
              </button>

              <button
                type="submit"
                name="accion"
                value="finalizar-whatsapp"
                disabled={enviando}
                className="w-full rounded-xl bg-[#F97316] px-5 py-4 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando &&
                accionEnCurso === "finalizar-whatsapp"
                  ? "Finalizando y abriendo WhatsApp..."
                  : "Finalizar y enviar por WhatsApp"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}