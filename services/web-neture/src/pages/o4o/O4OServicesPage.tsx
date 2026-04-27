/**
 * O4OServicesPage — O4O 매장 운영 서비스 페이지
 *
 * WO-O4O-SERVICES-PAGE-V1
 *
 * 목적: 매장에서 사용할 수 있는 서비스 종류와 활용 방식을 구조적으로 보여준다.
 * 금지: 채널 용어, 기능/구현 상세, 장문 설명.
 */

import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  QrCode,
  Tablet,
  FileText,
  GraduationCap,
  Package,
  Boxes,
  CreditCard,
  MessageSquare,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';

export default function O4OServicesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <ServiceGroups />
      <Flow />
      <Summary />
      <Cta
        onNext={() => navigate('/o4o/targets/pharmacy')}
        onBack={() => navigate('/o4o')}
      />
    </div>
  );
}

/* ─── 1. Header ───────────────────────────────────────────── */
function Header() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          O4O 서비스
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-600">
          O4O는 매장에서 고객과 연결되고 판매가 이루어지도록
          <br className="hidden md:block" />
          다양한 서비스를 제공합니다.
        </p>
      </div>
    </section>
  );
}

/* ─── 2. Service Groups (핵심) ────────────────────────────── */
function ServiceGroups() {
  const groups = [
    {
      label: '고객 접점',
      desc: '고객과 직접 만나는 영역',
      accent: 'bg-blue-50 border-blue-200 text-blue-700',
      services: [
        { icon: <Monitor className="w-6 h-6" />, name: '디지털 사이니지', detail: '매장에서 정보를 전달하는 화면' },
        { icon: <QrCode className="w-6 h-6" />, name: 'QR / 모바일 연결', detail: '고객이 즉시 반응할 수 있는 연결' },
        { icon: <Tablet className="w-6 h-6" />, name: '키오스크 / 태블릿', detail: '매장 내 셀프 안내와 입력' },
      ],
    },
    {
      label: '콘텐츠 / 설명',
      desc: '정보 전달과 이해를 만드는 영역',
      accent: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      services: [
        { icon: <FileText className="w-6 h-6" />, name: '콘텐츠 관리', detail: '필요한 정보를 매장 단위로 노출' },
        { icon: <GraduationCap className="w-6 h-6" />, name: 'LMS (교육 / 설명)', detail: '제품과 사용법을 학습 형태로 전달' },
        { icon: <Package className="w-6 h-6" />, name: '상품 정보 페이지', detail: '제품 이해를 돕는 표준 페이지' },
      ],
    },
    {
      label: '판매 / 운영',
      desc: '실제 판매와 운영을 지원하는 영역',
      accent: 'bg-amber-50 border-amber-200 text-amber-700',
      services: [
        { icon: <Boxes className="w-6 h-6" />, name: '무재고 판매', detail: '재고 부담 없이 취급과 노출만 선택' },
        { icon: <CreditCard className="w-6 h-6" />, name: '주문 / 결제 연결', detail: '매장 흐름 안에서 거래가 완료' },
        { icon: <MessageSquare className="w-6 h-6" />, name: '고객 반응 관리', detail: '응답과 후속 조치를 매장에서 처리' },
      ],
    },
  ];

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl space-y-12">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="flex items-center gap-3 mb-5">
              <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${g.accent}`}>
                {g.label}
              </span>
              <span className="text-sm text-slate-500">{g.desc}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {g.services.map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl bg-white border border-slate-200 px-5 py-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600">{s.icon}</span>
                    <span className="text-base font-semibold text-slate-900">{s.name}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── 3. Flow (활용 연결) ─────────────────────────────────── */
function Flow() {
  return (
    <section className="bg-white border-y border-slate-200 py-16 px-6">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
          서비스는 이렇게 연결됩니다
        </h2>
        <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
          <FlowNode label="노출" sub="고객 접점" />
          <FlowArrow />
          <FlowNode label="반응" sub="콘텐츠 / 설명" emphasized />
          <FlowArrow />
          <FlowNode label="실행" sub="판매 / 운영" />
        </div>
      </div>
    </section>
  );
}

function FlowNode({
  label,
  sub,
  emphasized = false,
}: {
  label: string;
  sub: string;
  emphasized?: boolean;
}) {
  const base = 'rounded-xl px-6 py-4 min-w-[140px]';
  const cls = emphasized
    ? `${base} bg-blue-600 text-white shadow-lg ring-2 ring-blue-300`
    : `${base} bg-white border border-slate-300 text-slate-900`;
  return (
    <div className={cls}>
      <div className="text-base font-bold">{label}</div>
      <div className={`text-xs mt-1 ${emphasized ? 'text-blue-100' : 'text-slate-500'}`}>{sub}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <>
      <ArrowRight className="hidden md:block w-5 h-5 text-slate-400" />
      <ArrowDown className="md:hidden w-5 h-5 text-slate-400" />
    </>
  );
}

/* ─── 4. Summary ──────────────────────────────────────────── */
function Summary() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">정리</h2>
        <p className="mt-4 text-base md:text-lg text-slate-700 leading-relaxed">
          O4O는 매장에서 실행 가능한 서비스들을 연결하여
          <br className="hidden md:block" />
          하나의 판매 구조를 만듭니다.
        </p>
      </div>
    </section>
  );
}

/* ─── 5. CTA ──────────────────────────────────────────────── */
function Cta({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <section className="bg-white border-t border-slate-200 py-12 px-6">
      <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition"
        >
          업종별 적용 보기 →
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-white font-medium hover:bg-slate-800 transition"
        >
          ← 플랫폼 개요로 돌아가기
        </button>
      </div>
    </section>
  );
}
