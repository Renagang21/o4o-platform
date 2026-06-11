// WO-O4O-GLYCOPHARM-SERVICE-GUIDE-PAGE-V1
//
// /service-guide — GlycoPharm 서비스 안내 (공개 페이지).
//   상단 메뉴 "서비스 안내" 단일 진입점. About / Contact Us 분리 메뉴 대신 통합 안내.
//   대상: 약국 경영자 · 약국 운영 담당자 · 공급/제휴 사업자.
//   GlycoPharm 문구 기준: 약국 / 약국 경영자 / 내 약국 표현 우선 ("내 매장" 일괄 표현 금지).
//   이번 작업은 구조 + 기본 문구 우선. 문의 폼 신규 구현은 범위 외 — 기존 /contact 경로 연결.
//   푸터 정비는 후속 작업으로 분리.
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Store,
  Building2,
  Handshake,
  LayoutGrid,
  FileText,
  MonitorPlay,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

// ─── 이용 대상 (카드 3개) ───────────────────────────────────────────────────
const AUDIENCES: { icon: typeof Store; title: string; desc: string }[] = [
  {
    icon: Building2,
    title: '약국 경영자',
    desc: '약국 운영에 필요한 정보와 자료를 확인하고, 내 약국 기능을 통해 약국 현장 활용 자료를 관리할 수 있습니다.',
  },
  {
    icon: Store,
    title: '약국 운영 담당자',
    desc: '약국 내 고객 안내, 제품 설명, 콘텐츠 활용 등 약국 운영 보조 업무에 필요한 자료를 확인할 수 있습니다.',
  },
  {
    icon: Handshake,
    title: '공급 · 제휴 사업자',
    desc: '약국에서 활용할 수 있는 제품, 콘텐츠, 이벤트 오퍼 등과 관련된 제휴 문의를 진행할 수 있습니다.',
  },
];

// ─── 주요 기능 (카드 6개) ───────────────────────────────────────────────────
const FEATURES: { icon: typeof Store; title: string; desc: string }[] = [
  {
    icon: Building2,
    title: '약국 운영 지원',
    desc: '약국 운영에 필요한 정보와 자료를 한 곳에서 확인할 수 있습니다.',
  },
  {
    icon: LayoutGrid,
    title: '매장 운영 허브',
    desc: '제품, 콘텐츠, 이벤트 오퍼 등 약국에서 활용할 수 있는 항목을 확인합니다.',
  },
  {
    icon: Store,
    title: '내 약국',
    desc: '약국별 운영 정보와 활용 자료를 관리합니다.',
  },
  {
    icon: FileText,
    title: '콘텐츠 활용',
    desc: '고객 안내, 제품 설명, POP, QR 등 약국 현장에서 활용할 수 있는 자료를 제공합니다.',
  },
  {
    icon: MonitorPlay,
    title: '디지털 안내 도구',
    desc: '약국 내 TV나 화면을 활용한 고객 안내 콘텐츠 운영을 지원합니다.',
  },
  {
    icon: HelpCircle,
    title: '문의 안내',
    desc: '서비스 이용, 가입, 권한, 제휴, 오류 신고와 관련된 문의를 안내합니다.',
  },
];

// ─── 이용 흐름 (Step 5개) ───────────────────────────────────────────────────
const STEPS: { no: string; title: string }[] = [
  { no: '01', title: '회원가입 또는 로그인' },
  { no: '02', title: '서비스 이용 권한 확인' },
  { no: '03', title: '매장 운영 허브에서 약국 활용 자료 확인' },
  { no: '04', title: '내 약국에서 약국별 정보와 자료 관리' },
  { no: '05', title: '필요한 콘텐츠와 실행 자료를 약국 현장에서 활용' },
];

export default function ServiceGuidePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-600 text-white text-sm font-medium mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white/90" />
            서비스 안내
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            약국 운영을 위한 O4O 서비스 안내
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            GlycoPharm은 약국 경영자가 약국 운영, 제품 정보, 콘텐츠, 매장 실행 자료를 한 곳에서 확인하고
            활용할 수 있도록 지원하는 O4O 기반 약국 운영 서비스입니다.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Link
              to="/store-hub"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <LayoutGrid className="w-4 h-4" />
              매장 운영 허브 보기
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              문의하기
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 서비스 소개 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">서비스 소개</h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 space-y-3">
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              GlycoPharm은 오프라인 약국의 운영을 온라인 도구로 지원하기 위한 서비스입니다.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              약국 경영자는 약국 운영에 필요한 정보와 자료를 확인하고, 매장 운영 허브와 내 약국 기능을 통해
              약국 현장에서 활용할 수 있는 콘텐츠와 실행 자료를 관리할 수 있습니다.
            </p>
          </div>
        </section>

        {/* 3. 이용 대상 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">이용 대상</h2>
          <p className="text-sm text-slate-500 mb-6">약국 운영과 관련된 다양한 참여자가 GlycoPharm을 활용할 수 있습니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{a.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{a.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. 주요 기능 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">주요 기능</h2>
          <p className="text-sm text-slate-500 mb-6">약국 운영과 콘텐츠 활용을 위한 핵심 기능을 제공합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. 이용 흐름 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">이용 흐름</h2>
          <p className="text-sm text-slate-500 mb-6">회원가입부터 약국 현장 활용까지의 기본 흐름입니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {STEPS.map((s) => (
              <div key={s.no} className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <span className="text-xs font-bold text-primary-500">STEP {s.no}</span>
                <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{s.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. 문의 안내 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">문의 안내</h2>
          <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  서비스 이용, 가입, 권한, 공급 · 제휴, 오류 신고와 관련된 문의는 문의하기를 통해 접수할 수 있습니다.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  문의 수신 경로와 푸터 문의 링크는 후속 푸터 / 문의 정비 작업에서 함께 정리합니다.
                </p>
                <div className="mt-5">
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                    문의하기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
