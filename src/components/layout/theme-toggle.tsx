import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initialize based on user preference or existing class
    const darkClass = document.documentElement.classList.contains("dark");
    setIsDark(darkClass);
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
    }
    setIsDark(!isDark);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center justify-center rounded-full p-2 transition-colors hover:bg-sidebar-accent",
        isDark ? "text-yellow-300" : "text-gray-600"
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </button>
  );
}
