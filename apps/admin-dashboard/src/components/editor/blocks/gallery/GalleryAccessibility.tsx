/**
 * Gallery Accessibility Component
 * 갤러리 블록의 접근성 기능을 제공하는 컴포넌트
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { GalleryImage, GalleryAttributes } from './types';

interface GalleryAccessibilityProps {
  images: GalleryImage[];
  attributes: GalleryAttributes;
  currentFocus?: number;
  onFocusChange?: (index: number) => void;
  onImageActivate?: (index: number) => void;
  children: React.ReactNode;
}

/**
 * 키보드 네비게이션과 접근성을 관리하는 래퍼 컴포넌트
 */
export const GalleryAccessibility: React.FC<GalleryAccessibilityProps> = ({
  images,
  attributes,
  currentFocus = 0,
  onFocusChange,
  onImageActivate,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);

  // 스크린 리더용 실시간 공지사항
  const announceToScreenReader = useCallback((message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  // 키보드 네비게이션 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (images.length === 0) return;

    const { layout, columns } = attributes;
    let newFocus = currentFocus;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newFocus = Math.max(0, currentFocus - 1);
        break;

      case 'ArrowRight':
        e.preventDefault();
        newFocus = Math.min(images.length - 1, currentFocus + 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (layout === 'grid') {
          newFocus = Math.max(0, currentFocus - columns);
        } else {
          newFocus = Math.max(0, currentFocus - 1);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (layout === 'grid') {
          newFocus = Math.min(images.length - 1, currentFocus + columns);
        } else {
          newFocus = Math.min(images.length - 1, currentFocus + 1);
        }
        break;

      case 'Home':
        e.preventDefault();
        newFocus = 0;
        break;

      case 'End':
        e.preventDefault();
        newFocus = images.length - 1;
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        onImageActivate?.(currentFocus);
        announceToScreenReader(`Opening image ${currentFocus + 1} of ${images.length}`);
        return;

      case 'Escape':
        e.preventDefault();
        // This could close lightbox or exit edit mode
        return;

      default:
        return;
    }

    if (newFocus !== currentFocus) {
      onFocusChange?.(newFocus);
      const currentImage = images[newFocus];
      announceToScreenReader(
        `Image ${newFocus + 1} of ${images.length}: ${currentImage.alt || currentImage.title || 'Untitled'}`
      );
    }
  }, [images, attributes, currentFocus, onFocusChange, onImageActivate, announceToScreenReader]);

  // 포커스 관리
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 현재 포커스된 이미지 요소 찾기
    const focusedImage = container.querySelector(`[data-image-index="${currentFocus}"]`) as HTMLElement;
    if (focusedImage) {
      focusedImage.focus();
    }
  }, [currentFocus]);

  // ARIA 라이브 리전 설정
  useEffect(() => {
    announceToScreenReader(`Gallery loaded with ${images.length} images`);
  }, [images.length, announceToScreenReader]);

  return (
    <div
      ref={containerRef}
      role="grid"
      aria-label={`Image gallery with ${images.length} images using ${attributes.layout} layout`}
      aria-rowcount={Math.ceil(images.length / attributes.columns)}
      aria-colcount={attributes.columns}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="gallery-accessibility-wrapper"
    >
      {/* Screen reader only instructions */}
      <div className="sr-only">
        <p>
          Navigate using arrow keys. Press Enter or Space to open an image.
          Press Home to go to first image, End to go to last image.
          {attributes.enableLightbox && ' Images open in lightbox view.'}
        </p>
      </div>

      {/* Live announcements for screen readers */}
      <div
        ref={announcementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Gallery content */}
      {children}
    </div>
  );
};

/**
 * 개별 이미지의 접근성 속성을 생성하는 훅
 */
export const useImageAccessibility = (
  image: GalleryImage,
  index: number,
  totalImages: number,
  isFocused: boolean = false
) => {
  const getAriaProps = useCallback(() => {
    const rowIndex = Math.floor(index / 3) + 1; // Assuming 3 columns for grid calculation
    const colIndex = (index % 3) + 1;

    return {
      role: 'gridcell',
      'aria-rowindex': rowIndex,
      'aria-colindex': colIndex,
      'aria-label': `Image ${index + 1} of ${totalImages}: ${image.alt || image.title || 'Untitled image'}`,
      'aria-describedby': image.caption ? `caption-${image.id}` : undefined,
      'data-image-index': index,
      tabIndex: isFocused ? 0 : -1,
    };
  }, [image, index, totalImages, isFocused]);

  return { getAriaProps };
};

/**
 * 갤러리 키보드 네비게이션 훅
 */
export const useGalleryKeyboardNavigation = (
  images: GalleryImage[],
  layout: string,
  columns: number
) => {
  const [currentFocus, setCurrentFocus] = React.useState(0);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
    let newFocus = currentFocus;

    switch (direction) {
      case 'left':
        newFocus = Math.max(0, currentFocus - 1);
        break;
      case 'right':
        newFocus = Math.min(images.length - 1, currentFocus + 1);
        break;
      case 'up':
        if (layout === 'grid') {
          newFocus = Math.max(0, currentFocus - columns);
        } else {
          newFocus = Math.max(0, currentFocus - 1);
        }
        break;
      case 'down':
        if (layout === 'grid') {
          newFocus = Math.min(images.length - 1, currentFocus + columns);
        } else {
          newFocus = Math.min(images.length - 1, currentFocus + 1);
        }
        break;
      case 'home':
        newFocus = 0;
        break;
      case 'end':
        newFocus = images.length - 1;
        break;
    }

    setCurrentFocus(newFocus);
    return newFocus;
  }, [currentFocus, images.length, layout, columns]);

  return {
    currentFocus,
    setCurrentFocus,
    moveFocus
  };
};

/**
 * 스크린 리더 지원을 위한 커스텀 훅
 */
export const useScreenReaderSupport = () => {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const AnnouncementRegion = useCallback(() => (
    <div
      ref={announcementRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  ), []);

  return {
    announce,
    AnnouncementRegion
  };
};

/**
 * 고대비 모드 감지 훅
 */
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Windows 고대비 모드 감지
      if (window.matchMedia) {
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        setIsHighContrast(highContrastQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
          setIsHighContrast(e.matches);
        };

        highContrastQuery.addEventListener('change', handleChange);
        return () => highContrastQuery.removeEventListener('change', handleChange);
      }
    };

    checkHighContrast();
  }, []);

  return isHighContrast;
};

/**
 * 모션 감소 설정 감지 훅
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  return prefersReducedMotion;
};

/**
 * 포커스 트랩 훅 (모달/라이트박스용)
 */
export const useFocusTrap = (isActive: boolean, containerRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // 초기 포커스 설정
    firstElement.focus();

    const handleTabKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKeyDown);

    return () => {
      document.removeEventListener('keydown', handleTabKeyDown);
    };
  }, [isActive, containerRef]);
};

export default GalleryAccessibility;