/**
 * GuideBusinessPharmacyCoopPage — 약국들의 협동조합 사업자 상세 안내
 *
 * WO-O4O-NETURE-BUSINESS-PHARMACY-COOP-DETAIL-PAGE-V1
 *
 * /guide/business/pharmacy-coop 의 placeholder 를 실제 사업자 안내 페이지로 승격.
 * 사업자(협동조합 운영진)용 안내 — 개별 약국 사용 설명서가 아니다.
 * 카드 · 2열 비교 · 흐름도 · 강조 박스로 시인성 중심 구성. 상담은 /contact.
 *
 * 톤 기준: 교육 문서가 아니라 사업 안내. 수익은 "운영 재원 · 주도권" 수준(보장 표현 금지).
 * 약국 영역 — 의료행위 표현 회피(고객 안내 · 건강정보 · 상담 보조 수준).
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// ─── 작은 표시용 헬퍼 ──────────────────────────────────────────────────────

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

export function GuideBusinessPharmacyCoopPage() {
  return (
    <div>
      {/* ── 1. Hero ── */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-16">
          <p className="text-sm font-medium text-violet-300 mb-3">사업 운영 안내</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">약국들의 협동조합</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl">
            조합원 약국이 함께 쓸 상품 · 콘텐츠 · 매장 활용 자료와 교육 · 행사 운영을 O4O 기반으로 연결합니다.
            무거운 쇼핑몰을 직접 운영하지 않고도 협동조합이 상품과 매장 지원에 집중할 수 있는 구조입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              상담하기 →
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
        {/* ── 2. 협동조합이 기대하는 사업 방향 ── */}
        <section>
          <SectionTitle eyebrow="기대하는 방향">협동조합이 기대하는 사업 방향</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            협동조합은 단순 공동구매를 넘어 다음을 기대합니다. O4O는 이 방향을 한 번에가 아니라 단계적으로 담을 수 있습니다.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: '더 좋은 상품 조건', d: '조합 규모를 바탕으로 더 나은 공급 조건과 특가를 협의합니다.' },
              { t: '조합원 전용 상품', d: '조합원을 위한 전용 · 단독 공급 상품을 운영할 수 있습니다.' },
              { t: '자체 제품', d: '조합이 직접 기획한 제품을 단계적으로 운영할 수 있습니다.' },
              { t: '운영 재원', d: '상품 운영을 통해 조합 운영에 필요한 재원을 만들어 갑니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900 mb-1.5">{c.t}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. O4O로 구성할 수 있는 운영 모델 (2열 비교) ── */}
        <section>
          <SectionTitle eyebrow="운영 구조">O4O로 구성할 수 있는 협동조합 운영 모델</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            문제를 지적하려는 것이 아니라, 운영 구조의 차이를 보여드립니다.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-bold text-slate-500 mb-3">일반 협동조합 쇼핑몰 방식</p>
              <Bullets
                items={[
                  '제품 등록 · 주문 처리 · 배송 · CS · 정산을 조합이 직접 맡는 경우가 많습니다.',
                  '전담 인력과 고정비 부담이 생깁니다.',
                  '규모가 커져야 유지가 가능해집니다.',
                ]}
              />
            </div>
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
              <p className="text-sm font-bold text-violet-700 mb-3">O4O 기반 협동조합 운영 방식</p>
              <Bullets
                items={[
                  '일반 공급 상품은 공급업체가 주문 · 배송을 처리합니다.',
                  '조합은 상품 선정 · 공급 조건 협의 · 콘텐츠 · 매장 지원에 집중합니다.',
                  '자체 · 전용 · 위탁 상품처럼 직접 주도가 유리한 경우 조합이 공급자로 참여합니다.',
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 4. O4O 표준 기능으로 할 수 있는 일 (4블록) ── */}
        <section>
          <SectionTitle eyebrow="표준 기능">O4O 표준 기능으로 할 수 있는 일</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                t: '제품 구비',
                items: [
                  '다양한 공급자와 제품 공급 협의',
                  '협동조합 대상 공급 조건 협의',
                  '판매자 모집 제품 우대 조건 협의',
                  '이벤트 오퍼 특가 상품 운영',
                  '공급업체 → 운영자 → 매장 HUB 진열',
                ],
              },
              {
                t: '자체 제품 구비',
                items: [
                  '단독 공급 · 차등 가격 협의',
                  '협동조합이 공급업체로 등록해 직접 공급',
                  '일반 공급업체 제품을 대신 공급',
                  '공급업체와 협의한 유통참여형 펀딩',
                  '조합이 주도하는 유통참여형 제품 개발',
                ],
              },
              {
                t: '매장 환경 지원',
                items: [
                  '상품 설명 · 건강정보 콘텐츠',
                  'QR · POP · 블로그',
                  '사이니지 · 타블렛 화면',
                  '제작자료 · 매장 HUB 등록',
                ],
              },
              {
                t: '강의 · 커뮤니티 운영',
                items: [
                  '조합원 교육',
                  '공급업체 설명회',
                  '포럼 · 강의',
                  '자료 공유 · 커뮤니티 활동',
                ],
              },
            ].map((b) => (
              <div key={b.t} className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="font-bold text-slate-900 mb-3">{b.t}</p>
                <Bullets items={b.items} />
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. 매장에서 바로 활용하도록 준비하는 흐름 (흐름도) ── */}
        <section>
          <SectionTitle eyebrow="운영 흐름">매장에서 바로 활용할 수 있도록 준비하는 흐름</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            개별 약국이 모든 자료를 직접 만들지 않습니다. 운영자가 정리해 매장에서 쓸 수 있는 형태로 준비하고 매장 HUB로 전달합니다.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {[
              '공급자 자료 · 커뮤니티 의견 · 조합원 의견',
              '협동조합 운영자가 정리',
              '콘텐츠 · QR · POP · 블로그 · 사이니지 · 타블렛 자료 제작',
              '매장 HUB 등록',
              '조합원 약국이 선택해 활용',
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-3 md:flex-1 md:flex-col md:items-stretch md:gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-700">
                  <span className="block text-xs font-bold text-violet-500 mb-1">STEP {i + 1}</span>
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <span className="text-violet-400 font-bold md:rotate-90">→</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. 직접 주도할 상품 vs 공급업체가 담당할 상품 (2열) ── */}
        <section>
          <SectionTitle eyebrow="상품 운영">조합이 주도할 상품과 공급업체가 담당할 상품을 나누어 운영합니다</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            모든 상품을 직접 유통할 필요가 없습니다. 직접 주도할 상품과 공급업체가 담당할 상품을 나누면, 직접 주도하는 상품에서 운영 재원과 주도권을 키울 수 있습니다.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-700 mb-3">공급업체가 담당하는 상품</p>
              <Bullets items={['일반 공급 상품의 주문 · 배송 · CS를 공급업체가 처리합니다.']} />
            </div>
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
              <p className="font-bold text-violet-700 mb-3">협동조합이 더 주도할 수 있는 상품</p>
              <Bullets
                items={[
                  '조합원 전용 상품',
                  '자체 제품',
                  '위탁 판매 제품',
                  '차등 가격 상품',
                  '유통참여형 펀딩 상품 · 특가 상품',
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 7. 협동조합에 필요한 서비스는 추가 제작 가능 ── */}
        <section>
          <SectionTitle eyebrow="추가 제작">협동조합에 필요한 서비스는 추가 제작할 수 있습니다</SectionTitle>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-bold text-slate-900 mb-3">이벤트 관리 서비스</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <Bullets items={['총회 안내', '행사 · 교육 신청', '참석자 관리', '알림 · 자료 배포']} />
              <Bullets items={['설문', '공급업체 설명회', '공동 캠페인']} />
            </div>
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 leading-relaxed">
            O4O는 표준 플랫폼이며, 협동조합의 운영 방식에 따라 필요한 서비스는 <span className="font-semibold text-slate-800">별도 제작 협의가 가능</span>합니다.
          </p>
        </section>

        {/* ── 8. 복합 활용을 통한 운영 확장 ── */}
        <section>
          <SectionTitle eyebrow="운영 확장">복합 활용을 통한 협동조합 운영 확장</SectionTitle>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
            <p className="text-sm text-slate-700 leading-relaxed">
              상품 준비 → 공급 조건 협의 → 콘텐츠와 매장 활용 자료 제작 → 매장 HUB 제공 → 조합원 약국 활용 → 교육 · 행사 · 커뮤니티 운영 → 필요 서비스 추가 제작.
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              이 요소들은 따로 떨어진 기능이 아니라, 하나의 협동조합 운영 구조로 연결됩니다.
            </p>
          </div>
        </section>

        {/* ── 9. 상담 안내 ── */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-center text-white">
            <h2 className="text-xl font-bold mb-2">협동조합 운영 방식 상담하기</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              조합 규모 · 조합원 수 · 상품 운영 방식 · 자체 제품 운영 여부 · 행사 운영 방식에 따라 적용 구조가 달라질 수 있습니다.
              협동조합 운영 방식과 필요한 서비스는 상담을 통해 검토할 수 있습니다.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              협동조합 운영 방식 상담하기 →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GuideBusinessPharmacyCoopPage;
