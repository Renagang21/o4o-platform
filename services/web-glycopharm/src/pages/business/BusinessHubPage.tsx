// WO-O4O-GLYCOPHARM-BUSINESS-PAGE-ROADMAP-REWRITE-V1
//
// /business — 서비스 소개가 아니라 "혈당관리 약국 사업 추진 스케줄"(참여자용 로드맵).
//   대상: 공급업체 · 운영자 · 초기 참여 약국 · 콘텐츠/강의/세미나 참여자 · 향후 협력 후보.
//   1차 사전 설명 세미나를 가장 앞 단계로 배치(참여자가 O4O를 모르므로 준비 전에 먼저 설명).
//   운영 수익은 약국 구독료가 아니라 공급자 마케팅 지원 + 자체/전용 제품 운영 우선.
//   후속 기능(주문 후보 도구 등)은 "검토" 수준, 한국당뇨협회 등 외부 협력은 미확정으로 표기.
//   기존 실제 route(/business/bloodcare, /forum, /products, /preparation)만 연결 — dead link 금지.
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  MessageSquare,
  Presentation,
  Boxes,
  Store,
  ClipboardCheck,
  Megaphone,
  Network,
  Rocket,
  Coins,
  PackageOpen,
  ListChecks,
} from 'lucide-react';

// ─── 8단계 추진 스케줄 ─────────────────────────────────────────────────────
const STAGES: { no: string; title: string }[] = [
  { no: '01', title: '1차 사전 설명 세미나' },
  { no: '02', title: '공급자 · 제품 · 콘텐츠 준비' },
  { no: '03', title: '약국 HUB 등록 및 초기 구성' },
  { no: '04', title: '초기 약국 테스트와 요구사항 정리' },
  { no: '05', title: '2차 참여자 세미나' },
  { no: '06', title: '전문 매체 및 약국 경영자 홍보' },
  { no: '07', title: '거래 발생 후 외부 협력 확대' },
  { no: '08', title: '확장 세미나 및 후속 사업 도입' },
];

// ─── 하단 실행 문서 바로가기 (실제 존재 route 만) ───────────────────────────
const DOC_LINKS: { icon: typeof Activity; title: string; desc: string; to: string }[] = [
  { icon: Activity, title: '혈당관리 약국 사업 추진 현황', desc: '현재 준비 단계와 참여자별 확인 사항.', to: '/business/bloodcare' },
  { icon: MessageSquare, title: '사업 논의 게시판', desc: '사업 준비·진행 의견을 남기고 확인.', to: '/business/forum' },
  { icon: PackageOpen, title: '제품 등록 및 공급자 협의 준비', desc: '제품 등록·판매자 모집 방향 검토.', to: '/business/products' },
  { icon: ListChecks, title: '사전 준비 체크리스트', desc: '무료혈당기 · 표시물 · 약관 · 테스트 환경 등.', to: '/business/preparation' },
];

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function StageHeader({ no, icon: Icon, eyebrow, title }: { no: string; icon: typeof Activity; eyebrow?: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <div>
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-500">{eyebrow}</p>}
        <h2 className="text-lg font-bold text-slate-800">
          <span className="text-primary-400 mr-1.5">{no}</span>
          {title}
        </h2>
      </div>
    </div>
  );
}

