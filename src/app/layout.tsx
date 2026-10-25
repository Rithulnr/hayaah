import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HayaaHeader from "./components/header/HayaaHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HAYAAH PERFUMES | Luxury Fragrances & Long Lasting Perfumes India",
  description: "Experience luxury in every spray. HAYAAH PERFUMES offers premium, long-lasting fragrances and Extrait de Parfum crafted in Trivandrum, India. Discover elegance, high projection, and timeless sophistication.",
  keywords: [
    "Premium Perfumes India",
    "Luxury Perfumes Kerala",
    "Long Lasting Perfumes",
    "Designer Inspired Perfumes",
    "Premium Fragrances",
    "Best Perfume Brand India",
    "HAYAAH PERFUMES",
    "Luxury Perfume Online",
    "Men's Perfumes",
    "Women's Perfumes",
    "Unisex Perfumes",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <HayaaHeader />
        {children}
      </body>
    </html>
  );
}
