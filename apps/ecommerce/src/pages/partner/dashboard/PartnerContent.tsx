/**
 * Partner Content Page
 *
 * 파트너 콘텐츠 (루틴 등) 관리
 *
 * @package Phase K - Partner Flow
 */

import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export function PartnerContent() {
  const [activeTab, setActiveTab] = useState<'routines' | 'products'>('routines');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">콘텐츠</h1>
        <p className="text-gray-600">
          추천할 콘텐츠와 상품을 관리하세요.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('routines')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'routines'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          루틴
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          추천 상품
        </button>
      </div>

      {/* Content */}
      {activeTab === 'routines' ? <RoutinesTab /> : <ProductsTab />}
    </div>
  );
}

function RoutinesTab() {
  // TODO: 실제 루틴 데이터 연동
  const routines: any[] = [];

  return (
    <div>
      {routines.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 루틴이 없어요
          </h3>
          <p className="text-gray-600 mb-6">
            나만의 뷰티 루틴을 만들어 공유해 보세요.
            <br />
            루틴에 포함된 상품이 판매되면 커미션이 적립됩니다.
          </p>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
            루틴 기능은 준비 중입니다. 곧 만나보실 수 있어요!
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Routine cards would go here */}
        </div>
      )}
    </div>
  );
}

function ProductsTab() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-medium text-gray-900 mb-4">추천 상품 찾기</h3>
      <p className="text-gray-600 mb-6">
        쇼핑몰에서 추천하고 싶은 상품을 찾아 링크를 생성하세요.
      </p>
      <NavLink
        to="/products"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        상품 둘러보기
      </NavLink>

      {/* Popular Products */}
      <div className="mt-8">
        <h4 className="font-medium text-gray-900 mb-4">인기 상품</h4>
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
          인기 상품 추천 기능은 준비 중입니다.
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">추천 팁</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- 직접 사용해 본 상품을 추천하면 신뢰도가 높아져요.</li>
          <li>- 상품별 전용 링크를 사용하면 어떤 상품이 잘 팔리는지 알 수 있어요.</li>
          <li>- 시즌이나 트렌드에 맞는 상품을 추천해 보세요.</li>
        </ul>
      </div>
    </div>
  );
}
