import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { ContentApi } from '@/api/contentApi';
const ResponsiveImage = ({ mediaId, alt = '', className = '', sizes, loading = 'lazy', priority = false, quality: _quality = 85, format = 'auto', fallback, onLoad, onError, width, height, maxWidth, maxHeight, aspectRatio, breakpoints, objectFit = 'cover', objectPosition = 'center', placeholder = 'blur', placeholderColor = '#f3f4f6' }) => {
    const [mediaFile, setMediaFile] = useState(null);
    const [imageFormats, setImageFormats] = useState(null);
    const [loadingState, setLoadingState] = useState('loading');
    const [currentSrc, setCurrentSrc] = useState('');
    const [placeholderSrc, setPlaceholderSrc] = useState('');
    const imgRef = useRef(null);
    const [isIntersecting, setIsIntersecting] = useState(!loading || priority);
    useEffect(() => {
        loadMediaFile();
    }, [mediaId]);
    useEffect(() => {
        if (loading === 'lazy' && !priority) {
            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    observer.disconnect();
                }
            }, { threshold: 0.1, rootMargin: '50px' });
            if (imgRef.current) {
                observer.observe(imgRef.current);
            }
            return () => observer.disconnect();
        }
    }, [loading, priority]);
    const loadMediaFile = async () => {
        try {
            const response = await ContentApi.getMediaFile(mediaId);
            const file = response.data;
            setMediaFile(file);
            const formats = parseImageFormats(file);
            setImageFormats(formats);
            if (placeholder === 'blur') {
                setPlaceholderSrc(generatePlaceholder(file));
            }
        }
        catch (error) {
            console.error('Failed to load media file:', error);
            setLoadingState('error');
            onError?.(error);
        }
    };
    const parseImageFormats = (file) => {
        const sizes = file.sizes || [];
        const formats = {
            webp: {
                thumbnail: '',
                small: '',
                medium: '',
                large: '',
                original: ''
            },
            jpg: {
                thumbnail: '',
                small: '',
                medium: '',
                large: '',
                original: ''
            }
        };
        const baseUrl = '/uploads';
        const [year, month] = file.uploadedAt.split('-');
        const datePath = `${year}/${month.padStart(2, '0')}`;
        const sizeNames = ['thumbnail', 'small', 'medium', 'large', 'original'];
        sizeNames.forEach(sizeName => {
            const sizeData = sizes.find(s => s.name === sizeName);
            if (sizeData) {
                const filename = file.filename.replace(/\.[^/.]+$/, '');
                formats.webp[sizeName] =
                    `${baseUrl}/${datePath}/${sizeName}/${filename}.webp`;
                if (supportsAVIF()) {
                    if (!formats.avif)
                        formats.avif = { thumbnail: '', small: '', medium: '', large: '', original: '' };
                    formats.avif[sizeName] =
                        `${baseUrl}/${datePath}/${sizeName}/${filename}.avif`;
                }
                formats.jpg[sizeName] =
                    `${baseUrl}/${datePath}/${sizeName}/${filename}.jpg`;
            }
        });
        return formats;
    };
    const supportsAVIF = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/avif').indexOf('image/avif') !== -1;
    };
    const supportsWebP = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('image/webp') !== -1;
    };
    const generatePlaceholder = (file) => {
        if (file.thumbnailUrl) {
            return file.thumbnailUrl;
        }
        const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${placeholderColor}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="12" font-family="system-ui">
          Loading...
        </text>
      </svg>
    `;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    };
    const generateSrcSet = () => {
        if (!imageFormats)
            return '';
        let formatToUse;
        if (format === 'auto') {
            if (imageFormats.avif && supportsAVIF()) {
                formatToUse = 'avif';
            }
            else if (supportsWebP()) {
                formatToUse = 'webp';
            }
            else {
                formatToUse = 'jpg';
            }
        }
        else if (format === 'avif' && imageFormats.avif) {
            formatToUse = 'avif';
        }
        else if (format === 'webp') {
            formatToUse = 'webp';
        }
        else {
            formatToUse = 'jpg';
        }
        const selectedFormat = imageFormats[formatToUse];
        const srcSetEntries = [
            `${selectedFormat?.small} 300w`,
            `${selectedFormat?.medium} 768w`,
            `${selectedFormat?.large} 1200w`,
            `${selectedFormat?.original} 2400w`
        ].filter(entry => !entry.includes('undefined'));
        return srcSetEntries.join(', ');
    };
    const generateSizes = () => {
        if (sizes)
            return sizes;
        if (breakpoints) {
            const sizeQueries = [];
            if (breakpoints.mobile) {
                sizeQueries.push(`(max-width: 640px) ${breakpoints.mobile}`);
            }
            if (breakpoints.tablet) {
                sizeQueries.push(`(max-width: 1024px) ${breakpoints.tablet}`);
            }
            if (breakpoints.desktop) {
                sizeQueries.push(breakpoints.desktop);
            }
            return sizeQueries.join(', ') || '100vw';
        }
        if (maxWidth) {
            return `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${maxWidth}px`;
        }
        return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
    };
    const generateSrc = () => {
        if (!imageFormats)
            return fallback || '';
        let formatToUse = 'jpg';
        const selectedFormat = imageFormats[formatToUse];
        if (width && width <= 150)
            return selectedFormat.thumbnail;
        if (width && width <= 300)
            return selectedFormat.small;
        if (width && width <= 768)
            return selectedFormat.medium;
        if (width && width <= 1200)
            return selectedFormat.large;
        return selectedFormat.medium;
    };
    const handleLoad = () => {
        setLoadingState('loaded');
        onLoad?.();
    };
    const handleError = () => {
        setLoadingState('error');
        if (fallback && currentSrc !== fallback) {
            setCurrentSrc(fallback);
        }
        else {
            onError?.(new Error('Failed to load image'));
        }
    };
    useEffect(() => {
        if (isIntersecting && imageFormats) {
            setCurrentSrc(generateSrc());
        }
    }, [isIntersecting, imageFormats]);
    const imageStyle = {
        width,
        height,
        maxWidth,
        maxHeight,
        aspectRatio,
        objectFit,
        objectPosition,
        transition: 'opacity 0.3s ease-in-out',
        opacity: loadingState === 'loaded' ? 1 : 0
    };
    const placeholderStyle = {
        ...imageStyle,
        opacity: loadingState === 'loaded' ? 0 : 1,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
    };
    if (!mediaFile) {
        return (_jsx("div", { className: `bg-gray-200 animate-pulse ${className}`, style: { width, height, maxWidth, maxHeight, aspectRatio } }));
    }
    return (_jsxs("div", { className: `relative overflow-hidden ${className}`, style: { width, height, maxWidth, maxHeight, aspectRatio }, children: [placeholder && loadingState !== 'loaded' && (_jsx("img", { src: placeholderSrc || `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${placeholderColor}"/></svg>`)}`, alt: "", style: placeholderStyle, className: "blur-sm" })), isIntersecting && (_jsxs("picture", { children: [imageFormats?.avif && (_jsx("source", { srcSet: Object.entries(imageFormats.avif)
                            .filter(([_, url]) => url)
                            .map(([size, url]) => {
                            const widths = { thumbnail: 150, small: 300, medium: 768, large: 1200, original: 2400 };
                            return `${url} ${widths[size]}w`;
                        })
                            .join(', '), sizes: generateSizes(), type: "image/avif" })), imageFormats?.webp && (_jsx("source", { srcSet: Object.entries(imageFormats.webp)
                            .filter(([_, url]) => url)
                            .map(([size, url]) => {
                            const widths = { thumbnail: 150, small: 300, medium: 768, large: 1200, original: 2400 };
                            return `${url} ${widths[size]}w`;
                        })
                            .join(', '), sizes: generateSizes(), type: "image/webp" })), _jsx("img", { ref: imgRef, src: currentSrc, srcSet: generateSrcSet(), sizes: generateSizes(), alt: alt || mediaFile.altText || mediaFile.name, style: imageStyle, loading: loading, onLoad: handleLoad, onError: handleError, decoding: "async" })] })), loadingState === 'error' && (_jsx("div", { className: "flex items-center justify-center bg-gray-100 text-gray-400", style: { width, height, maxWidth, maxHeight, aspectRatio }, children: _jsx("svg", { className: "w-8 h-8", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z", clipRule: "evenodd" }) }) }))] }));
};
export default ResponsiveImage;
export const useResponsiveImage = (mediaId) => {
    const [mediaFile, setMediaFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const loadMedia = async () => {
            try {
                setLoading(true);
                const response = await ContentApi.getMediaFile(mediaId);
                setMediaFile(response.data);
            }
            catch (err) {
                setError(err);
            }
            finally {
                setLoading(false);
            }
        };
        if (mediaId) {
            loadMedia();
        }
    }, [mediaId]);
    return { mediaFile, loading, error };
};
export const SimpleResponsiveImage = ({ mediaId, alt, className, width, height }) => {
    return (_jsx(ResponsiveImage, { mediaId: mediaId, alt: alt, className: className, width: width, height: height, loading: "lazy", format: "auto", placeholder: "blur" }));
};
//# sourceMappingURL=ResponsiveImage.js.map