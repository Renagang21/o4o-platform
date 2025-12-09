/**
 * CPT/ACF Preset Type Definitions
 *
 * Presets define reusable templates for forms, views, and page layouts.
 * They follow the SSOT (Single Source of Truth) principle.
 */
// ==================== Type Guards ====================
export function isFormPreset(preset) {
    return 'config' in preset && 'fields' in preset.config;
}
export function isViewPreset(preset) {
    return 'config' in preset && 'renderMode' in preset.config;
}
export function isTemplatePreset(preset) {
    return 'config' in preset && 'layout' in preset.config;
}
//# sourceMappingURL=preset.js.map