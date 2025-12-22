import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'backend/index': 'src/backend/index.ts',
    'frontend/index': 'src/frontend/index.ts',
    'lifecycle/index': 'src/lifecycle/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    'react',
    'react-dom',
    'express',
    'typeorm',
    '@o4o/types',
    '@o4o/utils',
  ],
});
