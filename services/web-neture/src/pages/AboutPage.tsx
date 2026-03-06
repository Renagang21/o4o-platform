/**
 * AboutPage - Neture 플랫폼 소개 페이지
 *
 * Work Order: WO-O4O-NETURE-SUPPLIER-PARTNER-PAGES-V1
 *
 * 구조:
 * 1. Hero - Neture + Online for Offline Network
 * 2. Neture 소개
 * 3. O4O 플랫폼 설명 + 구조 흐름도
 * 4. 플랫폼 구조 (3 cards: Supplier, Partner, Store)
 * 5. Supplier / Partner 역할
 * 6. 플랫폼 비전
 */

import { Link } from 'react-router-dom';
import { Package, Megaphone, Store, ChevronRight, ArrowRight, ArrowDown } from 'lucide-react';

export default function AboutPage() {
  return (
    <div>
      {/* ── 1. Hero ── */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Neture</h1>
          <p className="text-xl md:text-2xl font-medium text-white/90 mb-6">
            Online for Offline Network
          </p>
          <p className="text-lg text-white/70 leading-relaxed max-w-xl mx-auto">
            Neture는 오프라인 매장을 지원하는<br />
            공급자·파트너 협업 플랫폼입니다.
          </p>
        </div>
      </section>

      {/* ── 2. Neture 소개 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Neture 소개</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Neture는 공급자와 파트너가 협력하여<br />
            매장 네트워크를 지원하는 플랫폼입니다.
          </p>
          <p className="text-gray-600 leading-relaxed">
            제품 공급, 콘텐츠 홍보, 매장 협업을 통해<br />
            오프라인 매장의 경쟁력을 높이는 것을 목표로 합니다.
          </p>
        </div>
      </section>

      {/* ── 3. O4O 플랫폼 설명 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">
            Platform Concept
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Online for Offline</h2>
          <p className="text-gray-600 mb-10 max-w-lg mx-auto leading-relaxed">
            온라인 서비스를 통해<br />
            오프라인 매장의 경쟁력을 강화합니다.
          </p>

          {/* 구조 흐름도 */}
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Supplier</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 hidden md:block" />
            <ArrowDown className="w-5 h-5 text-gray-300 md:hidden" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-8 h-8 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Product</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 hidden md:block" />
            <ArrowDown className="w-5 h-5 text-gray-300 md:hidden" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mb-3">
                <Store className="w-8 h-8 text-gray-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Store</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 hidden md:block rotate-180" />
            <ArrowDown className="w-5 h-5 text-gray-300 md:hidden rotate-180" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3">
                <Megaphone className="w-8 h-8 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Partner</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. 플랫폼 구조 (3 cards) ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">플랫폼 구조</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supplier</h3>
              <p className="text-sm text-gray-600">제품을 공급하는 기업</p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Partner</h3>
              <p className="text-sm text-gray-600">마케팅 / 콘텐츠 협력</p>
            </div>

            <div className="bg-gray-100 rounded-xl p-6 border border-gray-200 text-center">
              <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Store</h3>
              <p className="text-sm text-gray-600">제품을 판매하는 매장</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Supplier / Partner 역할 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Supplier &middot; Partner 역할
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Supplier */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Supplier</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-700">제품 등록</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-700">매장 공급</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-700">파트너 협력</span>
                </li>
              </ul>
              <div className="mt-6">
                <Link
                  to="/supplier"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Supplier 자세히 보기
                  <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Partner */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Partner</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-700">콘텐츠 제작</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-700">마케팅 협력</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-700">매장 홍보</span>
                </li>
              </ul>
              <div className="mt-6">
                <Link
                  to="/partner"
                  className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Partner 자세히 보기
                  <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. 플랫폼 비전 ── */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6">플랫폼 비전</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Neture는 공급자와 파트너가 협력하여<br />
            매장 네트워크를 지원하는 협업 플랫폼입니다.
          </p>
          <p className="text-gray-300 leading-relaxed mb-10">
            제품과 콘텐츠가 연결되는<br />
            새로운 매장 생태계를 구축합니다.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            문의하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
