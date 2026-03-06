/**
 * SupplierLandingPage - 공급자 안내 + 참여 유도 페이지
 *
 * Work Order: WO-O4O-NETURE-SUPPLIER-PARTNER-PAGES-V1
 *
 * 구조:
 * 1. Hero - 공급자 역할 안내, 참여/로그인 CTA
 * 2. 역할 설명 - Supplier → Product → Store Network
 * 3. 혜택 카드 - 제품 등록, 매장 공급, 파트너 협업
 * 4. Forum Preview - 공급자 포럼 주제 미리보기
 * 5. 참여 CTA - 하단 참여 유도
 */

import { Link } from 'react-router-dom';
import { Package, Store, Handshake, ArrowRight, MessageSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';

const forumTopics = [
  { title: '제품 공급 협력 문의', desc: '신규 제품 공급 및 협력 관련 논의' },
  { title: '매장 진열 사례 공유', desc: '성공적인 매장 진열 사례와 노하우' },
  { title: '유통 전략 논의', desc: '효과적인 유통 채널 전략 공유' },
];

const benefits = [
  {
    icon: Package,
    title: '제품 등록',
    desc: '제품을 플랫폼에 등록하고 전국 매장 네트워크에 노출할 수 있습니다.',
    color: 'blue',
  },
  {
    icon: Store,
    title: '매장 공급',
    desc: '검증된 매장 네트워크를 통해 안정적인 유통 채널을 확보합니다.',
    color: 'emerald',
  },
  {
    icon: Handshake,
    title: '파트너 협업',
    desc: '마케팅 파트너와 협력하여 제품 홍보와 판매를 촉진합니다.',
    color: 'violet',
  },
];

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600' },
};

export default function SupplierLandingPage() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  const isSupplier = isAuthenticated && user?.roles.some(r => ['supplier', 'admin'].includes(r));

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            공급자를 위한 매장 네트워크 플랫폼
          </h1>
          <p className="text-lg text-blue-100 mb-8 leading-relaxed">
            제품을 등록하고<br />
            전국 매장 네트워크에 공급할 수 있습니다.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {isSupplier ? (
              <Link
                to="/account/supplier"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                Supplier Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  공급자 참여
                </Link>
                <button
                  onClick={() => openLoginModal('/supplier')}
                  className="inline-flex items-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                >
                  공급자 로그인
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 역할 설명 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">공급자 역할</h2>

          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Supplier</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 hidden md:block" />
            <ArrowRight className="w-5 h-5 text-gray-300 md:hidden" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-8 h-8 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Product</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 hidden md:block" />
            <ArrowRight className="w-5 h-5 text-gray-300 md:hidden" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3">
                <Store className="w-8 h-8 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Store Network</span>
            </div>
          </div>

          <p className="text-gray-600 mt-8 max-w-lg mx-auto leading-relaxed">
            공급자는 제품을 등록하고<br />
            매장 네트워크에 공급할 수 있습니다.
          </p>
        </div>
      </section>

      {/* ── 혜택 카드 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">공급자 혜택</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((b) => {
              const colors = colorMap[b.color];
              return (
                <div
                  key={b.title}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                    <b.icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Forum Preview ── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Supplier Forum</h2>
          </div>

          <div className="space-y-3 mb-6">
            {forumTopics.map((topic) => (
              <div
                key={topic.title}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-sm font-medium text-gray-900 mb-1">{topic.title}</p>
                <p className="text-xs text-gray-500">{topic.desc}</p>
              </div>
            ))}
          </div>

          <Link
            to="/supplier/forum"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Supplier Forum 보기
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── 참여 CTA ── */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            공급자로 참여하세요
          </h2>
          <p className="text-gray-400 mb-8">
            전국 매장 네트워크를 통해 제품을 공급하고 비즈니스를 성장시키세요.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            공급자 참여 신청
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
