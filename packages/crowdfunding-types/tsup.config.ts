import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: './src/index.ts',
    resolve: true,
  },
  clean: true,
  sourcemap: true,
  external: ['@o4o/types'],
  esbuildOptions(options) {
    options.bundle = true;
  },
});