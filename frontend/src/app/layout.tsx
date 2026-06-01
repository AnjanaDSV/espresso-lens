import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "../styles/globals.css";
import Header from "../components/shared/Header";
import Footer from "../components/shared/Footer";
import { Providers } from "./providers";

// Load Google Fonts natively via Next.js to eliminate hydration mismatch risk
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EspressoLens | Intelligent Extraction Diagnostic Suite",
  description: "Detect espresso channeling, uneven extraction flow, and crema quality via visual frame-by-frame vector search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <Providers>
          <Header />
          <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
