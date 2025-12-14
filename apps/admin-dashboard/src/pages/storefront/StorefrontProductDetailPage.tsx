/**
 * StorefrontProductDetailPage - Product Detail Page
 *
 * Phase 7-I: Storefront & QR Landing UI
 *
 * Consumer-facing product detail page.
 * Features:
 * - Hero section with product image
 * - Product info with tags
 * - Tabbed content (Overview, Ingredients, Related Routines)
 * - Similar products recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGStorefrontLayout,
  AGStorefrontSection,
  AGStorefrontCardGrid,
  AGStorefrontProductCard,
  AGStorefrontRoutineCard,
  StorefrontPartner,
} from '@o4o/ui';
import { AGButton, AGTag } from '@o4o/ui';
import { ArrowLeft, ExternalLink, Heart, Share2, Sparkles } from 'lucide-react';

interface ProductDetail {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  price?: number;
  description?: string;
  skinTypes?: string[];
  concerns?: string[];
  ingredients?: string[];
  howToUse?: string;
  volume?: string;
}

interface RelatedRoutine {
  id: string;
  title: string;
  description?: string;
  stepCount: number;
  routineType: 'morning' | 'evening' | 'weekly' | 'special';
  skinTypes?: string[];
}

interface SimilarProduct {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  price?: number;
  skinTypes?: string[];
}

type TabType = 'overview' | 'ingredients' | 'routines';

export default function StorefrontProductDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<StorefrontPartner | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedRoutines, setRelatedRoutines] = useState<RelatedRoutine[]>([]);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLiked, setIsLiked] = useState(false);

  const loadProductDetail = useCallback(async () => {
    if (!slug || !id) return;

    try {
      setLoading(true);

      const response = await authClient.api.get(`/api/v1/storefront/${slug}/products/${id}`);

      if (response.data?.success) {
        const data = response.data.data;
        setPartner(data.partner);
        setProduct(data.product);
        setRelatedRoutines(data.relatedRoutines || []);
        setSimilarProducts(data.similarProducts || []);
      }
    } catch (err) {
      console.error('Error loading product detail:', err);
      // Demo data
      setPartner({
        name: '뷰티인사이더 지수',
        slug: slug || 'demo',
        profileImage: 'https://placehold.co/100x100/pink/white?text=J',
        tagline: '피부과학 기반 스킨케어 전문가',
      });
      setProduct({
        id: id || '1',
        name: '히알루론산 수분 세럼',
        brand: '더마랩',
        image: 'https://placehold.co/400x400/f5f5f5/666?text=Serum',
        price: 35000,
        description: '3중 히알루론산 복합체가 피부 깊숙이 수분을 공급하여 오랫동안 촉촉하고 탄력있는 피부로 가꿔줍니다. 가벼운 워터 텍스처로 빠르게 흡수되며, 건조함 없이 산뜻한 마무리감을 선사합니다.',
        skinTypes: ['건성', '복합성', '민감성'],
        concerns: ['건조', '수분', '탄력'],
        ingredients: ['히알루론산', '나이아신아마이드', '판테놀', '알란토인', '세라마이드 NP', '글리세린'],
        howToUse: '세안 후 토너로 피부결을 정돈한 뒤, 적당량을 덜어 얼굴 전체에 부드럽게 펴 발라주세요. 가볍게 두드려 흡수시켜줍니다.',
        volume: '50ml',
      });
      setRelatedRoutines([
        {
          id: '1',
          title: '건조 피부를 위한 집중 보습 루틴',
          description: '하루 종일 촉촉한 피부를 위한 5단계 루틴',
          stepCount: 5,
          routineType: 'evening',
          skinTypes: ['건성', '민감성'],
        },
        {
          id: '2',
          title: '수분 광채 모닝 루틴',
          description: '촉촉하고 광나는 피부로 하루 시작',
          stepCount: 4,
          routineType: 'morning',
          skinTypes: ['건성', '복합성'],
        },
      ]);
      setSimilarProducts([
        {
          id: '2',
          name: '세라마이드 보습 크림',
          brand: '피부연구소',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Cream',
          price: 42000,
          skinTypes: ['건성', '민감성'],
        },
        {
          id: '5',
          name: '나이아신아마이드 토너',
          brand: '스킨랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Toner',
          price: 25000,
          skinTypes: ['지성', '복합성'],
        },
        {
          id: '7',
          name: '센텔라 진정 세럼',
          brand: '시카케어',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Cica',
          price: 32000,
          skinTypes: ['민감성', '복합성'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    loadProductDetail();
  }, [loadProductDetail]);

  const handleBack = () => {
    navigate(`/storefront/${slug}/products`);
  };

  const handleRoutineClick = (routineId: string) => {
    navigate(`/storefront/${slug}/routines/${routineId}`);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/storefront/${slug}/products/${productId}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: '개요' },
    { key: 'ingredients', label: '성분' },
    { key: 'routines', label: '관련 루틴' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!partner || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">제품을 찾을 수 없습니다</h2>
          <AGButton variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <AGStorefrontLayout partner={partner} showBackButton onBack={handleBack}>
      {/* Product Hero */}
      <div className="bg-white">
        {/* Image */}
        <div className="aspect-square bg-gray-100 relative">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="w-16 h-16 text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-gray-500 mb-1">{product.brand}</p>
          )}

          {/* Name */}
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>

          {/* Volume */}
          {product.volume && (
            <p className="text-sm text-gray-500 mt-1">{product.volume}</p>
          )}

          {/* Price */}
          {product.price !== undefined && (
            <p className="mt-2 text-2xl font-bold text-pink-600">
              {product.price.toLocaleString()}원
            </p>
          )}

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {product.skinTypes?.map((type) => (
              <AGTag key={type} color="blue" size="sm">
                {type}
              </AGTag>
            ))}
            {product.concerns?.map((concern) => (
              <AGTag key={concern} color="green" size="sm">
                {concern}
              </AGTag>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-3 rounded-full border transition-colors ${
                isLiked
                  ? 'bg-pink-50 border-pink-200 text-pink-500'
                  : 'border-gray-200 text-gray-400 hover:text-pink-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-3 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <AGButton variant="primary" className="flex-1 ml-2">
              <ExternalLink className="w-4 h-4 mr-2" />
              구매하러 가기
            </AGButton>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-t border-b border-gray-200 sticky top-14 z-30">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.key === 'routines' && relatedRoutines.length > 0 && (
                <span className="ml-1 text-xs">({relatedRoutines.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white min-h-[200px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <AGStorefrontSection>
            {product.description && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">제품 설명</h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
            {product.howToUse && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">사용 방법</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {product.howToUse}
                </p>
              </div>
            )}
          </AGStorefrontSection>
        )}

        {/* Ingredients Tab */}
        {activeTab === 'ingredients' && (
          <AGStorefrontSection>
            {product.ingredients && product.ingredients.length > 0 ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">주요 성분</h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">성분 정보가 없습니다</p>
            )}
          </AGStorefrontSection>
        )}

        {/* Routines Tab */}
        {activeTab === 'routines' && (
          <AGStorefrontSection>
            {relatedRoutines.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">
                  이 제품이 포함된 루틴
                </p>
                {relatedRoutines.map((routine) => (
                  <AGStorefrontRoutineCard
                    key={routine.id}
                    id={routine.id}
                    title={routine.title}
                    description={routine.description}
                    stepCount={routine.stepCount}
                    type={routine.routineType}
                    tags={routine.skinTypes}
                    onClick={() => handleRoutineClick(routine.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                이 제품이 포함된 루틴이 없습니다
              </p>
            )}
          </AGStorefrontSection>
        )}
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <AGStorefrontSection title="비슷한 제품" className="bg-gray-50 mt-4">
          <AGStorefrontCardGrid columns={3}>
            {similarProducts.map((prod) => (
              <AGStorefrontProductCard
                key={prod.id}
                id={prod.id}
                name={prod.name}
                brand={prod.brand}
                image={prod.image}
                price={prod.price}
                tags={prod.skinTypes}
                onClick={() => handleProductClick(prod.id)}
              />
            ))}
          </AGStorefrontCardGrid>
        </AGStorefrontSection>
      )}
    </AGStorefrontLayout>
  );
}