export default function BusinessHubPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-600 text-white text-sm font-medium mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white/90" />
            사업 추진 스케줄
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">혈당관리 약국 사업 추진 스케줄</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            GlycoPharm 혈당관리 약국 사업을 함께 준비하는 공급업체 · 운영자 · 초기 참여 약국을 위한 사업 추진 로드맵입니다.
            소비자용 서비스 소개가 아니라, 무엇을 어떤 순서로 준비하고 실행할지를 정리합니다.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed max-w-3xl mt-2">
            1차 사전 설명 세미나에서 O4O 구조와 참여자 역할을 먼저 정리한 뒤, 공급자 · 제품 · 콘텐츠 준비, 약국 HUB 등록,
            초기 약국 테스트, 전문 매체 홍보, 외부 협력 확대 순서로 진행합니다.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Link
              to="/business/bloodcare"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Activity className="w-4 h-4" />
              사업 추진 현황 보기
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
        {/* 2. 현재 추진 단계 요약 (8단계 타임라인) */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">추진 단계 한눈에 보기</h2>
          <p className="text-sm text-slate-500 mb-6">사전 설명 세미나에서 시작해 준비 · 테스트 · 홍보 · 협력 확대 순서로 진행합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STAGES.map((s) => (
              <div key={s.no} className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <span className="text-xs font-bold text-primary-500">{s.no}</span>
                <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{s.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. 1차 사전 설명 세미나 */}
        <section className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-6 sm:p-8">
          <StageHeader no="01" icon={Presentation} eyebrow="가장 먼저" title="1차 사전 설명 세미나 — O4O 구조와 참여자 역할 이해" />
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            대부분의 참여자는 아직 O4O 구조를 잘 모릅니다. 제품과 콘텐츠를 준비하기 전에, 먼저 O4O가 무엇이고 각 참여자가 어떤 역할을
            하는지 설명하는 출발점입니다.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-white border border-primary-100 p-5">
              <p className="font-semibold text-slate-800 mb-3">대상</p>
              <Bullets items={['공급업체', '운영자', '초기 참여 약국', '콘텐츠 · 강의 참여자', '향후 협력 후보']} />
            </div>
            <div className="rounded-xl bg-white border border-primary-100 p-5">
              <p className="font-semibold text-slate-800 mb-3">설명할 내용</p>
              <Bullets
                items={[
                  'O4O 기본 구조와 GlycoPharm 사업 추진 방향',
                  '공급자 · 운영자 · 약국의 역할과 초기 참여 방식',
                  '제품 · 콘텐츠 준비 기준',
                  '이벤트 오퍼 · 판매자 선별 제품 · 유통참여형 펀딩 활용 방향',
                  '운영자 수익의 우선 방향',
                ]}
              />
            </div>
          </div>
        </section>

        {/* 4. 공급자·제품·콘텐츠 준비 */}
        <section>
          <StageHeader no="02" icon={Boxes} title="공급자 · 제품 · 콘텐츠 준비" />
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            공급자는 제품과 원천 콘텐츠를 제공하고, 운영자는 이를 약국에서 활용할 수 있는 상품 · 콘텐츠 · 매장 활용 자료로 정리합니다.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-3">제품 · 공급 검토</p>
              <Bullets items={['공급자와 제품 후보 선정', 'B2B 전용 · 이벤트 오퍼 · 판매자 선별 제품 검토', '약국 전용 또는 우대 조건 제품 검토', '공급자와 함께 세미나 · 제품 설명 자료 준비']} />
            </div>
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-3">콘텐츠 준비</p>
              <Bullets items={['제품별 원천 콘텐츠 확보', '제품별 약국 활용 콘텐츠 3~5종 준비', 'QR · POP · 블로그 · 사이니지 · 타블렛 자료화 준비']} />
            </div>
          </div>
        </section>

        {/* 5. 약국 HUB 등록 및 초기 구성 */}
        <section>
          <StageHeader no="03" icon={Store} title="약국 HUB 등록 및 초기 구성" />
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            전체 기능을 한 번에 여는 것이 아니라, 초기 참여 약국이 테스트할 수 있는 최소 구성으로 시작합니다.
          </p>
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <Bullets items={['제품 등록 · 콘텐츠 등록 · 약국 HUB 진열', '내 약국에서 활용할 제작자료 구성', 'QR · POP · 블로그 · 사이니지 · 타블렛 자료 연결', '초기 참여 약국이 사용할 최소 기능 구성']} />
          </div>
        </section>

        {/* 6. 초기 약국 테스트와 요구사항 정리 */}
        <section>
          <StageHeader no="04" icon={ClipboardCheck} title="초기 약국 테스트와 요구사항 정리" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-3">테스트 · 반응 확인</p>
              <Bullets items={['약사 모임에 제한적으로 소개 · 초기 참여 약국 모집', '일부 기능만 사용하도록 유도', '제품 · 콘텐츠 · 이벤트 오퍼 반응 확인', '약국 현장의 반복 업무 확인']} />
            </div>
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-3">후속 기능 요구사항 (검토 단계)</p>
              <Bullets items={['조제 · 판매 소모량 기반 주문 후보 정리 도구(검토)', '약국 내 반복 안내 업무 보조(검토)', '제품 · 콘텐츠 활용 현황 확인(검토)']} />
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">후속 기능은 현재 구현된 기능이 아니라 요구사항 수집 · 도입 검토 대상입니다.</p>
            </div>
          </div>
        </section>

        {/* 7. 2차 참여자 세미나 */}
        <section className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-6 sm:p-8">
          <StageHeader no="05" icon={Presentation} eyebrow="초기 테스트 이후" title="2차 참여자 세미나 — 초기 반응 공유와 보완" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-white border border-primary-100 p-5">
              <p className="font-semibold text-slate-800 mb-3">목적</p>
              <Bullets items={['초기 약국 · 제품 · 콘텐츠 반응 공유', '이벤트 오퍼 · 판매자 선별 제품 보완', '약국 요구사항 정리', '전문 매체 홍보 전 보완 사항 확인']} />
            </div>
            <div className="rounded-xl bg-white border border-primary-100 p-5">
              <p className="font-semibold text-slate-800 mb-3">대상</p>
              <Bullets items={['공급업체 · 운영자', '초기 참여 약국', '필요 시 추가 공급업체', '콘텐츠 · 강의 참여자']} />
            </div>
          </div>
        </section>

        {/* 8. 전문 매체 및 약국 경영자 홍보 */}
        <section>
          <StageHeader no="06" icon={Megaphone} title="전문 매체 및 약국 경영자 홍보" />
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            제품 · 콘텐츠 · 초기 반응이 일정 수준 갖춰진 뒤에 진행하는 단계입니다.
          </p>
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <Bullets items={['약업신문 등 전문 매체 홍보', '약국 경영자 대상 홍보', '혈당관리 지원약국 참여 확대', '공급업체 추가 참여 유도', '제품 · 콘텐츠 · 이벤트 오퍼 확대']} />
          </div>
        </section>

        {/* 9. 거래 발생 후 외부 협력 확대 */}
        <section>
          <StageHeader no="07" icon={Network} title="거래 발생 후 외부 협력 확대" />
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            공급업체와 제품이 일정 수준 확보되고 약국에서 실제 거래 · 반응이 발생한 뒤에 검토하는 단계입니다.
          </p>
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <Bullets items={['한국당뇨협회 등 외부 협력 검토(미확정)', '관련 단체 · 커뮤니티와 협력 가능성 검토', '추가 공급업체 참여 확대']} />
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">외부 협력은 확정된 것이 아니라, 거래와 반응이 발생한 뒤 검토하는 가능성입니다.</p>
          </div>
        </section>

        {/* 10. 확장 세미나 및 후속 사업 도입 */}
        <section>
          <StageHeader no="08" icon={Rocket} title="확장 세미나 및 후속 사업 도입" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-3">확장 단계 논의</p>
              <Bullets items={['후속 사업 도입 여부 논의', '공급자 추가 참여 정리', '약국 경영자 대상 확장 전략 정리', '외부 단체 협력 방향 정리']} />
            </div>
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-3">후속 사업 후보 (도입 검토)</p>
              <Bullets items={['샘플 판매 · 강좌 · 무재고 판매 · 케어 서비스', '추가 이벤트 오퍼', '유통참여형 펀딩 제품 개발', '약국 반복 업무 지원 도구']} />
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">후속 후보는 확정 기능이 아니라 확장 검토 대상입니다.</p>
            </div>
          </div>
        </section>

        {/* 11. 운영 수익의 우선 방향 */}
        <section>
          <StageHeader no="·" icon={Coins} eyebrow="수익 방향" title="운영 수익의 우선 방향" />
          <div className="rounded-2xl border border-accent-200 bg-accent-50/60 p-6">
            <p className="text-sm text-slate-700 leading-relaxed max-w-3xl mb-4">
              GlycoPharm의 초기 운영 수익은 약국 참여 구독료보다, 공급자의 제품 랜딩과 약국 현장 활용을 지원하는 구조에서 먼저
              검토합니다. 공급자 마케팅 지원과 자체 제품 · 전용 제품 운영이 우선 수익 방향입니다.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-800 mb-3">우선 방향</p>
                <Bullets items={['공급자 마케팅 지원 · 세미나 운영 지원', '제품 · 콘텐츠 약국 HUB 등록 지원', '매장 활용 자료 제작 지원', '이벤트 오퍼 · 판매자 선별 제품 운영', '자체 제품 또는 전용 제품 운영']} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-3">후속 확장</p>
                <Bullets items={['샘플 판매', '강좌', '무재고 판매', '케어 서비스']} />
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">약국 참여 구독료를 핵심 수익으로 보지 않으며, 후속 확장은 도입 검토 대상입니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 12. 실행 문서 바로가기 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">실행 문서 바로가기</h2>
          <p className="text-sm text-slate-500 mb-6">추진 현황 · 논의 게시판 · 준비 문서로 이동합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOC_LINKS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.to}
                  className="group block rounded-xl p-5 border border-slate-100 bg-white shadow-sm hover:border-primary-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-slate-600" />
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
      </div>
    </div>
  );
}
