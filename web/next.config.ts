import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `next build` writes a plain HTML/CSS/JS site to `out/`.
  // Deployable on any static host; Vercel serves it as-is too.
  output: "export",
  // No next/image optimizer in a static export (we don't use next/image anyway).
  images: { unoptimized: true },
  // No trailingSlash: the export writes out/units/press.html, which serves at
  // /units/press on Vercel, Netlify, Cloudflare Pages, GitHub Pages and `npx serve`.
  // Flip trailingSlash on if a host needs directory/index.html instead.
};

export default nextConfig;
