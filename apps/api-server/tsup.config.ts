import { defineConfig } from 'tsup';
import { Plugin } from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Plugin to handle TypeScript ESM imports with .js extensions
 * This resolves .js imports to .ts files during bundling
 */
const jsToTsPlugin: Plugin = {
  name: 'js-to-ts-resolver',
  setup(build) {
    // Handle .js imports that should resolve to .ts files
    build.onResolve({ filter: /\.js$/ }, async (args) => {
      // Only process relative imports
      if (!args.path.startsWith('.')) {
        return undefined;
      }

      // Try to resolve as .ts file
      const tsPath = args.path.replace(/\.js$/, '.ts');
      const resolveDir = args.resolveDir;
      const fullPath = path.resolve(resolveDir, tsPath);

      if (fs.existsSync(fullPath)) {
        return { path: fullPath };
      }

      // Try .tsx
      const tsxPath = args.path.replace(/\.js$/, '.tsx');
      const fullTsxPath = path.resolve(resolveDir, tsxPath);

      if (fs.existsSync(fullTsxPath)) {
        return { path: fullTsxPath };
      }

      return undefined;
    });
  },
};

/**
 * tsup configuration for api-server bundling
 *
 * Purpose: Create a single bundled output for Cloud Run deployment
 *
 * Strategy:
 * - Inline all @o4o/* internal workspace packages
 * - Keep external dependencies (express, typeorm, pg, etc.) as external
 * - Output ESM format for Node.js 22+
 */
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  bundle: true,

  // Keep external dependencies - these will be installed via npm in Docker
  external: [
    // Core Node.js built-ins
    'fs', 'path', 'url', 'http', 'https', 'crypto', 'stream', 'util', 'os',
    'child_process', 'events', 'buffer', 'querystring', 'zlib', 'net', 'tls',
    'dns', 'dgram', 'cluster', 'readline', 'repl', 'vm', 'assert', 'tty',
    'string_decoder', 'punycode', 'domain', 'constants', 'module', 'process',
    'perf_hooks', 'async_hooks', 'worker_threads', 'inspector', 'v8', 'trace_events',

    // Express and web framework
    'express',
    'cors',
    'helmet',
    'compression',
    'cookie-parser',
    'express-session',
    'express-rate-limit',
    'express-validator',
    'connect-redis',
    'rate-limit-redis',
    'multer',
    'passport',
    'passport-google-oauth20',
    'passport-kakao',
    'passport-naver-v2',

    // Database
    'typeorm',
    'pg',
    'reflect-metadata',
    'better-sqlite3',
    'sqlite3',

    // Redis
    'ioredis',
    'redis',
    'redis-cache-express',
    'bullmq',

    // WebSocket
    'socket.io',

    // Authentication & Security
    'jsonwebtoken',
    'bcrypt',
    'bcryptjs',

    // Utilities
    'axios',
    'dayjs',
    'uuid',
    'slugify',
    'dotenv',
    'zod',
    'joi',
    'class-validator',
    'class-transformer',
    'lru-cache',
    'node-cache',

    // File processing
    'sharp',
    'pdfkit',
    'exceljs',
    'xlsx',
    'csv-writer',
    'json2csv',
    'adm-zip',
    'xml2js',
    'js-yaml',

    // Scheduling
    'cron',
    'node-cron',

    // Logging & Monitoring
    'winston',
    'prom-client',

    // OpenTelemetry
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-http',

    // HTTP client
    'node-fetch',

    // Documentation
    'swagger-jsdoc',
    'swagger-ui-express',

    // Email
    'nodemailer',

    // Misc
    'tail',
    'ua-parser-js',
    'semver',

    // NestJS (optional dependencies that may be referenced)
    '@nestjs/core',
    '@nestjs/common',
    '@nestjs/typeorm',
    '@nestjs/event-emitter',
    '@nestjs/websockets',
    '@nestjs/microservices',
    '@nestjs/platform-express',
    '@nestjs/websockets/socket-module',
    '@nestjs/microservices/microservices-module',

    // NestJS peer dependencies
    'rxjs',
    'iterare',
  ],

  // Include all @o4o/* packages inline (they will be bundled)
  noExternal: [
    /^@o4o\/.*/,
    /^@o4o-apps\/.*/,
    /^@o4o-extensions\/.*/,
  ],

  // TypeScript/ESM settings
  shims: true,

  // Environment
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },

  // Banner for ESM compatibility - using unique names to avoid conflicts with bundled code
  banner: {
    js: `
import { createRequire as _cReq } from 'module';
import { fileURLToPath as _fURL } from 'url';
import { dirname as _dir } from 'path';
var require = globalThis.require ?? _cReq(import.meta.url);
var __filename = globalThis.__filename ?? _fURL(import.meta.url);
var __dirname = globalThis.__dirname ?? _dir(__filename);
`.trim(),
  },

  // Add custom esbuild plugin for .js to .ts resolution
  esbuildPlugins: [jsToTsPlugin],

  esbuildOptions(options) {
    // Ensure proper handling of decorators for TypeORM
    options.keepNames = true;

    // Handle .js extensions in TypeScript ESM imports
    // This is critical for TypeScript ESM projects that use .js extensions in imports
    options.resolveExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

    // Ensure loader is set for all TypeScript files
    options.loader = {
      ...options.loader,
      '.ts': 'ts',
      '.tsx': 'tsx',
    };
  },
});
