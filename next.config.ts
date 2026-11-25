import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Absolute project root — required so Turbopack can resolve `next` when the
// repo lives under a Windows path that contains spaces (e.g. "Bangla LKC…").
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle for the Docker image
  output: "standalone",
  // Pin Turbopack / tracing root to this package (avoids "Next.js package not found")
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
