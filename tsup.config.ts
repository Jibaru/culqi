import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    checkout: "src/checkout/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});
