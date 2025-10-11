/**
 * Appearance Configuration Constants
 * Centralized configuration for themes, widgets, and customizer
 */

import * as path from 'path';

// Theme upload configuration
export const THEME_UPLOAD = {
  MAX_FILE_SIZE: parseInt(process.env.THEME_MAX_FILE_SIZE || '52428800', 10), // Default 50MB
  UPLOAD_DIR: process.env.THEME_UPLOAD_DIR || 'uploads/themes/',
  ALLOWED_EXTENSIONS: ['.zip']
};

// Theme directories
export const THEME_DIRS = {
  BASE: process.env.THEME_BASE_DIR || path.join(process.cwd(), 'themes'),
  TEMP: process.env.THEME_TEMP_DIR || path.join(process.cwd(), 'themes', 'temp'),
  BACKUPS: process.env.THEME_BACKUP_DIR || path.join(process.cwd(), 'themes', 'backups')
};

// Theme subdirectories
export const THEME_SUBDIRS = {
  STYLES: 'styles',
  SCRIPTS: 'scripts',
  TEMPLATES: 'templates'
};

// Theme file names
export const THEME_FILES = {
  MANIFEST: 'theme.json',
  SCREENSHOT: 'screenshot.png',
  README: 'README.md'
};

// Theme status defaults
export const THEME_DEFAULTS = {
  TYPE: process.env.DEFAULT_THEME_TYPE || 'external',
  STATUS: process.env.DEFAULT_THEME_STATUS || 'inactive',
  VERSION: process.env.DEFAULT_THEME_VERSION || '1.0.0'
};
