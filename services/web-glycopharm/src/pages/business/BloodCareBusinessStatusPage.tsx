// WO-O4O-GLYCOPHARM-BLOODCARE-BUSINESS-STATUS-PAGE-V1 (신규)
// WO-O4O-GLYCOPHARM-BLOODCARE-BUSINESS-PAGE-REWRITE-V1 (본문 전면 재정렬)
//
// 혈당관리 약국 사업 추진 현황 — 초기 사업 참여자(운영자/공급자/약국 경영자/협력기관/도우미)가
// 사전 준비 → 초기 오픈 → 사업 확장 흐름을 확인하고 사업 논의 게시판으로 진입하는 사업 진행 허브.
//
// 본 작업 범위: /business/bloodcare 페이지 본문 재작성 (내용 정렬).
//   - 라우트(/business/bloodcare) · 푸터 메뉴는 기존 유지.
//   - 전용 게시판/포럼 카테고리 신설, 최근 논의 실제 연동, 운영자 CMS 편집, 세부 페이지/권한 분리는 후속 작업.
//   - 게시판 섹션은 기존 포럼 경로(/forum/posts, /forum/write)로 연결.
import { Link } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  MessageSquare,
  PenLine,
  Megaphone,
  Rocket,
  TrendingUp,
  Store,
  PackageOpen,
  Ticket,
  FileBarChart,
  FlaskConical,
  Users,
  Truck,
  Building2,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const STAGES = [
  {
    icon: ClipboardList,
    title: '사전 준비',
    desc: '가입자를 받기 전 서비스, 상품, 콘텐츠, 약관, 테스트 환경을 준비하는 단계',
    sub: '약국 경영자가 가입했을 때 빈 화면을 보는 것이 아니라 실제로 확인하고 참여할 수 있는 내용을 먼저 준비합니다.',
    active: true,
  },
  {
    icon: Rocket,
    title: '초기 오픈',
    desc: '약국 경영자에게 서비스를 알리고 가입과 테스트 참여를 유도하는 단계',
    sub: '약업신문 등 운영사업자의 홍보 채널을 활용하여 서비스 체험, 가입, 초기 참여를 유도합니다.',
    active: false,
  },
  {
    icon: TrendingUp,
    title: '사업 확장',
    desc: '가입자 기반을 바탕으로 이벤트 오퍼, 제품 등록, 판매자 모집, 혈당관리 지원약국 사업으로 확대하는 단계',
    sub: '가입자와 공급자 협의가 일정 수준 확보되면 본격적인 제품 사업과 대표 사업으로 확장합니다.',
    active: false,
  },
];

// Hero 우측 요약 카드 — 사업 진행 3단계 (현재/다음/후속)
const HERO_STAGE_SUMMARY: { title: string; phase: string; desc: string; current: boolean }[] = [
  { title: '사전 준비', phase: '현재 단계', desc: '서비스·상품·콘텐츠·약관·테스트 환경 준비', current: true },
  { title: '초기 오픈', phase: '다음 단계', desc: '약국 경영자 모집과 초기 참여 유도', current: false },
  { title: '사업 확장', phase: '후속 단계', desc: '이벤트 오퍼, 제품 사업, 혈당관리 지원약국으로 확대', current: false },
];

const BOARD_CATEGORIES = [
  '공지사항',
  '사업 준비',
  '제품·공급자',
  '콘텐츠·홍보',
  '약관·정책',
  '질문·의견',
];

// 최근 논의 — 실제 포럼 연동은 후속 작업. 사업 진행용 안내형 예시 항목.
const RECENT_DISCUSSIONS: { title: string; status: '공지' | '논의 중' | '검토 필요' | '의견 요청' }[] = [
  { title: '무료혈당기 사업 준비 항목 확인', status: '논의 중' },
  { title: '첫 등록 제품 선정 기준', status: '의견 요청' },
  { title: '약국 부착용 CI 제작 범위', status: '검토 필요' },
  { title: '개인정보처리방침 반영 항목', status: '검토 필요' },
  { title: '테스트 약국 아이디 제공 방식', status: '공지' },
];

