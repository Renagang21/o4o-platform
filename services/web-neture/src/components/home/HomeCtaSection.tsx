/**
 * HomeCtaSection - Supplier / Partner 진입 CTA
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * Home 하단 CTA:
 * - Supplier: "제품을 매장 네트워크에 공급하세요"
 * - Partner: "콘텐츠와 홍보 활동으로 매장을 지원하세요"
 */

import { Link } from 'react-router-dom';
import { Package, Megaphone, ArrowRight } from 'lucide-react';

export function HomeCtaSection() {
  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">
            Neture와 함께 성장하세요
          </h2>
          <p className="text-gray-400">
            공급자 또는 파트너로 참여하여 비즈니스를 확장하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Supplier CTA */}
          <div className="p-8 bg-gray-800 rounded-2xl border border-gray-700">
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
              <Package className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Supplier</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              제품을 매장 네트워크에 공급하세요.
              <br />
              검증된 유통 채널을 통해 판매를 확대합니다.
            </p>
            <Link
              to="/supplier"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              공급자 참여
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>

          {/* Partner CTA */}
          <div className="p-8 bg-gray-800 rounded-2xl border border-gray-700">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
              <Megaphone className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Partner</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              콘텐츠와 홍보 활동으로 매장을 지원하세요.
              <br />
              파트너 수익 공유 모델로 함께 성장합니다.
            </p>
            <Link
              to="/partner"
              className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              파트너 참여
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
