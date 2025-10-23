/**
 * Environment Loader
 * MUST be imported first before any other modules
 * Loads .env files based on NODE_ENV
 */
import dotenv from 'dotenv';
import path from 'path';

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
      console.log(`✅ Loaded env from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded && NODE_ENV === 'production') {
  console.warn('⚠️ No .env file loaded in production mode');
}

// Export a marker to ensure this module is imported
export const ENV_LOADED = true;
