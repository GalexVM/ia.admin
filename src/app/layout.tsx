import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zefiron Admin | Central Configuration",
  description: "Sistema centralizado de aprovisionamiento y gestión de configuración para bots Zefiron",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
