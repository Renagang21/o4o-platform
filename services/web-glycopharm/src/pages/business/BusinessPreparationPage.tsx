// WO-O4O-GLYCOPHARM-BUSINESS-PREPARATION-PAGE-SPLIT-V1
//
// 혈당관리 약국 사업 사전 준비 (/business/preparation) — IR-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-IA-AUDIT-V1 Phase 2.
//   - /business/bloodcare 의 사전 준비·다음 확인 사항을 독립 페이지로 분리.
//   - bloodcare 에는 요약 + CTA 만 남기고, 상세는 본 페이지로 이관.
//   - 제품 등록·공급자 협의는 /business/products 로 이미 분리됨 → 본 페이지 3-3 은 요약 + 링크만.
//   - Market Trial 은 준비 후보/검토 항목 '소개'만 — 실행은 Neture, GlycoPharm 내부 구현 금지.
import { Link } from 'react-router-dom';
import {
  Target,
  Activity,
  Sticker,
  PackageOpen,
  LayoutGrid,
  ScrollText,
  Monitor,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

// 제품 등록·공급자 협의 하위 흐름 (요약용 — 상세는 /business/products)
const PRODUCT_SUBFLOWS = ['B2B 제품 등록 준비', '서비스별 제품 등록 준비', '판매자 모집 준비'];

// 사전 준비 6개 영역 (3-3 은 isProductSummary)
const PREP_AREAS: {
  num: string;
  icon: typeof Activity;
  title: string;
  desc: string;
  items?: string[];
  note?: string;
  isProductSummary?: boolean;
}[] = [
  {
    num: '3-1',
    icon: Activity,
    title: '무료혈당기 사업 준비',
    desc: '무료혈당기 사업은 초기 약국 경영자를 모으는 중요한 사업 아이템입니다. 사전 준비 단계에서 가장 먼저 정리되어야 합니다.',
    items: [
      '무료혈당기 사업 소개',
      '약국 경영자용 참여 안내',
      '무료혈당기 사업 참여 조건',
      '참여 신청 또는 참여 의향 접수 방식',
      '무료혈당기 관련 제품 구성',
      '혈당기 및 관련 소모품의 B2B 등록',
      '약국에서 사용할 안내문, POP, QR-code 기본 문안',
      '고객에게 설명할 기본 콘텐츠',
    ],
  },
  {
    num: '3-2',
    icon: Sticker,
    title: '혈당관리 약국 표시물 및 CI 준비',
    desc: '무료혈당기 사업과 혈당관리 약국 사업은 약국 내부와 약국 입구에서 고객에게 보일 수 있어야 합니다.',
    items: [
      '혈당관리 약국 사업 CI',
      '무료혈당기 사업 CI',
      '약국 문 또는 입구 부착용 표시물',
      '약국 내부 게시용 POP',
      '고객 안내용 QR-code',
      '약국 내 상담 유도 문구',
      '참여 약국 표시 기준',
    ],
  },
  {
    num: '3-3',
    icon: PackageOpen,
    title: '제품 등록 및 공급자 협의 준비',
    desc: '공급자와 운영자는 어떤 제품을 어떤 방식으로 등록할지 먼저 협의합니다. 이 과정에서 O4O의 시장조사, QR-code, POP, 약국 HUB 콘텐츠, 블로그, 전자상거래, 이벤트 오퍼, Market Trial 가능성을 함께 검토합니다.',
    isProductSummary: true,
  },
  {
    num: '3-4',
    icon: LayoutGrid,
    title: '약국 HUB 콘텐츠 준비',
    desc: '가입자가 들어왔을 때 빈 화면이 아니라 실제로 볼 수 있는 콘텐츠가 있어야 합니다. 운영자는 우선 몇 개 제품과 사업 항목을 중심으로 약국 HUB에 진열할 콘텐츠를 준비합니다.',
    items: [
      '제품 설명 콘텐츠',
      '고객 안내문',
      'QR-code 안내 콘텐츠',
      'POP 문안',
      '블로그 초안',
      '약국 경영자용 활용 팁',
      '무료혈당기 사업 안내 콘텐츠',
      '혈당관리 지원약국 안내 콘텐츠',
      '설문조사 참여 안내 콘텐츠',
    ],
  },
  {
    num: '3-5',
    icon: ScrollText,
    title: '약관·정책 문서 준비',
    desc: '가입자 모집과 사업 참여를 위해 기본 약관과 정책 문서가 필요합니다.',
    items: [
      'GlycoPharm 기본 이용약관',
      '개인정보처리방침',
      '무료혈당기 사업 참여 안내',
      '무료혈당기 사업 참여 동의 또는 약관',
      '혈당관리 지원약국 참여 안내',
      '혈당관리 지원약국 참여 약관',
      '설문조사 참여 안내 및 개인정보 처리 기준',
    ],
    note: '특히 혈당관리 지원약국은 일반 회원 가입보다 한 단계 깊은 사업 참여이므로, 별도의 참여 기준과 역할 범위를 정리해야 합니다.',
  },
  {
    num: '3-6',
    icon: Monitor,
    title: '테스트 약국 환경 준비',
    desc: '초기 홍보와 상담 과정에서 약국 경영자, 운영자, 공급자, 협력기관, 내부 도우미가 같은 화면을 보며 논의할 수 있어야 합니다.',
    items: [
      '테스트 약국 아이디 또는 데모 환경',
      '약국 HUB 진입 화면',
      '제품 및 콘텐츠 확인 화면',
      '무료혈당기 사업 안내 확인',
      'QR-code, POP, 블로그 예시',
      '설문조사 또는 초기 참여 사업 확인',
      '제품 등록 및 이벤트 오퍼 예시',
      '혈당관리 지원약국 참여 안내',
    ],
  },
];

const PREP_CHECKLIST = [
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

export default function BusinessPreparationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link to="/business" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
            <ArrowLeft className="w-4 h-4" />
            사업 진행 허브
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">혈당관리 약국 사업 사전 준비</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            GlycoPharm 혈당관리 약국 사업은 약국 경영자를 모집하기 전에 실제로 보여줄 수 있는 서비스, 제품, 콘텐츠, 약관,
            테스트 환경을 먼저 준비해야 합니다. 이 페이지는 가입자 모집 전 준비해야 할 항목을 한곳에서 확인하는 사전 준비 페이지입니다.
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
              to="/business"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              사업 허브로 돌아가기
            </Link>
            <Link
              to="/business/products"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <PackageOpen className="w-4 h-4" />
              제품 등록 및 공급자 협의 보기
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 사전 준비의 목적 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">사전 준비의 목적</h2>
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  사전 준비 단계의 목표는 약국 경영자가 GlycoPharm에 들어왔을 때 "이 사업은 실제로 준비되어 있고, 내가 무엇을 볼 수 있으며,
                  어떻게 참여할 수 있는지"를 바로 이해할 수 있게 하는 것입니다.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  따라서 가입자 모집 전에는 무료혈당기 사업, 약국 표시물, 제품 등록, 약국 HUB 콘텐츠, 약관·정책 문서,
                  테스트 약국 환경이 먼저 준비되어야 합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 사전 준비 6개 영역 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">사전 준비 영역</h2>
          <div className="space-y-4">
            {PREP_AREAS.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.num} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">{area.num}</span>
                        <h3 className="font-semibold text-slate-800">{area.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mt-1">{area.desc}</p>
                    </div>
                  </div>

                  {area.isProductSummary ? (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {PRODUCT_SUBFLOWS.map((s) => (
                          <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600 text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                      <Link
                        to="/business/products"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                      >
                        제품 등록 및 공급자 협의 자세히 보기
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">준비 항목</p>
                      <div className="flex flex-wrap gap-2">
                        {area.items?.map((item) => (
                          <span key={item} className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600 text-xs">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {area.note && (
                    <p className="text-sm text-slate-700 font-medium bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 mt-4">
                      {area.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. 사전 준비 체크리스트 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">사전 준비 체크리스트</h2>
          <p className="text-sm text-slate-500 mb-6">가입자 모집 전에 함께 점검할 항목입니다.</p>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
            {PREP_CHECKLIST.map((item) => (
              <div key={item} className="flex items-center gap-3 px-6 py-4">
                <CheckCircle2 className="w-5 h-5 text-slate-300 flex-shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 5. 관련 페이지 연결 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">관련 페이지 연결</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Activity, label: '혈당관리 약국 사업 추진 현황', to: '/business/bloodcare' },
              { icon: PackageOpen, label: '제품 등록 및 공급자 협의 준비', to: '/business/products' },
              { icon: ArrowLeft, label: '사업 진행 허브', to: '/business' },
              { icon: MessageSquare, label: '사업 논의 게시판', to: '/forum/posts' },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-center justify-between gap-3 rounded-xl p-5 bg-white border border-slate-100 shadow-sm hover:border-primary-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-semibold text-slate-800">{link.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
