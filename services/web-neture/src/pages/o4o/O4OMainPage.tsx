/**
 * O4OMainPage - o4o 공개 사이트 메인
 *
 * Work Order: WO-O4O-PUBLIC-SITE-PHASE1-BUILD-V1
 *
 * 목적:
 * - 사업자가 '활용 가능한 기반'임을 직관적으로 인지
 * - 설계·기술 설명 배제
 *
 * 구성:
 * 1. Hero
 * 2. Why o4o (사업자 관점)
 * 3. 대상 사업자
 * 4. 채널 개념 요약
 * 5. Repo 기반 협업 구조 (placeholder)
 * 6. 예제 서비스 진입
 */

import { Link } from 'react-router-dom';
import { Store, Package, Users, Monitor, MessageSquare, GraduationCap } from 'lucide-react';

export default function O4OMainPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <HeroSection />

      {/* Why o4o */}
      <WhyO4OSection />

      {/* 대상 사업자 */}
      <TargetBusinessSection />

      {/* 채널 개념 요약 */}
      <ChannelConceptSection />

      {/* Repo 기반 협업 */}
      <RepoCollaborationSection />

      {/* 예제 서비스 */}
      <ExamplesSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-slate-900 text-white py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
          사업자가 직접 운영하는
          <br />
          유통 채널 기반
        </h1>
        <p className="text-xl text-slate-300 mb-10 leading-relaxed">
          o4o는 온라인과 오프라인 채널을
          <br />
          사업자 중심으로 연결합니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/examples/store/pharmacy"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            예시 화면 보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhyO4OSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          왜 o4o인가
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Store className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">채널 주도권</h3>
            <p className="text-gray-600 text-sm">
              사업자가 자신의 채널을 직접 운영
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">무재고 판매</h3>
            <p className="text-gray-600 text-sm">
              재고 부담 없이 상품 판매 가능
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">공급자 연결</h3>
            <p className="text-gray-600 text-sm">
              검증된 공급자와 직접 제휴
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TargetBusinessSection() {
  const targets = [
    { name: '약국', desc: '건강기능식품, 의약외품' },
    { name: '병원/의원', desc: '건강관리 상품' },
    { name: '미용실', desc: '화장품, 미용용품' },
    { name: '안경원', desc: '안경, 렌즈 관련' },
  ];

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          대상 사업자
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {targets.map((t) => (
            <div
              key={t.name}
              className="px-6 py-3 bg-white rounded-lg border border-gray-200"
            >
              <span className="font-medium text-gray-900">{t.name}</span>
              <span className="text-gray-500 text-sm ml-2">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChannelConceptSection() {
  const channels = [
    { icon: Monitor, name: '온라인', desc: '웹/앱 판매' },
    { icon: Store, name: '오프라인', desc: '매장 판매' },
    { icon: Monitor, name: '사이니지', desc: '디지털 안내' },
    { icon: MessageSquare, name: '포럼', desc: '커뮤니티' },
    { icon: GraduationCap, name: 'LMS', desc: '교육' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          채널
        </h2>
        <p className="text-gray-600 text-center mb-10">
          사업자가 활용할 수 있는 채널 유형
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {channels.map((ch) => (
            <div
              key={ch.name}
              className="p-4 bg-slate-50 rounded-xl text-center"
            >
              <ch.icon className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">{ch.name}</h3>
              <p className="text-gray-500 text-xs mt-1">{ch.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            to="/manual/concepts/channel-map"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            채널 구조 보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function RepoCollaborationSection() {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          함께 운영
        </h2>
        <p className="text-gray-600 text-center mb-8 text-sm">
          공급자 · 파트너 · 판매자
        </p>
        {/* Placeholder for diagram */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">협업 다이어그램</p>
          <p className="text-gray-300 text-xs mt-2">(이미지 삽입 예정)</p>
        </div>
      </div>
    </section>
  );
}

function ExamplesSection() {
  const examples = [
    { name: 'Neture', path: '/supplier-ops', desc: '공급자 연결' },
    { name: 'K-Cosmetics', path: '/examples', desc: '화장품' },
    { name: 'GlycoPharm', path: '/examples', desc: '건강기능식품' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          예제 서비스
        </h2>
        <p className="text-gray-600 text-center mb-10 text-sm">
          o4o 기반으로 운영 중인 서비스
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {examples.map((ex) => (
            <Link
              key={ex.name}
              to={ex.path}
              className="p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-center"
            >
              <h3 className="font-semibold text-gray-900 mb-1">{ex.name}</h3>
              <p className="text-gray-500 text-sm">{ex.desc}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            to="/examples"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            전체 예제 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
