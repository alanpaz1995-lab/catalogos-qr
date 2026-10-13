
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
  applicationName: "ComerSys",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ComerSys",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/icon-192.png",
  },
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
