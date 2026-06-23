import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getIsAdmin } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shuttle Stats — Tactical Telemetry",
  description:
    "Track badminton matches, analyze player performance, and discover winning partnerships with detailed statistics.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0A0A",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdmin = await getIsAdmin();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased dark`}
    >
      <head>
        {/* Preconnect to Supabase to eliminate TCP/TLS handshake latency */}
        {supabaseHostname && (
          <>
            <link rel="preconnect" href={`https://${supabaseHostname}`} />
            <link rel="dns-prefetch" href={`https://${supabaseHostname}`} />
          </>
        )}
      </head>
      <body className="min-h-full flex relative font-sans">
        <TooltipProvider>
          <Sidebar isAdmin={isAdmin} />
          <main className="flex-1 min-w-0 min-h-screen pb-20 md:pb-0">
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
              {children}
            </div>
          </main>
          <MobileNav isAdmin={isAdmin} />
        </TooltipProvider>
      </body>
    </html>
  );
}
