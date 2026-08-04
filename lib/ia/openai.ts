import type {
  RespuestaIA,
  SolicitudIA,
} from "./types";

import { obtenerPrompt } from "./prompts";

export async function ejecutarOpenAI(
  solicitud: SolicitudIA
): Promise<RespuestaIA> {
  try {
    const respuesta = await fetch(
      "/api/ia",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          prompt: obtenerPrompt(
            solicitud
          ),
          solicitud,
        }),
      }
    );

    const resultado =
      await respuesta.json();

    if (!respuesta.ok) {
      return {
        ok: false,
        modo: "openai",
        error:
          resultado.error ??
          "Error al ejecutar la IA.",
      };
    }

    return {
      ok: true,
      modo: "openai",
      resultado:
        resultado.resultado,
    };
  } catch (error) {
    return {
      ok: false,
      modo: "openai",
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido.",
    };
  }
}