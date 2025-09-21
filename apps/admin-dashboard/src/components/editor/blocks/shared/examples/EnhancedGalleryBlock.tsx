/**
 * Enhanced Gallery Block Example
 * 새로운 MediaSelector를 사용하는 Gallery Block 예시
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Images,
  Upload,
  Plus,
  Settings,
  Grid,
  List,
  Columns,
  Shuffle,
  Maximize,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MediaSelector from '../MediaSelector';
import { MediaItem } from '../types';
import { cn } from '@/lib/utils';

interface GalleryBlockProps {
  attributes?: {
    images?: MediaItem[];
    layout?: 'grid' | 'masonry' | 'carousel' | 'justified';
    columns?: number;
    gap?: number;
    aspectRatio?: 'square' | '4:3' | '16:9' | '3:2' | 'original';
    showCaptions?: boolean;
    enableLightbox?: boolean;
    randomOrder?: boolean;
    borderRadius?: number;
    hoverEffect?: 'none' | 'zoom' | 'fade' | 'slide';
    captionPosition?: 'overlay' | 'below' | 'hover';
  };
  onChange?: (attributes: any) => void;
  isSelected?: boolean;
}

const EnhancedGalleryBlock: React.FC<GalleryBlockProps> = ({
  attributes = {},
  onChange,
  isSelected = false
}) => {
  const {
    images = [],
    layout = 'grid',
    columns = 3,
    gap = 16,
    aspectRatio = 'square',
    showCaptions = true,
    enableLightbox = true,
    randomOrder = false,
    borderRadius = 8,
    hoverEffect = 'zoom',
    captionPosition = 'overlay'
  } = attributes;

  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange?.({ ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Handle media selection
  const handleMediaSelect = useCallback((media: MediaItem | MediaItem[]) => {
    const selectedMedia = Array.isArray(media) ? media : [media];
    updateAttribute('images', [...images, ...selectedMedia]);
    setShowMediaSelector(false);
  }, [updateAttribute, images]);

  // Remove image
  const removeImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    updateAttribute('images', updatedImages);
  }, [updateAttribute, images]);

  // Reorder images
  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    updateAttribute('images', newImages);
  }, [updateAttribute, images]);

  // Get ordered images
  const orderedImages = useMemo(() => {
    if (randomOrder && !isSelected) {
      return [...images].sort(() => Math.random() - 0.5);
    }
    return images;
  }, [images, randomOrder, isSelected]);

  // Layout options
  const layoutOptions = [
    { value: 'grid', label: '그리드', icon: Grid },
    { value: 'masonry', label: '메이슨리', icon: Columns },
    { value: 'carousel', label: '캐러셀', icon: ChevronRight },
    { value: 'justified', label: '정렬', icon: List }
  ];

  // Aspect ratio options
  const aspectRatioOptions = [
    { value: 'square', label: '정사각형 (1:1)' },
    { value: '4:3', label: '표준 (4:3)' },
    { value: '16:9', label: '와이드 (16:9)' },
    { value: '3:2', label: '클래식 (3:2)' },
    { value: 'original', label: '원본 비율' }
  ];

  // Hover effect options
  const hoverEffectOptions = [
    { value: 'none', label: '없음' },
    { value: 'zoom', label: '확대' },
    { value: 'fade', label: '페이드' },
    { value: 'slide', label: '슬라이드' }
  ];

  // Get image styles
  const getImageStyles = (image: MediaItem) => {
    const styles: React.CSSProperties = {
      borderRadius: `${borderRadius}px`,
      overflow: 'hidden'
    };

    if (aspectRatio !== 'original') {
      const ratios = {
        square: '1 / 1',
        '4:3': '4 / 3',
        '16:9': '16 / 9',
        '3:2': '3 / 2'
      };
      styles.aspectRatio = ratios[aspectRatio as keyof typeof ratios];
    }

    return styles;
  };

  // Render single image
  const renderImage = (image: MediaItem, index: number) => {
    return (
      <div
        key={image.id}
        className={cn(
          'relative group cursor-pointer transition-all duration-300',
          hoverEffect === 'zoom' && 'hover:scale-105',
          hoverEffect === 'fade' && 'hover:opacity-80'
        )}
        style={getImageStyles(image)}
        onClick={() => enableLightbox && setLightboxIndex(index)}
      >
        {/* Image */}
        {image.type === 'image' ? (
          <img
            src={image.thumbnailUrl || image.url}
            alt={image.alt || image.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
            <img
              src={image.thumbnailUrl || image.url}
              alt={image.alt || image.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>
        )}

        {/* Caption Overlay */}
        {showCaptions && image.caption && captionPosition === 'overlay' && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-sm">{image.caption}</p>
          </div>
        )}

        {/* Hover Caption */}
        {showCaptions && image.caption && captionPosition === 'hover' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-sm text-center px-4">{image.caption}</p>
          </div>
        )}

        {/* Edit Controls */}
        {isSelected && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                removeImage(image.id);
              }}
              size="sm"
              variant="destructive"
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Preview Button */}
        {!isSelected && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(index);
              }}
              size="sm"
              variant="secondary"
              className="h-6 w-6 p-0 bg-white/80 hover:bg-white"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Render caption below
  const renderImageWithCaption = (image: MediaItem, index: number) => {
    const imageElement = renderImage(image, index);

    if (showCaptions && image.caption && captionPosition === 'below') {
      return (
        <div key={image.id}>
          {imageElement}
          <p className="mt-2 text-sm text-gray-600 text-center">{image.caption}</p>
        </div>
      );
    }

    return imageElement;
  };

  // Render gallery based on layout
  const renderGallery = () => {
    if (orderedImages.length === 0) {
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
          <Images className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">갤러리 만들기</h3>
          <p className="text-sm text-gray-600 mb-4">이미지나 비디오를 추가하세요</p>
          <Button onClick={() => setShowMediaSelector(true)}>
            <Upload className="mr-2 h-4 w-4" />
            미디어 추가
          </Button>
        </div>
      );
    }

    const containerStyle = { gap: `${gap}px` };

    switch (layout) {
      case 'grid':
        return (
          <div
            className="grid w-full"
            style={{
              ...containerStyle,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
            }}
          >
            {orderedImages.map((image, index) => renderImageWithCaption(image, index))}
          </div>
        );

      case 'masonry':
        return (
          <div
            className="columns-1 sm:columns-2 md:columns-3 lg:columns-4"
            style={{
              columnCount: columns,
              columnGap: `${gap}px`
            }}
          >
            {orderedImages.map((image, index) => (
              <div key={image.id} className="break-inside-avoid mb-4">
                {renderImageWithCaption(image, index)}
              </div>
            ))}
          </div>
        );

      case 'carousel':
        return (
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-300"
              style={{ gap: `${gap}px` }}
            >
              {orderedImages.map((image, index) => (
                <div
                  key={image.id}
                  className="flex-shrink-0"
                  style={{ width: `calc(${100 / columns}% - ${gap * (columns - 1) / columns}px)` }}
                >
                  {renderImageWithCaption(image, index)}
                </div>
              ))}
            </div>
          </div>
        );

      case 'justified':
        return (
          <div className="flex flex-wrap" style={containerStyle}>
            {orderedImages.map((image, index) => {
              const aspectRatio = image.width && image.height ? image.width / image.height : 1;
              const width = 200 * aspectRatio;
              return (
                <div
                  key={image.id}
                  className="flex-shrink-0"
                  style={{ width: `${width}px`, minWidth: '150px' }}
                >
                  {renderImageWithCaption(image, index)}
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  // Lightbox Modal
  const LightboxModal = () => {
    if (lightboxIndex === null || orderedImages.length === 0) return null;

    const currentImage = orderedImages[lightboxIndex];

    const navigateLightbox = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        setLightboxIndex((lightboxIndex - 1 + orderedImages.length) % orderedImages.length);
      } else {
        setLightboxIndex((lightboxIndex + 1) % orderedImages.length);
      }
    };

    return (
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
        onClick={() => setLightboxIndex(null)}
      >
        {/* Close Button */}
        <button
          onClick={() => setLightboxIndex(null)}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Navigation */}
        {orderedImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('prev');
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('next');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Media Content */}
        <div className="max-w-7xl max-h-screen p-8">
          {currentImage.type === 'image' ? (
            <img
              src={currentImage.url}
              alt={currentImage.alt || currentImage.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={currentImage.url}
              controls
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Caption */}
          {currentImage.caption && (
            <div className="text-white text-center mt-4 max-w-2xl mx-auto">
              <p>{currentImage.caption}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Gallery */}
      <div className="w-full">
        {renderGallery()}

        {/* Add More Button */}
        {isSelected && images.length > 0 && (
          <div className="mt-4 text-center">
            <Button
              onClick={() => setShowMediaSelector(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              미디어 추가
            </Button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {isSelected && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            갤러리 설정
          </h3>

          {/* Media Management */}
          <div>
            <Label className="text-sm font-medium mb-2 block">미디어</Label>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowMediaSelector(true)}
                variant="outline"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                미디어 추가
              </Button>
              {images.length > 0 && (
                <Button
                  onClick={() => updateAttribute('images', [])}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  전체 삭제
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              현재 {images.length}개의 미디어 파일
            </p>
          </div>

          {/* Layout Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">레이아웃</Label>
              <Select value={layout} onValueChange={(value) => updateAttribute('layout', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {layoutOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">종횡비</Label>
              <Select value={aspectRatio} onValueChange={(value) => updateAttribute('aspectRatio', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatioOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">
                컬럼 ({columns}개)
              </Label>
              <Slider
                min={1}
                max={6}
                step={1}
                value={[columns]}
                onValueChange={([value]) => updateAttribute('columns', value)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">
                간격 ({gap}px)
              </Label>
              <Slider
                min={0}
                max={32}
                step={4}
                value={[gap]}
                onValueChange={([value]) => updateAttribute('gap', value)}
              />
            </div>
          </div>

          {/* Visual Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">
                모서리 둥글기 ({borderRadius}px)
              </Label>
              <Slider
                min={0}
                max={20}
                step={2}
                value={[borderRadius]}
                onValueChange={([value]) => updateAttribute('borderRadius', value)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">호버 효과</Label>
              <Select value={hoverEffect} onValueChange={(value) => updateAttribute('hoverEffect', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hoverEffectOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Caption Settings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">캡션 표시</Label>
              <Switch
                checked={showCaptions}
                onCheckedChange={(checked) => updateAttribute('showCaptions', checked)}
              />
            </div>

            {showCaptions && (
              <div>
                <Label className="text-sm font-medium mb-2 block">캡션 위치</Label>
                <Select value={captionPosition} onValueChange={(value) => updateAttribute('captionPosition', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overlay">오버레이</SelectItem>
                    <SelectItem value="below">아래쪽</SelectItem>
                    <SelectItem value="hover">호버시</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">라이트박스</Label>
              <Switch
                checked={enableLightbox}
                onCheckedChange={(checked) => updateAttribute('enableLightbox', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">랜덤 순서</Label>
              <Switch
                checked={randomOrder}
                onCheckedChange={(checked) => updateAttribute('randomOrder', checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Selector Modal */}
      <MediaSelector
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={handleMediaSelect}
        multiple={true}
        acceptedTypes={['image', 'video']}
        maxSelection={50}
        title="갤러리 미디어 선택"
      />

      {/* Lightbox */}
      {enableLightbox && <LightboxModal />}
    </div>
  );
};

export default EnhancedGalleryBlock;