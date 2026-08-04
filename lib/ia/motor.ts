import { ejecutarModoDesarrollo } from "./desarrollo";
import { ejecutarOpenAI } from "./openai";

import type {
  RespuestaIA,
  SolicitudIA,
} from "./types";

function usarModoDesarrollo() {
  const modo =
    process.env.NEXT_PUBLIC_IA_MODO;

  return (
    modo === "desarrollo" ||
    modo === "dev"
  );
}

export async function ejecutarIA(
  solicitud: SolicitudIA
): Promise<RespuestaIA> {
  if (usarModoDesarrollo()) {
    return ejecutarModoDesarrollo(
      solicitud
    );
  }

  const respuesta =
    await ejecutarOpenAI(solicitud);

  if (!respuesta.ok) {
    console.warn(
      "OpenAI no disponible. Se utiliza modo desarrollo."
    );

    return ejecutarModoDesarrollo(
      solicitud
    );
  }

  return respuesta;
}