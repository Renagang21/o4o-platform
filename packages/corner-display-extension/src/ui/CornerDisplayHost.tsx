/**
 * CornerDisplayHost
 *
 * Phase 2: 디바이스 → 코너 화면 호스트
 *
 * WO-7 추가:
 * - 코너 정보 + 제품 목록 통합 로딩
 * - Phase 1 Listings API 연결
 * - renderCornerWithProducts 콜백 제공
 *
 * 역할:
 * - "이 디바이스는 어떤 코너 화면을 띄워야 하는가"를 결정
 * - deviceId를 입력받아 귀속된 CornerDisplay 조회
 * - 코너에 해당하는 제품 목록 조회
 * - 없으면 Phase 1 화면으로 fallback
 *
 * ❌ 이 컴포넌트에서 하지 않는 것:
 * - 코너 전환 UI
 * - 디바이스 선택 UI
 * - 복잡한 디자인 (틀만 제공)
 */

import React, { useState, useEffect } from 'react';
import type { CornerListingQuery, CornerDisplayLayout } from '@o4o/types';

/**
 * 제품 타입 (Phase 1 Listing API 응답)
 */
export interface CornerProduct {
  id: string;
  name: string;
  description?: string;
  sellingPrice: number;
  imageUrl?: string;
  isFeatured?: boolean;
}

/**
 * 코너 컨텍스트 (API 응답 타입)
 */
export interface CornerContext {
  corner: {
    id: string;
    cornerKey: string;
    name: string;
    description?: string;
    displayType: string;
    status: string;
    listingQuery?: CornerListingQuery;
    layoutConfig?: CornerDisplayLayout;
  };
  device: {
    id: string;
    deviceId: string;
    deviceType: string;
    name?: string;
    isPrimary: boolean;
  };
  siblingDevices: Array<{
    deviceId: string;
    deviceType: string;
    name?: string;
  }>;
}

/**
 * 코너 + 제품 통합 컨텍스트 (WO-7)
 */
export interface CornerContextWithProducts extends CornerContext {
  products: CornerProduct[];
  query: CornerListingQuery;
}

export interface CornerDisplayHostProps {
  /**
   * 디바이스 식별자
   * - 태블릿 기동 시 설정된 deviceId
   */
  deviceId: string;

  /**
   * 코너 컨텍스트 조회 함수
   * - 기본: fetch API
   * - 테스트/커스텀 시 override 가능
   */
  fetchCornerContext?: (deviceId: string) => Promise<CornerContext | null>;

  /**
   * 코너 화면 렌더러 (기존 - 제품 없이)
   * - 실제 제품 그리드 등을 렌더링
   */
  renderCornerDisplay?: (context: CornerContext) => React.ReactNode;

  /**
   * WO-7: 코너 + 제품 통합 렌더러
   * - 제품 목록까지 포함된 컨텍스트로 렌더링
   * - renderCornerDisplay보다 우선 적용
   */
  renderCornerWithProducts?: (context: CornerContextWithProducts) => React.ReactNode;

  /**
   * WO-7: 제품 조회 활성화 여부
   * - true: 코너 정보 + 제품 목록 동시 로딩
   * - false: 코너 정보만 로딩 (기존 동작)
   * @default false
   */
  loadProducts?: boolean;

  /**
   * Fallback 컴포넌트
   * - 디바이스가 등록되지 않은 경우
   */
  fallback?: React.ReactNode;

  /**
   * 로딩 컴포넌트
   */
  loadingComponent?: React.ReactNode;

  /**
   * 에러 컴포넌트
   */
  errorComponent?: (error: string) => React.ReactNode;

  /**
   * API 베이스 URL
   */
  apiBaseUrl?: string;

  /**
   * WO-7: Listings API 베이스 URL
   * @default apiBaseUrl + '/api/v1/dropshipping/core'
   */
  listingsApiBaseUrl?: string;
}

