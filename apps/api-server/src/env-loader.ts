/**
 * Environment Loader
 * MUST be imported first before any other modules
 * Loads .env files based on NODE_ENV
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine which .env file to load
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production'
  ? '.env.production'
  : NODE_ENV === 'development'
    ? '.env.development'
    : '.env';

// Try multiple possible paths
const possiblePaths = [
  path.resolve(__dirname, '..', envFile),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(process.cwd(), envFile),
  path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      // Environment loaded successfully from envPath
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded && NODE_ENV === 'production') {
  // Warning: No .env file loaded in production mode
  // This is expected if environment variables are set by the system
}

// Export a marker to ensure this module is imported
export const ENV_LOADED = true;
