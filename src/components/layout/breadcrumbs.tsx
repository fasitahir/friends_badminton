"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  
  if (pathname === "/") return null;
  
  const paths = pathname.split("/").filter(Boolean);
  
  return (
    <nav className="flex items-center text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/" className="hover:text-foreground transition-colors flex items-center">
            <Home className="size-3" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {paths.map((path, index) => {
          const href = `/${paths.slice(0, index + 1).join("/")}`;
          const isLast = index === paths.length - 1;
          const label = path.replace(/-/g, " ");
          
          return (
            <li key={path} className="flex items-center space-x-2">
              <ChevronRight className="size-3" />
              {isLast ? (
                <span className="text-foreground font-semibold" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link href={href} className="hover:text-foreground transition-colors">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
