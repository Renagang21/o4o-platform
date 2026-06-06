// WO-O4O-GLYCOPHARM-BUSINESS-PRODUCTS-PAGE-SPLIT-V1
//
// 제품 등록 및 공급자 협의 준비 (/business/products) — IR-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-IA-AUDIT-V1 Phase 2.
//   - /business/bloodcare 의 제품 등록·공급자 협의 상세 섹션을 독립 페이지로 분리.
//   - bloodcare 에는 요약 + CTA 만 남기고, 상세는 본 페이지로 이관.
//   - Market Trial 은 제품 검증·사업 기획 가능성 '소개'만 — 실행 플로우는 Neture 담당, GlycoPharm 내부 구현 금지.
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  ListChecks,
  Activity,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

// 공급자에게 공유할 O4O 활용 요소 (9)
const O4O_USES = [
  '설문조사 등 시장조사',
  '약국 내 QR-code 활용',
  '약국 내 POP 활용',
  '약국 HUB 콘텐츠 진열',
  '매장이 운영하는 블로그 활용',
  '전자상거래를 통한 제품 판매',
  '이벤트 오퍼',
  '유통참여형 펀딩 기반 제품 검증 및 개발',
  '향후 파트너 서비스 연계 가능성',
];

// 제품 등록 전 함께 검토할 질문 (10)
const REVIEW_QUESTIONS = [
  '어떤 제품을 우선 등록할 것인가',
  '해당 제품이 GlycoPharm 사업과 어떤 관련이 있는가',
  'B2B 공통 제품으로 등록할 것인가',
  'GlycoPharm 서비스별 제품으로 별도 노출할 것인가',
  '이벤트 오퍼 대상이 될 수 있는가',
  '설문조사나 시장조사와 연결할 수 있는가',
  'QR-code, POP, 블로그 등 매장 실행 콘텐츠가 필요한가',
  '유통참여형 펀딩 기반 제품 개발 또는 검증으로 확장할 수 있는가',
  '판매자 모집이 필요한 제품인가',
  '판매자 모집을 언제, 어떤 조건으로 진행할 것인가',
];

// 3개 하위 흐름
const SUBFLOWS: { num: string; title: string; lead: string; desc: string; note?: string; points: string[] }[] = [
  {
    num: '5-1',
    title: 'B2B 제품 등록 준비',
    lead: 'O4O 서비스 전체에서 공통으로 활용할 수 있는 제품을 등록하는 단계입니다.',
    desc: '혈당관리 관련 제품 중 약국이 기본적으로 구매하거나 취급할 수 있는 제품을 검토합니다. B2B 등록은 이후 서비스별 제품 노출, 이벤트 오퍼, 판매자 모집, 무재고 판매 등으로 확장될 수 있는 기반입니다.',
    points: [
      'B2B 공통 제품으로 등록할 제품',
      '공급 가격과 공급 조건',
      '주문 및 배송 방식',
      '약국 경영자에게 제공할 제품 설명',
      '제품 이미지와 기본 자료',
      '향후 이벤트 오퍼 전환 가능성',
      '다른 O4O 서비스에서도 활용 가능한지 여부',
    ],
  },
  {
    num: '5-2',
    title: '서비스별 제품 등록 준비',
    lead: 'GlycoPharm의 성격에 맞게 제품을 노출하고 운영하는 단계입니다.',
    desc: '같은 제품이라도 GlycoPharm에서는 혈당관리, 당뇨관리, 약국 상담, 무료혈당기 사업, 혈당관리 지원약국 사업과 연결되는 방식으로 설명되어야 합니다.',
    note: '공급자와 협의, 공급자 가입, 제품 등록, 제품 등재 진행 상황을 운영자가 점검합니다.',
    points: [
      '공급자와 제품 등록 협의 여부',
      '공급자 가입 여부',
      '제품 기본 정보 준비 여부',
      '제품 이미지와 설명 자료 준비 여부',
      'GlycoPharm 서비스 내 노출 방식',
      '약국 HUB 콘텐츠와의 연결 여부',
      'QR-code, POP, 블로그 등 매장 활용 콘텐츠 필요 여부',
      '이벤트 오퍼 또는 유통참여형 펀딩 연계 가능성',
      '제품 등록 완료 여부',
      '제품 등재 후 검토 및 수정 필요 여부',
    ],
  },
  {
    num: '5-3',
    title: '판매자 모집 준비',
    lead: '기본적으로 공급자가 준비해야 할 사업 요소이며, 운영자는 공급자와 협의하여 추진 여부와 시기를 정합니다.',
    desc: '판매자 모집은 제품 등록 이후 자동으로 진행되는 것이 아니라, 공급자의 준비 상태와 사업 의지, 운영자의 사업 일정, 약국 경영자의 관심도에 따라 추진 여부와 시기를 결정합니다.',
    points: [
      '해당 제품이 판매자 모집 대상인지 여부',
      '공급자가 판매자 모집을 원하는지 여부',
      '판매자 모집 시기',
      '참여 약국 또는 매장 경영자의 조건',
      '판매자에게 제공할 혜택 또는 조건',
      '제품 공급 방식',
      '이벤트 오퍼와의 연결 여부',
      '무재고 판매 가능성',
      '약국 내 홍보 콘텐츠 제공 여부',
      '판매자 모집 안내문 필요 여부',
    ],
  },
];

