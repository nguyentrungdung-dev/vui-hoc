import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import {
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants";
import { assertProductionConfig } from "./src/server/runtime-config.mjs";

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  outputFileTracingExcludes: {
    "/*": [".data/**/*", ".test-data/**/*", ".env*"],
  },
};

export default withWorkflow(async (phase) => {
  if (
    phase === PHASE_PRODUCTION_SERVER ||
    (phase === PHASE_PRODUCTION_BUILD && process.env.VERCEL)
  ) {
    assertProductionConfig();
  }
  return config;
});
