import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sweaty.gg'),
  title: "Sweaty — Track Your Gaming Journey",
  description: "Keep a diary of every game you play. Rate, review, and share your thoughts with a community of gamers. Coming soon to iOS and Android.",
  keywords: ["games", "video games", "game tracking", "gaming", "reviews", "ratings", "backlog", "game diary"],
  authors: [{ name: "Sweaty" }],
  creator: "Sweaty",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://sweaty.gg",
    siteName: "Sweaty",
    title: "Sweaty — Track Your Gaming Journey",
    description: "Keep a diary of every game you play. Rate, review, and share your thoughts with a community of gamers. Coming soon to iOS and Android.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sweaty — Track Your Gaming Journey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sweaty — Track Your Gaming Journey",
    description: "Keep a diary of every game you play. Rate, review, and share your thoughts with a community of gamers.",
    creator: "@sweatyapp",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased min-h-screen`}
      >
        <Navbar />
        <main>{children}</main>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  );
}
