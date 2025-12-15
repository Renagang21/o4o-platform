/**
 * AGButton - Antigravity Button Component for Cosmetics Suite
 */

import React from 'react';
import { cosmeticsTheme } from '../theme/index.js';

export interface AGButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    mode?: 'primary' | 'seller' | 'partner' | 'supplier' | 'sample';
    fullWidth?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
}

export const AGButton: React.FC<AGButtonProps> = ({
    variant = 'primary',
    size = 'md',
    mode = 'primary',
    fullWidth = false,
    loading = false,
    icon,
    children,
    disabled,
    className = '',
    ...props
}) => {
    const getVariantStyles = () => {
        const modeColors = {
            primary: cosmeticsTheme.colors.primary,
            seller: cosmeticsTheme.colors.sellerMode,
            partner: cosmeticsTheme.colors.partnerMode,
            supplier: cosmeticsTheme.colors.supplierMode,
            sample: cosmeticsTheme.colors.sampleMode,
        };

        const colors = modeColors[mode];

        switch (variant) {
            case 'primary':
                return {
                    backgroundColor: colors[500],
                    color: '#FFFFFF',
                    border: 'none',
                    hover: colors[600],
                };
            case 'secondary':
                return {
                    backgroundColor: 'transparent',
                    color: colors[700],
                    border: `1px solid ${colors[300]}`,
                    hover: colors[50],
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                    color: colors[700],
                    border: 'none',
                    hover: colors[50],
                };
            case 'danger':
                return {
                    backgroundColor: cosmeticsTheme.colors.error[500],
                    color: '#FFFFFF',
                    border: 'none',
                    hover: cosmeticsTheme.colors.error[700],
                };
            default:
                return {
                    backgroundColor: colors[500],
                    color: '#FFFFFF',
                    border: 'none',
                    hover: colors[600],
                };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'sm':
                return {
                    padding: `${cosmeticsTheme.spacing[2]} ${cosmeticsTheme.spacing[3]}`,
                    fontSize: cosmeticsTheme.typography.ui.button.sm.fontSize,
                    fontWeight: cosmeticsTheme.typography.ui.button.sm.fontWeight,
                };
            case 'md':
                return {
                    padding: `${cosmeticsTheme.spacing[3]} ${cosmeticsTheme.spacing[4]}`,
                    fontSize: cosmeticsTheme.typography.ui.button.md.fontSize,
                    fontWeight: cosmeticsTheme.typography.ui.button.md.fontWeight,
                };
            case 'lg':
                return {
                    padding: `${cosmeticsTheme.spacing[4]} ${cosmeticsTheme.spacing[6]}`,
                    fontSize: cosmeticsTheme.typography.ui.button.lg.fontSize,
                    fontWeight: cosmeticsTheme.typography.ui.button.lg.fontWeight,
                };
        }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    const baseStyles: React.CSSProperties = {
        ...sizeStyles,
        backgroundColor: variantStyles.backgroundColor,
        color: variantStyles.color,
        border: variantStyles.border,
        borderRadius: cosmeticsTheme.borderRadius.md,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        fontFamily: cosmeticsTheme.typography.fontFamily.sans,
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: cosmeticsTheme.spacing[2],
        transition: 'all 0.2s ease',
        boxShadow: variant === 'primary' ? cosmeticsTheme.shadows.sm : 'none',
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
            e.currentTarget.style.backgroundColor = variantStyles.hover;
        }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
            e.currentTarget.style.backgroundColor = variantStyles.backgroundColor;
        }
    };

    return (
        <button
            style={baseStyles}
            className={className}
            disabled={disabled || loading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {loading && <span>⏳</span>}
            {icon && <span>{icon}</span>}
            {children}
        </button>
    );
};

export default AGButton;
