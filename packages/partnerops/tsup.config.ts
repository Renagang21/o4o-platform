import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/backend/index.ts'],
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['typeorm', 'express', '@o4o/partner-core', '@o4o/types'],
  target: 'es2022',
});
