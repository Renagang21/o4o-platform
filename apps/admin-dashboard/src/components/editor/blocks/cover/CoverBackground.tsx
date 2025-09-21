/**
 * CoverBackground Component
 * Manages background media (image/video/color/gradient) for Cover Block
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Replace,
  Trash2,
  Focus,
  Palette,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import MediaSelector, { MediaItem } from '../shared/MediaSelector';
import {
  CoverBackgroundMedia,
  BackgroundType,
  FocalPoint,
  COMMON_GRADIENTS,
  GradientValue
} from './types';

interface CoverBackgroundProps {
  backgroundType: BackgroundType;
  backgroundImage?: CoverBackgroundMedia;
  backgroundVideo?: CoverBackgroundMedia;
  backgroundColor?: string;
  gradient?: string | GradientValue;
  focalPoint?: FocalPoint;
  onBackgroundTypeChange: (type: BackgroundType) => void;
  onBackgroundImageChange: (image?: CoverBackgroundMedia) => void;
  onBackgroundVideoChange: (video?: CoverBackgroundMedia) => void;
  onBackgroundColorChange: (color: string) => void;
  onGradientChange: (gradient: string | GradientValue) => void;
  onFocalPointChange: (focalPoint: FocalPoint) => void;
  isSelected: boolean;
  allowParallax?: boolean;
  className?: string;
}

const CoverBackground: React.FC<CoverBackgroundProps> = ({
  backgroundType,
  backgroundImage,
  backgroundVideo,
  backgroundColor = '#000000',
  gradient,
  focalPoint = { x: 50, y: 50 },
  onBackgroundTypeChange,
  onBackgroundImageChange,
  onBackgroundVideoChange,
  onBackgroundColorChange,
  onGradientChange,
  onFocalPointChange,
  isSelected,
  allowParallax = true,
  className
}) => {
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showFocalPointPicker, setShowFocalPointPicker] = useState(false);
  const [isDraggingFocalPoint, setIsDraggingFocalPoint] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const focalPointRef = useRef<HTMLDivElement>(null);

  // Handle media selection
  const handleMediaSelect = useCallback((media: MediaItem | MediaItem[]) => {
    const selectedMedia = Array.isArray(media) ? media[0] : media;

    const mediaData: CoverBackgroundMedia = {
      id: selectedMedia.id,
      url: selectedMedia.url,
      alt: selectedMedia.alt || selectedMedia.title,
      title: selectedMedia.title,
      width: selectedMedia.width,
      height: selectedMedia.height,
      mimeType: selectedMedia.mimeType,
      focalPoint: focalPoint
    };

    if (mediaType === 'image') {
      onBackgroundImageChange(mediaData);
      onBackgroundTypeChange('image');
    } else {
      onBackgroundVideoChange(mediaData);
      onBackgroundTypeChange('video');
    }

    setIsMediaSelectorOpen(false);
  }, [mediaType, focalPoint, onBackgroundImageChange, onBackgroundVideoChange, onBackgroundTypeChange]);

  // Handle background type selection
  const handleSelectBackground = (type: BackgroundType) => {
    if (type === 'image' || type === 'video') {
      setMediaType(type);
      setIsMediaSelectorOpen(true);
    } else {
      onBackgroundTypeChange(type);
    }
  };

  // Handle focal point drag
  const handleFocalPointMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingFocalPoint(true);

    const updateFocalPoint = (clientX: number, clientY: number) => {
      if (!focalPointRef.current) return;

      const rect = focalPointRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      onFocalPointChange({ x: Math.round(x), y: Math.round(y) });
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateFocalPoint(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setIsDraggingFocalPoint(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    updateFocalPoint(e.clientX, e.clientY);
  }, [onFocalPointChange]);

  // Video controls
  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  // Color utilities
  const generateGradientCSS = (gradientValue: string | GradientValue): string => {
    if (typeof gradientValue === 'string') {
      return gradientValue;
    }
    return gradientValue.gradient;
  };

  // Get current background style
  const getBackgroundStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      zIndex: 0
    };

    switch (backgroundType) {
      case 'image':
        if (backgroundImage?.url) {
          return {
            ...baseStyle,
            backgroundImage: `url(${backgroundImage.url})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPoint.x}% ${focalPoint.y}%`,
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: allowParallax ? 'fixed' : 'scroll'
          };
        }
        break;

      case 'color':
        return {
          ...baseStyle,
          backgroundColor: backgroundColor
        };

      case 'gradient':
        if (gradient) {
          return {
            ...baseStyle,
            background: generateGradientCSS(gradient)
          };
        }
        break;

      case 'video':
        return baseStyle;
    }

    return baseStyle;
  };

  // Background selector buttons
  const BackgroundSelector = () => {
    if (!isSelected) return null;

    return (
      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center gap-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
          <Button
            variant={backgroundType === 'image' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleSelectBackground('image')}
            className="h-8 px-3"
          >
            <ImageIcon className="h-3 w-3 mr-1" />
            Image
          </Button>

          <Button
            variant={backgroundType === 'video' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleSelectBackground('video')}
            className="h-8 px-3"
          >
            <Video className="h-3 w-3 mr-1" />
            Video
          </Button>

          <Button
            variant={backgroundType === 'color' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleSelectBackground('color')}
            className="h-8 px-3"
          >
            <div
              className="w-3 h-3 rounded-full border border-white mr-1"
              style={{ backgroundColor: backgroundColor }}
            />
            Color
          </Button>

          <Button
            variant={backgroundType === 'gradient' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleSelectBackground('gradient')}
            className="h-8 px-3"
          >
            <Palette className="h-3 w-3 mr-1" />
            Gradient
          </Button>
        </div>
      </div>
    );
  };

  // Background controls (replace, focal point, etc.)
  const BackgroundControls = () => {
    if (!isSelected || (backgroundType !== 'image' && backgroundType !== 'video')) return null;

    const currentMedia = backgroundType === 'image' ? backgroundImage : backgroundVideo;

    return (
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center gap-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMediaType(backgroundType);
              setIsMediaSelectorOpen(true);
            }}
            className="h-8 px-3"
          >
            <Replace className="h-3 w-3 mr-1" />
            Replace
          </Button>

          {backgroundType === 'image' && (
            <Button
              variant={showFocalPointPicker ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowFocalPointPicker(!showFocalPointPicker)}
              className="h-8 px-3"
            >
              <Focus className="h-3 w-3 mr-1" />
              Focal Point
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (backgroundType === 'image') {
                onBackgroundImageChange(undefined);
              } else {
                onBackgroundVideoChange(undefined);
              }
              onBackgroundTypeChange('color');
            }}
            className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    );
  };

  // Video controls overlay
  const VideoControls = () => {
    if (backgroundType !== 'video' || !backgroundVideo?.url || !isSelected) return null;

    return (
      <div className="absolute bottom-4 left-4 z-20">
        <div className="flex items-center gap-2 bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVideoPlayback}
            className="h-8 w-8 p-0 text-white hover:bg-white hover:bg-opacity-20"
          >
            {isVideoPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVideoMute}
            className="h-8 w-8 p-0 text-white hover:bg-white hover:bg-opacity-20"
          >
            {isVideoMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Focal point picker overlay
  const FocalPointPicker = () => {
    if (!showFocalPointPicker || backgroundType !== 'image' || !backgroundImage?.url) return null;

    return (
      <div
        ref={focalPointRef}
        className="absolute inset-0 z-30 cursor-crosshair"
        onMouseDown={handleFocalPointMouseDown}
        style={{
          background: `linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.3) 49%, rgba(255,255,255,0.3) 51%, transparent 52%),
                      linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.3) 49%, rgba(255,255,255,0.3) 51%, transparent 52%)`
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white border-opacity-50">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-white border-opacity-30" />
          ))}
        </div>

        {/* Focal point indicator */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
          style={{
            left: `${focalPoint.x}%`,
            top: `${focalPoint.y}%`
          }}
        >
          <div className="absolute inset-1 bg-blue-500 rounded-full animate-pulse" />
        </div>

        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-sm rounded-lg p-3 max-w-xs">
          <p className="font-medium mb-1">Set Focal Point</p>
          <p className="text-xs opacity-80">Click or drag to set the focal point for image positioning</p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFocalPointChange({ x: 50, y: 50 })}
              className="h-6 px-2 text-xs text-white hover:bg-white hover:bg-opacity-20"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFocalPointPicker(false)}
              className="h-6 px-2 text-xs text-white hover:bg-white hover:bg-opacity-20"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Color picker popup
  const ColorPicker = () => {
    if (backgroundType !== 'color' || !isSelected) return null;

    return (
      <div className="absolute top-16 left-4 z-20 bg-white rounded-lg shadow-lg p-4 min-w-64">
        <h3 className="text-sm font-medium mb-3">Background Color</h3>

        <div className="space-y-3">
          <div>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded cursor-pointer"
            />
          </div>

          <div>
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              placeholder="#000000"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color presets */}
          <div>
            <p className="text-xs text-gray-600 mb-2">Color Presets</p>
            <div className="grid grid-cols-6 gap-2">
              {[
                '#000000', '#ffffff', '#f3f4f6', '#1f2937',
                '#ef4444', '#f97316', '#eab308', '#22c55e',
                '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => onBackgroundColorChange(color)}
                  className={cn(
                    "w-8 h-8 rounded border-2 transition-transform hover:scale-110",
                    backgroundColor === color ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Gradient picker popup
  const GradientPicker = () => {
    if (backgroundType !== 'gradient' || !isSelected) return null;

    return (
      <div className="absolute top-16 left-4 z-20 bg-white rounded-lg shadow-lg p-4 min-w-80">
        <h3 className="text-sm font-medium mb-3">Background Gradient</h3>

        <div className="space-y-4">
          {/* Custom gradient input */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Custom CSS Gradient</label>
            <textarea
              value={typeof gradient === 'string' ? gradient : gradient?.gradient || ''}
              onChange={(e) => onGradientChange(e.target.value)}
              placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
            />
          </div>

          {/* Gradient presets */}
          <div>
            <p className="text-xs text-gray-600 mb-2">Gradient Presets</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {COMMON_GRADIENTS.map((gradientPreset) => (
                <button
                  key={gradientPreset.slug}
                  onClick={() => onGradientChange(gradientPreset)}
                  className={cn(
                    "relative h-12 rounded border-2 transition-transform hover:scale-105 overflow-hidden",
                    (typeof gradient === 'object' && gradient?.slug === gradientPreset.slug) ||
                    (typeof gradient === 'string' && gradient === gradientPreset.gradient)
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-300"
                  )}
                  style={{ background: gradientPreset.gradient }}
                  title={gradientPreset.name}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('cover-background relative', className)}>
      {/* Background layer */}
      <div style={getBackgroundStyle()}>
        {backgroundType === 'video' && backgroundVideo?.url && (
          <video
            ref={videoRef}
            src={backgroundVideo.url}
            autoPlay
            muted={isVideoMuted}
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onLoadedData={() => {
              if (videoRef.current) {
                videoRef.current.play();
                setIsVideoPlaying(true);
              }
            }}
          />
        )}
      </div>

      {/* Overlays and controls */}
      <BackgroundSelector />
      <BackgroundControls />
      <VideoControls />
      <FocalPointPicker />
      <ColorPicker />
      <GradientPicker />

      {/* Media Selector Modal */}
      <MediaSelector
        isOpen={isMediaSelectorOpen}
        onClose={() => setIsMediaSelectorOpen(false)}
        onSelect={handleMediaSelect}
        acceptedTypes={[mediaType]}
        title={`Select ${mediaType === 'image' ? 'Background Image' : 'Background Video'}`}
        multiple={false}
      />
    </div>
  );
};

export default CoverBackground;