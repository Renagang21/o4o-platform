import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disable DTS
  clean: true,
  sourcemap: true,
  splitting: true,
  external: [
    'react',
    'react-dom',
    '@wordpress/block-editor',
    '@wordpress/blocks',
    '@wordpress/components',
    '@wordpress/element',
    '@wordpress/i18n',
    '@wordpress/data',
    '@o4o/block-core'
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '/* O4O Dynamic Blocks */',
    };
    options.minify = true;
    options.treeShaking = true;
  },
});