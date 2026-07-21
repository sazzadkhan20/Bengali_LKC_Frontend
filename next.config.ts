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
  // Ensure the WordNet 2.1 ILI registry travels with the standalone output
  outputFileTracingIncludes: {
    "/api/lookup/ili": ["./data/wordnet21-ili.json"],
    "/dashboard/ili-finder": ["./data/wordnet21-ili.json"],
    "/api/submissions": ["./data/wordnet21-ili.json"],
  },
};

export default nextConfig;
