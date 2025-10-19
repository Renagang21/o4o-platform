/**
 * Schema Migration Utility
 * Handles migration of customizer settings between versions
 * Ensures backward compatibility and data integrity
 */
/**
 * Map legacy color to new color if exists in mapping table
 */
export declare function mapLegacyColor(color: string): string;
/**
 * Detect version of customizer settings
 */
export declare function detectVersion(settings: any): string;
/**
 * Migrate from legacy structure to v1.0.0
 */
export declare function migrateFromLegacy(legacySettings: any): any;
/**
 * Main migration function - routes to appropriate migration
 */
export declare function migrateCustomizerSettings(settings: any): any;
/**
 * Validate migration result
 */
export declare function validateMigration(settings: any): {
    valid: boolean;
    errors: string[];
};
/**
 * Get default settings structure for v1.0.0
 * Used as fallback when no settings exist
 */
export declare function getDefaultSettingsV1(): any;
//# sourceMappingURL=schema-migration.d.ts.map