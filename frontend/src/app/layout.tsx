import type { Metadata } from "next";
import "../styles/globals.css";
import Header from "../components/shared/Header";
import Footer from "../components/shared/Footer";
import { Providers } from "./providers";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
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
