import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/backend/index.ts'],
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['typeorm', 'reflect-metadata'],
});
