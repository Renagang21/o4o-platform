"use strict";
/**
 * Appearance Configuration Constants
 * Centralized configuration for themes, widgets, and customizer
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEME_DEFAULTS = exports.THEME_FILES = exports.THEME_SUBDIRS = exports.THEME_DIRS = exports.THEME_UPLOAD = void 0;
const path = __importStar(require("path"));
// Theme upload configuration
exports.THEME_UPLOAD = {
    MAX_FILE_SIZE: parseInt(process.env.THEME_MAX_FILE_SIZE || '52428800', 10), // Default 50MB
    UPLOAD_DIR: process.env.THEME_UPLOAD_DIR || 'uploads/themes/',
    ALLOWED_EXTENSIONS: ['.zip']
};
// Theme directories
exports.THEME_DIRS = {
    BASE: process.env.THEME_BASE_DIR || path.join(process.cwd(), 'themes'),
    TEMP: process.env.THEME_TEMP_DIR || path.join(process.cwd(), 'themes', 'temp'),
    BACKUPS: process.env.THEME_BACKUP_DIR || path.join(process.cwd(), 'themes', 'backups')
};
// Theme subdirectories
exports.THEME_SUBDIRS = {
    STYLES: 'styles',
    SCRIPTS: 'scripts',
    TEMPLATES: 'templates'
};
// Theme file names
exports.THEME_FILES = {
    MANIFEST: 'theme.json',
    SCREENSHOT: 'screenshot.png',
    README: 'README.md'
};
// Theme status defaults
exports.THEME_DEFAULTS = {
    TYPE: process.env.DEFAULT_THEME_TYPE || 'external',
    STATUS: process.env.DEFAULT_THEME_STATUS || 'inactive',
    VERSION: process.env.DEFAULT_THEME_VERSION || '1.0.0'
};
//# sourceMappingURL=appearance.constants.js.map