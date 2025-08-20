import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disable DTS
  clean: true,
  sourcemap: true,
  splitting: true, // Enable code splitting for better optimization
  external: [
    'react',
    'react-dom',
    '@wordpress/block-editor',
    '@wordpress/blocks',
    '@wordpress/components',
    '@wordpress/element',
    '@wordpress/i18n',
    '@wordpress/media-utils',
    '@o4o/block-core'
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '/* O4O Layout & Media Blocks */',
    };
    // Optimize for smaller bundle size
    options.minify = true;
    options.treeShaking = true;
  },
});