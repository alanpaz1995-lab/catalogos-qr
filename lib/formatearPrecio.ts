export function formatearPrecio(
  valor: number | string | null | undefined,
  moneda = "ARS"
) {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(0);
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero);
}

export function convertirPrecio(
  valor: string
) {
  const numero = Number(
    valor
      .trim()
      .replace(/\./g, "")
      .replace(",", ".")
  );

  if (!Number.isFinite(numero)) {
    throw new Error(
      "El precio ingresado no es válido."
    );
  }

  return numero;
}