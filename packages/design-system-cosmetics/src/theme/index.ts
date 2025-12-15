/**
 * Cosmetics Design System - Theme Export
 */

import { cosmeticsColors, type CosmeticsColorScale, type CosmeticsModeColor } from './colors.js';
import { typography, type TypographyScale } from './typography.js';
import {
    spacing,
    borderRadius,
    shadows,
    breakpoints,
    zIndex,
    type SpacingScale,
    type BorderRadiusScale,
    type ShadowScale,
} from './spacing.js';

export const cosmeticsTheme = {
    colors: cosmeticsColors,
    typography,
    spacing,
    borderRadius,
    shadows,
    breakpoints,
    zIndex,
} as const;

export type CosmeticsTheme = typeof cosmeticsTheme;

// Re-export sub-modules
export {
    cosmeticsColors,
    typography,
    spacing,
    borderRadius,
    shadows,
    breakpoints,
    zIndex,
};

export type {
    CosmeticsColorScale,
    CosmeticsModeColor,
    TypographyScale,
    SpacingScale,
    BorderRadiusScale,
    ShadowScale,
};

export default cosmeticsTheme;
