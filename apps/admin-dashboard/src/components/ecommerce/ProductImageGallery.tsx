/**
 * ProductImageGallery Component
 * 상품 편집기에서 다중 이미지를 관리하는 갤러리 컴포넌트
 */

import { useState, useRef, useCallback } from 'react';
import {
  ImageIcon,
  Plus,
  X,
  Star,
  Edit2,
  Move,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Grid3X3
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MediaSelector from '@/components/editor/blocks/shared/MediaSelector';
import { MediaItem } from '@/components/editor/blocks/shared/MediaSelector';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
  isFeatured?: boolean;
  position?: number;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
  className?: string;
}

interface DraggableImageProps {
  image: ProductImage;
  index: number;
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  onDelete: () => void;
  onSetFeatured: () => void;
  onEdit: () => void;
  isFeatured: boolean;
}

const ItemType = 'IMAGE';

const DraggableImage: React.FC<DraggableImageProps> = ({
  image,
  index,
  moveImage,
  onDelete,
  onSetFeatured,
  onEdit,
  isFeatured
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemType,
    hover: (item: { index: number }) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveImage(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(
        "relative group cursor-move transition-all",
        isDragging && "opacity-50",
        isOver && "scale-105"
      )}
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-gray-300">
        <img
          src={image.url}
          alt={image.alt || '상품 이미지'}
          className="w-full h-full object-cover"
        />
        
        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            대표
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            {!isFeatured && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetFeatured();
                }}
                className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                title="대표 이미지로 설정"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              title="편집"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drag Handle */}
        <div className="absolute bottom-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <Move className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images = [],
  onImagesChange,
  maxImages = 10,
  className
}) => {
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'featured' | 'additional'>('featured');
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get featured image (first image or explicitly marked)
  const featuredImage = images.find(img => img.isFeatured) || images[0];
  const additionalImages = images.filter(img => img !== featuredImage);

  // Handle drop for upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      toast.error(`최대 ${maxImages}개까지 업로드할 수 있습니다.`);
      return;
    }

    // TODO: Upload files to server and get URLs
    // For now, create temporary URLs
    const newImages: ProductImage[] = acceptedFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      alt: file.name,
      title: file.name,
      position: images.length + index
    }));

    onImagesChange([...images, ...newImages]);
    toast.success(`${acceptedFiles.length}개 이미지가 추가되었습니다.`);
  }, [images, maxImages, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: maxImages - images.length
  });

  // Handle media selection
  const handleMediaSelect = useCallback((selected: MediaItem[] | MediaItem) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    
    if (selectorMode === 'featured') {
      // Replace or set featured image
      const newFeatured: ProductImage = {
        id: selectedArray[0].id,
        url: selectedArray[0].url,
        alt: selectedArray[0].alt,
        title: selectedArray[0].title,
        isFeatured: true,
        position: 0
      };

      const updatedImages = images
        .map(img => ({ ...img, isFeatured: false }))
        .filter(img => img.id !== newFeatured.id);

      onImagesChange([newFeatured, ...updatedImages]);
      toast.success('대표 이미지가 설정되었습니다.');
    } else {
      // Add additional images
      const newImages: ProductImage[] = selectedArray.map((item, index) => ({
        id: item.id,
        url: item.url,
        alt: item.alt,
        title: item.title,
        position: images.length + index
      }));

      const totalImages = images.length + newImages.length;
      if (totalImages > maxImages) {
        toast.error(`최대 ${maxImages}개까지 선택할 수 있습니다.`);
        const allowedCount = maxImages - images.length;
        onImagesChange([...images, ...newImages.slice(0, allowedCount)]);
      } else {
        onImagesChange([...images, ...newImages]);
        toast.success(`${newImages.length}개 이미지가 추가되었습니다.`);
      }
    }
    setShowMediaSelector(false);
  }, [selectorMode, images, maxImages, onImagesChange]);

  // Move image (drag and drop)
  const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    const draggedImage = additionalImages[dragIndex];
    const newImages = [...images];
    
    // Find actual indices in full array
    const dragActualIndex = images.indexOf(draggedImage);
    const hoverActualIndex = images.indexOf(additionalImages[hoverIndex]);
    
    // Swap positions
    [newImages[dragActualIndex], newImages[hoverActualIndex]] = 
    [newImages[hoverActualIndex], newImages[dragActualIndex]];
    
    onImagesChange(newImages);
  }, [additionalImages, images, onImagesChange]);

  // Set image as featured
  const setFeaturedImage = useCallback((imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isFeatured: img.id === imageId
    }));
    onImagesChange(updatedImages);
    toast.success('대표 이미지가 변경되었습니다.');
  }, [images, onImagesChange]);

  // Delete image
  const deleteImage = useCallback((imageId: string) => {
    const imageToDelete = images.find(img => img.id === imageId);
    if (imageToDelete?.isFeatured && images.length > 1) {
      // If deleting featured image, make next image featured
      const newImages = images.filter(img => img.id !== imageId);
      newImages[0] = { ...newImages[0], isFeatured: true };
      onImagesChange(newImages);
    } else {
      onImagesChange(images.filter(img => img.id !== imageId));
    }
    toast.success('이미지가 삭제되었습니다.');
  }, [images, onImagesChange]);

  // Delete all images
  const deleteAllImages = useCallback(() => {
    if (confirm('모든 이미지를 삭제하시겠습니까?')) {
      onImagesChange([]);
      toast.success('모든 이미지가 삭제되었습니다.');
    }
  }, [onImagesChange]);

  // Edit image details
  const handleEditImage = useCallback((image: ProductImage) => {
    setEditingImage(image);
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingImage) return;
    
    const updatedImages = images.map(img =>
      img.id === editingImage.id ? editingImage : img
    );
    onImagesChange(updatedImages);
    setShowEditModal(false);
    setEditingImage(null);
    toast.success('이미지 정보가 수정되었습니다.');
  }, [editingImage, images, onImagesChange]);

  // Scroll carousel
  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 120;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            상품 이미지
          </h3>
          {images.length > 0 && (
            <button
              onClick={deleteAllImages}
              className="text-sm text-red-600 hover:text-red-700"
            >
              모두 삭제
            </button>
          )}
        </div>

        {/* Featured Image */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            대표 이미지
          </label>
          {featuredImage ? (
            <div className="relative group w-full aspect-video rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
              <img
                src={featuredImage.url}
                alt={featuredImage.alt || '대표 이미지'}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded flex items-center gap-1">
                <Star className="w-4 h-4 fill-current" />
                대표 이미지
              </div>
              
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectorMode('featured');
                      setShowMediaSelector(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    변경
                  </button>
                  <button
                    onClick={() => handleEditImage(featuredImage)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    편집
                  </button>
                  {images.length > 1 && (
                    <button
                      onClick={() => deleteImage(featuredImage.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                "w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors",
                isDragActive && "border-blue-500 bg-blue-50"
              )}
            >
              <input {...getInputProps()} />
              <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium mb-1">대표 이미지를 선택하세요</p>
              <p className="text-sm text-gray-500">클릭하거나 이미지를 드래그하세요</p>
            </div>
          )}
        </div>

        {/* Additional Images */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            추가 이미지 ({additionalImages.length}/{maxImages - 1})
          </label>
          
          {additionalImages.length > 0 ? (
            <div className="relative">
              {additionalImages.length > 4 && (
                <>
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
              
              <div
                ref={scrollContainerRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {additionalImages.map((image, index) => (
                  <div key={image.id} className="flex-shrink-0 w-24 h-24">
                    <DraggableImage
                      image={image}
                      index={index}
                      moveImage={moveImage}
                      onDelete={() => deleteImage(image.id)}
                      onSetFeatured={() => setFeaturedImage(image.id)}
                      onEdit={() => handleEditImage(image)}
                      isFeatured={false}
                    />
                  </div>
                ))}
                
                {/* Add More Button */}
                {images.length < maxImages && (
                  <button
                    onClick={() => {
                      setSelectorMode('additional');
                      setShowMediaSelector(true);
                    }}
                    className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">추가</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectorMode('additional');
                  setShowMediaSelector(true);
                }}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">추가</span>
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        {images.length === 0 && (
          <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">이미지 추가 방법</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>미디어 라이브러리에서 기존 이미지 선택</li>
                <li>새 이미지 파일 업로드</li>
                <li>이미지를 드래그 앤 드롭으로 추가</li>
                <li>최대 {maxImages}개까지 등록 가능</li>
              </ul>
            </div>
          </div>
        )}

        {/* Media Selector Modal */}
        <MediaSelector
          isOpen={showMediaSelector}
          onClose={() => setShowMediaSelector(false)}
          onSelect={handleMediaSelect}
          multiple={selectorMode === 'additional'}
          acceptedTypes={['image']}
          maxSelection={selectorMode === 'additional' ? maxImages - images.length : 1}
          title={selectorMode === 'featured' ? '대표 이미지 선택' : '추가 이미지 선택'}
        />

        {/* Edit Modal */}
        {showEditModal && editingImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">이미지 정보 수정</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    대체 텍스트 (Alt)
                  </label>
                  <input
                    type="text"
                    value={editingImage.alt || ''}
                    onChange={(e) => setEditingImage({
                      ...editingImage,
                      alt: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이미지 설명"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제목
                  </label>
                  <input
                    type="text"
                    value={editingImage.title || ''}
                    onChange={(e) => setEditingImage({
                      ...editingImage,
                      title: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이미지 제목"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    캡션
                  </label>
                  <textarea
                    value={editingImage.caption || ''}
                    onChange={(e) => setEditingImage({
                      ...editingImage,
                      caption: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이미지 캡션"
                  />
                </div>
                
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={editingImage.url}
                    alt={editingImage.alt || ''}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingImage(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default ProductImageGallery;