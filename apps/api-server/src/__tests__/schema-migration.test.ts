/**
 * Schema Migration Tests
 * Tests for customizer settings migration system
 */

import {
  detectVersion,
  migrateFromLegacy,
  migrateCustomizerSettings,
  validateMigration,
  mapLegacyColor,
  getDefaultSettingsV1,
} from '../utils/schema-migration.js';

describe('Schema Migration', () => {
  describe('detectVersion', () => {
    it('should detect current version (1.0.0)', () => {
      const settings = {
        colors: { primaryColor: '#3b82f6' },
        _meta: { version: '1.0.0' },
      };
      expect(detectVersion(settings)).toBe('1.0.0');
    });

    it('should detect legacy version (0.0.0) - no _meta', () => {
      const settings = {
        colors: { primaryColor: '#0073aa' },
      };
      expect(detectVersion(settings)).toBe('0.0.0');
    });

    it('should detect current version when _meta exists without version', () => {
      const settings = {
        colors: { primaryColor: '#0073aa' },
        _meta: {},
      };
      // _meta exists (truthy) → not legacy structure → returns current version
      expect(detectVersion(settings)).toBe('1.0.0');
    });

    it('should detect legacy version (0.0.0) - missing new sections', () => {
      const settings = {
        colors: { primaryColor: '#3b82f6' },
        header: {},
      };
      expect(detectVersion(settings)).toBe('0.0.0');
    });
  });

  describe('mapLegacyColor', () => {
    it('should map legacy primary color', () => {
      expect(mapLegacyColor('#0073aa')).toBe('#3b82f6');
    });

    it('should map legacy secondary color', () => {
      expect(mapLegacyColor('#ff6b6b')).toBe('#ef4444');
    });

    it('should preserve custom colors', () => {
      expect(mapLegacyColor('#abc123')).toBe('#abc123');
    });

    it('should handle uppercase', () => {
      expect(mapLegacyColor('#0073AA')).toBe('#3b82f6');
    });

    it('should preserve invalid colors', () => {
      expect(mapLegacyColor('invalid')).toBe('invalid');
      expect(mapLegacyColor('')).toBe('');
    });

    it('should map all legacy colors', () => {
      const legacyColors = [
        '#0073aa',
        '#005177',
        '#ff6b6b',
        '#e74c3c',
        '#4ecdc4',
        '#00d2d3',
        '#f7b731',
        '#5f27cd',
        '#ff9ff3',
        '#54a0ff',
        '#48dbfb',
      ];

      const expectedColors = [
        '#3b82f6',
        '#2563eb',
        '#ef4444',
        '#dc2626',
        '#14b8a6',
        '#06b6d4',
        '#f59e0b',
        '#8b5cf6',
        '#f0abfc',
        '#60a5fa',
        '#38bdf8',
      ];

      legacyColors.forEach((legacyColor, index) => {
        expect(mapLegacyColor(legacyColor)).toBe(expectedColors[index]);
      });
    });
  });

  describe('migrateFromLegacy', () => {
    it('should add missing scrollToTop section', () => {
      const legacy = {
        colors: { primaryColor: '#0073aa' },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.scrollToTop).toBeDefined();
      expect(migrated.scrollToTop.enabled).toBe(true);
      expect(migrated.scrollToTop.displayType).toBe('both');
    });

    it('should add missing buttons section', () => {
      const legacy = {
        colors: { primaryColor: '#0073aa' },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.buttons).toBeDefined();
      expect(migrated.buttons.primary).toBeDefined();
      expect(migrated.buttons.primary.backgroundColor).toBe('#3b82f6');
    });

    it('should add missing breadcrumbs section', () => {
      const legacy = {
        colors: { primaryColor: '#0073aa' },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.breadcrumbs).toBeDefined();
      expect(migrated.breadcrumbs.enabled).toBe(true);
      expect(migrated.breadcrumbs.position).toBe('below-header');
    });

    it('should map colors in nested objects', () => {
      const legacy = {
        colors: {
          primaryColor: '#0073aa',
          linkColor: {
            normal: '#0073aa',
            hover: '#005177',
          },
        },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.colors.primaryColor).toBe('#3b82f6');
      expect(migrated.colors.linkColor.normal).toBe('#3b82f6');
      expect(migrated.colors.linkColor.hover).toBe('#2563eb');
    });

    it('should add _meta field', () => {
      const legacy = {
        colors: { primaryColor: '#0073aa' },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated._meta).toBeDefined();
      expect(migrated._meta.version).toBe('1.0.0');
      expect(migrated._meta.migratedFrom).toBe('0.0.0');
      expect(migrated._meta.migrationDate).toBeDefined();
      expect(migrated._meta.lastModified).toBeDefined();
    });

    it('should preserve existing sections', () => {
      const legacy = {
        siteIdentity: {
          logo: { desktop: 'logo.png' },
        },
        colors: { primaryColor: '#0073aa' },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.siteIdentity).toBeDefined();
      expect(migrated.siteIdentity.logo.desktop).toBe('logo.png');
    });
  });

  describe('migrateCustomizerSettings', () => {
    it('should not migrate already v1.0.0 settings', () => {
      const settings = {
        colors: { primaryColor: '#3b82f6' },
        _meta: { version: '1.0.0' },
      };

      const result = migrateCustomizerSettings(settings);

      expect(result).toBe(settings);
    });

    it('should migrate legacy settings', () => {
      const legacy = {
        colors: { primaryColor: '#0073aa' },
      };

      const result = migrateCustomizerSettings(legacy);

      expect(result._meta.version).toBe('1.0.0');
      expect(result.colors.primaryColor).toBe('#3b82f6');
      expect(result.scrollToTop).toBeDefined();
    });

    it('should handle null settings', () => {
      expect(migrateCustomizerSettings(null)).toBe(null);
    });

    it('should handle undefined settings', () => {
      expect(migrateCustomizerSettings(undefined)).toBe(undefined);
    });

    it('should handle empty object', () => {
      const result = migrateCustomizerSettings({});
      expect(result._meta.version).toBe('1.0.0');
    });
  });

  describe('validateMigration', () => {
    it('should validate complete settings', () => {
      const settings = getDefaultSettingsV1();
      const validation = validateMigration(settings);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing sections', () => {
      const settings = {
        _meta: { version: '1.0.0', lastModified: new Date().toISOString() },
      };

      const validation = validateMigration(settings);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Missing required section: siteIdentity');
    });

    it('should detect missing _meta', () => {
      const settings = {
        siteIdentity: {},
        colors: {},
        typography: {},
        container: {},
        sidebar: {},
        header: {},
        footer: {},
        blog: {},
      };

      const validation = validateMigration(settings);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing _meta field');
    });

    it('should detect invalid color format', () => {
      const settings = {
        ...getDefaultSettingsV1(),
        colors: {
          primaryColor: 'not-a-color',
          secondaryColor: '#ef4444',
          textColor: '#333333',
          borderColor: '#dddddd',
          linkColor: { normal: '#3b82f6', hover: '#2563eb' },
          bodyBackground: '#ffffff',
          contentBackground: '#ffffff',
          palette: {},
        },
      };

      const validation = validateMigration(settings);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid color format'))).toBe(true);
    });
  });

  describe('getDefaultSettingsV1', () => {
    it('should return complete default settings', () => {
      const defaults = getDefaultSettingsV1();

      expect(defaults.siteIdentity).toBeDefined();
      expect(defaults.colors).toBeDefined();
      expect(defaults.typography).toBeDefined();
      expect(defaults.container).toBeDefined();
      expect(defaults.sidebar).toBeDefined();
      expect(defaults.header).toBeDefined();
      expect(defaults.footer).toBeDefined();
      expect(defaults.blog).toBeDefined();
      expect(defaults.scrollToTop).toBeDefined();
      expect(defaults.buttons).toBeDefined();
      expect(defaults.breadcrumbs).toBeDefined();
      expect(defaults._meta).toBeDefined();
    });

    it('should use new color palette', () => {
      const defaults = getDefaultSettingsV1();

      expect(defaults.colors.primaryColor).toBe('#3b82f6');
      expect(defaults.colors.secondaryColor).toBe('#ef4444');
    });

    it('should have valid _meta', () => {
      const defaults = getDefaultSettingsV1();

      expect(defaults._meta.version).toBe('1.0.0');
      expect(defaults._meta.lastModified).toBeDefined();
      expect(defaults._meta.isDirty).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deeply nested color objects', () => {
      const legacy = {
        header: {
          above: {
            background: '#0073aa',
          },
          primary: {
            background: '#ff6b6b',
          },
        },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.header.above.background).toBe('#3b82f6');
      expect(migrated.header.primary.background).toBe('#ef4444');
    });

    it('should handle arrays with color values', () => {
      const legacy = {
        colors: {
          palette: {
            color1: '#0073aa',
            color2: '#ff6b6b',
          },
        },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.colors.palette.color1).toBe('#3b82f6');
      expect(migrated.colors.palette.color2).toBe('#ef4444');
    });

    it('should preserve null values', () => {
      const legacy = {
        siteIdentity: {
          logo: {
            desktop: null,
            mobile: null,
          },
        },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.siteIdentity.logo.desktop).toBeNull();
      expect(migrated.siteIdentity.logo.mobile).toBeNull();
    });

    it('should handle mixed legacy and new colors', () => {
      const legacy = {
        colors: {
          primaryColor: '#0073aa', // legacy
          secondaryColor: '#10b981', // custom new
        },
      };

      const migrated = migrateFromLegacy(legacy);

      expect(migrated.colors.primaryColor).toBe('#3b82f6'); // mapped
      expect(migrated.colors.secondaryColor).toBe('#10b981'); // preserved
    });
  });
});
