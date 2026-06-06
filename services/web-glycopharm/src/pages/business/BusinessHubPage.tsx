// WO-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-PAGE-V1
//
// GlycoPharm 사업 진행 허브 (/business) — IR-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-IA-AUDIT-V1 Phase 1.
//   - /business 404 해소 + 푸터 "혈당관리 약국 사업" → /business 재연결.
//   - 상위 골격만 구성: 큰 줄기 요약 + 기존 페이지(/business/bloodcare, /forum/posts)로 진입.
//   - 하위 페이지(/business/products, /business/preparation, /business/market-trial 등)는 만들지 않는다 (Phase 2).
//   - Market Trial 은 사업 항목 '소개'만 — 실행 플로우는 Neture 담당, GlycoPharm 내부 구현 금지.
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Rocket,
  TrendingUp,
  MessageSquare,
  PackageOpen,
  ListChecks,
  Store,
  Ticket,
  FileBarChart,
  FlaskConical,
} from 'lucide-react';

const STAGES = [
  { icon: ClipboardList, title: '사전 준비', desc: '가입자를 받기 전 서비스, 상품, 콘텐츠, 약관, 테스트 환경을 준비하는 단계', active: true },
  { icon: Rocket, title: '초기 오픈', desc: '약국 경영자에게 서비스를 알리고 가입과 테스트 참여를 유도하는 단계', active: false },
  { icon: TrendingUp, title: '사업 확장', desc: '가입자 기반을 바탕으로 이벤트 오퍼, 제품 등록, 판매자 모집, 혈당관리 지원약국 사업으로 확대하는 단계', active: false },
];

// 주요 진입 카드 — 현재 존재하는 페이지/안전 경로만 연결 (빈 페이지 링크 금지)
const ENTRY_CARDS: { icon: typeof Activity; title: string; desc: string; to: string; primary?: boolean }[] = [
  {
    icon: Activity,
    title: '혈당관리 약국 사업 추진 현황',
    desc: '현재 준비 단계, 사업 논의 게시판, 주요 사업 항목, 참여자별 확인 사항을 확인합니다.',
    to: '/business/bloodcare',
    primary: true,
  },
  {
    icon: MessageSquare,
    title: '사업 논의 게시판',
    desc: '사업 준비와 진행 과정에서 필요한 의견을 남기고 확인하는 공간입니다.',
    to: '/business/forum',
  },
  {
    icon: PackageOpen,
    title: '제품 등록 및 공급자 협의 준비',
    desc: '공급자와 운영자가 O4O를 어떤 사업 도구로 활용할지 협의하고, 제품 등록과 판매자 모집 방향을 검토하는 영역입니다.',
    to: '/business/products',
  },
  {
    icon: ListChecks,
    title: '사전 준비 체크리스트',
    desc: '무료혈당기 사업, 표시물·CI, 제품 등록, 약관·정책, 테스트 약국 환경 등 가입자 모집 전 준비 항목을 확인합니다.',
    to: '/business/preparation',
  },
];

// 주요 사업 항목 요약 6개 — '약국 랜딩 서비스' 미표시, 'B2B 제품 및 이벤트 오퍼' 묶음 미표시
const BUSINESS_ITEMS: { icon: typeof Activity; title: string; desc: string }[] = [
  { icon: Activity, title: '무료혈당기 사업', desc: '약국 가입자를 모으는 초기 핵심 사업' },
  { icon: Store, title: '혈당관리 지원약국', desc: '적극 참여 약국 모집 사업' },
  { icon: PackageOpen, title: '제품 등록 및 판매자 모집', desc: 'B2B·서비스별 제품 등록과 판매자 모집' },
  { icon: Ticket, title: '이벤트 오퍼', desc: '공급자 협의 기반 제품 프로모션' },
  { icon: FileBarChart, title: '설문조사 및 초기 참여 사업', desc: '관심도·수요 확인 초기 참여' },
  { icon: FlaskConical, title: '유통참여형 펀딩 기반 당뇨 관련 제품 개발', desc: '약국 현장 반응 기반 참여형 제품 개발 (실행은 Neture)' },
];

// 향후 확장 예정 안내 — Phase 1 에서 라우트/페이지 미생성
const FUTURE_AREAS = [
  '제품 등록 및 공급자 협의',
  '사전 준비',
  '사업 논의 게시판',
  '무료혈당기 사업',
  '유통참여형 펀딩 기반 제품 개발 안내',
];

export default function BusinessHubPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-600 text-white text-sm font-medium mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white/90" />
            사업 진행 허브
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">혈당관리 약국 사업</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            GlycoPharm 혈당관리 약국 사업은 약국 경영자가 혈당관리 관련 제품, 콘텐츠, 이벤트, 시장조사,
            유통참여형 펀딩 기반 제품 개발 등을 단계적으로 활용할 수 있도록 준비하는 사업입니다.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed max-w-3xl mt-2">
            이 허브에서는 현재 사업 추진 현황과 주요 준비 항목을 확인하고, 세부 사업 페이지와 논의 공간으로 이동할 수 있습니다.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Link
              to="/business/bloodcare"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Activity className="w-4 h-4" />
              혈당관리 사업 추진 현황 보기
            </Link>
            <Link
              to="/business/forum"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              사업 논의 게시판 보기
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 사업 진행 단계 요약 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">사업 진행 단계</h2>
          <p className="text-sm text-slate-500 mb-6">사전 준비 → 초기 오픈 → 사업 확장 순서로 진행됩니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.title}
                  className={`rounded-xl p-6 border shadow-sm ${
                    stage.active ? 'bg-white border-primary-200 ring-1 ring-primary-100' : 'bg-white border-slate-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${stage.active ? 'bg-primary-100' : 'bg-slate-100'}`}>
                    <Icon className={`w-5 h-5 ${stage.active ? 'text-primary-600' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800">{stage.title}</h3>
                    {stage.active && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">진행 중</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{stage.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. 주요 진입 카드 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">바로 가기</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ENTRY_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.to}
                  className={`group block rounded-xl p-6 border shadow-sm transition-colors ${
                    card.primary ? 'bg-white border-primary-200 hover:border-primary-300' : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.primary ? 'bg-primary-100' : 'bg-slate-100'}`}>
                      <Icon className={`w-5 h-5 ${card.primary ? 'text-primary-600' : 'text-slate-600'}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mt-4 mb-1">{card.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. 주요 사업 항목 요약 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">주요 사업 항목</h2>
          <p className="text-sm text-slate-500 mb-6">
            세부 설명은{' '}
            <Link to="/business/bloodcare" className="text-primary-600 hover:text-primary-700 font-medium">
              추진 현황 페이지
            </Link>
            에서 확인할 수 있습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUSINESS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-accent-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. 향후 확장 예정 안내 */}
        <section>
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-2">향후 확장 예정</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              현재는 혈당관리 약국 사업 추진 현황 페이지를 중심으로 운영하며, 제품 등록 및 공급자 협의, 사전 준비,
              사업 논의 게시판 등은 향후 필요에 따라 별도 페이지로 분리할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {FUTURE_AREAS.map((area) => (
                <span key={area} className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                  {area}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
