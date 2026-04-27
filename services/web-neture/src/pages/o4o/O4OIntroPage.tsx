/**
 * O4OIntroPage — O4O 플랫폼 구조 페이지
 *
 * WO-O4O-INTRO-STRUCTURE-PAGE-V1
 *
 * 목적: O4O 구성요소와 연결을 한 눈에 보여준다.
 * 금지: 개념/철학 설명, 장문 텍스트, Channel/서비스 상세.
 */

import { useNavigate } from 'react-router-dom';
import { Truck, Store, Handshake, ShieldCheck, ArrowRight, ArrowDown } from 'lucide-react';

export default function O4OIntroPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Diagram />
      <Elements />
      <Flow />
      <Cta
        onNext={() => navigate('/o4o/concepts')}
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
          O4O 플랫폼 구조
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-600">
          공급자, 매장, 파트너가 하나의 흐름으로 연결된 구조입니다.
        </p>
      </div>
    </section>
  );
}

/* ─── 2. Structure Diagram (핵심) ─────────────────────────── */
function Diagram() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DiagramCard icon={<Truck className="w-8 h-8" />} label="공급자" />
          <DiagramCard icon={<Store className="w-9 h-9" />} label="매장" emphasized />
          <DiagramCard icon={<Handshake className="w-8 h-8" />} label="파트너" />
          <DiagramCard icon={<ShieldCheck className="w-8 h-8" />} label="운영자" />
        </div>
      </div>
    </section>
  );
}

function DiagramCard({
  icon,
  label,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  emphasized?: boolean;
}) {
  const base = 'flex flex-col items-center justify-center rounded-xl py-8 px-4 transition';
  const cls = emphasized
    ? `${base} bg-blue-600 text-white shadow-lg ring-2 ring-blue-300`
    : `${base} bg-white text-slate-800 border border-slate-200`;
  return (
    <div className={cls}>
      <div className={emphasized ? 'text-white' : 'text-blue-600'}>{icon}</div>
      <div className={`mt-3 text-base font-semibold ${emphasized ? 'text-white' : 'text-slate-900'}`}>
        {label}
      </div>
    </div>
  );
}

/* ─── 3. Element Descriptions ─────────────────────────────── */
function Elements() {
  const items = [
    { label: '공급자', desc: '제품과 정보를 제공하는 주체' },
    { label: '매장', desc: '고객과 만나는 실제 접점이며 판매가 이루어지는 공간' },
    { label: '파트너', desc: '콘텐츠, 마케팅, 운영을 지원하는 역할' },
    { label: '운영자', desc: '전체 구조를 유지하고 연결하는 역할' },
  ];

  return (
    <section className="bg-white border-y border-slate-200 py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((it) => (
            <div
              key={it.label}
              className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4"
            >
              <div className="text-sm font-semibold text-blue-600">{it.label}</div>
              <div className="mt-1 text-slate-700">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 4. Flow ─────────────────────────────────────────────── */
function Flow() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">구조의 흐름</h2>

        {/* Horizontal flow on desktop, vertical on mobile */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
          <FlowNode>공급자</FlowNode>
          <FlowArrow />
          <FlowNode emphasized>매장</FlowNode>
          <FlowArrow />
          <FlowNode>고객</FlowNode>
          <FlowArrow />
          <FlowNode>반응</FlowNode>
          <FlowArrow />
          <FlowNode>재연결</FlowNode>
        </div>
      </div>
    </section>
  );
}

function FlowNode({
  children,
  emphasized = false,
}: {
  children: React.ReactNode;
  emphasized?: boolean;
}) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium';
  const cls = emphasized
    ? `${base} bg-blue-600 text-white`
    : `${base} bg-white border border-slate-300 text-slate-800`;
  return <div className={cls}>{children}</div>;
}

function FlowArrow() {
  return (
    <>
      <ArrowRight className="hidden md:block w-5 h-5 text-slate-400" />
      <ArrowDown className="md:hidden w-5 h-5 text-slate-400" />
    </>
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
          플랫폼 개념 보기 →
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
