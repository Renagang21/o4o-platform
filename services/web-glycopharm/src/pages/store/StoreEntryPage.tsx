/**
 * StoreEntryPage - 약국 매장 허브 진입 포털
 *
 * WO-STORE-MAIN-ENTRY-LAYOUT-V1
 * WO-O4O-STORE-UX-STRUCTURE-ALIGNMENT-V1:
 * - 2카드 선택 → 3-step 실행 흐름 구조
 * - 상품 선택 → 콘텐츠 만들기 → 매장에 적용하기
 */

import { NavLink } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import { BarChart3, Package, FileText, Monitor, ArrowRight, Settings } from 'lucide-react';

export default function StoreEntryPage() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            약국 운영 시작하기
          </h1>
          <p className="text-slate-300 text-sm md:text-base">
            상품 선택 → 콘텐츠 만들기 → 매장에 적용하기
          </p>
        </div>
      </section>

      <PageSection last>
        <PageContainer>
          {/* 3-Step Execution Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

            {/* Step 1: 상품 선택 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  상품 선택
                </span>
              </div>
              <Package className="w-8 h-8 text-blue-400 mb-3" />
              <h2 className="text-lg font-bold text-slate-800 mb-2">판매할 상품 선택</h2>
              <p className="text-sm text-slate-500 mb-5">
                HUB에서 판매할 상품을 선택하고 매장에 등록합니다
              </p>
              <NavLink
                to="/store/products"
                className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
              >
                상품 관리 <ArrowRight className="w-4 h-4" />
              </NavLink>
            </div>

            {/* Step 2: 콘텐츠 만들기 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                  콘텐츠 만들기
                </span>
              </div>
              <FileText className="w-8 h-8 text-emerald-400 mb-3" />
              <h2 className="text-lg font-bold text-slate-800 mb-2">콘텐츠 제작</h2>
              <p className="text-sm text-slate-500 mb-5">
                상품을 알릴 콘텐츠와 사이니지 자료를 만듭니다
              </p>
              <div className="flex flex-col gap-2">
                <NavLink
                  to="/store/content"
                  className="flex items-center gap-1 text-sm text-emerald-600 font-medium hover:text-emerald-700"
                >
                  콘텐츠 관리 <ArrowRight className="w-4 h-4" />
                </NavLink>
                <NavLink
                  to="/store/signage"
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                >
                  사이니지 <ArrowRight className="w-4 h-4" />
                </NavLink>
              </div>
            </div>

            {/* Step 3: 매장에 적용하기 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                  매장에 적용하기
                </span>
              </div>
              <Monitor className="w-8 h-8 text-violet-400 mb-3" />
              <h2 className="text-lg font-bold text-slate-800 mb-2">채널 적용 및 운영</h2>
              <p className="text-sm text-slate-500 mb-5">
                채널을 통해 매장에 적용하고 운영 현황을 확인합니다
              </p>
              <div className="flex flex-col gap-2">
                <NavLink
                  to="/store/channels"
                  className="flex items-center gap-1 text-sm text-violet-600 font-medium hover:text-violet-700"
                >
                  채널 관리 <ArrowRight className="w-4 h-4" />
                </NavLink>
                <NavLink
                  to="/store/hub"
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                >
                  운영 허브 <ArrowRight className="w-4 h-4" />
                </NavLink>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="mt-6 flex flex-wrap gap-3">
            <NavLink
              to="/store/hub"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-amber-500" />
              운영 허브
            </NavLink>
            <NavLink
              to="/store/orders"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              주문 관리
            </NavLink>
          </div>
        </PageContainer>
      </PageSection>
    </div>
  );
}
