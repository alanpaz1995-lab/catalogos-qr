import Image from "next/image";
import Link from "next/link";

type LogoComerSysProps = {
  variante?: "icono" | "horizontal";
  ancho?: number;
  alto?: number;
  conLink?: boolean;
};

export default function LogoComerSys({
  variante = "horizontal",
  ancho,
  alto,
  conLink = true,
}: LogoComerSysProps) {
  const contenido =
    variante === "icono" ? (
      <Image
        src="/brand/logo-icon.png"
        alt="ComerSys"
        width={ancho ?? 70}
        height={alto ?? 70}
        priority
        className="h-auto w-auto"
      />
    ) : (
      <Image
        src="/brand/logo-horizontal.png"
        alt="ComerSys - Gestión Comercial Inteligente"
        width={ancho ?? 360}
        height={alto ?? 90}
        priority
        className="h-auto w-auto"
      />
    );

  if (!conLink) {
    return contenido;
  }

  return (
    <Link
      href="/"
      aria-label="Ir al inicio de ComerSys"
      className="inline-flex items-center"
    >
      {contenido}
    </Link>
  );
}