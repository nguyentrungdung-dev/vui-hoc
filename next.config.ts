import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const config: NextConfig = {
  devIndicators: false,
  outputFileTracingExcludes: {
    "/*": [".data/**/*", ".test-data/**/*", ".env*"],
  },
};

export default withWorkflow(config);
