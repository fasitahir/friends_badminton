"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions";
import { LogIn, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    emoji: "🏠",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    label: "Players",
    href: "/players",
    emoji: "🏸",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Sessions",
    href: "/sessions",
    emoji: "📅",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    emoji: "📊",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r border-sidebar-border bg-sidebar min-h-screen relative overflow-hidden">
      {/* Background court pattern */}
      <div className="absolute inset-0 court-bg pointer-events-none opacity-50" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center neon-glow-sm shrink-0">
          <span className="text-xl leading-none">🏸</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-base tracking-tight text-sidebar-foreground truncate">
            Shuttle Stats
          </h1>
          <p className="text-[10px] text-primary/70 font-medium uppercase tracking-widest truncate">Badminton Analytics</p>
        </div>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-4">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Menu</p>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary neon-glow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
                  )}
                  <span className="text-base leading-none">{item.emoji}</span>
                  <span className="flex items-center gap-2">
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto size-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="relative px-5 py-4 border-t border-sidebar-border flex flex-col gap-3">
        {isAdmin ? (
          <form action={logout}>
            <button type="submit" className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
              <LogOut className="size-4" />
              Logout
            </button>
          </form>
        ) : (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <LogIn className="size-4" />
            Admin Login
          </Link>
        )}
        <div className="flex items-center gap-2 px-3">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] text-muted-foreground/50">v1.0 · Personal Use</p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border pb-[max(env(safe-area-inset-bottom),8px)]">
      <ul className="flex w-full py-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-xs font-medium transition-all duration-200 touch-target relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />
                )}
                <span className={cn("text-xl leading-none transition-transform duration-200", isActive && "scale-110")}>{item.emoji}</span>
                <span className={cn("truncate max-w-full text-[10px]", isActive && "font-semibold")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-col items-center justify-center">
          <ThemeToggle />
        </li>
        <li className="flex-1">
          {isAdmin ? (
            <form action={logout} className="m-0 p-0">
              <button type="submit" className="flex flex-col items-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors touch-target text-muted-foreground hover:text-foreground w-full">
                <span className="text-xl leading-none">🚪</span>
                <span className="truncate max-w-full text-[10px]">Logout</span>
              </button>
            </form>
          ) : (
            <Link href="/login" className="flex flex-col items-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors touch-target text-muted-foreground hover:text-foreground">
              <span className="text-xl leading-none">🔐</span>
              <span className="truncate max-w-full text-[10px]">Login</span>
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
