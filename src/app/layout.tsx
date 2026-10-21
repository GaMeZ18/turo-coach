import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Graduate } from "next/font/google";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-barlow-condensed" });
// Letra "college" parecida a la del escudo, solo para la marca
const graduate = Graduate({ subsets: ["latin"], weight: "400", variable: "--font-graduate" });

export const metadata: Metadata = {
  title: "Turó Coach · CB Turó de la Peira",
  description: "Herramientas para los entrenadores del CB Turó de la Peira",
  appleWebApp: { capable: true, title: "Turó Coach", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#002b8e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} ${graduate.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