const STATUS_TONE: Record<string, string> = {
  '공지': 'bg-primary-50 text-primary-700',
  '논의 중': 'bg-blue-50 text-blue-700',
  '검토 필요': 'bg-amber-50 text-amber-700',
  '의견 요청': 'bg-purple-50 text-purple-700',
};

// 주요 사업 항목 — 6개. '약국 랜딩 서비스' 제거, 'B2B 제품 및 이벤트 오퍼' → '제품 등록 및 판매자 모집' + '이벤트 오퍼' 분리.
const BUSINESS_ITEMS: {
  icon: typeof Activity;
  title: string;
  desc: string;
  sub?: string;
  flows?: { label: string; desc: string }[];
}[] = [
  {
    icon: Activity,
    title: '무료혈당기 사업',
    desc: '약국 가입자를 모으고 혈당관리 고객 접점을 만드는 초기 핵심 사업입니다. 무료혈당기 관련 서비스, CI, 약국 부착물, B2B 등록 제품과 연결됩니다.',
  },
  {
    icon: Store,
    title: '혈당관리 지원약국',
    desc: '무료혈당기 사업 참여 약국 중 한 단계 더 적극적으로 참여할 약국을 모집하는 사업입니다. 참여 약국의 역할, 표시물 사용, 고객 안내 기준, 참여 약관이 함께 준비되어야 합니다.',
  },
  {
    icon: PackageOpen,
    title: '제품 등록 및 판매자 모집',
    desc: '혈당관리 관련 제품을 O4O와 GlycoPharm 안에서 판매·활용할 수 있도록 등록하고, 해당 제품을 취급할 약국 또는 매장 경영자를 모집하는 사업입니다.',
    flows: [
      { label: 'B2B 제품 등록', desc: '모든 O4O 서비스 공통 등록 대상 제품' },
      { label: '서비스별 제품 등록', desc: 'GlycoPharm 등 개별 서비스 성격에 맞게 노출·운영할 제품' },
      { label: '판매자 모집', desc: '해당 제품을 실제로 취급하거나 참여할 약국/매장 경영자 모집' },
    ],
  },
  {
    icon: Ticket,
    title: '이벤트 오퍼',
    desc: '공급자와 협의한 특별 조건, 기간, 수량, 참여 조건 등을 기반으로 약국 경영자가 참여할 수 있는 제품 중심 프로모션 사업입니다.',
    sub: '이벤트 오퍼는 일반 B2B 제품 등록 이후 차별적인 조건을 제시할 때 효과가 커집니다.',
  },
  {
    icon: FileBarChart,
    title: '설문조사 및 초기 참여 사업',
    desc: '약국 경영자가 부담 없이 참여할 수 있는 초기 사업입니다. 운영자는 설문조사를 통해 약국의 관심도, 제품 수요, 혈당관리 사업 참여 의향 등을 확인할 수 있습니다.',
  },
  {
    icon: FlaskConical,
    title: 'Market Trial 기반 당뇨 관련 제품 개발',
    desc: '약국 경영자와 고객 반응을 기반으로 당뇨 관련 제품의 기획, 검증, 개선을 진행하는 참여형 제품 개발 사업입니다.',
    sub: 'GlycoPharm은 단순 유통을 넘어 약국 현장 반응을 제품 개발과 검증에 연결할 수 있습니다.',
  },
];

