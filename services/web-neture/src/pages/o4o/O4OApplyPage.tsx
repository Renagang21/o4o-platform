/**
 * O4OApplyPage — O4O 적용 검토 (통합 진입)
 *
 * WO-O4O-NETURE-APPLY-PAGE-CONSOLIDATION-V1
 *
 * 기존 분리된 두 페이지의 통합:
 *   - /o4o/business-inquiry (BusinessInquiryPage) — 사업 문의 안내
 *   - /o4o/consultation (ConsultationRequestPage) — 상담 요청 안내
 *
 * 두 페이지 모두 form 없는 안내 페이지였으므로, 본 페이지로 통합 후 두 URL 은
 * Navigate redirect 로 처리. /o4o 메인 + 모든 소개 페이지의 1차 CTA 가 본 페이지로 수렴.
 *
 * WO-O4O-NETURE-APPLY-FORM-MVP-V1 (2026-05-24):
 *   기존 mailto-only CtaSection 을 실제 form (ApplyForm) 으로 교체.
 *   POST /api/v1/platform/inquiries 재사용 (backend 변경 없음).
 *
 * 디자인: /o4o 메인 (O4OMainPage) 의 Tailwind 패턴 일치.
 */

import ApplyForm from './ApplyForm';

export default function O4OApplyPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <TargetSection />
      <ScopeSection />
      <ProcessSection />
      <InfoSection />
      <ApplyForm />
      <NoticeSection />
    </div>
  );
}

// ─── 1. Hero ──────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="bg-slate-900 text-white py-20">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <span className="inline-block px-4 py-1 bg-white/10 text-white rounded-full text-sm font-medium mb-4">
          O4O 적용 검토
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
          내 사업에 O4O를 어떻게 적용할 수 있을지<br className="hidden sm:inline" /> 함께 검토합니다
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">
          사업 구조, 참여 방식, 운영 가능성을 확인해 보세요.
        </p>
      </div>
    </section>
  );
}

// ─── 2. 누가 검토할 수 있는가 ─────────────────────────────────────────────────

function TargetSection() {
  const targets = [
    { icon: '🏢', title: '제조·유통 사업자', desc: '자사 제품을 오프라인 매장 채널에 공급하고 싶은 사업자' },
    { icon: '🔗', title: '프랜차이즈 / 매장 본부', desc: '가맹점·매장 네트워크에 새로운 운영 구조를 도입하려는 본부' },
    { icon: '🤝', title: '협동조합 / 협회 / 전문가 단체', desc: '회원·소속 사업자 간 공동 운영을 검토하는 단체' },
    { icon: '📍', title: '지역 기반 사업 운영자', desc: '지역 매장·채널을 묶어 운영하는 사업자' },
    { icon: '🌱', title: '신규 사업 기획자', desc: 'O4O 구조를 활용해 새 사업을 만들고 싶은 사업자' },
  ];

  return (
    <section className="bg-white py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">이런 사업자가 검토할 수 있습니다</h2>
          <p className="text-base text-slate-500">O4O는 모든 사업에 열려 있지 않고, 취지에 부합하는 경우에만 함께 검토합니다.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((t) => (
            <div key={t.title} className="p-6 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-3xl mb-3">{t.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{t.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 3. 검토 가능한 내용 ──────────────────────────────────────────────────────

function ScopeSection() {
  const items = [
    'O4O 플랫폼 개요 이해',
    '내 사업에 적용 가능한 구조 검토',
    '공급자 / 파트너 / 운영자 참여 방식',
    '매장 기반 사업 확장 가능성',
    '콘텐츠 · QR · 디지털 사이니지 활용 가능성',
    '공동 구매 · 신제품 검증 · 자체 상품 가능성',
  ];

  return (
    <section className="bg-slate-50 py-20">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">검토 가능한 내용</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
              <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">✓</span>
              <span className="text-slate-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── 4. 진행 방식 ─────────────────────────────────────────────────────────────

function ProcessSection() {
  const steps = [
    { n: 1, label: '사업 상황 확인', desc: '업종·규모·운영 방식 등 기본 정보 공유' },
    { n: 2, label: '적용 가능성 1차 검토', desc: 'O4O 플랫폼과의 부합 여부 검토' },
    { n: 3, label: '필요한 서비스 구조 정리', desc: '구체적인 적용 모델 / 채널 구조 협의' },
    { n: 4, label: '참여 방식 또는 도입 방식 안내', desc: '공급자·파트너·운영 방식 등 결정' },
    { n: 5, label: '후속 상담 또는 제안 진행', desc: '필요 시 상세 제안서 또는 시범 운영 협의' },
  ];

  return (
    <section className="bg-white py-20">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">진행 방식</h2>
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.n} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-600 text-white font-bold">{s.n}</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{s.label}</h3>
                <p className="text-sm text-slate-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. 상담 진행 정보 ─────────────────────────────────────────────────────────

function InfoSection() {
  const info = [
    { label: '방식', value: '문의 접수 후 유선 또는 화상 상담' },
    { label: '소요', value: '접수 후 영업일 기준 2~3일 내 회신' },
    { label: '비용', value: '초기 상담은 무료' },
  ];

  return (
    <section className="bg-slate-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-5 text-center">상담 진행 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {info.map((i) => (
              <div key={i.label} className="text-center sm:text-left">
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">{i.label}</p>
                <p className="text-sm text-slate-700">{i.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 6. 안내사항 ───────────────────────────────────────────────────────────────

function NoticeSection() {
  const items = [
    'O4O는 모든 사업에 열려 있지 않습니다. 플랫폼 취지에 부합하는 경우에만 진행합니다.',
    '제안서는 접촉 이후에만 제공됩니다.',
    '문의 시 사업 개요 (업종, 규모, 목적) 와 관심 분야를 포함하면 검토가 빠릅니다.',
  ];

  return (
    <section className="bg-white py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-3">안내사항</h3>
          <ul className="space-y-2 list-disc list-inside text-sm text-amber-900">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
