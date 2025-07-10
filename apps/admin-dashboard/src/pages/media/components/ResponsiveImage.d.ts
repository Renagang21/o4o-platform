import React from 'react';
import { MediaFile } from '@/types/content';
interface ResponsiveImageProps {
    mediaId: string;
    alt?: string;
    className?: string;
    sizes?: string;
    loading?: 'lazy' | 'eager';
    priority?: boolean;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg';
    fallback?: string;
    onLoad?: () => void;
    onError?: (error: Error) => void;
    width?: number;
    height?: number;
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: string;
    breakpoints?: {
        mobile?: string;
        tablet?: string;
        desktop?: string;
    };
    objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
    objectPosition?: string;
    placeholder?: 'blur' | 'empty' | string;
    placeholderColor?: string;
}
declare const ResponsiveImage: React.FC<ResponsiveImageProps>;
export default ResponsiveImage;
export declare const useResponsiveImage: (mediaId: string) => {
    mediaFile: MediaFile | null;
    loading: boolean;
    error: Error | null;
};
export declare const SimpleResponsiveImage: React.FC<{
    mediaId: string;
    alt?: string;
    className?: string;
    width?: number;
    height?: number;
}>;
//# sourceMappingURL=ResponsiveImage.d.ts.map