/**
 * 기본 Fallback 컴포넌트
 */
const DefaultFallback: React.FC<{ deviceId: string }> = ({ deviceId }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem',
    }}
  >
    <div
      style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        디바이스 미등록
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
        이 디바이스({deviceId})는 아직 코너에 등록되지 않았습니다.
      </p>
      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
        관리자에게 문의하여 코너 등록을 요청하세요.
      </p>
    </div>
  </div>
);

/**
 * 기본 로딩 컴포넌트
 */
const DefaultLoading: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: '3rem',
          height: '3rem',
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem',
        }}
      />
      <p style={{ color: '#6b7280' }}>코너 정보를 불러오는 중...</p>
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * 기본 에러 컴포넌트
 */
const DefaultError: React.FC<{ error: string }> = ({ error }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#fef2f2',
      padding: '2rem',
    }}
  >
    <div
      style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        border: '1px solid #fecaca',
        textAlign: 'center',
        maxWidth: '400px',
      }}
    >
      <h2 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>오류 발생</h2>
      <p style={{ color: '#6b7280' }}>{error}</p>
    </div>
  </div>
);

/**
 * 기본 코너 디스플레이 렌더러
 * - Phase 1 CornerDisplay 컴포넌트 연결 위치
 */
const DefaultCornerRenderer: React.FC<{ context: CornerContext }> = ({ context }) => (
  <div
    style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '1.5rem',
    }}
  >
    {/* 헤더 */}
    <div
      style={{
        backgroundColor: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{context.corner.name}</h1>
      {context.corner.description && (
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
          {context.corner.description}
        </p>
      )}
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
        코너: {context.corner.cornerKey} | 디바이스: {context.device.deviceId}
        {context.device.isPrimary && ' (Primary)'}
      </div>
    </div>

    {/* 제품 영역 (Phase 1 CornerDisplay 연결 위치) */}
    <div
      style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p>제품 그리드 영역</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Phase 1 CornerDisplay 컴포넌트 연결 예정
        </p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
          쿼리: {JSON.stringify(context.corner.listingQuery || { corner: context.corner.cornerKey })}
        </p>
      </div>
    </div>
  </div>
);

/**
 * WO-7: 제품 목록을 포함한 기본 렌더러
 */
const DefaultCornerWithProductsRenderer: React.FC<{ context: CornerContextWithProducts }> = ({ context }) => (
  <div
    style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '1.5rem',
    }}
  >
    {/* 헤더 */}
    <div
      style={{
        backgroundColor: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{context.corner.name}</h1>
      {context.corner.description && (
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
          {context.corner.description}
        </p>
      )}
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
        코너: {context.corner.cornerKey} | 디바이스: {context.device.deviceId}
        {context.device.isPrimary && ' (Primary)'} | 제품: {context.products.length}개
      </div>
    </div>

    {/* 제품 그리드 */}
    {context.products.length > 0 ? (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${context.corner.layoutConfig?.columns || 4}, 1fr)`,
          gap: '1rem',
        }}
      >
        {context.products.map((product) => (
          <div
            key={product.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            {product.imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.25rem',
                  marginBottom: '0.75rem',
                  backgroundImage: `url(${product.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {product.name}
            </h3>
            {context.corner.layoutConfig?.showPrice !== false && (
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#2563eb' }}>
                {product.sellingPrice.toLocaleString()}원
              </p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div
        style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          color: '#9ca3af',
        }}
      >
        <p>이 코너에 등록된 제품이 없습니다.</p>
      </div>
    )}
  </div>
);

export const CornerDisplayHost: React.FC<CornerDisplayHostProps> = ({
  deviceId,
  fetchCornerContext,
  renderCornerDisplay,
  renderCornerWithProducts,
  loadProducts = false,
  fallback,
  loadingComponent,
  errorComponent,
  apiBaseUrl = '/api',
  listingsApiBaseUrl,
}) => {
  const [context, setContext] = useState<CornerContext | null>(null);
  const [contextWithProducts, setContextWithProducts] = useState<CornerContextWithProducts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listings API URL 계산
  const effectiveListingsApiBaseUrl = listingsApiBaseUrl || `${apiBaseUrl}/api/v1/dropshipping/core`;

  useEffect(() => {
    const loadContext = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let result: CornerContext | null = null;

        if (fetchCornerContext) {
          // 커스텀 fetch 함수 사용
          result = await fetchCornerContext(deviceId);
        } else {
          // 기본 API 호출
          const response = await fetch(
            `${apiBaseUrl}/corner-displays/by-device/${encodeURIComponent(deviceId)}`
          );

          if (response.ok) {
            const data = await response.json() as { success: boolean; data?: CornerContext };
            if (data.success && data.data) {
              result = data.data;
            }
          } else if (response.status !== 404) {
            throw new Error('코너 정보를 불러오는데 실패했습니다');
          }
        }

        setContext(result);

        // WO-7: 제품 로딩 (loadProducts가 true이고 코너가 있는 경우)
        if (result && loadProducts) {
          const query: CornerListingQuery = result.corner.listingQuery || {
            corner: result.corner.cornerKey,
            visibility: 'visible',
            limit: 12,
            sortBy: 'sortOrder',
            sortDirection: 'asc',
          };

          // Phase 1 Listings API 호출
          const params = new URLSearchParams();
          params.set('corner', query.corner);
          if (query.visibility) params.set('visibility', query.visibility);
          if (query.deviceType) params.set('deviceType', query.deviceType);
          if (query.sortBy) params.set('sortBy', query.sortBy);
          if (query.sortDirection) params.set('sortDirection', query.sortDirection);

          try {
            const listingsResponse = await fetch(
              `${effectiveListingsApiBaseUrl}/listings?${params.toString()}`
            );

            let products: CornerProduct[] = [];
            if (listingsResponse.ok) {
              const listingsData = await listingsResponse.json() as { success?: boolean; data?: CornerProduct[]; items?: CornerProduct[] };
              // API 응답 형식에 따라 처리
              products = listingsData.data || listingsData.items || [];

              // limit 적용
              if (query.limit && products.length > query.limit) {
                products = products.slice(0, query.limit);
              }
            }

            setContextWithProducts({
              ...result,
              products,
              query,
            });
          } catch (productError) {
            // 제품 로딩 실패 시 빈 배열로 처리 (Fallback)
            console.error('Failed to fetch products:', productError);
            setContextWithProducts({
              ...result,
              products: [],
              query,
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, [deviceId, fetchCornerContext, apiBaseUrl, loadProducts, effectiveListingsApiBaseUrl]);

  // 로딩 상태
  if (isLoading) {
    return <>{loadingComponent || <DefaultLoading />}</>;
  }

  // 에러 상태
  if (error) {
    return (
      <>
        {errorComponent ? errorComponent(error) : <DefaultError error={error} />}
      </>
    );
  }

  // 디바이스 미등록 (Fallback)
  if (!context) {
    return <>{fallback || <DefaultFallback deviceId={deviceId} />}</>;
  }

  // WO-7: 제품 포함 렌더러 (우선 적용)
  if (loadProducts && contextWithProducts && renderCornerWithProducts) {
    return <>{renderCornerWithProducts(contextWithProducts)}</>;
  }

  // WO-7: 제품 포함 기본 렌더러
  if (loadProducts && contextWithProducts) {
    return <DefaultCornerWithProductsRenderer context={contextWithProducts} />;
  }

  // 기존: 코너 화면 렌더링 (제품 없이)
  if (renderCornerDisplay) {
    return <>{renderCornerDisplay(context)}</>;
  }

  return <DefaultCornerRenderer context={context} />;
};

CornerDisplayHost.displayName = 'CornerDisplayHost';

export default CornerDisplayHost;
