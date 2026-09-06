import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : "";
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  // React Compiler (Forget) — memoises components automatically
  reactCompiler: true,

  // Enable gzip/brotli compression on the Node.js server
  compress: true,

  // Optimised package imports — reduces bundle by tree-shaking large libs
  experimental: {
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "@radix-ui/react-tabs",
      "@radix-ui/react-select",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tooltip",
    ],
  },

  // Custom HTTP headers for cache control
  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [];
    }

    const rules = [
      {
        // Cache favicons for a week
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];

    if (supabaseHostname) {
      rules.push({
        // Preconnect to Supabase for all page responses
        source: "/(.*)",
        headers: [
          {
            key: "Link",
            value: `<https://${supabaseHostname}>; rel=preconnect, <https://${supabaseHostname}>; rel=dns-prefetch`,
          },
        ],
      });
    }

    return rules;
  },
};

export default nextConfig;
