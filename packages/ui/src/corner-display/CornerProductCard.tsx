/**
 * CornerProductCard
 *
 * Phase 1: 코너 디스플레이용 제품 카드
 * - 키오스크/태블릿에 최적화된 터치 친화적 UI
 * - featured 상태에 따른 강조 표시
 */

import React from 'react';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface CornerProductCardProps {
  /** 제품 ID */
  id: string;
  /** 제품명 */
  name: string;
  /** 제품 이미지 URL */
  imageUrl?: string;
  /** 판매 가격 */
  price: number;
  /** 원가 (할인 전) */
  originalPrice?: number;
  /** featured 여부 */
  isFeatured?: boolean;
  /** 카드 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 가격 표시 여부 */
  showPrice?: boolean;
  /** 클릭 핸들러 */
  onClick?: (id: string) => void;
  /** 추가 클래스 */
  className?: string;
}

const sizeClasses = {
  sm: 'min-h-[200px]',
  md: 'min-h-[280px]',
  lg: 'min-h-[360px]',
};

const imageSizeClasses = {
  sm: 'h-[120px]',
  md: 'h-[180px]',
  lg: 'h-[240px]',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const priceSizeClasses = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

export const CornerProductCard: React.FC<CornerProductCardProps> = ({
  id,
  name,
  imageUrl,
  price,
  originalPrice,
  isFeatured = false,
  size = 'md',
  showPrice = true,
  onClick,
  className,
}) => {
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(value);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl shadow-sm border overflow-hidden',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        isFeatured && 'ring-2 ring-blue-500 ring-offset-2',
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Image */}
      <div className={cn(
        'relative w-full overflow-hidden bg-gray-100',
        imageSizeClasses[size]
      )}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isFeatured && (
            <span className="px-2 py-1 text-xs font-bold bg-blue-500 text-white rounded-full shadow">
              추천
            </span>
          )}
          {discount > 0 && (
            <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full shadow">
              {discount}%
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className={cn(
          'font-medium text-gray-900 line-clamp-2 mb-2',
          textSizeClasses[size]
        )}>
          {name}
        </h3>

        {showPrice && (
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'font-bold text-gray-900',
              priceSizeClasses[size]
            )}>
              {formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

CornerProductCard.displayName = 'CornerProductCard';
