import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/widget.js',
      format: 'iife',
      name: 'SiteGuide',
      sourcemap: true,
    },
    {
      file: 'dist/widget.min.js',
      format: 'iife',
      name: 'SiteGuide',
      plugins: [terser()],
    },
  ],
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
};
