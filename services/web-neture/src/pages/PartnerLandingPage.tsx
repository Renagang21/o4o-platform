/**
 * PartnerLandingPage - 파트너 안내 + 참여 유도 페이지
 *
 * Work Order: WO-O4O-NETURE-SUPPLIER-PARTNER-PAGES-V1
 *
 * 구조:
 * 1. Hero - 파트너 역할 안내, 참여/로그인 CTA
 * 2. 역할 설명 - Supplier → Product → Store ← Partner (Promotion)
 * 3. 활동 영역 카드 - 콘텐츠 제작, 홍보 활동, 매장 협업
 * 4. Forum Preview - 파트너 포럼 주제 미리보기
 * 5. 참여 CTA - 하단 참여 유도
 */

import { Link } from 'react-router-dom';
import { Megaphone, Package, Store, Palette, TrendingUp, Handshake, ArrowRight, MessageSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';

const forumTopics = [
  { title: '마케팅 아이디어 공유', desc: '효과적인 마케팅 전략과 아이디어 논의' },
  { title: '콘텐츠 제작 협업', desc: '제품 홍보 콘텐츠 공동 제작 논의' },
  { title: '매장 홍보 사례', desc: '성공적인 매장 홍보 사례와 성과 공유' },
];

const activities = [
  {
    icon: Palette,
    title: '콘텐츠 제작',
    desc: '제품 홍보를 위한 콘텐츠를 제작하고 매장과 공유합니다.',
    color: 'emerald',
  },
  {
    icon: TrendingUp,
    title: '홍보 활동',
    desc: '매장 판매를 촉진하는 홍보와 마케팅 활동을 수행합니다.',
    color: 'blue',
  },
  {
    icon: Handshake,
    title: '매장 협업',
    desc: '매장과 직접 협력하여 마케팅 캠페인을 진행합니다.',
    color: 'violet',
  },
];

const colorMap: Record<string, { bg: string; icon: string }> = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600' },
};

export default function PartnerLandingPage() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  const isPartner = isAuthenticated && user?.roles.some(r => ['partner', 'admin'].includes(r));

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            매장 네트워크를 연결하는 마케팅 파트너
          </h1>
          <p className="text-lg text-emerald-100 mb-8 leading-relaxed">
            콘텐츠와 홍보 활동을 통해<br />
            매장 판매를 지원할 수 있습니다.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {isPartner ? (
              <Link
                to="/account/partner"
                className="inline-flex items-center px-6 py-3 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
              >
                Partner Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center px-6 py-3 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  파트너 참여
                </Link>
                <button
                  onClick={() => openLoginModal('/partner')}
                  className="inline-flex items-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                >
                  파트너 로그인
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 역할 설명 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">파트너 역할</h2>

          <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap">
            {/* Supplier → Product → Store 상단 흐름 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-2">
                <Package className="w-7 h-7 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-gray-900">Supplier</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 hidden md:block" />
            <ArrowRight className="w-4 h-4 text-gray-300 md:hidden" />
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-2">
                <Package className="w-7 h-7 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-gray-900">Product</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 hidden md:block" />
            <ArrowRight className="w-4 h-4 text-gray-300 md:hidden" />
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-2">
                <Store className="w-7 h-7 text-gray-600" />
              </div>
              <span className="text-xs font-semibold text-gray-900">Store</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 hidden md:block rotate-90 md:rotate-0" />
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-2">
                <Megaphone className="w-7 h-7 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 font-bold">Partner</span>
              <span className="text-[10px] text-emerald-600">(Promotion)</span>
            </div>
          </div>

          <p className="text-gray-600 mt-8 max-w-lg mx-auto leading-relaxed">
            파트너는 콘텐츠와 홍보 활동을 통해<br />
            매장과 제품을 연결하는 역할을 합니다.
          </p>
        </div>
      </section>

      {/* ── 활동 영역 카드 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">파트너 활동 영역</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activities.map((a) => {
              const colors = colorMap[a.color];
              return (
                <div
                  key={a.title}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                    <a.icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{a.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{a.desc}</p>
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
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">Partner Forum</h2>
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
            to="/partner/forum"
            className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Partner Forum 보기
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── 참여 CTA ── */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            파트너로 참여하세요
          </h2>
          <p className="text-gray-400 mb-8">
            콘텐츠와 홍보 활동을 통해 매장 네트워크를 지원하고 함께 성장하세요.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            파트너 참여 신청
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
