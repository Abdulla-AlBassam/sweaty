import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sweaty.gg'),
  title: {
    default: "Sweaty - Track Your Games",
    template: "%s | Sweaty",
  },
  description: "Track, rate, and share your video game journey. Like Letterboxd, but for games.",
  keywords: ["games", "video games", "game tracking", "gaming", "reviews", "ratings", "backlog"],
  authors: [{ name: "Sweaty" }],
  creator: "Sweaty",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sweaty.gg",
    siteName: "Sweaty",
    title: "Sweaty - Track Your Games",
    description: "Track, rate, and share your video game journey. Like Letterboxd, but for games.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sweaty - Track Your Games",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sweaty - Track Your Games",
    description: "Track, rate, and share your video game journey. Like Letterboxd, but for games.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--background-lighter)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            },
          }}
        />
        <ServiceWorkerRegister />
        <Navbar />
        <main>{children}</main>
        <InstallPrompt />
      </body>
    </html>
  );
}
