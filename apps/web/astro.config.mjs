import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// On-Demand-Rendering statt Build-Time-SSG — siehe ADR 0014.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
});
