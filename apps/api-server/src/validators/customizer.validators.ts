/**
 * Customizer Settings Validators (Zod Schemas)
 * Validates request payloads for customizer API endpoints
 */

import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

/**
 * Responsive Value Schema
 * Used for values that differ across devices
 */
const ResponsiveValueSchema = z.object({
  desktop: z.number(),
  tablet: z.number(),
  mobile: z.number(),
});

/**
 * Font Weight Schema
 */
const FontWeightSchema = z.union([
  z.literal(100),
  z.literal(200),
  z.literal(300),
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
  z.literal(900),
]);

/**
 * Text Transform Schema
 */
const TextTransformSchema = z.enum(['none', 'capitalize', 'uppercase', 'lowercase']);

// ============================================
// Scroll to Top Schema
// ============================================

export const ScrollToTopSchema = z.object({
  enabled: z.boolean().default(true),
  displayType: z.enum(['desktop', 'mobile', 'both']).default('both'),
  threshold: z.number().min(0).optional().default(300),
  backgroundColor: z.string().optional().default('#3b82f6'),
  iconColor: z.string().optional().default('#ffffff'),
  position: z.enum(['left', 'right']).optional().default('right'),
});

export type ScrollToTopInput = z.infer<typeof ScrollToTopSchema>;

// ============================================
// Button Settings Schema
// ============================================

/**
 * Button Style Settings Schema
 */
const ButtonStyleSettingsSchema = z.object({
  // Basic styles
  backgroundColor: z.string(),
  textColor: z.string(),
  borderWidth: z.number().min(0),
  borderColor: z.string(),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'double', 'none']),
  borderRadius: z.number().min(0),
  paddingVertical: z.number().min(0),
  paddingHorizontal: z.number().min(0),

  // Hover effects
  hoverBackgroundColor: z.string(),
  hoverTextColor: z.string(),
  hoverBorderColor: z.string(),
  hoverTransform: z.enum(['none', 'scale', 'translateY']).optional(),
  transitionDuration: z.number().min(0),

  // Typography
  fontFamily: z.string().optional(),
  fontSize: ResponsiveValueSchema,
  fontWeight: FontWeightSchema,
  textTransform: TextTransformSchema,
  letterSpacing: z.number(),

  // Shadow
  boxShadow: z.enum(['none', 'small', 'medium', 'large']).optional(),
  hoverBoxShadow: z.enum(['none', 'small', 'medium', 'large']).optional(),
});

/**
 * Button Variants Schema
 */
export const ButtonSettingsSchema = z.object({
  primary: ButtonStyleSettingsSchema,
  secondary: ButtonStyleSettingsSchema.partial().optional(),
  outline: ButtonStyleSettingsSchema.partial().optional(),
  text: ButtonStyleSettingsSchema.partial().optional(),
  global: z.object({
    minHeight: z.number().min(0).optional(),
    minWidth: z.number().min(0).optional(),
    displayType: z.enum(['inline-block', 'block', 'inline-flex']).optional(),
    iconSpacing: z.number().min(0).optional(),
  }).optional(),
});

export type ButtonSettingsInput = z.infer<typeof ButtonSettingsSchema>;

// ============================================
// Breadcrumbs Schema
// ============================================

export const BreadcrumbsSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(['above-content', 'below-header']).default('below-header'),
  homeText: z.string().default('Home'),
  separator: z.enum(['>', '/', '→', '•', '|']).default('>'),
  showCurrentPage: z.boolean().default(true),
  showOnHomepage: z.boolean().default(false),

  // Colors
  linkColor: z.string().default('#3b82f6'),
  currentPageColor: z.string().default('#6b7280'),
  separatorColor: z.string().default('#9ca3af'),
  hoverColor: z.string().default('#2563eb'),

  // Typography
  fontSize: ResponsiveValueSchema.default({
    desktop: 14,
    tablet: 13,
    mobile: 12,
  }),
  fontWeight: FontWeightSchema.default(400),
  textTransform: TextTransformSchema.default('none'),

  // Spacing
  itemSpacing: z.number().min(0).default(8),
  marginTop: z.number().min(0).default(16),
  marginBottom: z.number().min(0).default(16),

  // Advanced
  maxLength: z.number().min(0).optional(),
  showIcons: z.boolean().optional().default(false),
  mobileHidden: z.boolean().optional().default(false),
});

export type BreadcrumbsInput = z.infer<typeof BreadcrumbsSchema>;
