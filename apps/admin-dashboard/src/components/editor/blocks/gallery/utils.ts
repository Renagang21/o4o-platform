/**
 * Gallery Block Utilities
 * WordPress Gutenberg 호환성 및 유틸리티 함수들
 */

import { GalleryImage, GalleryAttributes, WordPressGalleryShortcode } from './types';

/**
 * WordPress Gallery Shortcode를 갤러리 attributes로 변환
 */
export const parseWordPressGalleryShortcode = (shortcode: string): Partial<GalleryAttributes> | null => {
  const galleryRegex = /\[gallery([^\]]*)\]/;
  const match = shortcode.match(galleryRegex);

  if (!match) return null;

  const attributes: Partial<GalleryAttributes> = {};
  const params = match[1];

  // Extract parameters
  const paramRegex = /(\w+)=["']?([^"'\s]+)["']?/g;
  let paramMatch;

  while ((paramMatch = paramRegex.exec(params)) !== null) {
    const [, key, value] = paramMatch;

    switch (key) {
      case 'columns':
        const cols = parseInt(value);
        if (!isNaN(cols) && cols > 0 && cols <= 8) {
          attributes.columns = cols;
        }
        break;

      case 'ids':
        // Parse comma-separated IDs
        const ids = value.split(',').map(id => id.trim()).filter(Boolean);
        attributes.ids = ids;
        break;

      case 'size':
        // Map WordPress image sizes to aspect ratios
        const sizeMap: Record<string, string> = {
          'thumbnail': 'square',
          'medium': '4:3',
          'large': '16:9',
          'full': 'auto'
        };
        if (sizeMap[value]) {
          attributes.aspectRatio = sizeMap[value] as any;
        }
        break;

      case 'link':
        const linkMap: Record<string, any> = {
          'none': 'none',
          'file': 'media',
          'post': 'attachment'
        };
        if (linkMap[value]) {
          attributes.linkTo = linkMap[value];
        }
        break;

      case 'orderby':
        if (value === 'rand') {
          attributes.randomOrder = true;
        }
        break;
    }
  }

  return attributes;
};

/**
 * 갤러리 attributes를 WordPress Gallery Shortcode로 변환
 */
export const generateWordPressGalleryShortcode = (attributes: GalleryAttributes): string => {
  const params: string[] = [];

  // IDs
  if (attributes.ids.length > 0) {
    params.push(`ids="${attributes.ids.join(',')}"`);
  }

  // Columns
  if (attributes.columns !== 3) {
    params.push(`columns="${attributes.columns}"`);
  }

  // Size (aspect ratio to WordPress size mapping)
  const aspectRatioToSize: Record<string, string> = {
    'square': 'thumbnail',
    '4:3': 'medium',
    '16:9': 'large',
    'auto': 'full'
  };
  const size = aspectRatioToSize[attributes.aspectRatio];
  if (size && size !== 'full') {
    params.push(`size="${size}"`);
  }

  // Link
  const linkToWP: Record<string, string> = {
    'none': 'none',
    'media': 'file',
    'attachment': 'post'
  };
  const link = linkToWP[attributes.linkTo];
  if (link && link !== 'none') {
    params.push(`link="${link}"`);
  }

  // Random order
  if (attributes.randomOrder) {
    params.push(`orderby="rand"`);
  }

  return `[gallery ${params.join(' ')}]`;
};

/**
 * 갤러리 HTML 클래스 생성 (WordPress 스타일)
 */
export const generateGalleryClasses = (attributes: GalleryAttributes): string => {
  const classes: string[] = ['wp-block-gallery'];

  // Layout classes
  classes.push(`is-layout-${attributes.layout}`);

  // Column classes
  classes.push(`has-${attributes.columns}-columns`);

  // Alignment
  if (attributes.align && attributes.align !== 'center') {
    classes.push(`align${attributes.align}`);
  }

  // Image crop
  if (attributes.imageCrop) {
    classes.push('is-cropped');
  }

  // Custom class
  if (attributes.className) {
    classes.push(attributes.className);
  }

  return classes.join(' ');
};

/**
 * 갤러리 CSS 스타일 생성
 */
export const generateGalleryStyles = (attributes: GalleryAttributes): React.CSSProperties => {
  const styles: React.CSSProperties = {};

  // Layout specific styles
  switch (attributes.layout) {
    case 'grid':
      styles.display = 'grid';
      styles.gridTemplateColumns = `repeat(${attributes.columns}, minmax(0, 1fr))`;
      styles.gap = `${attributes.gap}px`;
      break;

    case 'masonry':
      styles.columnCount = attributes.columns;
      styles.columnGap = `${attributes.gap}px`;
      styles.columnFill = 'auto';
      break;

    case 'slider':
      styles.display = 'flex';
      styles.gap = `${attributes.gap}px`;
      styles.overflowX = 'auto';
      styles.scrollSnapType = 'x mandatory';
      break;
  }

  // Padding
  if (attributes.padding > 0) {
    styles.padding = `${attributes.padding}px`;
  }

  // Border
  if (attributes.borderWidth > 0) {
    styles.border = `${attributes.borderWidth}px solid ${attributes.borderColor}`;
  }

  // Border radius
  if (attributes.borderRadius > 0) {
    styles.borderRadius = `${attributes.borderRadius}px`;
  }

  return styles;
};

/**
 * 이미지 스타일 생성
 */
