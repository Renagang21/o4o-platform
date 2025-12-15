/**
 * Cosmetics Design System - Typography Scale
 */

export const typography = {
    // Font Families
    fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"SF Mono", "Consolas", "Liberation Mono", Menlo, monospace',
    },

    // Font Sizes
    fontSize: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
        '5xl': '3rem',     // 48px
    },

    // Font Weights
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    // Line Heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.6,
        loose: 1.8,
    },

    // Heading Styles
    headings: {
        h1: {
            fontSize: '2.25rem',  // 36px
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontSize: '1.875rem', // 30px
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontSize: '1.5rem',   // 24px
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1.25rem',  // 20px
            fontWeight: 500,
            lineHeight: 1.5,
        },
        h5: {
            fontSize: '1.125rem', // 18px
            fontWeight: 500,
            lineHeight: 1.5,
        },
        h6: {
            fontSize: '1rem',     // 16px
            fontWeight: 500,
            lineHeight: 1.5,
        },
    },

    // Body Text Styles
    body: {
        lg: {
            fontSize: '1.125rem', // 18px
            lineHeight: 1.6,
        },
        md: {
            fontSize: '1rem',     // 16px
            lineHeight: 1.5,
        },
        sm: {
            fontSize: '0.875rem', // 14px
            lineHeight: 1.4,
        },
    },

    // UI Text Styles
    ui: {
        button: {
            lg: { fontSize: '1rem', fontWeight: 500 },
            md: { fontSize: '0.875rem', fontWeight: 500 },
            sm: { fontSize: '0.75rem', fontWeight: 500 },
        },
        label: {
            fontSize: '0.875rem',
            fontWeight: 500,
        },
        caption: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
        },
    },
} as const;

export type TypographyScale = typeof typography;
