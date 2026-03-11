/**
 * SupplierLandingPage - 공급자 참여 유도 Landing Page
 *
 * Work Order: WO-O4O-NETURE-SUPPLIER-PAGE-V1
 *
 * 구조:
 * 1. Hero - 공급자 참여 유도
 * 2. 참여 혜택 - 4개 카드
 * 3. 공급 흐름 - Supplier → Product → Service HUB → Store → Customer
 * 4. 공급 가능한 제품 - 카테고리 예시
 * 5. 가입 절차 - 4단계
 * 6. CTA - 하단 참여 유도
 */

import { Link } from 'react-router-dom';
import {
  Store,
  Monitor,
  Megaphone,
  BarChart3,
  Package,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  ShoppingBag,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';

/* ── 참여 혜택 ── */
const benefits = [
  {
    icon: Store,
    title: '매장 네트워크',
    desc: '오프라인 매장과 연결하여 전국 유통 채널을 확보합니다.',
    color: { bg: 'bg-blue-50', text: 'text-blue-600' },
  },
  {
    icon: Monitor,
    title: '콘텐츠 유통',
    desc: '제품 콘텐츠, POP 디자인, Digital Signage를 매장에 제공합니다.',
    color: { bg: 'bg-violet-50', text: 'text-violet-600' },
  },
  {
    icon: Megaphone,
    title: '파트너 마케팅',
    desc: '파트너 네트워크를 통해 제품 홍보와 판매를 확장합니다.',
    color: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  },
  {
    icon: BarChart3,
    title: '판매 데이터',
    desc: '공급 현황과 판매 데이터를 실시간으로 확인합니다.',
    color: { bg: 'bg-amber-50', text: 'text-amber-600' },
  },
];

/* ── 공급 흐름 ── */
const flowSteps = [
  { icon: Package, label: 'Supplier', desc: '공급자' },
  { icon: ShoppingBag, label: 'Product', desc: '제품 등록' },
  { icon: Monitor, label: 'Service HUB', desc: '서비스 허브' },
  { icon: Store, label: 'Store', desc: '매장' },
  { icon: Users, label: 'Customer', desc: '고객' },
];

/* ── 공급 가능한 제품 ── */
const productCategories = [
  { emoji: '💊', name: '건강기능식품' },
  { emoji: '🩺', name: '의료기기' },
  { emoji: '🧴', name: '화장품' },
  { emoji: '🏠', name: '생활용품' },
];

/* ── 가입 절차 ── */
const registrationSteps = [
  { step: 1, title: '공급자 등록', desc: '기본 정보를 입력하여 공급자로 등록합니다.' },
  { step: 2, title: '운영자 승인', desc: '운영자가 등록 정보를 검토하고 승인합니다.' },
  { step: 3, title: '제품 등록', desc: '승인 후 제품과 콘텐츠를 등록합니다.' },
  { step: 4, title: '매장 공급', desc: '매장 네트워크를 통해 제품을 공급합니다.' },
];

export default function SupplierLandingPage() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const isSupplier = isAuthenticated && user?.roles.some((r) => ['supplier', 'admin'].includes(r));

  return (
    <div>
      {/* ── 1. Hero ── */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Neture 공급자로 참여하세요
          </h1>
          <p className="text-lg text-blue-100 mb-8 leading-relaxed max-w-2xl mx-auto">
            Neture는 오프라인 매장 네트워크와 연결되는 유통 플랫폼입니다.
            <br />
            공급자는 제품과 콘텐츠를 등록하고 매장과 파트너를 통해 판매를 확장할 수 있습니다.
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
                  공급자 등록
                  <ArrowRight className="ml-2 w-5 h-5" />
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

      {/* ── 2. 참여 혜택 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">공급자 참여 혜택</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 ${b.color.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <b.icon className={`w-6 h-6 ${b.color.text}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. 공급 흐름 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">공급 흐름</h2>
          <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
            공급자는 제품과 콘텐츠를 등록합니다.
            각 서비스의 Store HUB에서 매장이 이를 활용합니다.
          </p>

          {/* Desktop: horizontal */}
          <div className="hidden md:flex items-center justify-center gap-4">
            {flowSteps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white border-2 border-blue-200 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
                    <s.icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                  <span className="text-xs text-gray-500">{s.desc}</span>
                </div>
                {i < flowSteps.length - 1 && <ChevronRight className="w-6 h-6 text-gray-300 mt-[-1.5rem]" />}
              </div>
            ))}
          </div>

          {/* Mobile: vertical */}
          <div className="flex md:hidden flex-col items-center gap-3">
            {flowSteps.map((s, i) => (
              <div key={s.label} className="flex flex-col items-center">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white border-2 border-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                    <s.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
                {i < flowSteps.length - 1 && <ArrowDown className="w-5 h-5 text-gray-300 my-1" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. 공급 가능한 제품 ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">공급 가능한 제품</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {productCategories.map((cat) => (
              <div
                key={cat.name}
                className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center hover:border-blue-200 transition-colors"
              >
                <span className="text-3xl mb-3 block">{cat.emoji}</span>
                <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. 가입 절차 ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">공급자 가입 절차</h2>
          <p className="text-gray-600 text-center mb-10">
            공급자는 등록 후 운영자 승인 과정을 거칩니다.
            승인 이후 제품을 등록하고 매장에 공급할 수 있습니다.
          </p>
          <div className="space-y-6">
            {registrationSteps.map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
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

      {/* ── 6. CTA ── */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Neture 공급자로 참여하세요</h2>
          <p className="text-gray-400 mb-8">
            전국 매장 네트워크를 통해 제품을 공급하고 비즈니스를 성장시키세요.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            공급자 등록
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
