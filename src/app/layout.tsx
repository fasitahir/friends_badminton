import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getIsAdmin } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shuttle Stats — Badminton Analytics",
  description:
    "Track badminton matches, analyze player performance, and discover winning partnerships with detailed statistics.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdmin = await getIsAdmin();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex">
        <TooltipProvider>
          <Sidebar isAdmin={isAdmin} />
          <main className="flex-1 min-h-screen pb-20 md:pb-0">
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
              {children}
            </div>
          </main>
          <MobileNav isAdmin={isAdmin} />
        </TooltipProvider>
      </body>
    </html>
  );
}
