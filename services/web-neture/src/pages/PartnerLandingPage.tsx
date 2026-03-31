/**
 * PartnerLandingPage - 파트너 참여 유도 Landing Page
 *
 * Work Order: WO-O4O-NETURE-PARTNER-PAGE-V1
 *
 * 구조:
 * 1. Hero - 파트너 참여 유도
 * 2. 파트너 프로그램 소개 - 4개 카드
 * 3. 파트너 활동 방식 - Partner → 제품 선택 → 홍보 활동 → 고객 구매 → 파트너 수익
 * 4. 파트너 수익 구조 - 제품 판매 → 커미션 → 정산
 * 5. 파트너 활동 예시 - 4개 카드
 * 6. 참여 절차 - 4단계
 * 7. CTA - 하단 참여 유도
 */

import { Link } from 'react-router-dom';
import {
  Megaphone,
  Link2,
  Monitor,
  Wallet,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  ShoppingCart,
  Users,
  CheckCircle2,
  Star,
  Share2,
  QrCode,
  ImageIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';

/* ── 파트너 프로그램 소개 ── */
const programCards = [
  {
    icon: Megaphone,
    title: '제품 홍보',
    desc: '공급자의 제품을 다양한 채널에서 홍보하고 판매를 촉진합니다.',
    color: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  },
  {
    icon: Link2,
    title: '링크 공유',
    desc: '전용 파트너 링크를 통해 고객을 매장으로 연결합니다.',
    color: { bg: 'bg-blue-50', text: 'text-blue-600' },
  },
  {
    icon: Monitor,
    title: '콘텐츠 활용',
    desc: '공급자가 제공하는 홍보 콘텐츠를 활용하여 마케팅합니다.',
    color: { bg: 'bg-violet-50', text: 'text-violet-600' },
  },
  {
    icon: Wallet,
    title: '수익 정산',
    desc: '홍보 활동을 통한 판매 실적에 따라 커미션을 정산받습니다.',
    color: { bg: 'bg-amber-50', text: 'text-amber-600' },
  },
];

/* ── 파트너 활동 방식 ── */
const activityFlow = [
  { icon: Users, label: 'Partner', desc: '파트너' },
  { icon: ShoppingCart, label: '제품 선택', desc: '홍보할 제품' },
  { icon: Megaphone, label: '홍보 활동', desc: '마케팅 수행' },
  { icon: Users, label: '고객 구매', desc: '매출 발생' },
  { icon: Wallet, label: '파트너 수익', desc: '커미션 정산' },
];

/* ── 파트너 활동 예시 ── */
const activityExamples = [
  { emoji: '⭐', icon: Star, name: '제품 리뷰', desc: '제품 사용 후기를 작성하여 공유' },
  { emoji: '📢', icon: Share2, name: 'SNS 홍보', desc: 'SNS 채널을 통해 제품 홍보' },
  { emoji: '📱', icon: QrCode, name: 'QR 홍보', desc: 'QR 코드를 활용한 오프라인 홍보' },
  { emoji: '🖼️', icon: ImageIcon, name: '매장 콘텐츠 공유', desc: '매장에서 사용할 콘텐츠 공유' },
];

/* ── 참여 절차 ── */
const registrationSteps = [
  { step: 1, title: '파트너 가입', desc: '기본 정보를 입력하여 파트너로 등록합니다.' },
  { step: 2, title: '운영자 승인', desc: '운영자가 등록 정보를 검토하고 승인합니다.' },
  { step: 3, title: '제품 선택', desc: '승인 후 홍보할 제품을 선택합니다.' },
  { step: 4, title: '홍보 활동', desc: '다양한 채널을 통해 홍보 활동을 시작합니다.' },
];

export default function PartnerLandingPage() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const isPartner = isAuthenticated && user?.roles.some((r) => ['neture:partner', 'partner', 'neture:admin', 'platform:super_admin'].includes(r));

  return (
    <div>
      {/* ── 1. Hero ── */}
      <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Neture 파트너로 참여하세요
          </h1>
          <p className="text-lg text-emerald-100 mb-8 leading-relaxed max-w-2xl mx-auto">
            Neture 파트너는 제품 홍보 활동을 통해 매출을 촉진하고
            <br />
            판매 실적에 따라 커미션을 정산받는 프로그램입니다.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {isPartner ? (
              <Link
                to="/partner/dashboard"
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
                  파트너 등록
                  <ArrowRight className="ml-2 w-5 h-5" />
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

      {/* ── 2. 파트너 프로그램 소개 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">파트너 프로그램</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {programCards.map((c) => (
              <div
                key={c.title}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 ${c.color.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <c.icon className={`w-6 h-6 ${c.color.text}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. 파트너 활동 방식 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">파트너 활동 방식</h2>
          <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
            파트너는 제품을 선택하고 홍보 활동을 수행합니다.
            고객이 구매하면 파트너에게 커미션이 정산됩니다.
          </p>

          {/* Desktop: horizontal */}
          <div className="hidden md:flex items-center justify-center gap-4">
            {activityFlow.map((s, i) => (
              <div key={s.label + i} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white border-2 border-emerald-200 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
                    <s.icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                  <span className="text-xs text-gray-500">{s.desc}</span>
                </div>
                {i < activityFlow.length - 1 && <ChevronRight className="w-6 h-6 text-gray-300 mt-[-1.5rem]" />}
              </div>
            ))}
          </div>

          {/* Mobile: vertical */}
          <div className="flex md:hidden flex-col items-center gap-3">
            {activityFlow.map((s, i) => (
              <div key={s.label + i} className="flex flex-col items-center">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white border-2 border-emerald-200 rounded-2xl flex items-center justify-center shadow-sm">
                    <s.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
                {i < activityFlow.length - 1 && <ArrowDown className="w-5 h-5 text-gray-300 my-1" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. 파트너 수익 구조 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">파트너 수익 구조</h2>
          <p className="text-gray-600 text-center mb-10">
            파트너는 홍보 활동을 통해 발생한 판매 실적에 따라 커미션을 정산받습니다.
          </p>
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-2">
                <ShoppingCart className="w-7 h-7 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">제품 판매</span>
              <span className="text-xs text-gray-500">고객 구매 발생</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-2">
                <Megaphone className="w-7 h-7 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">커미션</span>
              <span className="text-xs text-gray-500">판매 실적 기반</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-2">
                <Wallet className="w-7 h-7 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">정산</span>
              <span className="text-xs text-gray-500">파트너 수익</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. 파트너 활동 예시 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">파트너 활동 예시</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {activityExamples.map((ex) => (
              <div
                key={ex.name}
                className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-emerald-200 transition-colors"
              >
                <span className="text-3xl mb-3 block">{ex.emoji}</span>
                <span className="text-sm font-semibold text-gray-900 block mb-1">{ex.name}</span>
                <span className="text-xs text-gray-500">{ex.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. 참여 절차 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">파트너 참여 절차</h2>
          <p className="text-gray-600 text-center mb-10">
            파트너는 등록 후 운영자 승인 과정을 거칩니다.
            승인 이후 제품을 선택하고 홍보 활동을 시작할 수 있습니다.
          </p>
          <div className="space-y-6">
            {registrationSteps.map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {item.step}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-gray-200 flex-shrink-0 mt-2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. CTA ── */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Neture 파트너로 참여하세요</h2>
          <p className="text-gray-400 mb-8">
            제품 홍보 활동을 통해 커미션을 정산받고 함께 성장하세요.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            파트너 등록
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
