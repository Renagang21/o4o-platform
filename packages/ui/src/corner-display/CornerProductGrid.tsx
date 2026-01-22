/**
 * CornerProductGrid
 *
 * Phase 1: 코너 디스플레이용 제품 그리드
 * - CmsView.layout 설정 기반 렌더링
 * - 디바이스별 반응형 레이아웃
 */

import React from 'react';
import { CornerProductCard, CornerProductCardProps } from './CornerProductCard';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface CornerProduct {
  id: string;
  name: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  isFeatured?: boolean;
}

export interface CornerProductGridProps {
  /** 제품 목록 */
  products: CornerProduct[];
  /** 그리드 열 수 */
  columns?: number;
  /** 아이템 간격 */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** 아이템 크기 */
  itemSize?: 'sm' | 'md' | 'lg' | 'auto';
  /** featured 아이템 표시 여부 */
  showFeatured?: boolean;
  /** 가격 표시 여부 */
  showPrice?: boolean;
  /** 제품 클릭 핸들러 */
  onProductClick?: (productId: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
  /** 추가 클래스 */
  className?: string;
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const getGridColsClass = (columns: number): string => {
  const colsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };
  return colsMap[columns] || 'grid-cols-4';
};

const getItemSize = (itemSize: 'sm' | 'md' | 'lg' | 'auto'): 'sm' | 'md' | 'lg' => {
  if (itemSize === 'auto') return 'md';
  return itemSize;
};

export const CornerProductGrid: React.FC<CornerProductGridProps> = ({
  products,
  columns = 4,
  gap = 'md',
  itemSize = 'md',
  showFeatured = true,
  showPrice = true,
  onProductClick,
  isLoading = false,
  emptyMessage = '등록된 상품이 없습니다.',
  className,
}) => {
  // 로딩 상태
  if (isLoading) {
    return (
      <div className={cn('grid', getGridColsClass(columns), gapClasses[gap], className)}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 rounded-xl"
            style={{ minHeight: itemSize === 'lg' ? 360 : itemSize === 'sm' ? 200 : 280 }}
          />
        ))}
      </div>
    );
  }

  // 빈 상태
  if (products.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}>
        <svg
          className="w-16 h-16 text-gray-300 mb-4"
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
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  // featured 아이템 분리
  const featuredProducts = showFeatured
    ? products.filter((p) => p.isFeatured)
    : [];
  const regularProducts = showFeatured
    ? products.filter((p) => !p.isFeatured)
    : products;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Featured Section */}
      {featuredProducts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">추천 상품</h3>
          <div className={cn('grid', getGridColsClass(Math.min(columns, 3)), gapClasses[gap])}>
            {featuredProducts.map((product) => (
              <CornerProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                imageUrl={product.imageUrl}
                price={product.price}
                originalPrice={product.originalPrice}
                isFeatured={true}
                size={getItemSize(itemSize)}
                showPrice={showPrice}
                onClick={onProductClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Products */}
      <div className={cn('grid', getGridColsClass(columns), gapClasses[gap])}>
        {regularProducts.map((product) => (
          <CornerProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            imageUrl={product.imageUrl}
            price={product.price}
            originalPrice={product.originalPrice}
            isFeatured={false}
            size={getItemSize(itemSize)}
            showPrice={showPrice}
            onClick={onProductClick}
          />
        ))}
      </div>
    </div>
  );
};

CornerProductGrid.displayName = 'CornerProductGrid';
