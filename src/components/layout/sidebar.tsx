"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions";
import { LogIn, LogOut } from "lucide-react";
const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r border-border bg-sidebar min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary-foreground">
            <circle cx="12" cy="12" r="10" />
            <path d="m8 12 3-8 3 8" />
            <path d="M8 12h6" />
          </svg>
        </div>
        <div>
          <h1 className="font-heading font-bold text-base tracking-tight text-sidebar-foreground">
            Shuttle Stats
          </h1>
          <p className="text-xs text-muted-foreground">Badminton Analytics</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border flex flex-col gap-3">
        {isAdmin ? (
          <form action={logout}>
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <LogOut className="size-4" />
              Logout
            </button>
          </form>
        ) : (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
            <LogIn className="size-4" />
            Admin Login
          </Link>
        )}
        <p className="text-xs text-muted-foreground">
          v1.0 — Personal Use
        </p>
      </div>
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border pb-[max(env(safe-area-inset-bottom),12px)]">
      <ul className="flex w-full py-1.5">
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
                  "flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg text-xs font-medium transition-colors touch-target",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.icon}
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          {isAdmin ? (
            <form action={logout} className="m-0 p-0">
              <button type="submit" className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg text-xs font-medium transition-colors touch-target text-muted-foreground hover:text-foreground w-full">
                <LogOut className="size-5" />
                <span className="truncate max-w-full">Logout</span>
              </button>
            </form>
          ) : (
            <Link href="/login" className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg text-xs font-medium transition-colors touch-target text-muted-foreground hover:text-foreground">
              <LogIn className="size-5" />
              <span className="truncate max-w-full">Login</span>
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
