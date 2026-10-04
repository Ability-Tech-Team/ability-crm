import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Same root-based alias as tsconfig.json: `@/src/...`.
      "@": root,
      // Next.js handles `import "server-only"`; tests load an empty module.
      "server-only": join(root, "test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