const PARTICIPANTS: { icon: typeof Users; title: string; desc: string; checks: string[] }[] = [
  {
    icon: Users,
    title: '운영자',
    desc: '사업 진행 상황을 관리하고, 제품과 콘텐츠를 준비하며, 약국 경영자에게 제공할 안내 자료를 정리합니다.',
    checks: ['제품·콘텐츠 준비', '약관·안내문 관리', '약국 HUB 진열', '게시판 논의 정리', '사업 일정 관리'],
  },
  {
    icon: Truck,
    title: '공급자',
    desc: '혈당관리 관련 제품과 원천 자료를 제공하고, B2B 제품 등록, 이벤트 오퍼, 무료혈당기 사업 등에 협력합니다.',
    checks: ['제품 자료 제공', '공급 조건 협의', '이벤트 오퍼 협의', 'Market Trial 참여 가능성 검토'],
  },
  {
    icon: Building2,
    title: '약국 경영자',
    desc: 'GlycoPharm에 가입하거나 테스트 계정을 통해 서비스를 확인하고, 무료혈당기 사업, 설문조사, 이벤트 오퍼 등에 단계적으로 참여할 수 있습니다.',
    checks: ['서비스 가입 또는 테스트 참여', '약국 HUB 확인', '무료혈당기 사업 참여', '설문조사 참여', '제품 취급 또는 이벤트 참여'],
  },
  {
    icon: HeartHandshake,
    title: '협력기관·도우미',
    desc: '사업 준비, 안내문 검토, 콘텐츠 정리, 참여 약국 확대, 사업 운영 지원 등에 참여할 수 있습니다.',
    checks: ['사업 검토', '콘텐츠 정리 지원', '참여 약국 확대 지원', '외부 협력 사업 검토'],
  },
];

const NEXT_CHECKLIST = [
  '무료혈당기 서비스 구성 범위',
  '무료혈당기 CI 및 약국 부착물 제작 범위',
  'B2B 전자상거래 등록 제품',
  '서비스별 등록 제품',
  '판매자 모집 방식',
  '이벤트 오퍼 준비 방식',
  '이용약관',
  '개인정보처리방침',
  '무료혈당기 사업 참여 안내',
  '혈당관리 지원약국 참여 약관',
  '테스트 약국 아이디 구성',
  '초기 홍보 및 가입자 모집 방식',
  '설문조사 주제',
  'Market Trial 기반 제품 개발 후보',
];

export default function BloodCareBusinessStatusPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero — WO-O4O-GLYCOPHARM-BLOODCARE-HERO-VISUAL-CLARITY-FIX-V1:
          연한 녹색 배경 + 좌(설명/버튼) · 우(사업 진행 요약 카드) 2열 구조로 대표 안내 영역 명확화 */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 items-center">
            {/* 좌측: 배지 · 제목 · 설명 · 버튼 */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-600 text-white text-sm font-medium mb-5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white/90" />
                현재 단계: 사전 준비
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                혈당관리 약국 사업 추진 현황
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                GlycoPharm 혈당관리 약국 사업의 준비 상황, 오픈 계획, 참여 안내, 논의 내용을 함께 확인하는 공간입니다.
                운영자, 공급자, 약국 경영자, 협력기관, 내부 도우미는 이 페이지에서 현재 사업 단계와 준비 항목을 확인하고
                필요한 의견을 남길 수 있습니다.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
                <a
                  href="#prep-checklist"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <ClipboardList className="w-4 h-4" />
                  사전 준비 항목 보기
                </a>
                <a
                  href="#discussion-board"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  사업 논의 게시판 보기
                </a>
                <Link
                  to="/forum/write"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <PenLine className="w-4 h-4" />
                  새 의견 작성
                </Link>
              </div>
            </div>

            {/* 우측: 사업 진행 요약 카드 */}
            <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">사업 진행 요약</p>
              <ol className="space-y-3">
                {HERO_STAGE_SUMMARY.map((s, i) => (
                  <li
                    key={s.title}
                    className={`flex items-start gap-3 rounded-xl p-3 ${
                      s.current ? 'bg-primary-50 ring-1 ring-primary-100' : 'bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        s.current ? 'bg-primary-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${s.current ? 'text-primary-700' : 'text-slate-700'}`}>
                          {s.title}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                            s.current ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {s.phase}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 사업 진행 단계 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">사업 진행 단계</h2>
          <p className="text-sm text-slate-500 mb-6">사전 준비 → 초기 오픈 → 사업 확장 순서로 진행됩니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.title}
                  className={`relative rounded-xl p-6 border shadow-sm ${
                    stage.active ? 'bg-white border-primary-200 ring-1 ring-primary-100' : 'bg-white border-slate-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                      stage.active ? 'bg-primary-100' : 'bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${stage.active ? 'text-primary-600' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800">{stage.title}</h3>
                    {stage.active && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                        진행 중
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">{stage.desc}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{stage.sub}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2-B. 제품 등록 및 공급자 협의 준비 — 요약 + CTA
            WO-O4O-GLYCOPHARM-BUSINESS-PRODUCTS-PAGE-SPLIT-V1: 상세는 /business/products 로 분리.
            anchor(#prep-product-supplier)는 /business 허브·기존 링크 호환 위해 유지. */}
        <section id="prep-product-supplier" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-800 mb-1">제품 등록 및 공급자 협의 준비</h2>
          <p className="text-sm text-slate-500 mb-6">사전 준비 단계에서 운영자와 공급자가 함께 검토하는 영역입니다.</p>

          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <PackageOpen className="w-5 h-5 text-primary-600" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  제품 등록은 단순 상품 등록이 아니라, 공급자와 운영자가 O4O를 어떤 사업 도구로 활용할지 먼저 이해하고 기획하는 단계입니다.
                  O4O 활용 요소, 제품 등록 전 검토 질문, B2B·서비스별 제품 등록·판매자 모집 하위 흐름 등 상세 내용은
                  제품 등록 및 공급자 협의 준비 페이지에서 확인합니다.
                </p>
              </div>
              <Link
                to="/business/products"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm flex-shrink-0"
              >
                제품 등록 및 공급자 협의 준비 보기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 3. 사업 논의 게시판 */}
        <section id="discussion-board" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-800 mb-1">사업 논의 게시판</h2>
          <p className="text-sm text-slate-500 mb-6">
            혈당관리 약국 사업 준비와 진행 과정에서 필요한 의견을 남기는 공간입니다.
            공급자 협의, 무료혈당기 사업, 약국 모집, 콘텐츠 준비, 약관 검토, 홍보 계획 등과 관련된 논의를 이곳에서 진행합니다.
          </p>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">사업 논의 게시판</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      준비 단계의 의견·질문·제안을 함께 정리합니다.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 lg:flex-shrink-0">
                  <Link
                    to="/forum/posts"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    전체 게시판 보기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/forum/write"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <PenLine className="w-4 h-4" />
                    새 의견 작성
                  </Link>
                  <Link
                    to="/forum/posts"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Megaphone className="w-4 h-4" />
                    공지사항 보기
                  </Link>
                </div>
              </div>
            </div>

            {/* 최근 논의 — 안내형 예시 (실제 포럼 연동은 후속 작업) */}
            <div className="p-6 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-3">최근 논의</p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
                {RECENT_DISCUSSIONS.map((d) => (
                  <li key={d.title} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                    <span className="text-sm text-slate-700">{d.title}</span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        STATUS_TONE[d.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {d.status}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-3">
                위 항목은 사업 준비 단계의 안내용 예시입니다. 실제 논의는 전체 게시판에서 확인할 수 있습니다.
              </p>
            </div>

            {/* 카테고리 안내 */}
            <div className="p-6">
              <p className="text-sm font-medium text-slate-700 mb-3">카테고리 안내</p>
              <div className="flex flex-wrap gap-2">
                {BOARD_CATEGORIES.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. 주요 사업 항목 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">주요 사업 항목</h2>
          <p className="text-sm text-slate-500 mb-6">현재 협의된 기준으로 정리한 혈당관리 약국 사업의 주요 항목입니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            {BUSINESS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-accent-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  {item.sub && (
                    <p className="text-xs text-slate-400 leading-relaxed mt-2">{item.sub}</p>
                  )}
                  {item.flows && (
                    <ul className="mt-4 space-y-2">
                      {item.flows.map((f) => (
                        <li key={f.label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                          <p className="text-sm font-medium text-slate-700">{f.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. 참여자별 확인 사항 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">참여자별 확인 사항</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            {PARTICIPANTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-1">{p.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.checks.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600 text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. 다음 확인 사항 */}
        <section id="prep-checklist" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-800 mb-1">다음 확인 사항</h2>
          <p className="text-sm text-slate-500 mb-6">사전 준비 단계에서 함께 점검할 항목입니다.</p>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
            {NEXT_CHECKLIST.map((item) => (
              <div key={item} className="flex items-center gap-3 px-6 py-4">
                <CheckCircle2 className="w-5 h-5 text-slate-300 flex-shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
