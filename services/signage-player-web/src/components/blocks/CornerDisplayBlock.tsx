/**
 * CornerDisplayBlock
 *
 * WO-8-B: Signage 화면 내 CornerDisplay Zone 렌더러
 *
 * 역할:
 * - Signage Template의 Zone에 제품 그리드 표시
 * - Phase 1 Listings API로 제품 조회
 * - 자동 새로고침 지원
 *
 * 특징:
 * - Signage와 독립된 refresh 주기
 * - zero-ui 모드 호환 (상호작용 없음)
 * - 에러 시 빈 화면 (fail-silent)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface CornerDisplayBlockSettings {
  /** CornerDisplay.id (직접 지정) */
  cornerId?: string;
  /** CornerDisplay.cornerKey (대안 - 코너 키로 조회) */
  cornerKey?: string;
  /** 디바이스 타입 필터 */
  deviceType?: 'tablet' | 'signage' | 'kiosk';
  /** 자동 새로고침 주기 (ms) - 기본: 60000 */
  refreshIntervalMs?: number;
  /** Phase 1 Listings API 베이스 URL */
  listingsApiBaseUrl?: string;
  /** 표시할 제품 수 제한 */
  limit?: number;
  /** 레이아웃 컬럼 수 */
  columns?: number;
  /** 가격 표시 여부 */
  showPrice?: boolean;
  /** 배경색 */
  backgroundColor?: string;
  /** 카드 배경색 */
  cardBackgroundColor?: string;
}

export interface CornerDisplayBlockProps {
  settings: CornerDisplayBlockSettings;
  /** Zone 전체 너비 */
  width?: number | string;
  /** Zone 전체 높이 */
  height?: number | string;
}

interface CornerProduct {
  id: string;
  name: string;
  description?: string;
  sellingPrice: number;
  imageUrl?: string;
  isFeatured?: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_REFRESH_INTERVAL = 60000; // 1분
const DEFAULT_LIMIT = 12;
const DEFAULT_COLUMNS = 4;
const DEFAULT_LISTINGS_API = '/api/v1/dropshipping/core';

// ============================================================================
// Component
// ============================================================================

export function CornerDisplayBlock({
  settings,
  width = '100%',
  height = '100%',
}: CornerDisplayBlockProps) {
  const [products, setProducts] = useState<CornerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Settings 추출
  const {
    cornerKey,
    cornerId,
    deviceType,
    refreshIntervalMs = DEFAULT_REFRESH_INTERVAL,
    listingsApiBaseUrl = DEFAULT_LISTINGS_API,
    limit = DEFAULT_LIMIT,
    columns = DEFAULT_COLUMNS,
    showPrice = true,
    backgroundColor = '#f9fafb',
    cardBackgroundColor = '#ffffff',
  } = settings;

  // 제품 조회 함수
  const fetchProducts = useCallback(async () => {
    const corner = cornerKey || cornerId;
    if (!corner) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      // Phase 1 Listings API 호출
      const params = new URLSearchParams();
      params.set('corner', corner);
      params.set('visibility', 'visible');
      if (deviceType) {
        params.set('deviceType', deviceType);
      }
      params.set('sortBy', 'sortOrder');
      params.set('sortDirection', 'asc');

      const response = await fetch(
        `${listingsApiBaseUrl}/listings?${params.toString()}`
      );

      if (!mountedRef.current) return;

      if (response.ok) {
        const data = (await response.json()) as {
          success?: boolean;
          data?: CornerProduct[];
          items?: CornerProduct[];
        };

        // API 응답 형식에 따라 처리
        let fetchedProducts = data.data || data.items || [];

        // limit 적용
        if (limit && fetchedProducts.length > limit) {
          fetchedProducts = fetchedProducts.slice(0, limit);
        }

        setProducts(fetchedProducts);
        setError(null);
      } else {
        // 에러 시 빈 배열 유지 (fail-silent)
        console.warn('[CornerDisplayBlock] Failed to fetch products:', response.status);
        setError('제품 조회 실패');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[CornerDisplayBlock] Error fetching products:', err);
      setError('네트워크 오류');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [cornerKey, cornerId, deviceType, listingsApiBaseUrl, limit]);

  // 초기 로드 및 자동 새로고침
  useEffect(() => {
    mountedRef.current = true;

    // 초기 로드
    fetchProducts();

    // 자동 새로고침 설정
    if (refreshIntervalMs > 0) {
      refreshTimerRef.current = window.setInterval(() => {
        fetchProducts();
      }, refreshIntervalMs);
    }

    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchProducts, refreshIntervalMs]);

  // 로딩 상태 (초기 로딩만)
  if (isLoading && products.length === 0) {
    return (
      <div
        className="corner-display-block corner-display-block--loading"
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
        }}
      >
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              border: '3px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'corner-display-spin 1s linear infinite',
              margin: '0 auto 0.5rem',
            }}
          />
          <p style={{ fontSize: '0.875rem' }}>불러오는 중...</p>
        </div>
        <style>{`
          @keyframes corner-display-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 에러 상태 또는 제품 없음
  if ((error || products.length === 0) && !isLoading) {
    return (
      <div
        className="corner-display-block corner-display-block--empty"
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
        }}
      >
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <p style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
            {error || '표시할 제품이 없습니다'}
          </p>
          <p style={{ fontSize: '0.75rem' }}>
            코너: {cornerKey || cornerId || '미지정'}
          </p>
        </div>
      </div>
    );
  }

  // 제품 그리드 렌더링
  return (
    <div
      className="corner-display-block"
      style={{
        width,
        height,
        backgroundColor,
        padding: '1rem',
        overflow: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="corner-display-block__grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '0.75rem',
          width: '100%',
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="corner-display-block__card"
            style={{
              backgroundColor: cardBackgroundColor,
              borderRadius: '0.5rem',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* 제품 이미지 */}
            {product.imageUrl && (
              <div
                className="corner-display-block__image"
                style={{
                  width: '100%',
                  paddingBottom: '100%', // 1:1 비율
                  backgroundColor: '#f3f4f6',
                  backgroundImage: `url(${product.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                }}
              >
                {product.isFeatured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      left: '0.5rem',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      padding: '0.125rem 0.5rem',
                      borderRadius: '0.25rem',
                    }}
                  >
                    추천
                  </div>
                )}
              </div>
            )}

            {/* 제품 정보 */}
            <div style={{ padding: '0.75rem' }}>
              <h4
                className="corner-display-block__name"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  marginBottom: '0.25rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.name}
              </h4>
              {showPrice && (
                <p
                  className="corner-display-block__price"
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    margin: 0,
                  }}
                >
                  {product.sellingPrice.toLocaleString()}원
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

CornerDisplayBlock.displayName = 'CornerDisplayBlock';

export default CornerDisplayBlock;
