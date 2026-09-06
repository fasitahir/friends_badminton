"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart2,
  LogIn,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    Icon: LayoutDashboard,
    shortLabel: "Home",
  },
  {
    label: "Players",
    href: "/players",
    Icon: Users,
    shortLabel: "Players",
  },
  {
    label: "Sessions",
    href: "/sessions",
    Icon: CalendarDays,
    shortLabel: "Sessions",
  },
  {
    label: "Analytics",
    href: "/analytics",
    Icon: BarChart2,
    shortLabel: "Stats",
  },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 border-r border-sidebar-border bg-sidebar min-h-screen relative">
      {/* Wordmark — M6 fix: was h1, causing double-h1 across every page */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading font-semibold text-sm tracking-tight text-sidebar-foreground leading-none">
            Shuttle Stats
          </span>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none">
            Badminton Analytics
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-0.5">
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
                    "relative flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "text-foreground bg-muted/60"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {/* Active hairline rule — absolute within this relative link */}
                  {isActive && (
                    <span className="absolute left-0 inset-y-1 w-0.5 bg-aviation-red" />
                  )}
                  <item.Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border flex flex-col gap-1">
        {isAdmin ? (
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-150"
            >
              <LogOut className="size-4 shrink-0" strokeWidth={1.5} />
              Logout
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-150"
          >
            <LogIn className="size-4 shrink-0" strokeWidth={1.5} />
            Admin Login
          </Link>
        )}
        <p className="px-3 text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mt-1">
          v1.0 · Personal Use
        </p>
      </div>
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <ul className="flex w-full py-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              {/* C1 fix: `relative` added so the absolute indicator is positioned inside the Link */}
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-1 py-2.5 transition-colors duration-150 min-h-[52px] justify-center",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active top indicator — correctly inside the relative Link */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-aviation-red" />
                )}
                <item.Icon
                  className={cn(
                    "size-5 shrink-0",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {/* M1 fix: shorter labels + smaller text to survive 320px */}
                <span
                  className={cn(
                    "text-[9px] leading-none tracking-wide",
                    isActive && "font-semibold"
                  )}
                >
                  {item.shortLabel}
                </span>
              </Link>
            </li>
          );
        })}

        {/* M2 fix: ThemeToggle stays but gets a proper labelled slot */}
        <li className="flex-1">
          <div className="flex flex-col items-center gap-0.5 px-1 py-2.5 min-h-[52px] justify-center">
            <ThemeToggle />
            <span className="text-[9px] leading-none tracking-wide text-muted-foreground mt-0.5">
              Theme
            </span>
          </div>
        </li>

        {/* Auth slot */}
        <li className="flex-1">
          {isAdmin ? (
            <form action={logout} className="m-0 p-0 h-full">
              <button
                type="submit"
                className="flex flex-col items-center gap-0.5 px-1 py-2.5 text-muted-foreground hover:text-foreground transition-colors duration-150 w-full min-h-[52px] justify-center"
              >
                <LogOut className="size-5 shrink-0" strokeWidth={1.5} />
                <span className="text-[9px] leading-none tracking-wide">Logout</span>
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="flex flex-col items-center gap-0.5 px-1 py-2.5 text-muted-foreground hover:text-foreground transition-colors duration-150 min-h-[52px] justify-center"
            >
              <LogIn className="size-5 shrink-0" strokeWidth={1.5} />
              <span className="text-[9px] leading-none tracking-wide">Login</span>
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
