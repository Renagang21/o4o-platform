/**
 * O4OMainPage - o4o 공개 사이트 메인
 *
 * Work Order: WO-O4O-PUBLIC-SITE-PHASE1-BUILD-V1
 *
 * 핵심 관점:
 * - o4o는 개별 매장이 아닌, "매장 네트워크 대상 사업자"를 위한 플랫폼
 * - 공급자, 본부, 파트너가 매장 채널을 활용해 비즈니스를 확장
 */

import { Link } from 'react-router-dom';
import { Store, Package, Monitor, MessageSquare, GraduationCap, ExternalLink, Building2, Truck, Megaphone, Globe } from 'lucide-react';

export default function O4OMainPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <HeroSection />

      {/* 핵심 가치 */}
      <CoreValueSection />

      {/* 대상 사업자 */}
      <TargetBusinessSection />

      {/* 매장 채널 */}
      <StoreChannelSection />

      {/* 채널 유형 */}
      <ChannelConceptSection />

      {/* 사이트 연결 서비스 */}
      <SiteServicesSection />

      {/* 예제 서비스 */}
      <ExamplesSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-slate-900 text-white py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-primary-400 text-sm font-medium mb-4">
          매장 네트워크 대상 사업자를 위한 플랫폼
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
          매장을 채널로,
          <br />
          비즈니스를 확장합니다
        </h1>
        <p className="text-xl text-slate-300 mb-10 leading-relaxed">
          o4o는 개별 매장이 아닌,
          <br />
          <strong className="text-white">매장 네트워크를 대상으로 비즈니스하는 사업자</strong>를 위한 플랫폼입니다.
        </p>
        <div className="flex justify-center">
          <Link
            to="/supplier-ops"
            className="inline-flex items-center justify-center px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            공급자/파트너 Hub
          </Link>
        </div>
      </div>
    </section>
  );
}

function CoreValueSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          o4o가 제공하는 가치
        </h2>
        <p className="text-gray-600 text-center mb-10 text-sm">
          공급자·본부·파트너·사이트 운영자가 비즈니스를 확장합니다
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Truck className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">공급자</h3>
            <p className="text-gray-600 text-sm">
              매장 네트워크에 상품을 공급하고
              <br />
              판매 채널을 확보합니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">본부 / 프랜차이즈</h3>
            <p className="text-gray-600 text-sm">
              가맹점에 통합 채널 환경을 제공하고
              <br />
              운영 효율을 높입니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">마케팅 파트너</h3>
            <p className="text-gray-600 text-sm">
              매장 대상 마케팅·콘텐츠 서비스를
              <br />
              제공합니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">사이트 운영자</h3>
            <p className="text-gray-600 text-sm">
              기존 사이트에 AI 기반 서비스를
              <br />
              연결하여 활용합니다
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TargetBusinessSection() {
  const storeTypes = [
    { name: '약국', desc: '건강기능식품, 의약외품', path: '/o4o/targets/pharmacy' },
    { name: '의료기관', desc: '서비스 향상', path: '/o4o/targets/clinic' },
    { name: '미용실', desc: '화장품, 미용용품', path: '/o4o/targets/salon' },
    { name: '안경원', desc: '안경, 렌즈 관련', path: '/o4o/targets/optical' },
  ];

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          대상 매장 업종
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          이 업종의 매장 네트워크를 대상으로 비즈니스하는 사업자가 o4o를 활용합니다
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {storeTypes.map((t) => (
            <Link
              key={t.name}
              to={t.path}
              className="px-6 py-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <span className="font-medium text-gray-900">{t.name}</span>
              <span className="text-gray-500 text-sm ml-2">{t.desc}</span>
            </Link>
          ))}
          <Link
            to="/o4o/site-operator"
            className="px-6 py-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <span className="font-medium text-gray-900">사이트 운영자</span>
          </Link>
          <Link
            to="/o4o/other-targets"
            className="px-6 py-3 bg-primary-50 rounded-lg border border-primary-200 hover:bg-primary-100 transition-colors"
          >
            <span className="font-medium text-primary-700">기타 대상 사업자</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function StoreChannelSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          매장에 제공되는 채널
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          공급자·본부·파트너가 매장에 제공할 수 있는 채널 환경
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <Monitor className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-gray-900">웹/앱/키오스크/태블릿</h3>
            </div>
            <p className="text-gray-600 text-sm">
              매장 전용 홈페이지, 모바일 앱, 매장 내 키오스크와 태블릿 화면을 제공합니다.
            </p>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <Store className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-gray-900">디지털 사이니지</h3>
            </div>
            <p className="text-gray-600 text-sm">
              매장 내 TV/모니터로 자체 방송 채널을 운영합니다. 콘텐츠를 직접 편성합니다.
            </p>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-gray-900">LMS (교육 콘텐츠)</h3>
            </div>
            <p className="text-gray-600 text-sm">
              자체 교육 콘텐츠를 제작하고 매장 직원 또는 고객에게 제공합니다.
            </p>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-gray-900">무재고 상품 공급</h3>
            </div>
            <p className="text-gray-600 text-sm">
              매장이 재고 부담 없이 상품을 판매합니다. 주문 시 공급사에서 직접 배송합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChannelConceptSection() {
  const channels = [
    { icon: Monitor, name: '온라인', desc: '웹/앱을 통한 판매 채널' },
    { icon: Store, name: '오프라인', desc: '웹/앱/키오스크/태블릿 기본 제공' },
    { icon: Monitor, name: '사이니지', desc: '디지털 화면을 통한 안내 채널' },
    { icon: MessageSquare, name: '포럼', desc: '커뮤니티 기반 소통 채널' },
    { icon: GraduationCap, name: 'LMS', desc: '교육 콘텐츠 제공 채널' },
  ];

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          채널 유형
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {channels.map((ch) => (
            <div
              key={ch.name}
              className="p-4 bg-white rounded-xl text-center border border-slate-200"
            >
              <ch.icon className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">{ch.name}</h3>
              <p className="text-gray-500 text-xs mt-1">{ch.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteServicesSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          기존 사이트에 연결해 활용할 수 있는 서비스
        </h2>
        <p className="text-gray-600 text-center mb-6 text-sm leading-relaxed">
          새 홈페이지를 만드는 서비스가 아닙니다.
          <br />
          Cafe24, SaaS 등으로 만든 기존 사이트에
          <br />
          배너·버튼·링크 형태로 연결하여 바로 활용할 수 있습니다.
        </p>
        <div className="flex justify-center">
          <a
            href="https://siteguide.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all max-w-sm w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">SiteGuide</h3>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <p className="text-gray-600 text-sm">
              방문자 질문에 사이트가 직접 답하는 AI 기반 안내 서비스
            </p>
          </a>
        </div>
        <p className="text-gray-400 text-center mt-6 text-xs">
          기존 사이트를 그대로 두고, 필요한 기능만 추가합니다.
        </p>
      </div>
    </section>
  );
}

function ExamplesSection() {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          서비스 예제
        </h2>
        <p className="text-gray-600 text-center mb-8 text-sm">
          o4o 기반으로 운영 중인 서비스를 직접 체험해 보세요
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/examples/store/pharmacy"
            className="p-6 bg-white rounded-xl hover:bg-slate-100 hover:border-primary-300 transition-colors text-center border border-slate-200"
          >
            <h3 className="font-semibold text-gray-900 mb-1">약국 매장 예제</h3>
            <p className="text-gray-500 text-sm">매장 운영 화면의 한 예시</p>
          </Link>
          <a
            href="https://siteguide.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 bg-white rounded-xl hover:bg-slate-100 hover:border-primary-300 transition-colors text-center border border-slate-200"
          >
            <h3 className="font-semibold text-gray-900 mb-1">SiteGuide</h3>
            <p className="text-gray-500 text-sm">AI 기반 사이트 안내 서비스</p>
          </a>
          <div className="p-6 bg-slate-100 rounded-xl text-center border border-slate-200 opacity-60">
            <h3 className="font-semibold text-gray-400 mb-1">추가 예정</h3>
            <p className="text-gray-400 text-sm">준비 중</p>
          </div>
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
