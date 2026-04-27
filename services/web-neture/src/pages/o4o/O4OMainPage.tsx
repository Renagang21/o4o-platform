/**
 * O4OMainPage — O4O 플랫폼 소개 메인
 *
 * WO-O4O-INTRO-PAGE-CONTENT-IMPLEMENT-V1
 *
 * 플랫폼의 정체성을 정의하는 페이지.
 * 단순 정보 페이지가 아닌, O4O 개념·구조·대상·실행 방식·결과를 한 번에
 * 이해시키는 진입점.
 *
 * 섹션 구조 (WO 고정):
 *   1. Hero (플랫폼 정의)
 *   2. 문제 정의
 *   3. O4O 개념
 *   4. 대상 (매장 유형)
 *   5. 제공 서비스
 *   6. 실행 구조
 *   7. 결과
 *   8. 상세 설명 진입
 *   9. CTA
 *
 * 금지: 매장 외부 연결 용어 사용 (5번 섹션), Target 페이지 내용 복사, 장문 설명.
 */

import { Link } from 'react-router-dom';
import {
  Store,
  Stethoscope,
  Monitor,
  Smartphone,
  Tablet,
  GraduationCap,
  Package,
  Eye,
  MousePointerClick,
  Zap,
  ArrowRight,
} from 'lucide-react';

export default function O4OMainPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ProblemSection />
      <ConceptSection />
      <TargetSection />
      <ServiceSection />
      <ExecutionSection />
      <OutcomeSection />
      <DetailEntrySection />
      <CtaSection />
    </div>
  );
}

// ─── 1. Hero (플랫폼 정의) ─────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="bg-slate-900 text-white py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
          O4O 플랫폼
        </h1>
        <p className="text-xl text-slate-200 mb-4 leading-relaxed">
          오프라인 매장을 위한 온라인 실행 플랫폼입니다.
        </p>
        <p className="text-base text-slate-400 leading-relaxed">
          매장에서의 판매와 고객 경험을 강화하기 위해
          <br className="hidden sm:inline" />
          {' '}온라인 기능을 연결합니다.
        </p>
      </div>
    </section>
  );
}

// ─── 2. 문제 정의 ────────────────────────────────────────────────────────────

function ProblemSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          왜 O4O가 필요한가
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed">
          다품종 소량 제품은 정보가 없으면 판매되지 않습니다.
          <br className="hidden sm:inline" />
          {' '}하지만 소규모 매장은 이를 충분히 설명하기 어렵습니다.
        </p>
      </div>
    </section>
  );
}

// ─── 3. O4O 개념 ─────────────────────────────────────────────────────────────

function ConceptSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          O4O는 무엇인가
        </h2>
        <p className="text-2xl font-semibold text-primary-600 mb-3">
          Online for Offline
        </p>
        <p className="text-lg text-gray-600 leading-relaxed">
          오프라인을 위한 온라인 구조입니다.
        </p>
      </div>
    </section>
  );
}

// ─── 4. 대상 (매장 유형) ─────────────────────────────────────────────────────

function TargetSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
          어떤 매장을 위한 플랫폼인가
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-5">
              <Store className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              제품을 판매하는 매장
            </h3>
            <p className="text-gray-600 leading-relaxed">
              약국, 안경원, 전문 매장 등
            </p>
          </div>
          <div className="p-8 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-5">
              <Stethoscope className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              제품을 판매하지 않는 매장
            </h3>
            <p className="text-gray-600 leading-relaxed">
              미용실, 헬스장, 치과, 의료기관 등
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 5. 제공 서비스 ──────────────────────────────────────────────────────────

function ServiceSection() {
  const services = [
    { icon: Monitor, name: '디지털 사이니지' },
    { icon: Smartphone, name: 'QR / 모바일 연결' },
    { icon: Tablet, name: '키오스크 / 태블릿' },
    { icon: GraduationCap, name: '콘텐츠 / LMS' },
    { icon: Package, name: '무재고 판매 구조' },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
          어떤 서비스를 제공하는가
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {services.map((s) => (
            <div
              key={s.name}
              className="p-5 bg-white rounded-xl border border-slate-200 text-center"
            >
              <s.icon className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="font-medium text-gray-900 text-sm">{s.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 6. 실행 구조 ────────────────────────────────────────────────────────────

function ExecutionSection() {
  const steps = [
    { icon: Eye, name: '노출', desc: '매장 안에서 정보가 보입니다' },
    { icon: MousePointerClick, name: '반응', desc: '고객이 보고 인식하고 행동합니다' },
    { icon: Zap, name: '실행', desc: '판매와 연결로 이어집니다' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
          어떻게 작동하는가
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step, idx) => (
            <div key={step.name} className="relative">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center h-full">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.name}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 items-center justify-center w-6 h-6 bg-white rounded-full border border-slate-200 z-10">
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 7. 결과 ─────────────────────────────────────────────────────────────────

function OutcomeSection() {
  const outcomes = [
    '매장이 정보 전달 공간이 됩니다',
    '설명 없이 이해되는 구조가 만들어집니다',
    '재고 없이도 판매 흐름이 형성됩니다',
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
          그래서 무엇이 바뀌는가
        </h2>
        <ul className="space-y-4">
          {outcomes.map((text) => (
            <li
              key={text}
              className="flex items-start gap-3 p-5 bg-white rounded-xl border border-slate-200"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-primary-700 font-semibold text-sm">✓</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── 8. 상세 설명 진입 (About에서 하던 역할 흡수) ────────────────────────────

function DetailEntrySection() {
  const detailLinks = [
    { name: 'O4O 개요', desc: '플랫폼 소개와 시작점', href: '/o4o/intro' },
    { name: '핵심 개념', desc: '구조를 이루는 개념들', href: '/o4o/concepts' },
    { name: '플랫폼 원칙', desc: '운영 원칙과 기준', href: '/o4o/principles' },
    { name: '판매 구조', desc: '실행 방식의 구조', href: '/o4o/structure' },
    { name: '서비스 맵', desc: '서비스 전체 지도', href: '/o4o/channel-map' },
    { name: '대상별 매장', desc: '업종별 적용 사례', href: '/o4o/targets/pharmacy' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
          더 알아보기
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {detailLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="group p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{link.name}</h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-500">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 9. CTA ──────────────────────────────────────────────────────────────────

function CtaSection() {
  // 주: WO 원안의 "/about" 버튼은 /about → /o4o redirect 적용 후 자기 자신으로 순환되므로,
  // "전체 구조 보기"는 상세 진입 페이지(/o4o/intro)로 연결한다.
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">시작하기</h2>
        <p className="text-slate-300 mb-10">
          O4O 플랫폼에 참여하거나 더 자세히 살펴보세요.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/supplier"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            제품 공급자로 참여하기
          </Link>
          <Link
            to="/partner"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            운영 파트너로 참여하기
          </Link>
          <Link
            to="/o4o/intro"
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
          >
            전체 구조 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
