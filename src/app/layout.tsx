import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zefiron IA Admin Central | Make your life easier",
  description: "Sistema centralizado de aprovisionamiento, inteligencia artificial y gestión de configuración para bots Zefiron",
  icons: {
    icon: "/logo/logo_icon.png",
    shortcut: "/logo/logo_icon.png",
    apple: "/logo/logo_ios.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={poppins.variable} suppressHydrationWarning>
      <body className={poppins.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
