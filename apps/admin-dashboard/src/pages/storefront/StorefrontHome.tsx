/**
 * StorefrontHome - Partner Storefront Home Page
 *
 * Phase 7-I: Storefront & QR Landing UI
 *
 * Consumer-facing home page for partner's mini-shop.
 * Features:
 * - Hero section with partner profile
 * - Featured routines
 * - Best product recommendations
 * - CTA for more products
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGStorefrontLayout,
  AGStorefrontHero,
  AGStorefrontSection,
  AGStorefrontCardGrid,
  AGStorefrontProductCard,
  AGStorefrontRoutineCard,
  StorefrontPartner,
} from '@o4o/ui';
import { AGButton } from '@o4o/ui';

interface Product {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  price?: number;
  skinTypes?: string[];
  concerns?: string[];
}

interface Routine {
  id: string;
  title: string;
  description?: string;
  stepCount: number;
  skinTypes?: string[];
  concerns?: string[];
  routineType: 'morning' | 'evening' | 'weekly' | 'special';
}

interface StorefrontData {
  partner: StorefrontPartner;
  featuredRoutines: Routine[];
  recommendedProducts: Product[];
  heroTitle?: string;
  heroDescription?: string;
  heroImage?: string;
}

export default function StorefrontHome() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StorefrontData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStorefrontData = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get(`/api/v1/storefront/${slug}`);

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        throw new Error('Failed to load storefront');
      }
    } catch (err: any) {
      console.error('Error loading storefront:', err);
      // Demo data for development
      setData({
        partner: {
          name: '뷰티인사이더 지수',
          slug: slug || 'demo',
          profileImage: 'https://placehold.co/100x100/pink/white?text=J',
          tagline: '피부과학 기반 스킨케어 전문가',
        },
        heroTitle: '나에게 맞는 스킨케어를 찾아보세요',
        heroDescription: '피부 타입별 맞춤 루틴과 검증된 제품을 추천해드립니다.',
        featuredRoutines: [
          {
            id: '1',
            title: '건조 피부를 위한 집중 보습 루틴',
            description: '하루 종일 촉촉한 피부를 위한 5단계 루틴',
            stepCount: 5,
            skinTypes: ['건성', '민감성'],
            concerns: ['건조', '주름'],
            routineType: 'evening',
          },
          {
            id: '2',
            title: '지성 피부 모닝 케어',
            description: '산뜻하게 하루를 시작하는 가벼운 루틴',
            stepCount: 4,
            skinTypes: ['지성', '복합성'],
            concerns: ['모공', '유수분불균형'],
            routineType: 'morning',
          },
          {
            id: '3',
            title: '주간 안티에이징 스페셜 케어',
            description: '주 1-2회 집중 영양 공급 루틴',
            stepCount: 5,
            skinTypes: ['건성', '중성'],
            concerns: ['주름', '탄력'],
            routineType: 'weekly',
          },
        ],
        recommendedProducts: [
          {
            id: '1',
            name: '히알루론산 수분 세럼',
            brand: '더마랩',
            image: 'https://placehold.co/300x300/f5f5f5/666?text=Serum',
            price: 35000,
            skinTypes: ['건성', '복합성'],
            concerns: ['건조', '수분'],
          },
          {
            id: '2',
            name: '세라마이드 보습 크림',
            brand: '피부연구소',
            image: 'https://placehold.co/300x300/f5f5f5/666?text=Cream',
            price: 42000,
            skinTypes: ['건성', '민감성'],
            concerns: ['보습', '장벽강화'],
          },
          {
            id: '3',
            name: '비타민C 브라이트닝 앰플',
            brand: '글로우랩',
            image: 'https://placehold.co/300x300/f5f5f5/666?text=Ampoule',
            price: 38000,
            skinTypes: ['모든피부'],
            concerns: ['미백', '톤업'],
          },
          {
            id: '4',
            name: 'BHA 모공 클렌저',
            brand: '클리어스킨',
            image: 'https://placehold.co/300x300/f5f5f5/666?text=Cleanser',
            price: 28000,
            skinTypes: ['지성', '복합성'],
            concerns: ['모공', '각질'],
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadStorefrontData();
  }, [loadStorefrontData]);

  const handleRoutineClick = (routineId: string) => {
    navigate(`/storefront/${slug}/routines/${routineId}`);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/storefront/${slug}/products/${productId}`);
  };

  const handleViewAllProducts = () => {
    navigate(`/storefront/${slug}/products`);
  };

  const handleViewAllRoutines = () => {
    navigate(`/storefront/${slug}/routines`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">스토어를 찾을 수 없습니다</h2>
          <p className="text-sm text-gray-500">{error || '요청하신 파트너 스토어가 존재하지 않습니다.'}</p>
        </div>
      </div>
    );
  }

  return (
    <AGStorefrontLayout partner={data.partner}>
      {/* Hero Section */}
      <AGStorefrontHero
        title={data.heroTitle || `${data.partner.name}의 스킨케어 스토어`}
        description={data.heroDescription}
        backgroundImage={data.heroImage}
        ctaLabel="추천 루틴 보기"
        onCtaClick={handleViewAllRoutines}
      />

      {/* Featured Routines */}
      {data.featuredRoutines.length > 0 && (
        <AGStorefrontSection title="추천 루틴">
          <div className="space-y-3">
            {data.featuredRoutines.map((routine) => (
              <AGStorefrontRoutineCard
                key={routine.id}
                id={routine.id}
                title={routine.title}
                description={routine.description}
                stepCount={routine.stepCount}
                tags={[...(routine.skinTypes || []), ...(routine.concerns || [])]}
                type={routine.routineType}
                onClick={() => handleRoutineClick(routine.id)}
              />
            ))}
          </div>
          <div className="mt-4 text-center">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={handleViewAllRoutines}
            >
              모든 루틴 보기
            </AGButton>
          </div>
        </AGStorefrontSection>
      )}

      {/* Recommended Products */}
      {data.recommendedProducts.length > 0 && (
        <AGStorefrontSection title="베스트 추천 제품">
          <AGStorefrontCardGrid columns={2}>
            {data.recommendedProducts.map((product) => (
              <AGStorefrontProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                brand={product.brand}
                image={product.image}
                price={product.price}
                tags={[...(product.skinTypes || []), ...(product.concerns || [])].slice(0, 2)}
                onClick={() => handleProductClick(product.id)}
              />
            ))}
          </AGStorefrontCardGrid>
          <div className="mt-6 text-center">
            <AGButton
              variant="primary"
              onClick={handleViewAllProducts}
              className="w-full sm:w-auto"
            >
              더 많은 제품 보기
            </AGButton>
          </div>
        </AGStorefrontSection>
      )}

      {/* Empty State */}
      {data.featuredRoutines.length === 0 && data.recommendedProducts.length === 0 && (
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            아직 컨텐츠가 없습니다
          </h3>
          <p className="text-sm text-gray-500">
            곧 멋진 스킨케어 루틴과 제품을 소개해드릴게요!
          </p>
        </div>
      )}
    </AGStorefrontLayout>
  );
}
