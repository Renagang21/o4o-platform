"use strict";
/**
 * Customizer Settings Validators (Zod Schemas)
 * Validates request payloads for customizer API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreadcrumbsSchema = exports.ButtonSettingsSchema = exports.ScrollToTopSchema = void 0;
const zod_1 = require("zod");
// ============================================
// Common Schemas
// ============================================
/**
 * Responsive Value Schema
 * Used for values that differ across devices
 */
const ResponsiveValueSchema = zod_1.z.object({
    desktop: zod_1.z.number(),
    tablet: zod_1.z.number(),
    mobile: zod_1.z.number(),
});
/**
 * Font Weight Schema
 */
const FontWeightSchema = zod_1.z.union([
    zod_1.z.literal(100),
    zod_1.z.literal(200),
    zod_1.z.literal(300),
    zod_1.z.literal(400),
    zod_1.z.literal(500),
    zod_1.z.literal(600),
    zod_1.z.literal(700),
    zod_1.z.literal(800),
    zod_1.z.literal(900),
]);
/**
 * Text Transform Schema
 */
const TextTransformSchema = zod_1.z.enum(['none', 'capitalize', 'uppercase', 'lowercase']);
// ============================================
// Scroll to Top Schema
// ============================================
exports.ScrollToTopSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().default(true),
    displayType: zod_1.z.enum(['desktop', 'mobile', 'both']).default('both'),
    threshold: zod_1.z.number().min(0).optional().default(300),
    backgroundColor: zod_1.z.string().optional().default('#3b82f6'),
    iconColor: zod_1.z.string().optional().default('#ffffff'),
    position: zod_1.z.enum(['left', 'right']).optional().default('right'),
});
// ============================================
// Button Settings Schema
// ============================================
/**
 * Button Style Settings Schema
 */
const ButtonStyleSettingsSchema = zod_1.z.object({
    // Basic styles
    backgroundColor: zod_1.z.string(),
    textColor: zod_1.z.string(),
    borderWidth: zod_1.z.number().min(0),
    borderColor: zod_1.z.string(),
    borderStyle: zod_1.z.enum(['solid', 'dashed', 'dotted', 'double', 'none']),
    borderRadius: zod_1.z.number().min(0),
    paddingVertical: zod_1.z.number().min(0),
    paddingHorizontal: zod_1.z.number().min(0),
    // Hover effects
    hoverBackgroundColor: zod_1.z.string(),
    hoverTextColor: zod_1.z.string(),
    hoverBorderColor: zod_1.z.string(),
    hoverTransform: zod_1.z.enum(['none', 'scale', 'translateY']).optional(),
    transitionDuration: zod_1.z.number().min(0),
    // Typography
    fontFamily: zod_1.z.string().optional(),
    fontSize: ResponsiveValueSchema,
    fontWeight: FontWeightSchema,
    textTransform: TextTransformSchema,
    letterSpacing: zod_1.z.number(),
    // Shadow
    boxShadow: zod_1.z.enum(['none', 'small', 'medium', 'large']).optional(),
    hoverBoxShadow: zod_1.z.enum(['none', 'small', 'medium', 'large']).optional(),
});
/**
 * Button Variants Schema
 */
exports.ButtonSettingsSchema = zod_1.z.object({
    primary: ButtonStyleSettingsSchema,
    secondary: ButtonStyleSettingsSchema.partial().optional(),
    outline: ButtonStyleSettingsSchema.partial().optional(),
    text: ButtonStyleSettingsSchema.partial().optional(),
    global: zod_1.z.object({
        minHeight: zod_1.z.number().min(0).optional(),
        minWidth: zod_1.z.number().min(0).optional(),
        displayType: zod_1.z.enum(['inline-block', 'block', 'inline-flex']).optional(),
        iconSpacing: zod_1.z.number().min(0).optional(),
    }).optional(),
});
// ============================================
// Breadcrumbs Schema
// ============================================
exports.BreadcrumbsSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().default(true),
    position: zod_1.z.enum(['above-content', 'below-header']).default('below-header'),
    homeText: zod_1.z.string().default('Home'),
    separator: zod_1.z.enum(['>', '/', '→', '•', '|']).default('>'),
    showCurrentPage: zod_1.z.boolean().default(true),
    showOnHomepage: zod_1.z.boolean().default(false),
    // Colors
    linkColor: zod_1.z.string().default('#3b82f6'),
    currentPageColor: zod_1.z.string().default('#6b7280'),
    separatorColor: zod_1.z.string().default('#9ca3af'),
    hoverColor: zod_1.z.string().default('#2563eb'),
    // Typography
    fontSize: ResponsiveValueSchema.default({
        desktop: 14,
        tablet: 13,
        mobile: 12,
    }),
    fontWeight: FontWeightSchema.default(400),
    textTransform: TextTransformSchema.default('none'),
    // Spacing
    itemSpacing: zod_1.z.number().min(0).default(8),
    marginTop: zod_1.z.number().min(0).default(16),
    marginBottom: zod_1.z.number().min(0).default(16),
    // Advanced
    maxLength: zod_1.z.number().min(0).optional(),
    showIcons: zod_1.z.boolean().optional().default(false),
    mobileHidden: zod_1.z.boolean().optional().default(false),
});
//# sourceMappingURL=customizer.validators.js.map