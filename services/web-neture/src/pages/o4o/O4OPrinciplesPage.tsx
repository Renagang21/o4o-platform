/**
 * O4OPrinciplesPage — O4O 운영 원칙 페이지
 *
 * WO-O4O-PRINCIPLES-PAGE-V1
 *
 * 목적: O4O가 어떤 기준으로 운영되는지 명확히 정의한다.
 * 금지: 개념/철학 반복, 구조 설명 반복, 기능 설명, 장문.
 */

import { useNavigate } from 'react-router-dom';
import { Store, FileText, Network, Users, Layers, Wrench } from 'lucide-react';

export default function O4OPrinciplesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Principles />
      <CommonMessage />
      <Summary />
      <Cta
        onNext={() => navigate('/o4o/structure')}
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
          O4O 운영 원칙
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-600">
          O4O는 일정한 기준에 따라 운영되며,
          <br className="hidden md:block" />
          모든 참여자는 이 구조 안에서 역할을 수행합니다.
        </p>
      </div>
    </section>
  );
}

/* ─── 2. Principles (핵심) ────────────────────────────────── */
function Principles() {
  const items = [
    {
      icon: <Store className="w-7 h-7" />,
      title: '매장이 중심이다',
      desc: '모든 구조와 서비스는 매장을 기준으로 설계됩니다.',
    },
    {
      icon: <FileText className="w-7 h-7" />,
      title: '설명이 가능한 구조를 만든다',
      desc: '제품이 아니라 정보를 통해 선택이 이루어지도록 합니다.',
    },
    {
      icon: <Network className="w-7 h-7" />,
      title: '역할은 분리되고 연결된다',
      desc: '공급자, 매장, 파트너는 각각의 역할을 가지며 하나의 흐름으로 연결됩니다.',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: '소규모를 조직화한다',
      desc: '개별 매장이 아닌 네트워크 구조로 경쟁력을 만듭니다.',
    },
    {
      icon: <Layers className="w-7 h-7" />,
      title: '불필요한 유통을 줄인다',
      desc: '구조를 단순화하여 비용을 줄이고 효율을 높입니다.',
    },
    {
      icon: <Wrench className="w-7 h-7" />,
      title: '실행 중심으로 설계한다',
      desc: '모든 기능은 실제 매장에서 사용되는 것을 기준으로 설계됩니다.',
    },
  ];

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((it, idx) => (
            <div
              key={it.title}
              className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="text-blue-600 shrink-0 mt-0.5">{it.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-slate-400">
                    원칙 {idx + 1}
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {it.title}
                  </div>
                  <div className="mt-2 text-slate-700 leading-relaxed">
                    {it.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 3. Common Message ───────────────────────────────────── */
function CommonMessage() {
  return (
    <section className="bg-white border-y border-slate-200 py-16 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
          운영의 기준
        </h2>
        <p className="mt-4 text-slate-700 leading-relaxed">
          O4O는 기능이 아니라 구조로 경쟁력을 만드는 플랫폼입니다.
          <br className="hidden md:block" />
          이 원칙은 모든 서비스와 운영에 동일하게 적용됩니다.
        </p>
      </div>
    </section>
  );
}

/* ─── 4. Summary ──────────────────────────────────────────── */
function Summary() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">정리</h2>
        <p className="mt-4 text-slate-700 leading-relaxed">
          O4O는 매장을 중심으로 역할을 연결하고,
          <br className="hidden md:block" />
          정보 기반 구조를 통해 경쟁력을 만들어가는 운영 방식입니다.
        </p>
      </div>
    </section>
  );
}

/* ─── 5. CTA ──────────────────────────────────────────────── */
function Cta({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <section className="bg-white border-t border-slate-200 py-12 px-6">
      <div className="mx-auto max-w-3xl flex flex-col md:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition"
        >
          유통 구조 보기 →
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
