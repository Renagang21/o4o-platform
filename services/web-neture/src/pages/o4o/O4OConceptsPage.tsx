/**
 * O4OConceptsPage — O4O 플랫폼 개념 (철학)
 *
 * WO-O4O-CONCEPTS-PAGE-V1
 *
 * 역할 분담:
 *   /o4o          = 이해 (What / Why)
 *   /o4o/intro    = 구조 (How)
 *   /o4o/concepts = 철학 (Why this way)  ← 이 페이지
 *
 * 섹션 구조 (WO 고정):
 *   1. 헤더 (제목 + 한 줄 정의)
 *   2. 기존 방식의 한계
 *   3. O4O 핵심 개념
 *   4. 핵심 원칙 4개
 *   5. 한 줄 정리
 *   6. CTA
 *
 * 금지: 구조 설명 반복(/intro 중복), 서비스 상세(/o4o 중복), Target 내용,
 *       과도한 마케팅 문구.
 */

import { Link } from 'react-router-dom';
import { Store, Info, Network, Layers, ArrowRight } from 'lucide-react';

export default function O4OConceptsPage() {
  return (
    <div className="min-h-screen">
      <HeaderSection />
      <LimitSection />
      <ConceptSection />
      <PrincipleSection />
      <SummarySection />
      <CtaSection />
    </div>
  );
}

// ─── 1. 헤더 ─────────────────────────────────────────────────────────────────

function HeaderSection() {
  return (
    <section className="bg-slate-900 text-white py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
          O4O 플랫폼 개념
        </h1>
        <p className="text-lg text-slate-200 leading-relaxed">
          O4O는 오프라인 매장을 중심으로
          <br className="hidden sm:inline" />
          {' '}정보 기반 판매 구조를 만드는 개념입니다.
        </p>
      </div>
    </section>
  );
}

// ─── 2. 기존 방식의 한계 ─────────────────────────────────────────────────────

function LimitSection() {
  const limits = [
    '상품 중심 판매는 정보 전달이 부족합니다',
    '소규모 매장은 설명과 확장에 한계가 있습니다',
    '다품종 소량 제품은 기존 유통 구조에서 비효율적입니다',
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
          기존 방식의 한계
        </h2>
        <ul className="space-y-4">
          {limits.map((text) => (
            <li
              key={text}
              className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-slate-600 font-semibold text-sm">!</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── 3. O4O 핵심 개념 ────────────────────────────────────────────────────────

function ConceptSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          O4O의 핵심 개념
        </h2>
        <p className="text-2xl font-semibold text-primary-600 mb-4">
          Online for Offline
        </p>
        <p className="text-lg text-gray-600 leading-relaxed">
          오프라인 매장에서의 판매와 경험을 중심으로
          <br className="hidden sm:inline" />
          {' '}온라인 기능을 연결하는 구조입니다.
        </p>
      </div>
    </section>
  );
}

// ─── 4. 핵심 원칙 ────────────────────────────────────────────────────────────

function PrincipleSection() {
  const principles = [
    {
      icon: Store,
      title: '매장이 중심이다',
      desc: '모든 구조는 매장을 중심으로 설계됩니다.',
    },
    {
      icon: Info,
      title: '정보가 판매를 만든다',
      desc: '고객은 설명과 정보를 기반으로 선택합니다.',
    },
    {
      icon: Network,
      title: '소규모를 연결한다',
      desc: '개별 매장이 아닌 네트워크로 경쟁력을 만듭니다.',
    },
    {
      icon: Layers,
      title: '구조가 경쟁력이다',
      desc: '유통과 운영 구조 자체가 경쟁력이 됩니다.',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
          핵심 원칙
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {principles.map((p) => (
            <div
              key={p.title}
              className="p-8 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-5">
                <p.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {p.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. 한 줄 정리 ───────────────────────────────────────────────────────────

function SummarySection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          정리
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed">
          O4O는 매장을 중심으로
          <br className="hidden sm:inline" />
          {' '}정보 기반 판매 구조를 만드는 방식입니다.
        </p>
      </div>
    </section>
  );
}

// ─── 6. CTA ──────────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-10">다음으로</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/o4o/principles"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            운영 원칙 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/o4o"
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
          >
            ← 플랫폼 개요로 돌아가기
          </Link>
        </div>
      </div>
    </section>
  );
}
