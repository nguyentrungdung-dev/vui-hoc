import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  outputFileTracingExcludes: {
    "/*": [".data/**/*", ".test-data/**/*", ".env*"],
  },
};

export default config;
