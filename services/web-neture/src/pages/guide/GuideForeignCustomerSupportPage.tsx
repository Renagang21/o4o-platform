/**
 * GuideForeignCustomerSupportPage — 외국인 고객 응대 가이드 (운영 매뉴얼)
 *
 * WO-O4O-NETURE-GUIDE-FOREIGN-CUSTOMER-SUPPORT-V1
 *
 * /guide/foreign-customer-support
 * 매장이 QR · 태블릿 · 다국어 상품 안내 콘텐츠로 외국인 고객에게 상품 정보를 보여주는
 * 실제 운영 방법을 안내하는 매뉴얼 페이지. 기능 구현이 아니라 가이드 콘텐츠.
 *
 * 정직성: 소비자 결제 · 관광객 앱 결제 · 자동 주문 기능과 혼동되지 않게 작성.
 * KPA Society 파일럿 흐름을 기준으로 작성하되 Neture 안내 문맥에 맞게 표현.
 *
 * 용어: 매장 취급 상품 / O4O 주문 가능 상품 / 다국어 상품 안내 콘텐츠 /
 *       고객용 보기 / QR 보기 / 태블릿 보기 / Store Hub.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

function SectionTitle({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 mb-1">{eyebrow}</p>}
      <h2 className="text-xl md:text-2xl font-bold text-slate-900">{children}</h2>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function GuideForeignCustomerSupportPage() {
  return (
    <div>
      {/* ── 1. Hero ── */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-16">
          <p className="text-sm font-medium text-violet-300 mb-3">매장 이용 안내</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">외국인 고객 응대 가이드</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl">
            QR · 태블릿 · 다국어 상품 안내 콘텐츠를 활용해 외국인 고객에게 상품 정보를 보여주는 방법입니다.
            매장 직원이 말로 설명하기 어려운 상황에서, 고객이 자신의 언어로 상품 안내를 확인하도록 돕습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/guide/for-seller"
              className="inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              내 매장 활용 가이드 →
            </Link>
            <Link
              to="/guide"
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              ← 가이드 홈
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">
        {/* ── 1. 어떤 상황에서 사용하나요? ── */}
        <section>
          <SectionTitle eyebrow="활용 상황">어떤 상황에서 사용하나요?</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            외국인 고객이 상품 설명을 이해하기 어려울 때, 매장 직원은 QR 또는 태블릿을 통해 다국어 상품 안내
            콘텐츠를 보여줄 수 있습니다. 직원이 외국어로 직접 설명하지 않아도, 고객은 자신의 언어로 상품 정보를
            확인할 수 있습니다.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { t: '상품 설명이 어려울 때', d: '성분 · 사용법 · 주의사항을 고객의 언어로 보여줍니다.' },
              { t: '직원이 바쁠 때', d: 'QR을 보여주면 고객이 스스로 휴대폰으로 확인합니다.' },
              { t: '대면 응대가 필요할 때', d: '태블릿으로 고객 앞에서 바로 상품 설명을 보여줍니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900 mb-1.5">{c.t}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. 준비해야 할 것 ── */}
        <section>
          <SectionTitle eyebrow="준비">준비해야 할 것</SectionTitle>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <Bullets
              items={[
                '다국어 상품 안내 콘텐츠 (운영자가 작성해 Store Hub에 게시한 자료)',
                '연결할 매장 취급 상품 또는 O4O 주문 가능 상품',
                '고객에게 보여줄 QR(인쇄/화면) 또는 매장 태블릿 화면',
              ]}
            />
          </div>
        </section>

        {/* ── 3. 다국어 상품 안내 콘텐츠 만들기 ── */}
        <section>
          <SectionTitle eyebrow="콘텐츠">다국어 상품 안내 콘텐츠 만들기</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            다국어 상품 안내 콘텐츠는 서비스 운영자가 작성해 Store Hub에 게시합니다. 매장은 직접 콘텐츠를
            제작하지 않아도, 게시된 콘텐츠를 가져와 자기 매장 상품에 연결하는 방식으로 활용합니다.
          </p>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            언어별 안내는 각각 독립된 안내 페이지로 작성됩니다. 자동 번역이 보장되는 기능이 아니라,
            운영자가 언어별로 정리해 게시하는 자료입니다.
          </p>
        </section>

        {/* ── 4. Store Hub에서 콘텐츠 가져오기 ── */}
        <section>
          <SectionTitle eyebrow="가져오기">Store Hub에서 콘텐츠 가져오기</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            운영자가 게시한 콘텐츠를 Store Hub에서 가져오면, 매장 전용 사본이 생성됩니다. 가져온 콘텐츠는
            내 매장 콘텐츠로 복사되어 이후 원본과 분리됩니다.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {[
              'Store Hub에서 다국어 상품 안내 콘텐츠 열람',
              '필요한 콘텐츠 가져오기',
              '매장 전용 사본 생성',
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-3 md:flex-1 md:flex-col md:items-stretch md:gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-700">
                  <span className="block text-xs font-bold text-violet-500 mb-1">STEP {i + 1}</span>
                  {step}
                </div>
                {i < arr.length - 1 && <span className="text-violet-400 font-bold md:rotate-90">→</span>}
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. 매장 상품에 연결하기 ── */}
        <section>
          <SectionTitle eyebrow="연결">매장 상품에 연결하기</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            가져온 콘텐츠는 매장 취급 상품 또는 O4O 주문 가능 상품에 연결할 수 있습니다. 연결하면 상품 목록에서
            다국어 콘텐츠가 연결되었음을 배지로 확인할 수 있습니다.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-900 mb-3">매장 취급 상품</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                매장에서 자체적으로 취급 · 진열하는 상품에 다국어 안내를 연결합니다.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-900 mb-3">O4O 주문 가능 상품</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                O4O로 주문 가능한 진열 상품에도 동일하게 다국어 안내를 연결할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* ── 6. QR로 보여주기 ── */}
        <section>
          <SectionTitle eyebrow="QR">QR로 보여주기</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            연결된 상품의 다국어 콘텐츠는 <span className="font-semibold text-slate-800">QR 보기</span>로
            QR을 만들 수 있습니다. QR을 인쇄해 진열대에 두거나 매장 화면에 보여주면, 고객은 자신의 휴대폰으로
            상품 안내를 확인할 수 있습니다. 고객은 별도의 로그인 없이 안내 화면을 볼 수 있습니다.
          </p>
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 leading-relaxed">
            안내 화면에서 고객은 지원되는 언어를 직접 선택할 수 있고, 요청한 언어가 없으면 다른 언어로 표시됩니다.
          </div>
        </section>

        {/* ── 7. 태블릿으로 보여주기 ── */}
        <section>
          <SectionTitle eyebrow="태블릿">태블릿으로 보여주기</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            <span className="font-semibold text-slate-800">태블릿 보기</span>는 매장 직원이 고객 앞에서 바로
            상품 설명을 보여줄 때 적합합니다. 큰 화면과 큰 글씨 · 큰 언어 선택 버튼으로 구성되어, 카운터나
            진열대에서 고객과 함께 보기 좋습니다.
          </p>
        </section>

        {/* ── 8. 매장 직원 응대 예시 ── */}
        <section>
          <SectionTitle eyebrow="응대 예시">매장 직원 응대 예시</SectionTitle>
          <div className="space-y-3">
            {[
              {
                s: '상황',
                d: '외국인 고객이 진열된 상품을 가리키며 설명을 원합니다.',
              },
              {
                s: '응대',
                d: '직원이 태블릿으로 해당 상품의 다국어 안내를 열고, 고객이 자신의 언어 버튼을 누르도록 안내합니다.',
              },
              {
                s: '또는',
                d: '진열대의 QR을 가리키며 고객이 직접 휴대폰으로 스캔해 확인하도록 안내합니다.',
              },
            ].map((c) => (
              <div key={c.s} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 flex-shrink-0">
                  {c.s}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 9. 운영 시 주의사항 ── */}
        <section>
          <SectionTitle eyebrow="운영 정책">운영 시 주의사항</SectionTitle>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <Bullets
              items={[
                'Store Hub에서 가져온 콘텐츠는 매장 전용 사본으로 저장됩니다.',
                '운영자 원본이 수정되거나 삭제되어도 이미 가져온 매장 사본에는 영향을 주지 않습니다.',
                '고객용 링크나 QR을 발급하면 고객에게 공개 가능한 상태가 됩니다.',
                '보관 처리된 콘텐츠는 고객에게 노출되지 않습니다.',
              ]}
            />
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            이 안내는 상품 정보를 보여주기 위한 도구입니다. 소비자 결제 · 관광객 앱 결제 · 자동 주문 기능과는
            무관하며, 상품 안내 · 응대 보조 목적으로 사용합니다.
          </p>
        </section>

        {/* ── 닫기 안내 ── */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-center text-white">
            <h2 className="text-xl font-bold mb-2">매장 운영에 적용하기</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              다국어 상품 안내 콘텐츠 · QR · 태블릿 활용은 매장의 취급 상품과 고객 구성에 따라 적용 방식이
              달라질 수 있습니다. 내 매장 활용 가이드에서 전체 매장 운영 흐름을 함께 확인하세요.
            </p>
            <Link
              to="/guide/for-seller"
              className="mt-5 inline-flex items-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              내 매장 활용 가이드 →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GuideForeignCustomerSupportPage;
