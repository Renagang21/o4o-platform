/**
 * SiteGuide Homepage
 *
 * Work Order: WO-SITEGUIDE-HOMEPAGE-IMPLEMENTATION-V1
 *
 * 섹션 구성:
 * 1. Hero Section
 * 2. Problem Section
 * 3. Solution Section
 * 4. Feature Section (3-card)
 * 5. Safety / Trust Section
 * 6. CTA Section (마무리)
 */

import { Mail, Shield, MessageCircle, Eye, Sparkles } from 'lucide-react';

const CONTACT_EMAIL = 'contact@siteguide.co.kr';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <FeatureSection />
      <SafetySection />
      <CTASection />
      <Footer />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-slate-900 text-white py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
          방문자는 묻고,
          <br />
          당신의 웹사이트가 직접 답하게 하세요.
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed">
          고객센터도, 추가 페이지도 필요 없습니다.
          <br />
          SiteGuide는 지금 있는 홈페이지 위에서 바로 작동합니다.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=SiteGuide 도입 상담 요청`}
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Mail className="w-5 h-5" />
          도입 상담 요청
        </a>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          방문자는 이미 길을 잃고 있습니다.
        </h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          페이지는 많아졌고 설명은 길어졌지만,
          <br />
          방문자는 원하는 답을 찾지 못한 채 떠납니다.
        </p>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          SiteGuide는 "설명하는 웹사이트"를 만듭니다.
        </h2>
        <div className="text-lg text-slate-600 leading-relaxed space-y-2">
          <p>검색하지 않아도 됩니다.</p>
          <p>문의하지 않아도 됩니다.</p>
          <p className="font-medium text-slate-800">사이트가 스스로 안내합니다.</p>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  const features = [
    {
      icon: Eye,
      title: '페이지를 이해합니다',
      description: '방문 중인 페이지 맥락 기준으로 답합니다.',
    },
    {
      icon: MessageCircle,
      title: '질문에 바로 응답합니다',
      description: '사용자는 묻고, 사이트는 답합니다.',
    },
    {
      icon: Sparkles,
      title: '정보만 보조합니다',
      description: '광고처럼 보이지 않게 필요한 만큼만.',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-8 border border-slate-200"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SafetySection() {
  const safetyItems = [
    { text: '개인정보 기반 타기팅', allowed: false },
    { text: '사용자 데이터 수집', allowed: false },
    { text: '사이트 데이터 수정', allowed: false },
    { text: '사업자 단위 실행/차단', allowed: true },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-slate-700" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            안전을 전제로 설계했습니다.
          </h2>
        </div>
        <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
          <ul className="space-y-4">
            {safetyItems.map((item) => (
              <li key={item.text} className="flex items-center gap-4 text-lg">
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    item.allowed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {item.allowed ? 'O' : 'X'}
                </span>
                <span className="text-slate-700">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          더 설명하지 마세요.
          <br />
          대신, 답하게 하세요.
        </h2>
        <p className="text-lg text-slate-300 mb-10 leading-relaxed">
          SiteGuide는 이미 운영 중인 정식 서비스입니다.
          <br />
          현재는 사업자 단위로 도입을 진행합니다.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=SiteGuide 도입 상담 요청`}
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Mail className="w-5 h-5" />
          도입 상담 요청
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-400">
      <div className="max-w-5xl mx-auto text-center text-sm">
        <p className="mb-2">SiteGuide is powered by O4O Platform</p>
        <p>&copy; {new Date().getFullYear()} SiteGuide. All rights reserved.</p>
      </div>
    </footer>
  );
}
