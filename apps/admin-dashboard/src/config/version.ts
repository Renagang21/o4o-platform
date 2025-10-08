/**
 * Application version configuration
 * This file provides a centralized location for version information
 *
 * Version is sourced from package.json and should be updated there
 * during release process
 */

// Read from package.json to ensure single source of truth
import packageJson from '../../package.json';

/**
 * Current application version
 * Format: MAJOR.MINOR.PATCH (e.g., 0.5.0)
 */
export const APP_VERSION = packageJson.version;

/**
 * Formatted version string for display
 * @example "v0.5.0"
 */
export const VERSION_DISPLAY = `v${APP_VERSION}`;

/**
 * Build timestamp
 */
export const BUILD_TIME = new Date().toISOString();

/**
 * Get build information from version.json (if available)
 */
export const getBuildInfo = async () => {
  try {
    const response = await fetch('/version.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Failed to load build info:', error);
  }
  return null;
};