export function requerido(
  valor: unknown,
  nombre: string
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    throw new Error(
      `${nombre} es obligatorio.`
    );
  }
}

export function validarPrecio(
  precio: number
) {
  if (precio < 0) {
    throw new Error(
      "El precio no puede ser negativo."
    );
  }
}

export function validarStock(
  stock: number
) {
  if (stock < 0) {
    throw new Error(
      "El stock no puede ser negativo."
    );
  }
}

export function validarTexto(
  texto: string,
  nombre: string,
  minimo = 1,
  maximo = 500
) {
  const valor = texto.trim();

  if (valor.length < minimo) {
    throw new Error(
      `${nombre} debe tener al menos ${minimo} caracteres.`
    );
  }

  if (valor.length > maximo) {
    throw new Error(
      `${nombre} no puede superar ${maximo} caracteres.`
    );
  }
}

export function validarEmail(
  email: string
) {
  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    throw new Error(
      "El correo electrónico no es válido."
    );
  }
}

export function validarTelefono(
  telefono: string
) {
  const limpio = telefono.replace(
    /\D/g,
    ""
  );

  if (limpio.length < 8) {
    throw new Error(
      "El teléfono no es válido."
    );
  }
}