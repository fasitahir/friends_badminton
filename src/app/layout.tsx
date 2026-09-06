import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Plus_Jakarta_Sans, Lora } from "next/font/google";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { PaletteProvider, PALETTE_SCRIPT } from "@/components/layout/palette-context";
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

// Court Glass theme — rounded humanist sans for headings
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Field Journal theme — classical roman serif for headings
const lora = Lora({
  variable: "--font-lora",
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
  let supabaseHostname: string | null = null;
  if (supabaseUrl) {
    try {
      supabaseHostname = new URL(supabaseUrl).hostname;
    } catch {
      supabaseHostname = null;
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${plusJakartaSans.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Palette flash-prevention — runs synchronously before first paint */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          id="hm-palette-script"
          dangerouslySetInnerHTML={{ __html: PALETTE_SCRIPT }}
          suppressHydrationWarning
        />
        {/* Preconnect to Supabase to eliminate TCP/TLS handshake latency */}
        {supabaseHostname && (
          <>
            <link rel="preconnect" href={`https://${supabaseHostname}`} />
            <link rel="dns-prefetch" href={`https://${supabaseHostname}`} />
          </>
        )}
      </head>
      <body className="min-h-full flex relative font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PaletteProvider>
          <TooltipProvider>
            <Sidebar isAdmin={isAdmin} />
            <main className="flex-1 min-w-0 min-h-screen pb-20 md:pb-0">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {children}
              </div>
            </main>
            <MobileNav isAdmin={isAdmin} />
          </TooltipProvider>
          </PaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
