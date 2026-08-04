function limpiarTelefono(telefono: string) {
  return telefono.replace(/\D/g, "");
}

export function crearLinkWhatsApp(
  telefono: string,
  mensaje = ""
) {
  const numero = limpiarTelefono(telefono);

  if (!numero) {
    throw new Error("Número de teléfono inválido.");
  }

  const texto = encodeURIComponent(mensaje);

  return `https://wa.me/${numero}?text=${texto}`;
}

/*
 * Nombre compatible con los módulos anteriores.
 */
export function crearEnlaceWhatsApp(
  telefono: string,
  mensaje = ""
) {
  return crearLinkWhatsApp(telefono, mensaje);
}

export function abrirWhatsApp(
  telefono: string,
  mensaje = ""
) {
  if (typeof window === "undefined") return;

  window.open(
    crearLinkWhatsApp(telefono, mensaje),
    "_blank",
    "noopener,noreferrer"
  );
}

export function mensajePedido(
  numeroPedido: number,
  cliente: string
) {
  return `Hola ${cliente}, te escribimos desde ComerSys para informarte sobre tu pedido #${numeroPedido}.`;
}

/*
 * Nombre compatible con CheckoutModal.
 */
export function generarMensajePedido(
  numeroPedido: number,
  cliente: string
) {
  return mensajePedido(numeroPedido, cliente);
}

export function mensajePago(
  cliente: string,
  importe: number
) {
  return `Hola ${cliente}. Registramos un pago por $${importe.toLocaleString(
    "es-AR"
  )}. ¡Muchas gracias!`;
}

export function mensajeSaldo(
  cliente: string,
  saldo: number
) {
  return `Hola ${cliente}. Tu saldo pendiente es de $${saldo.toLocaleString(
    "es-AR"
  )}. Ante cualquier duda escribinos.`;
}