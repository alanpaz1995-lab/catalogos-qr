import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import BotonInicioFlotante from "@/components/dashboard/BotonInicioFlotante";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ComerSys",
  description: "Sistema de gestión ComerSys",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        {children}
        <BotonInicioFlotante />
      </body>
    </html>
  );
}