/**
 * AGCard - Antigravity Card Component for Cosmetics Suite
 */

import React from 'react';
import { cosmeticsTheme } from '../theme/index.js';

export interface AGCardProps extends React.HTMLAttributes<HTMLDivElement> {
    elevation?: 0 | 1 | 2 | 3;
    padding?: 'compact' | 'comfortable' | 'spacious';
    mode?: 'primary' | 'seller' | 'partner' | 'supplier' | 'sample';
    hoverable?: boolean;
    header?: React.ReactNode;
    footer?: React.ReactNode;
}

export const AGCard: React.FC<AGCardProps> = ({
    elevation = 1,
    padding = 'comfortable',
    mode = 'primary',
    hoverable = false,
    header,
    footer,
    children,
    className = '',
    style,
    ...props
}) => {
    const getElevationShadow = () => {
        switch (elevation) {
            case 0:
                return 'none';
            case 1:
                return cosmeticsTheme.shadows.sm;
            case 2:
                return cosmeticsTheme.shadows.md;
            case 3:
                return cosmeticsTheme.shadows.lg;
        }
    };

    const getPaddingValue = () => {
        switch (padding) {
            case 'compact':
                return cosmeticsTheme.spacing[3];
            case 'comfortable':
                return cosmeticsTheme.spacing[4];
            case 'spacious':
                return cosmeticsTheme.spacing[6];
        }
    };

    const getModeAccent = () => {
        switch (mode) {
            case 'seller':
                return cosmeticsTheme.colors.sellerMode[500];
            case 'partner':
                return cosmeticsTheme.colors.partnerMode[500];
            case 'supplier':
                return cosmeticsTheme.colors.supplierMode[500];
            case 'sample':
                return cosmeticsTheme.colors.sampleMode[500];
            default:
                return cosmeticsTheme.colors.primary[500];
        }
    };

    const cardStyles: React.CSSProperties = {
        backgroundColor: '#FFFFFF',
        borderRadius: cosmeticsTheme.borderRadius.md,
        boxShadow: getElevationShadow(),
        border: `1px solid ${cosmeticsTheme.colors.neutral[200]}`,
        overflow: 'hidden',
        transition: hoverable ? 'all 0.2s ease' : 'none',
        cursor: hoverable ? 'pointer' : 'default',
        ...style,
    };

    const headerStyles: React.CSSProperties = {
        padding: getPaddingValue(),
        borderBottom: `1px solid ${cosmeticsTheme.colors.neutral[200]}`,
        borderTop: `3px solid ${getModeAccent()}`,
        fontWeight: cosmeticsTheme.typography.fontWeight.semibold,
        fontSize: cosmeticsTheme.typography.fontSize.lg,
    };

    const contentStyles: React.CSSProperties = {
        padding: getPaddingValue(),
    };

    const footerStyles: React.CSSProperties = {
        padding: getPaddingValue(),
        borderTop: `1px solid ${cosmeticsTheme.colors.neutral[200]}`,
        backgroundColor: cosmeticsTheme.colors.neutral[50],
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        if (hoverable) {
            e.currentTarget.style.boxShadow = cosmeticsTheme.shadows.lg;
            e.currentTarget.style.transform = 'translateY(-2px)';
        }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        if (hoverable) {
            e.currentTarget.style.boxShadow = getElevationShadow();
            e.currentTarget.style.transform = 'translateY(0)';
        }
    };

    return (
        <div
            style={cardStyles}
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {header && <div style={headerStyles}>{header}</div>}
            <div style={contentStyles}>{children}</div>
            {footer && <div style={footerStyles}>{footer}</div>}
        </div>
    );
};

export default AGCard;
