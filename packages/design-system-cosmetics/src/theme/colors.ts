/**
 * Cosmetics Design System - Color Tokens
 * 
 * Antigravity-based color palette customized for Cosmetics Suite
 */

export const cosmeticsColors = {
    // Primary Cosmetics Brand (Pink/Rose)
    primary: {
        50: '#FFF5F7',
        100: '#FFE0E8',
        200: '#FFC1D1',
        300: '#FFA2BA',
        400: '#FF83A3',
        500: '#E91E63', // Main brand pink
        600: '#C2185B',
        700: '#AD1457',
        800: '#880E4F',
        900: '#560027',
    },

    // Seller Mode (Green)
    sellerMode: {
        50: '#E8F5E9',
        100: '#C8E6C9',
        200: '#A5D6A7',
        300: '#81C784',
        400: '#66BB6A',
        500: '#4CAF50', // Main seller green
        600: '#43A047',
        700: '#388E3C',
        800: '#2E7D32',
        900: '#1B5E20',
    },

    // Partner Mode (Orange)
    partnerMode: {
        50: '#FFF3E0',
        100: '#FFE0B2',
        200: '#FFCC80',
        300: '#FFB74D',
        400: '#FFA726',
        500: '#FF9800', // Main partner orange
        600: '#FB8C00',
        700: '#F57C00',
        800: '#EF6C00',
        900: '#E65100',
    },

    // Supplier Mode (Blue)
    supplierMode: {
        50: '#E3F2FD',
        100: '#BBDEFB',
        200: '#90CAF9',
        300: '#64B5F6',
        400: '#42A5F5',
        500: '#2196F3', // Main supplier blue
        600: '#1E88E5',
        700: '#1976D2',
        800: '#1565C0',
        900: '#0D47A1',
    },

    // Sample/Display Mode (Purple)
    sampleMode: {
        50: '#F3E5F5',
        100: '#E1BEE7',
        200: '#CE93D8',
        300: '#BA68C8',
        400: '#AB47BC',
        500: '#9C27B0', // Main sample purple
        600: '#8E24AA',
        700: '#7B1FA2',
        800: '#6A1B9A',
        900: '#4A148C',
    },

    // Neutral (Gray scale)
    neutral: {
        0: '#FFFFFF',
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#EEEEEE',
        300: '#E0E0E0',
        400: '#BDBDBD',
        500: '#9E9E9E',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121',
        1000: '#000000',
    },

    // Semantic Colors
    success: {
        50: '#E8F5E9',
        500: '#4CAF50',
        700: '#388E3C',
    },

    warning: {
        50: '#FFF3E0',
        500: '#FF9800',
        700: '#F57C00',
    },

    error: {
        50: '#FFEBEE',
        500: '#F44336',
        700: '#D32F2F',
    },

    info: {
        50: '#E3F2FD',
        500: '#2196F3',
        700: '#1976D2',
    },
} as const;

export type CosmeticsColorScale = typeof cosmeticsColors;
export type CosmeticsModeColor = 'primary' | 'sellerMode' | 'partnerMode' | 'supplierMode' | 'sampleMode';
