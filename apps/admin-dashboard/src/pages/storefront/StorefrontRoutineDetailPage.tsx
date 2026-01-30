/**
 * StorefrontRoutineDetailPage - Routine Detail Page
 *
 * Phase 7-I: Storefront & QR Landing UI
 *
 * Consumer-facing routine detail page.
 * Features:
 * - Routine header with type badge
 * - Step-by-step guide
 * - Products list in routine
 * - Apply routine CTA
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGStorefrontLayout,
  AGStorefrontSection,
  AGStorefrontCardGrid,
  AGStorefrontProductCard,
  StorefrontPartner,
} from '@o4o/ui';
import { AGButton, AGTag, AGCard } from '@o4o/ui';
import {
  ArrowLeft,
  Sun,
  Moon,
  Calendar,
  Sparkles,
  Check,
  Heart,
  Share2,
  ChevronRight,
} from 'lucide-react';

interface RoutineStep {
  order: number;
  productId?: string;
  productName: string;
  productImage?: string;
  description: string;
}

interface RoutineDetail {
  id: string;
  title: string;
  description?: string;
  routineType: 'morning' | 'evening' | 'weekly' | 'special';
  skinTypes?: string[];
  concerns?: string[];
  steps: RoutineStep[];
  tips?: string;
  duration?: string;
}

interface RoutineProduct {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  price?: number;
  skinTypes?: string[];
}

const routineTypeInfo: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  morning: {
    icon: <Sun className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: '모닝 루틴',
  },
  evening: {
    icon: <Moon className="w-5 h-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: '이브닝 루틴',
  },
  weekly: {
    icon: <Calendar className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    label: '주간 루틴',
  },
  special: {
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    label: '스페셜 케어',
  },
};

export default function StorefrontRoutineDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<StorefrontPartner | null>(null);
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [products, setProducts] = useState<RoutineProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const loadRoutineDetail = useCallback(async () => {
    if (!slug || !id) return;

    try {
      setLoading(true);

      const response = await authClient.api.get(`/api/v1/storefront/${slug}/routines/${id}`);

      if (response.data?.success) {
        const data = response.data.data;
        setPartner(data.partner);
        setRoutine(data.routine);
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error loading routine detail:', err);
      // Demo data
      setPartner({
        name: '뷰티인사이더 지수',
        slug: slug || 'demo',
        profileImage: 'https://placehold.co/100x100/pink/white?text=J',
        tagline: '피부과학 기반 스킨케어 전문가',
      });
      setRoutine({
        id: id || '1',
        title: '건조 피부를 위한 집중 보습 루틴',
        description: '하루 종일 촉촉한 피부를 유지하기 위한 저녁 스킨케어 루틴입니다. 깊은 수분 공급과 장벽 강화에 초점을 맞추었습니다.',
        routineType: 'evening',
        skinTypes: ['건성', '민감성'],
        concerns: ['건조', '주름', '탄력'],
        duration: '약 15-20분',
        tips: '각 단계 사이에 30초~1분 정도 흡수 시간을 주면 더욱 효과적입니다. 특히 세럼과 크림 사이에는 충분히 흡수시켜 주세요.',
        steps: [
          {
            order: 1,
            productId: '1',
            productName: '클렌징 오일',
            productImage: 'https://placehold.co/80x80/f5f5f5/666?text=1',
            description: '메이크업과 선크림을 부드럽게 녹여 제거합니다. 마른 손에 적당량을 덜어 원을 그리며 마사지하듯 클렌징합니다.',
          },
          {
            order: 2,
            productId: '2',
            productName: '폼 클렌저',
            productImage: 'https://placehold.co/80x80/f5f5f5/666?text=2',
            description: '거품을 충분히 낸 후 미온수로 부드럽게 2차 세안합니다. 너무 오래 문지르지 마세요.',
          },
          {
            order: 3,
            productId: '3',
            productName: '하이드레이팅 토너',
            productImage: 'https://placehold.co/80x80/f5f5f5/666?text=3',
            description: '화장솜 또는 손에 덜어 피부결을 정돈하고 첫 수분을 공급합니다. 가볍게 패팅하며 흡수시킵니다.',
          },
          {
            order: 4,
            productId: '4',
            productName: '히알루론산 세럼',
            productImage: 'https://placehold.co/80x80/f5f5f5/666?text=4',
            description: '촉촉한 피부 상태에서 적당량을 덜어 얼굴 전체에 펴 바릅니다. 손바닥으로 감싸 체온으로 흡수시킵니다.',
          },
          {
            order: 5,
            productId: '5',
            productName: '세라마이드 크림',
            productImage: 'https://placehold.co/80x80/f5f5f5/666?text=5',
            description: '마무리 단계로 수분을 가두어 줍니다. 피부 바깥쪽으로 부드럽게 펴 바르며 마무리합니다.',
          },
        ],
      });
      setProducts([
        {
          id: '1',
          name: '클렌징 오일',
          brand: '더마랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Oil',
          price: 28000,
          skinTypes: ['모든피부'],
        },
        {
          id: '2',
          name: '폼 클렌저',
          brand: '더마랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Foam',
          price: 18000,
          skinTypes: ['건성', '민감성'],
        },
        {
          id: '3',
          name: '하이드레이팅 토너',
          brand: '스킨랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Toner',
          price: 25000,
          skinTypes: ['건성', '복합성'],
        },
        {
          id: '4',
          name: '히알루론산 세럼',
          brand: '더마랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Serum',
          price: 35000,
          skinTypes: ['건성', '복합성'],
        },
        {
          id: '5',
          name: '세라마이드 크림',
          brand: '피부연구소',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Cream',
          price: 42000,
          skinTypes: ['건성', '민감성'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    loadRoutineDetail();
  }, [loadRoutineDetail]);

  const handleBack = () => {
    navigate(`/storefront/${slug}`);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/storefront/${slug}/products/${productId}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: routine?.title,
          text: routine?.description,
          url: window.location.href,
        });
      } catch {
        // Share cancelled by user - no action needed
      }
    }
  };

  const toggleStepComplete = (stepOrder: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepOrder)) {
      newCompleted.delete(stepOrder);
    } else {
      newCompleted.add(stepOrder);
    }
    setCompletedSteps(newCompleted);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!partner || !routine) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">루틴을 찾을 수 없습니다</h2>
          <AGButton variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            스토어로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  const typeInfo = routineTypeInfo[routine.routineType];
  const completionPercentage = Math.round((completedSteps.size / routine.steps.length) * 100);

  return (
    <AGStorefrontLayout partner={partner} showBackButton onBack={handleBack}>
      {/* Routine Header */}
      <div className="bg-white p-4 border-b border-gray-100">
        {/* Type Badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${typeInfo.bgColor} ${typeInfo.color} mb-3`}>
          {typeInfo.icon}
          <span className="text-sm font-medium">{typeInfo.label}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {routine.title}
        </h1>

        {/* Description */}
        {routine.description && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            {routine.description}
          </p>
        )}

        {/* Meta */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
          <span>{routine.steps.length}단계</span>
          {routine.duration && <span>{routine.duration}</span>}
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-2">
          {routine.skinTypes?.map((type) => (
            <AGTag key={type} color="blue" size="sm">
              {type}
            </AGTag>
          ))}
          {routine.concerns?.map((concern) => (
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
        </div>
      </div>

      {/* Progress Indicator */}
      {completedSteps.size > 0 && (
        <div className="bg-pink-50 px-4 py-3 border-b border-pink-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-pink-700 font-medium">진행률: {completionPercentage}%</span>
            <button
              onClick={() => setCompletedSteps(new Set())}
              className="text-pink-600 hover:text-pink-700"
            >
              초기화
            </button>
          </div>
          <div className="mt-2 h-2 bg-pink-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <AGStorefrontSection title="루틴 단계">
        <div className="space-y-3">
          {routine.steps.map((step) => {
            const isCompleted = completedSteps.has(step.order);
            return (
              <AGCard
                key={step.order}
                className={`transition-all ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Step Number / Check */}
                  <button
                    onClick={() => toggleStepComplete(step.order)}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-pink-100 text-pink-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.order
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {step.productImage && (
                        <img
                          src={step.productImage}
                          alt={step.productName}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                          {step.productName}
                        </h4>
                        {step.productId && (
                          <button
                            onClick={() => handleProductClick(step.productId!)}
                            className="text-xs text-pink-600 hover:text-pink-700 flex items-center gap-0.5"
                          >
                            제품 상세
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`mt-2 text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'} leading-relaxed`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </AGCard>
            );
          })}
        </div>
      </AGStorefrontSection>

      {/* Tips */}
      {routine.tips && (
        <AGStorefrontSection title="추천 팁" className="bg-amber-50">
          <div className="flex gap-3 p-4 bg-white rounded-lg border border-amber-200">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {routine.tips}
            </p>
          </div>
        </AGStorefrontSection>
      )}

      {/* Products in Routine */}
      {products.length > 0 && (
        <AGStorefrontSection title="루틴에 사용된 제품" className="bg-gray-50">
          <AGStorefrontCardGrid columns={2}>
            {products.map((product) => (
              <AGStorefrontProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                brand={product.brand}
                image={product.image}
                price={product.price}
                tags={product.skinTypes}
                onClick={() => handleProductClick(product.id)}
              />
            ))}
          </AGStorefrontCardGrid>
        </AGStorefrontSection>
      )}

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 safe-area-inset-bottom">
        <AGButton variant="primary" className="w-full" size="lg">
          이 루틴 적용하기
        </AGButton>
      </div>
    </AGStorefrontLayout>
  );
}
