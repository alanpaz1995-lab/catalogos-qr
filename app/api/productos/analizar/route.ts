import OpenAI from "openai";
import { NextResponse } from "next/server";

type SolicitudAnalisis = {
  imageUrl?: string;
};

type ProductoAnalizado = {
  nombre: string;
  categoria: string;
  descripcion: string;
  palabras_clave: string[];
  confianza: "alta" | "media" | "baja";
};

function productoModoDesarrollo(): ProductoAnalizado {
  return {
    nombre: "Producto nuevo",
    categoria: "Sin categoría",
    descripcion:
      "Descripción preparada en modo desarrollo. Revisá el nombre, la categoría y este texto antes de guardar el producto.",
    palabras_clave: ["producto", "catálogo", "nuevo ingreso"],
    confianza: "media",
  };
}

function respuestaDesarrollo(motivo: string) {
  return NextResponse.json({
    ok: true,
    modo: "desarrollo",
    advertencia: motivo,
    producto: productoModoDesarrollo(),
  });
}

function esErrorDeCredito(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const posibleError = error as {
    status?: number;
    code?: string;
    type?: string;
    message?: string;
    error?: {
      code?: string;
      type?: string;
      message?: string;
    };
  };

  const status = posibleError.status;
  const codigo = posibleError.code ?? posibleError.error?.code ?? "";
  const tipo = posibleError.type ?? posibleError.error?.type ?? "";
  const mensaje = (
    posibleError.message ??
    posibleError.error?.message ??
    ""
  ).toLowerCase();

  return (
    status === 429 ||
    codigo === "insufficient_quota" ||
    tipo === "insufficient_quota" ||
    mensaje.includes("no credits remaining") ||
    mensaje.includes("insufficient quota") ||
    mensaje.includes("billing")
  );
}

export async function POST(request: Request) {
  const modoDesarrollo =
    process.env.OPENAI_MODO_DESARROLLO === "true";

  try {
    const body = (await request.json()) as SolicitudAnalisis;
    const imageUrl = body.imageUrl?.trim();

    if (!imageUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se recibió la URL de la imagen.",
        },
        { status: 400 }
      );
    }

    if (!imageUrl.startsWith("https://")) {
      return NextResponse.json(
        {
          ok: false,
          error: "La URL de la imagen no es válida.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      if (modoDesarrollo) {
        return respuestaDesarrollo(
          "OPENAI_API_KEY no está configurada. Se utilizó el modo desarrollo."
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta configurar OPENAI_API_KEY en el archivo .env.local.",
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    try {
      const respuesta = await openai.responses.create({
        model:
          process.env.OPENAI_VISION_MODEL ||
          "gpt-5.6",

        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Analizá la fotografía de este producto para un catálogo comercial.

Devolvé:
- Un nombre comercial claro y breve.
- Una categoría sencilla.
- Una descripción atractiva en español de Argentina.
- Entre 3 y 6 palabras clave.
- El nivel de confianza del análisis.

Reglas:
- No inventes materiales, medidas, marcas ni características que no puedan verse claramente.
- No sugieras precio ni stock.
- No menciones que sos una inteligencia artificial.
- La descripción debe ser profesional y fácil de entender.
- Si no podés identificar bien el producto, indicá confianza baja.
                `.trim(),
              },
              {
                type: "input_image",
                image_url: imageUrl,
                detail: "high",
              },
            ],
          },
        ],

        text: {
          format: {
            type: "json_schema",
            name: "producto_analizado",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                nombre: { type: "string" },
                categoria: { type: "string" },
                descripcion: { type: "string" },
                palabras_clave: {
                  type: "array",
                  items: { type: "string" },
                },
                confianza: {
                  type: "string",
                  enum: ["alta", "media", "baja"],
                },
              },
              required: [
                "nombre",
                "categoria",
                "descripcion",
                "palabras_clave",
                "confianza",
              ],
            },
          },
        },
      });

      if (!respuesta.output_text) {
        if (modoDesarrollo) {
          return respuestaDesarrollo(
            "OpenAI no devolvió texto. Se utilizó el modo desarrollo."
          );
        }

        return NextResponse.json(
          {
            ok: false,
            error: "La IA no devolvió un análisis.",
          },
          { status: 502 }
        );
      }

      const producto = JSON.parse(
        respuesta.output_text
      ) as ProductoAnalizado;

      return NextResponse.json({
        ok: true,
        modo: "openai",
        producto,
      });
    } catch (errorOpenAI) {
      console.error(
        "Error recibido desde OpenAI:",
        errorOpenAI
      );

      if (
        modoDesarrollo &&
        esErrorDeCredito(errorOpenAI)
      ) {
        return respuestaDesarrollo(
          "La cuenta de OpenAI no tiene créditos disponibles. Se utilizó el modo desarrollo."
        );
      }

      throw errorOpenAI;
    }
  } catch (errorDesconocido) {
    console.error(
      "Error al analizar el producto:",
      errorDesconocido
    );

    const mensaje =
      errorDesconocido instanceof Error
        ? errorDesconocido.message
        : "No se pudo analizar la imagen.";

    return NextResponse.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}