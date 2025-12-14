/**
 * QrLandingPage - QR Code Landing Page
 *
 * Phase 7-I: Storefront & QR Landing UI
 *
 * Quick landing page for QR code scans.
 * Objectives:
 * - Fast message delivery
 * - Partner trust/credibility
 * - Strong CTA
 *
 * Features:
 * - Minimal hero with partner info
 * - Primary CTA buttons
 * - Product preview grid
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { AGButton } from '@o4o/ui';
import {
  Store,
  Sparkles,
  ShoppingBag,
  ChevronRight,
  ExternalLink,
  Shield,
  Star,
} from 'lucide-react';

interface QrLandingData {
  partner: {
    name: string;
    slug: string;
    profileImage?: string;
    tagline?: string;
    badges?: string[];
    followerCount?: number;
  };
  featuredRoutine?: {
    id: string;
    title: string;
    stepCount: number;
  };
  previewProducts: Array<{
    id: string;
    name: string;
    image?: string;
    price?: number;
  }>;
  customMessage?: string;
}

export default function QrLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<QrLandingData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQrData = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);

      const response = await authClient.api.get(`/api/v1/storefront/qr/${slug}`);

      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Error loading QR landing data:', err);
      // Demo data
      setData({
        partner: {
          name: '뷰티인사이더 지수',
          slug: slug || 'demo',
          profileImage: 'https://placehold.co/120x120/pink/white?text=J',
          tagline: '피부과학 기반 스킨케어 전문가',
          badges: ['인증 파트너', '스킨케어 전문'],
          followerCount: 12500,
        },
        featuredRoutine: {
          id: '1',
          title: '건조 피부를 위한 집중 보습 루틴',
          stepCount: 5,
        },
        previewProducts: [
          {
            id: '1',
            name: '히알루론산 세럼',
            image: 'https://placehold.co/150x150/f5f5f5/666?text=1',
            price: 35000,
          },
          {
            id: '2',
            name: '세라마이드 크림',
            image: 'https://placehold.co/150x150/f5f5f5/666?text=2',
            price: 42000,
          },
          {
            id: '3',
            name: '비타민C 앰플',
            image: 'https://placehold.co/150x150/f5f5f5/666?text=3',
            price: 38000,
          },
          {
            id: '4',
            name: 'BHA 클렌저',
            image: 'https://placehold.co/150x150/f5f5f5/666?text=4',
            price: 28000,
          },
        ],
        customMessage: '나에게 맞는 스킨케어를 찾아보세요!',
      });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadQrData();
  }, [loadQrData]);

  const handleVisitStorefront = () => {
    navigate(`/storefront/${slug}`);
  };

  const handleViewRoutine = () => {
    if (data?.featuredRoutine) {
      navigate(`/storefront/${slug}/routines/${data.featuredRoutine.id}`);
    } else {
      navigate(`/storefront/${slug}`);
    }
  };

  const handleViewProducts = () => {
    navigate(`/storefront/${slug}/products`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">스토어를 찾을 수 없습니다</h2>
          <p className="text-sm text-gray-500">QR 코드가 올바르지 않거나 만료되었습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-200 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="relative px-6 pt-12 pb-8">
          {/* Partner Profile */}
          <div className="text-center">
            {/* Profile Image */}
            <div className="relative inline-block mb-4">
              {data.partner.profileImage ? (
                <img
                  src={data.partner.profileImage}
                  alt={data.partner.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-white text-3xl font-bold">
                    {data.partner.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* Verified Badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Partner Name */}
            <h1 className="text-2xl font-bold text-gray-900">
              {data.partner.name}
            </h1>

            {/* Tagline */}
            {data.partner.tagline && (
              <p className="mt-1 text-gray-600">
                {data.partner.tagline}
              </p>
            )}

            {/* Badges */}
            {data.partner.badges && data.partner.badges.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                {data.partner.badges.map((badge, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-full text-xs font-medium text-gray-700 shadow-sm"
                  >
                    <Star className="w-3 h-3 text-amber-500" />
                    {badge}
                  </span>
                ))}
              </div>
            )}

            {/* Follower Count */}
            {data.partner.followerCount && (
              <p className="mt-3 text-sm text-gray-500">
                <span className="font-semibold text-gray-700">
                  {data.partner.followerCount.toLocaleString()}
                </span>
                명이 팔로우 중
              </p>
            )}

            {/* Custom Message */}
            {data.customMessage && (
              <p className="mt-4 text-lg font-medium text-pink-600">
                {data.customMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="px-6 py-6 space-y-3">
        <AGButton
          variant="primary"
          size="lg"
          className="w-full shadow-lg"
          onClick={handleVisitStorefront}
        >
          <Store className="w-5 h-5 mr-2" />
          스토어 방문하기
        </AGButton>

        {data.featuredRoutine && (
          <AGButton
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleViewRoutine}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            대표 루틴 보기
            <span className="ml-auto text-sm text-gray-500">
              {data.featuredRoutine.stepCount}단계
            </span>
          </AGButton>
        )}
      </div>

      {/* Product Preview */}
      {data.previewProducts.length > 0 && (
        <div className="px-6 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">추천 제품</h2>
            <button
              onClick={handleViewProducts}
              className="text-sm text-pink-600 hover:text-pink-700 flex items-center"
            >
              전체 보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-3">
            {data.previewProducts.slice(0, 4).map((product) => (
              <button
                key={product.id}
                onClick={() => navigate(`/storefront/${slug}/products/${product.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="aspect-square bg-gray-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  {product.price && (
                    <p className="text-sm text-pink-600 font-semibold">
                      {product.price.toLocaleString()}원
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-8 text-center border-t border-gray-100 bg-white">
        <p className="text-sm text-gray-500">
          {data.partner.name}의 공식 스토어프론트
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Powered by O4O Platform
        </p>
        <button
          onClick={() => window.open('https://neture.co.kr', '_blank')}
          className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <ExternalLink className="w-3 h-3" />
          네이처에서 자세히 보기
        </button>
      </footer>
    </div>
  );
}
