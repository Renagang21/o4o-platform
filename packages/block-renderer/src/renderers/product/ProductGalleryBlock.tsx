/**
 * Product Gallery Block Renderer
 * Displays product images with thumbnail navigation
 */

import React, { useState } from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const ProductGalleryBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Access post data injected by CPTSingle
  const postData = (block as any)._postData;

  // Rules of Hooks — 아래 가드보다 위에서 호출해 렌더마다 호출 순서를 고정한다.
  // 초기값을 이미지 목록에서 받을 수 없으므로, 실제 표시 이미지는 아래에서 목록으로부터 파생시킨다
  // (postData 가 나중에 도착해도 기존과 동일하게 첫 번째 이미지가 표시된다).
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!postData) {
    return null;
  }

  // Get images from customFields or featuredImage
  const customFields = postData.customFields || postData.meta || {};
  const images: string[] = customFields.images || customFields.gallery || [];

  // If no gallery images, use featured image
  if (images.length === 0 && postData.featuredImage) {
    images.push(postData.featuredImage);
  }

  if (images.length === 0) {
    return null;
  }

  const activeImage = selectedImage && images.includes(selectedImage) ? selectedImage : images[0];

  // Get styling options
  const className = getBlockData(block, 'className', '');
  const showThumbnails = getBlockData(block, 'showThumbnails', true);

  const classNames = clsx('product-gallery', 'mb-6', className);

  return (
    <div className={classNames}>
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
        <img
          src={activeImage}
          alt={postData.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(img)}
              className={clsx(
                'aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors',
                activeImage === img ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
              )}
            >
              <img
                src={img}
                alt={`${postData.title} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
