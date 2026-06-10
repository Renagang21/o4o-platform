/**
 * GuideBusinessForeignCustomerStorePage — 외국인 고객이 많은 지역 매장 사업자 상세 안내
 *
 * WO-O4O-NETURE-BUSINESS-FOREIGN-CUSTOMER-STORE-DETAIL-PAGE-V1
 *
 * /guide/business/foreign-customer-store 의 placeholder 를 실제 사업자 안내 페이지로 승격.
 * 외국인 근로자 · 장기 체류 고객이 많은 지역의 약국 · 화장품 · 생활형 매장 대상.
 * 관광지 매장과 달리 홍보가 아니라 상담 보조 · 제품 선택 지원 · 다국어 안내 · 반복/생활형 구매 중심.
 *
 * 정직성: 공급사 마케팅 · SNS 홍보 중심 아님. 다국어 번역 · 제품 소재지 앱 · 세트/대량 구매 · 수출/통관은
 * 구현 완료 기능이 아니라 "추가 제작 협의 / 안내·보조" 영역으로 표현. 약국 의료행위 표현 회피.
 * 구매 · 매출 보장 표현 금지.
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

export function GuideBusinessForeignCustomerStorePage() {
  return (
    <div>
      {/* ── 1. Hero ── */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-16">
          <p className="text-sm font-medium text-violet-300 mb-3">사업 운영 안내</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">외국인 고객이 많은 지역 매장</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl">
            외국인 근로자나 장기 체류 고객이 많은 지역 매장에서 제품 설명 · 사용법 · 주의사항 · 제품 선택을
            다국어 자료와 매장 화면으로 안내할 수 있도록 돕습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              외국인 고객 매장 사업 상담하기 →
            </Link>
            <Link
              to="/guide/business"
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              ← 사업 안내 전체
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">
        {/* ── 2. 기대하는 사업 방향 ── */}
        <section>
          <SectionTitle eyebrow="기대하는 방향">이 사업자가 기대하는 사업 방향</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            외국인 고객이 많은 지역 매장은 홍보보다 상담과 제품 선택 지원이 중요합니다.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: '제품 설명을 쉽게 전달', d: '제품의 용도 · 사용법 · 주의사항을 고객이 이해할 수 있도록 안내합니다.' },
              { t: '상담 어려움을 줄임', d: '언어 장벽이 있는 고객에게 반복 설명을 줄이고 매장 직원의 상담을 보조합니다.' },
              { t: '제품 선택을 지원', d: '비슷한 제품 중 어떤 것을 선택할지 이해하기 쉽게 돕습니다.' },
              { t: '반복 · 대량 구매 대응', d: '가족 · 친인척용 구매, 세트 구성, 핸드캐리어 수요까지 고려합니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900 mb-1.5">{c.t}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. 운영 모델 (제품 정보 → 응대 자료 흐름) ── */}
        <section>
          <SectionTitle eyebrow="운영 구조">O4O로 구성할 수 있는 운영 모델</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            제품 정보가 고객이 이해할 수 있는 응대 자료로 바뀌어 매장의 상담과 제품 선택을 보조합니다.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {[
              '제품 정보 · 사용법 · 주의사항',
              '운영자가 다국어 안내 자료로 정리',
              'QR · POP · 타블렛 · 블로그 · 매장 화면으로 제공',
              '매장에서 상담과 제품 선택 보조',
              '반복 구매 · 세트 구매 · 대량 구매로 확장',
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

        {/* ── 4. O4O 표준 기능으로 할 수 있는 일 (4블록) ── */}
        <section>
          <SectionTitle eyebrow="표준 기능">O4O 표준 기능으로 할 수 있는 일</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { t: '다국어 제품 설명', items: ['제품 용도', '사용법', '주의사항', '비교 안내', 'QR · 타블렛 · POP'] },
              { t: '상담 보조 자료', items: ['자주 묻는 질문', '제품별 설명 카드', '언어별 안내 문구', '매장 직원용 응대 보조 자료', '고객 이해를 돕는 화면 자료'] },
              { t: '제품 선택 지원', items: ['비슷한 제품 비교', '상황별 제품군 안내', '가족 · 친인척용 구매 안내', '세트 구성 안내', '반복 구매 제품 안내'] },
              { t: '매장 활용 자료', items: ['QR · POP · 블로그', '타블렛 · 사이니지', '제작자료', '매장 HUB 등록'] },
            ].map((b) => (
              <div key={b.t} className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="font-bold text-slate-900 mb-3">{b.t}</p>
                <Bullets items={b.items} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            다국어 안내는 자동 번역 완료 기능이 아니라, 사업자 필요에 따라 제작 · 운영하는 영역입니다.
          </p>
        </section>

        {/* ── 5. 고객이 제품을 이해하고 선택하는 흐름 ── */}
        <section>
          <SectionTitle eyebrow="고객 여정">고객이 제품을 이해하고 선택하는 흐름</SectionTitle>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {[
              '외국인 고객 방문',
              '제품 또는 상황 문의',
              'QR · 타블렛 · POP로 언어별 설명 확인',
              '제품 비교 · 사용법 · 주의사항 이해',
              '매장 직원 상담 보조',
              '구매 · 반복 구매 · 가족용 세트 구매',
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
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            약국에서는 증상 진단이 아니라 제품 설명 · 사용법 안내 · 상담 보조 · 고객 이해 지원 수준으로 활용합니다.
          </p>
        </section>

        {/* ── 6. 주도 영역 vs 협력 영역 (2열) ── */}
        <section>
          <SectionTitle eyebrow="역할 구분">사업자가 주도할 영역과 공급자와 협력할 영역</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
              <p className="font-bold text-violet-700 mb-3">사업자가 주도할 수 있는 영역</p>
              <Bullets
                items={[
                  '외국인 고객이 많은 매장 네트워크 구성',
                  '생활형 제품군 구성',
                  '다국어 안내 자료 운영',
                  '제품 비교 · 세트 구성',
                  '반복 구매 상품 관리',
                  '제품 소재지 / 취급 매장 안내',
                ]}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-700 mb-3">공급자와 협력할 영역</p>
              <Bullets
                items={[
                  '제품 정보 제공',
                  '사용법 · 주의사항 자료 제공',
                  '제품 이미지 · 영상 제공',
                  '공급 조건 협의',
                  '세트 상품 구성 협의',
                  '대량 구매 대응 협의',
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 7. 필요한 서비스는 추가 제작 가능 ── */}
        <section>
          <SectionTitle eyebrow="추가 제작">필요한 서비스는 추가 제작할 수 있습니다</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                t: '다국어 안내 활용 서비스',
                items: ['다국어 제품 설명', '다국어 사용법 · 주의사항', 'QR 안내 · 타블렛 화면', '매장 직원용 응대 보조 자료'],
              },
              {
                t: '제품 소재지 / 취급 매장 안내 앱',
                items: ['제품별 취급 매장 안내', '고객이 제품을 찾을 수 있는 매장 정보', '매장 위치 · 언어별 제품 검색', '특정 제품 보유 매장 확인'],
                note: '실제 앱 구현은 이번 범위가 아니며, 추가 제작 가능 서비스로 검토합니다.',
              },
              {
                t: '세트 구매 / 대량 구매 보조 서비스',
                items: ['가족 · 친인척용 제품 세트 구성', '대량 구매 후보 제품 안내', '제품 조합 안내'],
                note: '수출 · 통관 서비스를 제공하지는 않으며, 핸드캐리어 수요가 있을 때 제품 선택과 세트 구성을 보조하는 수준입니다.',
              },
            ].map((s) => (
              <div key={s.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="font-bold text-slate-900 mb-3">{s.t}</p>
                <Bullets items={s.items} />
                {s.note && <p className="mt-3 text-xs text-slate-500 leading-relaxed">{s.note}</p>}
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 leading-relaxed">
            외국인 고객이 많은 지역 매장의 운영 방식에 따라 필요한 서비스는 <span className="font-semibold text-slate-800">별도 제작 협의가 가능</span>합니다.
          </p>
        </section>

        {/* ── 8. 성과가 만들어질 수 있는 지점 ── */}
        <section>
          <SectionTitle eyebrow="운영 성과">수익 또는 운영 성과가 만들어질 수 있는 지점</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            수익을 보장하지는 않지만, 운영을 통해 성과를 만들 수 있는 지점은 다음과 같습니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Bullets
              items={[
                '외국인 고객 응대 효율 향상',
                '제품 설명력 강화',
                '반복 구매 유도',
                '생활형 제품군 확대',
              ]}
            />
            <Bullets
              items={[
                '세트 상품 운영',
                '대량 구매 대응',
                '제품 소재지 안내를 통한 매장 연결',
                '다국어 안내 서비스 운영',
              ]}
            />
          </div>
        </section>

        {/* ── 9. 복합 활용을 통한 사업 확장 ── */}
        <section>
          <SectionTitle eyebrow="운영 확장">복합 활용을 통한 사업 확장</SectionTitle>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 space-y-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              외국인 고객이 많은 지역 매장 사업은 O4O를 통해 제품 설명 · 다국어 안내 · 제품 선택 · 세트 구성 · 매장 위치
              안내를 하나의 흐름으로 연결할 수 있습니다. 사업자는 매장이 설명하기 어려운 부분을 자료와 화면으로 보조하고,
              고객은 언어 장벽을 줄이면서 필요한 제품을 더 쉽게 이해합니다.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              필요한 경우 다국어 안내 서비스, 제품 소재지 앱, 세트 구매 보조 서비스 등을 추가 제작해 사업을 확장할 수 있습니다.
            </p>
          </div>
        </section>

        {/* ── 10. 상담 안내 ── */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-center text-white">
            <h2 className="text-xl font-bold mb-2">외국인 고객 매장 사업 상담하기</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              지역 특성 · 외국인 고객 비중 · 취급 상품 · 언어권 · 세트 구매 수요 · 매장 네트워크 구성 방식에 따라
              적용 구조가 달라질 수 있습니다. 필요한 전용 서비스는 상담을 통해 검토할 수 있습니다.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              외국인 고객 매장 사업 상담하기 →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GuideBusinessForeignCustomerStorePage;
