import { createBrowserClient } from "@supabase/ssr";

const supabaseUrlCruda =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKeyCruda =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = supabaseUrlCruda
  ?.trim()
  .replace(/\/rest\/v1\/?$/i, "")
  .replace(/\/+$/, "");

const supabaseKey =
  supabaseKeyCruda?.replace(/\s+/g, "");

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
  );
}

let urlValidada: URL;

try {
  urlValidada = new URL(supabaseUrl);
} catch {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL no contiene una URL válida."
  );
}

if (
  urlValidada.protocol !== "https:" &&
  urlValidada.protocol !== "http:"
) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL debe comenzar con http:// o https://."
  );
}

export const supabase = createBrowserClient(
  urlValidada.toString().replace(/\/$/, ""),
  supabaseKey
);