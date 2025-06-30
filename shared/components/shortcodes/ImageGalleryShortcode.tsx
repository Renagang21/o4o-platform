/**
 * [image-gallery] 숏코드 컴포넌트
 * 이미지 갤러리 with 라이트박스
 */

import React, { useState, useEffect } from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

interface MediaFile {
  id: string;
  url: string;
  originalName: string;
  altText?: string;
  caption?: string;
  formats?: {
    webp?: Record<string, { url: string; width: number; height: number }>;
    jpg?: Record<string, { url: string; width: number; height: number }>;
  };
}

const ImageGalleryShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  apiClient,
  editorMode = false
}) => {
  const [images, setImages] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const {
    ids = '',
    columns = 3,
    size = 'medium',
    show_captions = false,
    link_to = 'lightbox', // lightbox, file, none
    className = ''
  } = shortcode.attributes;

  useEffect(() => {
    if (ids && apiClient) {
      loadImages();
    } else {
      setLoading(false);
    }
  }, [ids, apiClient]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const imageIds = (ids as string).split(',').map(id => id.trim()).filter(Boolean);
      
      const imagePromises = imageIds.map(id => 
        apiClient.get(`/admin/media/${id}`).then(res => res.data.success ? res.data.data : null)
      );
      
      const results = await Promise.all(imagePromises);
      setImages(results.filter(Boolean));
    } catch (err) {
      console.error('Error loading gallery images:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOptimizedUrl = (image: MediaFile): string => {
    if (image.formats) {
      const formats = ['webp', 'jpg'] as const;
      for (const format of formats) {
        const formatImages = image.formats[format];
        if (formatImages && formatImages[size as string]) {
          return formatImages[size as string].url;
        }
      }
    }
    return image.url;
  };

  const getGridCols = (): string => {
    const cols = Math.min(Math.max(1, Number(columns)), 6);
    const colsMap: { [key: number]: string } = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-4',
      5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
    };
    return colsMap[cols] || 'grid-cols-2 md:grid-cols-3';
  };

  const openLightbox = (index: number) => {
    if (link_to === 'lightbox') {
      setCurrentImageIndex(index);
      setLightboxOpen(true);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    const skeletonItems = Array.from({ length: Math.min(6, Number(columns)) }, (_, i) => (
      <div key={i} className="gallery-skeleton animate-pulse">
        <div className="bg-gray-200 aspect-square rounded"></div>
        {show_captions && <div className="bg-gray-200 h-4 rounded mt-2"></div>}
      </div>
    ));

    return (
      <div className={`image-gallery-shortcode loading ${className}`}>
        <div className={`grid gap-4 ${getGridCols()}`}>
          {skeletonItems}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`image-gallery-shortcode empty ${className}`}>
        <div className="gallery-empty bg-gray-50 border border-gray-200 rounded p-6 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No images found for gallery</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`image-gallery-shortcode ${editorMode ? 'editor-mode' : ''} ${className}`}>
        <div className={`gallery-grid grid gap-4 ${getGridCols()}`}>
          {images.map((image, index) => (
            <figure
              key={image.id}
              className="gallery-item group cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <div className="gallery-image-wrapper relative overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={getOptimizedUrl(image)}
                  alt={image.altText || image.originalName}
                  className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {link_to === 'lightbox' && (
                  <div className="gallery-overlay absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                )}
              </div>
              
              {show_captions && (image.caption || image.altText) && (
                <figcaption className="gallery-caption text-sm text-gray-600 mt-2 text-center">
                  {image.caption || image.altText}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        {editorMode && (
          <div className="shortcode-editor-overlay">
            <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Gallery: {images.length} images ({columns} columns)
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="gallery-lightbox fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="lightbox-content relative max-w-screen-lg max-h-screen">
            {/* Close Button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Current Image */}
            <img
              src={images[currentImageIndex]?.url}
              alt={images[currentImageIndex]?.altText || images[currentImageIndex]?.originalName}
              className="max-w-full max-h-full object-contain"
            />

            {/* Caption */}
            {(images[currentImageIndex]?.caption || images[currentImageIndex]?.altText) && (
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="bg-black bg-opacity-50 text-white px-4 py-2 rounded">
                  {images[currentImageIndex]?.caption || images[currentImageIndex]?.altText}
                </p>
              </div>
            )}

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGalleryShortcode;