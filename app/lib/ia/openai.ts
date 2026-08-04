import type {
  SolicitudMotorIA,
  RespuestaMotorIA,
} from "./types";

/*
 * Este archivo será el único que hablará con OpenAI.
 * Por ahora devolvemos un mensaje indicando que la
 * integración todavía no está implementada.
 */

export async function ejecutarOpenAI(
  solicitud: SolicitudMotorIA
): Promise<RespuestaMotorIA> {
  return {
    ok: false,
    modo: "openai",
    accion: solicitud.accion,
    error:
      "La integración con OpenAI todavía no fue implementada.",
  };
}