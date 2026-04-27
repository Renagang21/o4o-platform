/**
 * AboutPage - Neture 플랫폼 소개 Hub 페이지
 *
 * Work Order: WO-O4O-NETURE-ABOUT-HUB-PAGE-V1
 *
 * 기존 소개 페이지들을 연결하는 Hub 구조.
 * 새 콘텐츠를 작성하지 않고, 이미 존재하는 페이지들을 정리하여 연결한다.
 *
 * 구조:
 * 1. Hero - About Neture
 * 2. 플랫폼 소개 - /o4o, /o4o/intro
 * 3. 플랫폼 개념 - /manual/concepts, /workspace/platform/principles
 * 4. 플랫폼 구조 - /channel/structure, /manual/concepts/channel-map
 * 5. 대상 산업 - /o4o/targets/*
 * 6. 유통 채널 - /channel/*
 */

import { Link } from 'react-router-dom';
import {
  Globe,
  BookOpen,
  Network,
  Building2,
  Truck,
  ArrowRight,
  Pill,
  Stethoscope,
  Scissors,
  Glasses,
  MoreHorizontal,
} from 'lucide-react';

/* ── 섹션 데이터 ── */

const platformIntro = [
  { title: 'O4O 플랫폼 소개', desc: 'Neture와 O4O 개념을 소개합니다.', to: '/o4o' },
  { title: 'O4O 플랫폼 상세', desc: '플랫폼 구조와 비전을 상세히 설명합니다.', to: '/o4o/intro' },
];

const platformConcepts = [
  { title: '플랫폼 개념 설명', desc: 'O4O 플랫폼의 핵심 개념을 설명합니다.', to: '/o4o/concepts' },
  { title: '플랫폼 운영 원칙', desc: 'Neture 플랫폼의 운영 원칙을 안내합니다.', to: '/o4o/principles' },
];

const platformStructure = [
  { title: '유통 채널 구조', desc: '공급자에서 매장까지의 유통 흐름을 설명합니다.', to: '/o4o/structure' },
  { title: '채널 맵', desc: '전체 채널 구조를 시각적으로 보여줍니다.', to: '/o4o/channel-map' },
];

const targetIndustries = [
  { icon: Pill, title: '약국', desc: '약국 채널 안내', to: '/o4o/targets/pharmacy', color: { bg: 'bg-blue-50', text: 'text-blue-600' } },
  { icon: Stethoscope, title: '의원', desc: '의원 채널 안내', to: '/o4o/targets/clinic', color: { bg: 'bg-emerald-50', text: 'text-emerald-600' } },
  { icon: Scissors, title: '미용실', desc: '미용실 채널 안내', to: '/o4o/targets/salon', color: { bg: 'bg-violet-50', text: 'text-violet-600' } },
  { icon: Glasses, title: '안경점', desc: '안경점 채널 안내', to: '/o4o/targets/optical', color: { bg: 'bg-amber-50', text: 'text-amber-600' } },
  { icon: MoreHorizontal, title: '기타 업종', desc: '기타 대상 업종', to: '/o4o/other-targets', color: { bg: 'bg-gray-50', text: 'text-gray-600' } },
];

const channels = [
  { title: '약국 채널', desc: '약국 유통 채널 구조를 설명합니다.', to: '/o4o/channels/pharmacy' },
  { title: '안경점 채널', desc: '안경점 유통 채널 구조를 설명합니다.', to: '/o4o/channels/optical' },
  { title: '의료기기 채널', desc: '의료기기 유통 채널 구조를 설명합니다.', to: '/o4o/channels/medical' },
  { title: '치과 채널', desc: '치과 유통 채널 구조를 설명합니다.', to: '/o4o/channels/dental' },
];

/* ── 공통 카드 링크 컴포넌트 ── */

function LinkCard({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-sm transition-all group"
    >
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 ml-4" />
    </Link>
  );
}

/* ── 섹션 헤더 ── */

function SectionHeader({ icon: Icon, title, desc, color }: { icon: typeof Globe; title: string; desc: string; color: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div>
      {/* ── 1. Hero ── */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">About Neture</h1>
          <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
            Neture는 O4O(Online for Offline) 유통 플랫폼입니다.
            <br />
            공급자, 파트너, 매장을 연결하여 오프라인 매장의 경쟁력을 강화합니다.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
        {/* ── 2. 플랫폼 소개 ── */}
        <section>
          <SectionHeader
            icon={Globe}
            title="플랫폼 소개"
            desc="Neture 플랫폼과 O4O 개념을 소개합니다."
            color="bg-primary-100 text-primary-600"
          />
          <div className="space-y-3">
            {platformIntro.map((item) => (
              <LinkCard key={item.to} {...item} />
            ))}
          </div>
        </section>

        {/* ── 3. 플랫폼 개념 ── */}
        <section>
          <SectionHeader
            icon={BookOpen}
            title="플랫폼 개념"
            desc="플랫폼 운영 원칙과 개념 설명"
            color="bg-violet-100 text-violet-600"
          />
          <div className="space-y-3">
            {platformConcepts.map((item) => (
              <LinkCard key={item.to} {...item} />
            ))}
          </div>
        </section>

        {/* ── 4. 플랫폼 구조 ── */}
        <section>
          <SectionHeader
            icon={Network}
            title="플랫폼 구조"
            desc="Neture 유통 구조와 채널 구조 설명"
            color="bg-blue-100 text-blue-600"
          />
          <div className="space-y-3">
            {platformStructure.map((item) => (
              <LinkCard key={item.to} {...item} />
            ))}
          </div>
        </section>

        {/* ── 5. 대상 산업 ── */}
        <section>
          <SectionHeader
            icon={Building2}
            title="대상 산업"
            desc="Neture 플랫폼이 활용되는 산업 분야"
            color="bg-emerald-100 text-emerald-600"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {targetIndustries.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="flex flex-col items-center p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-sm transition-all text-center"
              >
                <div className={`w-12 h-12 ${t.color.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <t.icon className={`w-6 h-6 ${t.color.text}`} />
                </div>
                <span className="text-sm font-semibold text-gray-900">{t.title}</span>
                <span className="text-xs text-gray-500 mt-1">{t.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 6. 유통 채널 ── */}
        <section>
          <SectionHeader
            icon={Truck}
            title="유통 채널"
            desc="산업별 유통 채널 구조 설명"
            color="bg-amber-100 text-amber-600"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {channels.map((item) => (
              <LinkCard key={item.to} {...item} />
            ))}
          </div>
        </section>
      </div>

      {/* ── CTA ── */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Neture와 함께하세요</h2>
          <p className="text-gray-400 mb-8">
            공급자, 파트너로 참여하거나 문의를 보내주세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/supplier"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              공급자 참여
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              to="/partner"
              className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              파트너 참여
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
