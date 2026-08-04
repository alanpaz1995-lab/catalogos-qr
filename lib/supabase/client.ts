import { createBrowserClient } from "@supabase/ssr";

const supabaseUrlCruda =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKeyCruda =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = supabaseUrlCruda
  ?.trim()
  .replace(/\/rest\/v1\/?$/i, "")
  .replace(/\/+$/, "");

const supabaseAnonKey =
  supabaseAnonKeyCruda?.replace(/\s+/g, "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
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
  supabaseAnonKey
);