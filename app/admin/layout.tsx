import type { ReactNode } from "react";

import { EmpresaProvider } from "@/lib/empresa/EmpresaProvider";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <EmpresaProvider>
      {children}
    </EmpresaProvider>
  );
}