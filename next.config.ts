import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trims the production image to only the files actually needed to run
  // `node .next/standalone/server.js` — see the Dockerfile at repo root.
  output: "standalone",
  // Pins the workspace root to this project. Without this, Next.js can
  // infer the wrong root if a lockfile exists anywhere above this folder
  // (e.g. in a parent directory on a dev machine), which then traces/
  // bundles far more than this project and nests the standalone output
  // under the wrong path.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
