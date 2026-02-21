/**
 * Gallery Lightbox Component
 * 이미지 전체화면 표시 및 내비게이션 기능
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Share2,
  Maximize,
  Minimize,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GalleryLightboxProps, GalleryImage } from './types';

const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  animation = 'fade',
  onClose,
  onNavigate,
  onImageSelect,
  showThumbnails = true,
  showCounter = true,
  enableKeyboard = true
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const lightboxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>(undefined);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const currentImage = images[currentIndex];
  const isVideo = currentImage?.url?.match(/\.(mp4|webm|ogg|mov)$/i);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || !enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            onNavigate('prev');
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < images.length - 1) {
            onNavigate('next');
          }
          break;
        case ' ':
          e.preventDefault();
          setIsAutoPlaying(!isAutoPlaying);
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'd':
          e.preventDefault();
          handleDownload();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    enableKeyboard,
    currentIndex,
    images.length,
    isAutoPlaying,
    onClose,
    onNavigate
  ]);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && !isVideo) {
      autoPlayRef.current = setInterval(() => {
        if (currentIndex < images.length - 1) {
          onNavigate('next');
        } else {
          setIsAutoPlaying(false);
        }
      }, 3000);
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, currentIndex, images.length, isVideo, onNavigate]);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  // Reset zoom when image changes
  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
    if (zoomLevel <= 1) {
      setIsZoomed(false);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setIsZoomed(false);
    setImagePosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (lightboxRef.current && typeof lightboxRef.current.requestFullscreen === 'function') {
        lightboxRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;

    const link = document.createElement('a');
    link.href = currentImage.fullUrl || currentImage.url;
    link.download = currentImage.title || `image-${currentIndex + 1}`;
    link.click();
  };

  const handleShare = async () => {
    if (!currentImage || !navigator.share) return;

    try {
      await navigator.share({
        title: currentImage.title,
        text: currentImage.caption,
        url: currentImage.url
      });
    } catch (error) {
      // Fallback to copy URL
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(currentImage.url);
      }
    }
  };

  // Mouse/touch handlers for dragging zoomed images
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isZoomed) return;

    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, isZoomed, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const showControlsTemporarily = () => {
    setShowControls(true);
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div
      ref={lightboxRef}
      className={cn(
        'fixed inset-0 z-50 bg-black',
        'flex items-center justify-center',
        // Animation classes
        animation === 'fade' && 'animate-in fade-in duration-300',
        animation === 'slide' && 'animate-in slide-in-from-bottom duration-300',
        animation === 'zoom' && 'animate-in zoom-in duration-300'
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseMove={showControlsTemporarily}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Main content area */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Image/Video display */}
        <div
          className="relative max-w-full max-h-full"
          style={{
            transform: `scale(${zoomLevel}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
            cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}
          onMouseDown={handleMouseDown}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentImage.url}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              ref={imageRef}
              src={currentImage.fullUrl || currentImage.url}
              alt={currentImage.alt}
              className="max-w-full max-h-full object-contain select-none"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
              onLoad={() => {
                // Image loaded successfully
              }}
              onError={() => {
                // Fallback to thumbnail if full image fails
                if (imageRef.current && currentImage.thumbnailUrl) {
                  imageRef.current.src = currentImage.thumbnailUrl;
                }
              }}
            />
          )}
        </div>

        {/* Loading indicator */}
        {!imageRef.current?.complete && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Counter */}
              {showCounter && (
                <div className="text-white text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </div>
              )}

              {/* Image title */}
              {currentImage.title && (
                <div className="text-white text-lg font-medium max-w-md truncate">
                  {currentImage.title}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Zoom controls */}
              {!isVideo && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.5}
                    title="Zoom out (-)"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </Button>
                  <div className="text-white text-sm px-2 min-w-[3rem] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 5}
                    title="Zoom in (+)"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </Button>
                </>
              )}

              {/* Download */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
                title="Download (d)"
              >
                <Download className="w-5 h-5" />
              </Button>

              {/* Share */}
              {!!navigator.share && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={handleShare}
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
                title="Fullscreen (f)"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={onClose}
                title="Close (Esc)"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            {/* Previous */}
            <Button
              variant="ghost"
              size="lg"
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto',
                'text-white hover:bg-white/20 h-12 w-12 p-0',
                currentIndex === 0 && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => currentIndex > 0 && onNavigate('prev')}
              disabled={currentIndex === 0}
              title="Previous image (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>

            {/* Next */}
            <Button
              variant="ghost"
              size="lg"
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto',
                'text-white hover:bg-white/20 h-12 w-12 p-0',
                currentIndex === images.length - 1 && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => currentIndex < images.length - 1 && onNavigate('next')}
              disabled={currentIndex === images.length - 1}
              title="Next image (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-auto">
          {/* Caption */}
          {currentImage.caption && (
            <div className="text-white text-center mb-4 max-w-2xl mx-auto">
              <p className="text-lg">{currentImage.caption}</p>
            </div>
          )}

          {/* Thumbnails */}
          {showThumbnails && images.length > 1 && (
            <div className="flex justify-center space-x-2 overflow-x-auto pb-2 mb-4">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  className={cn(
                    'flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all',
                    index === currentIndex
                      ? 'border-white shadow-lg scale-110'
                      : 'border-transparent hover:border-white/50'
                  )}
                  onClick={() => onImageSelect(index)}
                  title={image.title || `Image ${index + 1}`}
                >
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Playback controls */}
          {!isVideo && images.length > 1 && (
            <div className="flex justify-center items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => onImageSelect(0)}
                disabled={currentIndex === 0}
                title="First image"
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                title={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isAutoPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => onImageSelect(images.length - 1)}
                disabled={currentIndex === images.length - 1}
                title="Last image"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for auto-play */}
      {isAutoPlaying && !isVideo && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-3000 ease-linear"
            style={{
              width: `${((currentIndex + 1) / images.length) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default GalleryLightbox;