export const generateImageStyles = (
  image: GalleryImage,
  attributes: GalleryAttributes
): React.CSSProperties => {
  const styles: React.CSSProperties = {};

  // Aspect ratio
  if (attributes.aspectRatio !== 'auto' && attributes.layout !== 'masonry') {
    const ratioMap: Record<string, string> = {
      'square': '1 / 1',
      '4:3': '4 / 3',
      '16:9': '16 / 9',
      '3:2': '3 / 2'
    };
    styles.aspectRatio = ratioMap[attributes.aspectRatio];
  }

  // Border radius
  if (attributes.borderRadius > 0) {
    styles.borderRadius = `${attributes.borderRadius}px`;
  }

  // Object fit
  if (attributes.imageCrop) {
    styles.objectFit = 'cover';
  }

  // Individual image transformations
  if (image.rotation) {
    styles.transform = `rotate(${image.rotation}deg)`;
  }

  // Filters
  if (image.filters) {
    const filters: string[] = [];

    if (image.filters.brightness !== undefined && image.filters.brightness !== 100) {
      filters.push(`brightness(${image.filters.brightness}%)`);
    }
    if (image.filters.contrast !== undefined && image.filters.contrast !== 100) {
      filters.push(`contrast(${image.filters.contrast}%)`);
    }
    if (image.filters.saturation !== undefined && image.filters.saturation !== 100) {
      filters.push(`saturate(${image.filters.saturation}%)`);
    }
    if (image.filters.blur !== undefined && image.filters.blur > 0) {
      filters.push(`blur(${image.filters.blur}px)`);
    }
    if (image.filters.sepia) {
      filters.push('sepia(1)');
    }
    if (image.filters.grayscale) {
      filters.push('grayscale(1)');
    }

    if (filters.length > 0) {
      styles.filter = filters.join(' ');
    }
  }

  return styles;
};

/**
 * 반응형 컬럼 계산
 */
export const getResponsiveColumns = (
  baseColumns: number,
  screenWidth: number,
  responsiveColumns?: { mobile: number; tablet: number; desktop: number }
): number => {
  if (!responsiveColumns) {
    // Default responsive behavior
    if (screenWidth < 640) return Math.min(baseColumns, 2);
    if (screenWidth < 1024) return Math.min(baseColumns, 3);
    return baseColumns;
  }

  if (screenWidth < 640) return responsiveColumns.mobile;
  if (screenWidth < 1024) return responsiveColumns.tablet;
  return Math.min(baseColumns, responsiveColumns.desktop);
};

/**
 * 이미지 배열을 컬럼별로 분배 (메이슨리 레이아웃용)
 */
export const distributeImagesAcrossColumns = (
  images: GalleryImage[],
  columns: number
): GalleryImage[][] => {
  const columnArrays: GalleryImage[][] = Array.from({ length: columns }, () => []);
  const columnHeights = new Array(columns).fill(0);

  images.forEach(image => {
    // Find the column with the least height
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

    // Add image to that column
    columnArrays[shortestColumnIndex].push(image);

    // Estimate height based on aspect ratio
    const estimatedHeight = image.height && image.width
      ? (300 * image.height) / image.width
      : 300; // Default height estimate

    columnHeights[shortestColumnIndex] += estimatedHeight;
  });

  return columnArrays;
};

/**
 * 갤러리 접근성 속성 생성
 */
export const generateAccessibilityProps = (
  attributes: GalleryAttributes,
  imageIndex?: number
) => {
  const props: Record<string, any> = {};

  if (imageIndex !== undefined) {
    // Individual image accessibility
    props.role = 'img';
    props.tabIndex = 0;
    props['aria-label'] = `Image ${imageIndex + 1} of ${attributes.images.length}`;

    if (attributes.enableLightbox) {
      props['aria-describedby'] = 'Click to view in lightbox';
    }
  } else {
    // Gallery container accessibility
    props.role = 'group';
    props['aria-label'] = `Gallery with ${attributes.images.length} images`;
    props['aria-describedby'] = `Gallery layout: ${attributes.layout}`;
  }

  return props;
};

/**
 * 이미지 로딩 최적화를 위한 속성 생성
 */
export const generateImageLoadingProps = (
  image: GalleryImage,
  index: number,
  isVisible: boolean = true
) => {
  const props: Record<string, any> = {
    src: image.url,
    alt: image.alt,
    title: image.title,
    width: image.width,
    height: image.height
  };

  // Lazy loading for images not immediately visible
  if (index > 3 || !isVisible) {
    props.loading = 'lazy';
    props.decoding = 'async';
  } else {
    props.loading = 'eager';
  }

  // Use thumbnail for initial load if available
  if (image.thumbnailUrl && index > 6) {
    props.src = image.thumbnailUrl;
    props['data-full-src'] = image.url;
  }

  return props;
};

/**
 * 갤러리 성능 최적화를 위한 가상화 계산
 */
export const calculateVirtualization = (
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  overscan: number = 5
) => {
  const viewportHeight = containerHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight);

  return {
    startIndex: Math.max(0, startIndex - overscan),
    endIndex: Math.min(endIndex + overscan),
    offsetY: startIndex * itemHeight
  };
};

/**
 * 이미지 메타데이터 추출
 */
export const extractImageMetadata = (file: File): Promise<Partial<GalleryImage>> => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileSize: file.size,
        mimeType: file.type,
        title: file.name.replace(/\.[^/.]+$/, ''),
        alt: file.name.replace(/\.[^/.]+$/, '')
      });
    };

    img.onerror = () => {
      resolve({
        fileSize: file.size,
        mimeType: file.type,
        title: file.name,
        alt: file.name
      });
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * 색상 유틸리티 함수
 */
export const colorUtils = {
  // Hex to RGB 변환
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // RGB to Hex 변환
  rgbToHex: (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  // 대비 확인
  getContrastRatio: (color1: string, color2: string): number => {
    const getLuminance = (color: string) => {
      const rgb = colorUtils.hexToRgb(color);
      if (!rgb) return 0;

      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);

    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  }
};

/**
 * 디바운스 유틸리티
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 스로틀 유틸리티
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};