import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "";

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
    return [
      {
        // Immutable cache for hashed static assets (JS, CSS, fonts, images)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
      {
        // Preconnect to Supabase for all page responses
        source: "/(.*)",
        headers: supabaseHostname
          ? [
              {
                key: "Link",
                value: `<https://${supabaseHostname}>; rel=preconnect, <https://${supabaseHostname}>; rel=dns-prefetch`,
              },
            ]
          : [],
      },
    ];
  },
};

export default nextConfig;
