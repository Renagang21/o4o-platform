import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disable DTS generation
  clean: true,
  sourcemap: true,
  splitting: false,
  tsconfig: './tsconfig.json',
  external: [
    '@o4o/text-content-blocks',
    '@o4o/layout-media-blocks',
    '@o4o/interactive-blocks',
    '@o4o/dynamic-blocks',
    'react',
    'react-dom',
    '@wordpress/blocks',
    '@wordpress/block-editor',
    '@wordpress/components',
    '@wordpress/element',
    '@wordpress/i18n',
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '/* O4O Platform Block Core */',
    };
  },
});