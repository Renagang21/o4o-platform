import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/backend/index.ts',
    'src/frontend/index.ts',
    'src/lifecycle/index.ts',
  ],
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'typeorm',
    'express',
    '@o4o/diabetes-core',
    '@o4o/types',
  ],
});