// 다음 확인 사항 (제품 등록 영역 중심)
const NEXT_CHECKLIST = [
  'B2B 전자상거래 등록 제품',
  '서비스별 등록 제품',
  '판매자 모집 방식',
  '이벤트 오퍼 준비 방식',
  '무료혈당기 CI 및 약국 부착물 제작 범위',
];

export default function BusinessProductsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link to="/business" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
            <ArrowLeft className="w-4 h-4" />
            사업 진행 허브
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">제품 등록 및 공급자 협의 준비</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            혈당관리 약국 사업에서 제품 등록은 공급자와 운영자가 제품을 O4O 안에서 어떻게 활용할지 먼저 협의하는 과정입니다.
            제품을 단순히 등록하는 것을 넘어 시장조사, 매장 실행, 콘텐츠 활용, 전자상거래, 이벤트 오퍼, 유통참여형 펀딩 가능성까지 함께 검토합니다.
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
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 제품 등록 전 협의의 의미 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">제품 등록 전 협의의 의미</h2>
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  제품 등록은 단순 상품 등록이 아니라, 공급자와 운영자가 O4O를 어떤 사업 도구로 활용할지 먼저 이해하고 기획하는 단계입니다.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  어떤 제품을 어떤 방식으로 등록할지는 운영자가 공급자와 먼저 협의합니다. 이때 공급자에게 현재 O4O 서비스의 개요,
                  활용 방법, 마케팅 활용 가능성, 약국 현장 실행 방식 등을 공유하는 것이 필요합니다.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  공급자와 운영자 모두 O4O가 단순 유통 서비스가 아니라 시장조사, 매장 실행, 콘텐츠 활용, 전자상거래, 이벤트 오퍼,
                  유통참여형 펀딩, 향후 파트너 서비스까지 연결될 수 있는 사업 도구라는 점을 이해해야 합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 + 4. O4O 활용 요소 + 검토 질문 (2열) */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-800 mb-3">O4O 활용 요소</h2>
              <p className="text-sm text-slate-500 mb-4">공급자에게 공유해야 할 O4O 활용 가능성입니다.</p>
              <div className="flex flex-wrap gap-2">
                {O4O_USES.map((u) => (
                  <span key={u} className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                    {u}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-slate-500" />
                <h2 className="text-base font-bold text-slate-800">제품 등록 전 검토 질문</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">운영자와 공급자가 함께 검토합니다.</p>
              <ul className="space-y-2">
                {REVIEW_QUESTIONS.map((q) => (
                  <li key={q} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 5. 3개 하위 흐름 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">제품 등록 하위 흐름</h2>
          <div className="space-y-4">
            {SUBFLOWS.map((flow) => (
              <div key={flow.num} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 inline-flex items-center justify-center px-2.5 h-7 rounded-md bg-primary-600 text-white text-xs font-bold">
                    {flow.num}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-800">{flow.title}</h3>
                    <p className="text-sm text-primary-700 mt-0.5">{flow.lead}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{flow.desc}</p>
                {flow.note && (
                  <p className="text-sm text-slate-700 font-medium bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 mt-3">
                    {flow.note}
                  </p>
                )}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">검토 항목</p>
                  <div className="flex flex-wrap gap-2">
                    {flow.points.map((p) => (
                      <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600 text-xs">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. 다음 확인 사항 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">다음 확인 사항</h2>
          <p className="text-sm text-slate-500 mb-6">제품 등록 영역에서 함께 점검할 항목입니다.</p>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
            {NEXT_CHECKLIST.map((item) => (
              <div key={item} className="flex items-center gap-3 px-6 py-4">
                <CheckCircle2 className="w-5 h-5 text-slate-300 flex-shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. 관련 사업 연결 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">관련 사업 연결</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/business/bloodcare" className="group block rounded-xl p-5 bg-white border border-slate-100 shadow-sm hover:border-primary-200 transition-colors">
              <div className="flex items-center justify-between">
                <Activity className="w-5 h-5 text-primary-600" />
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-3">혈당관리 약국 사업 추진 현황</p>
            </Link>
            <Link to="/business" className="group block rounded-xl p-5 bg-white border border-slate-100 shadow-sm hover:border-primary-200 transition-colors">
              <div className="flex items-center justify-between">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-3">사업 진행 허브</p>
            </Link>
            <Link to="/business/forum" className="group block rounded-xl p-5 bg-white border border-slate-100 shadow-sm hover:border-primary-200 transition-colors">
              <div className="flex items-center justify-between">
                <MessageSquare className="w-5 h-5 text-slate-600" />
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-3">사업 논의 게시판</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
