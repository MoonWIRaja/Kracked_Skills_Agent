import type { Metadata } from "next";
import { Silkscreen, Space_Grotesk } from "next/font/google";
import "./globals.css";

const fontUI = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const fontArcade = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-arcade",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kracked Skills Agent - Pixel Console",
  description: "AI multi-agent orchestration with pixel observer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontUI.variable} ${fontArcade.variable} min-h-screen bg-[#030905] text-[#e8ffec] antialiased`}>
        {children}
      </body>
    </html>
  );
}
