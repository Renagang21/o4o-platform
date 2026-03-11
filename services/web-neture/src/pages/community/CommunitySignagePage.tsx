/**
 * CommunitySignagePage - Digital Signage 소개
 *
 * Work Order: WO-O4O-NETURE-COMMUNITY-PAGE-V1
 *
 * 정적 소개 페이지. API 호출 없음.
 * 공급자가 생성한 Signage 콘텐츠가 각 서비스 Store HUB에 등록되는 구조를 안내한다.
 */

import { Link } from 'react-router-dom';
import { Monitor, Image, LayoutGrid, Zap, ArrowLeft, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Monitor,
    title: '매장 디스플레이',
    description: '매장 내 모니터/TV에 제품 홍보 콘텐츠를 자동으로 표시합니다.',
    color: 'violet',
  },
  {
    icon: Image,
    title: '콘텐츠 관리',
    description: '이미지, 동영상 등 홍보 콘텐츠를 간편하게 등록하고 관리합니다.',
    color: 'blue',
  },
  {
    icon: LayoutGrid,
    title: '플레이리스트',
    description: '콘텐츠를 플레이리스트로 구성하여 원하는 순서대로 자동 재생합니다.',
    color: 'emerald',
  },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
};

const steps = [
  { step: '1', title: '콘텐츠 등록', description: '공급자가 제품 홍보 콘텐츠를 등록합니다.' },
  { step: '2', title: '플레이리스트 구성', description: '운영자가 콘텐츠를 플레이리스트로 조합합니다.' },
  { step: '3', title: '매장 표시', description: '매장 디스플레이에서 자동으로 재생됩니다.' },
];

export default function CommunitySignagePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-violet-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-violet-100 mb-4">
            <Monitor className="w-3.5 h-3.5" />
            <span>Digital Signage</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Digital Signage</h1>
          <p className="text-lg text-violet-100 leading-relaxed">
            매장에서 사용하는 디지털 콘텐츠 안내
          </p>
        </div>
      </section>

      {/* Back nav */}
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <Link
          to="/community"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Community
        </Link>
      </div>

      {/* What is Digital Signage */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Signage란?</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Digital Signage는 매장 내 모니터나 TV를 활용하여 제품 홍보, 이벤트 안내,
            브랜드 콘텐츠를 자동으로 표시하는 시스템입니다.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Signage 콘텐츠는 공급자가 생성하고, 각 서비스의 Store HUB에 등록됩니다.
            운영자는 플레이리스트를 구성하여 매장별로 적합한 콘텐츠를 노출할 수 있습니다.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const colors = colorMap[feature.color];
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <div
                    className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}
                  >
                    <feature.icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">사용 방법</h2>
          <div className="space-y-6">
            {steps.map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Zap className="w-10 h-10 text-violet-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Signage 콘텐츠를 시작하세요</h2>
          <p className="text-gray-400 mb-8">
            공급자로 등록하면 Signage 콘텐츠를 등록하고 관리할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/supplier"
              className="inline-flex items-center justify-center px-8 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              공급자 참여하기
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              to="/community"
              className="inline-flex items-center justify-center px-8 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              커뮤니티로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
