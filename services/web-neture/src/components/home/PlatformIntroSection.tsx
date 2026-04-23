/**
 * PlatformIntroSection - 플랫폼 소개 섹션
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 네트워크 구조 설명:
 * Supplier → Product → Store
 * Partner → Promotion → Store
 */

import { Package, Store, Megaphone, ArrowRight } from 'lucide-react';

export function PlatformIntroSection() {
  return (
    <section className="py-20 bg-white">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Neture 플랫폼 구조
          </h2>
          <p className="text-gray-600">
            공급자와 파트너가 매장 네트워크를 통해 비즈니스를 확장합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Supplier Flow */}
          <div className="p-8 bg-blue-50 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">공급자 네트워크</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                  <Package className="w-7 h-7 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Supplier</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                  <Package className="w-7 h-7 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Product</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                  <Store className="w-7 h-7 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Store</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center mt-6">
              제품을 매장 네트워크에 공급하여 판매 채널을 확보합니다
            </p>
          </div>

          {/* Partner Flow */}
          <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">파트너 네트워크</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
                  <Megaphone className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Partner</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
                  <Megaphone className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Promotion</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
                  <Store className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Store</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center mt-6">
              콘텐츠와 홍보 활동으로 매장을 지원하고 수익을 공유합니다
            </p>
          </div>
        </div>
    </section>
  );
}
