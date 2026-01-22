/**
 * CornerDisplay
 *
 * Phase 1: 코너 디스플레이 메인 컴포넌트
 * - CmsView 슬러그 기반 설정 로드
 * - 디바이스별 레이아웃 자동 적용
 * - AI 버튼 통합
 */

import React, { useMemo } from 'react';
import { CornerProductGrid, CornerProduct } from './CornerProductGrid';
import { CornerAiButton } from './CornerAiButton';
import type {
  CornerDisplayLayout,
  DeviceType,
  CORNER_DISPLAY_DEFAULTS,
  DEVICE_TYPE_LAYOUTS,
} from '@o4o/types';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// 기본값 (타입 패키지와 동기화)
const DEFAULTS: Omit<CornerDisplayLayout, never> = {
  columns: 4,
  gap: 'md',
  itemSize: 'md',
  showFeatured: true,
  showPrice: true,
  showAiButton: false,
};

const DEVICE_LAYOUTS: Record<DeviceType, Partial<CornerDisplayLayout>> = {
  web: { columns: 6, itemSize: 'md' },
  mobile: { columns: 2, itemSize: 'lg' },
  kiosk: { columns: 4, itemSize: 'lg', showAiButton: true },
  tablet: { columns: 3, itemSize: 'md' },
  signage: { columns: 3, itemSize: 'lg', showPrice: false },
};

export interface CornerDisplayProps {
  /** CmsView 슬러그 */
  slug?: string;
  /** 제품 목록 */
  products: CornerProduct[];
  /** 레이아웃 설정 (CmsView.layout) */
  layout?: Partial<CornerDisplayLayout>;
  /** 디바이스 타입 (자동 레이아웃 적용) */
  deviceType?: DeviceType;
  /** 제품 클릭 핸들러 */
  onProductClick?: (productId: string) => void;
  /** AI 요청 핸들러 */
  onAiRequest?: (query: string) => void | Promise<void>;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 코너 제목 */
  title?: string;
  /** 코너 설명 */
  description?: string;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
  /** 추가 클래스 */
  className?: string;
}

export const CornerDisplay: React.FC<CornerDisplayProps> = ({
  slug,
  products,
  layout: customLayout,
  deviceType,
  onProductClick,
  onAiRequest,
  isLoading = false,
  title,
  description,
  emptyMessage,
  className,
}) => {
  // 레이아웃 계산: 기본값 -> 디바이스 기본값 -> 커스텀 레이아웃
  const layout = useMemo(() => {
    const deviceDefaults = deviceType ? DEVICE_LAYOUTS[deviceType] : {};
    return {
      ...DEFAULTS,
      ...deviceDefaults,
      ...customLayout,
    };
  }, [deviceType, customLayout]);

  return (
    <div
      className={cn(
        'corner-display',
        'bg-gray-50 min-h-screen',
        className
      )}
      data-slug={slug}
      data-device-type={deviceType}
    >
      {/* Header */}
      {(title || description) && (
        <div className="px-6 py-4 bg-white border-b">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          )}
          {description && (
            <p className="mt-1 text-gray-600">{description}</p>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <CornerProductGrid
          products={products}
          columns={layout.columns}
          gap={layout.gap}
          itemSize={layout.itemSize}
          showFeatured={layout.showFeatured}
          showPrice={layout.showPrice}
          onProductClick={onProductClick}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
        />
      </div>

      {/* AI Button */}
      {layout.showAiButton && onAiRequest && (
        <CornerAiButton
          onAiRequest={onAiRequest}
          variant="floating"
          size="lg"
        />
      )}
    </div>
  );
};

CornerDisplay.displayName = 'CornerDisplay';
