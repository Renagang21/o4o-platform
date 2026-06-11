/**
 * GuideBusinessWarehousePharmacyPage — 창고형 약국 사업자 상세 안내
 *
 * WO-O4O-NETURE-BUSINESS-WAREHOUSE-PHARMACY-DETAIL-PAGE-V1
 *
 * /guide/business/warehouse-pharmacy 의 placeholder 를 실제 사업자 안내 페이지로 승격.
 * 창고형(대규모) 약국 대상. 핵심: O4O 는 POS·로봇·CCTV·키오스크·사이니지 통합 운영 시스템이 아니라,
 * 자체 제품·이벤트 오퍼·전략 상품을 고객에게 설명하는 콘텐츠와 매장 접점 연결을 선택적으로 지원한다.
 *
 * 정직성: POS 제공·대체 아님. 모든 POS 자동 연동 아님(엑셀 대안). 로봇/CCTV/키오스크/사이니지 하드웨어
 * 통합·CCTV 동선 분석 직접 제공 아님. 상비약 세트는 진단·치료 아님(제품 설명·상담 보조). 수익·매출 보장 금지.
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

export function GuideBusinessWarehousePharmacyPage() {
  return (
    <div>
      {/* ── 1. Hero ── */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-16">
          <p className="text-sm font-medium text-violet-300 mb-3">사업 운영 안내</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">창고형 약국</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl">
            많은 상품과 고객 유입을 가진 창고형 약국에서 자체 제품 · 이벤트 오퍼 · 전략 상품을 고객에게 더 잘
            설명하고, POS 데이터와 매장 접점을 활용해 수익성을 높일 수 있는 구조를 만듭니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              창고형 약국 적용 방식 상담하기 →
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
          <SectionTitle eyebrow="기대하는 방향">창고형 약국이 기대하는 사업 방향</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: '자체 제품과 전용 상품 운영', d: '매장 규모와 고객 유입을 바탕으로 자체 제작 제품이나 단독 상품을 운영합니다.' },
              { t: '이벤트 오퍼와 저가 공급 조건 확보', d: '공급사와 협의해 가격 경쟁력 있는 상품과 고객 유입 상품을 운영합니다.' },
              { t: '유통참여형 제품 개발', d: '판매 데이터와 고객 반응을 바탕으로 제품 개발 · 공급 기획에 참여합니다.' },
              { t: '전략 제품의 설명력 강화', d: '전문 제품 · 고마진 제품 · 자체 제품을 고객에게 더 잘 설명합니다.' },
              { t: '매장 하드웨어 접점에 콘텐츠 연결', d: '사이니지 · 로봇 · 타블렛 · QR · POP 등 매장 접점에 제품 설명 콘텐츠를 적용합니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900 mb-1.5">{c.t}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. 필요한 기능만 선택해 적용 (강조) ── */}
        <section>
          <SectionTitle eyebrow="적용 원칙">필요한 기능만 선택해 적용합니다</SectionTitle>
          <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              창고형 약국은 이미 매장 규모 · 고객 유입 · POS · 주문 · 판매 관리 시스템을 갖춘 경우가 많습니다.
              O4O 의 모든 서비스를 사용할 필요는 없습니다.
            </p>
            <Bullets
              items={[
                '커뮤니티나 일반 매장 지원 기능보다 상품 운영 · 콘텐츠 · 고객 접점 연결 · POS 데이터 활용이 더 중요할 수 있습니다.',
                '필요한 기능만 선택해 적용하고, 부족한 부분은 별도 제작 협의가 가능합니다.',
              ]}
            />
          </div>
        </section>

        {/* ── 4. O4O 담당하지 않는 것 vs 지원할 수 있는 것 (2열) ── */}
        <section>
          <SectionTitle eyebrow="역할 한계">O4O가 담당하지 않는 것과 지원할 수 있는 것</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-bold text-slate-500 mb-3">O4O가 직접 담당하지 않는 영역</p>
              <Bullets
                items={[
                  'POS 자체 제공',
                  '로봇 · CCTV · 키오스크 · 사이니지 장비 통합 관리',
                  '모든 주문 · 재고 시스템 대체',
                  '하드웨어 운영 전체 통합',
                  'CCTV 고객 동선 분석 자체 제공',
                  '매장 전체 운영 시스템 대체',
                ]}
              />
            </div>
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
              <p className="text-sm font-bold text-violet-700 mb-3">O4O가 지원할 수 있는 영역</p>
              <Bullets
                items={[
                  '장비에 표시할 상품 콘텐츠',
                  'QR · POP · 화면 안내 자료',
                  '공급사 제품 설명 자료 정리',
                  '자체 제품 · 이벤트 오퍼 상품의 매장 노출 콘텐츠',
                  'POS / 엑셀 데이터를 활용한 상품 운영 보조',
                  '공급사 → 운영자 → 매장으로 이어지는 콘텐츠 준비 흐름',
                ]}
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            O4O 는 하드웨어를 제공하거나 통합 관리하지 않으며, 장비가 고객에게 보여줄 콘텐츠와 매장 접점 연결을 지원하는 역할입니다.
          </p>
        </section>

        {/* ── 5. POS·판매 데이터 연결 (2열) ── */}
        <section>
          <SectionTitle eyebrow="데이터 활용">POS · 판매 데이터와 연결해 운영합니다</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            O4O 는 POS 를 대체하지 않습니다. 연동이 가능하면 데이터를 활용하고, 어렵다면 엑셀 데이터를 받아
            상품 운영 · 콘텐츠 제작에 활용합니다. 자동화 수준은 사용하는 POS 와 데이터 제공 방식에 따라 달라집니다.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-900 mb-3">POS 연동이 가능할 때</p>
              <Bullets
                items={['상품 · 판매 데이터 활용', '전략 제품 후보 확인', '이벤트 오퍼 반응 확인', '주문 준비 보조', '콘텐츠 노출 상품 선정']}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-900 mb-3">POS 연동이 어려울 때 (엑셀 대안)</p>
              <Bullets
                items={['엑셀 판매 데이터 업로드', '상품 목록 · 판매 목록 활용', '주문 후보 정리', '세트 구성 후보 확인', '콘텐츠 제작 대상 상품 확인']}
              />
            </div>
          </div>
        </section>

        {/* ── 6. O4O 표준 기능 4블록 ── */}
        <section>
          <SectionTitle eyebrow="표준 기능">O4O 표준 기능으로 할 수 있는 일</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { t: '자체 제품 · 전용 상품 운영', items: ['자체 제작 제품', '창고형 약국 전용 상품', '특정 공급사 단독 상품', '차등 가격 상품', '서비스 단독 제품'] },
              { t: '이벤트 오퍼와 가격 경쟁력', items: ['저렴한 가격 상품 확보', '공급사 특가 제안', '특정 기간 · 조건 상품 운영', '고객 유입 상품 구성', '공급사와 우대 조건 협의'] },
              { t: '유통참여형 펀딩과 제품 개발', items: ['제품 개발 참여', '수요 확인', '공급 전 반응 확인', '자체 상품 후보 검토', '공급사와 공동 개발 논의'] },
              { t: '콘텐츠 기반 매장 판매 지원', items: ['전문 제품 설명', 'QR · POP', '사이니지 · 타블렛 · 로봇 화면용 콘텐츠', '공급사 공동 제작 콘텐츠'] },
            ].map((b) => (
              <div key={b.t} className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="font-bold text-slate-900 mb-3">{b.t}</p>
                <Bullets items={b.items} />
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. 하드웨어 접점 콘텐츠 흐름 ── */}
        <section>
          <SectionTitle eyebrow="운영 흐름">하드웨어 접점에 콘텐츠를 연결하는 흐름</SectionTitle>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {[
              '공급사 자료 · 자체 제품 정보 · 이벤트 오퍼 상품',
              '운영자가 제품 설명 콘텐츠로 정리',
              'QR · POP · 사이니지 · 타블렛 · 로봇 화면용 자료 제작',
              '매장 내 고객 접점에 적용',
              '고객이 제품을 이해하고 상담 · 비교 · 구매로 이동',
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
            로봇 · 사이니지 · CCTV · POS · 키오스크 같은 장비는 각 전문 업체가 담당합니다. O4O 는 그 장비가 고객에게 보여줄
            상품 설명 콘텐츠를 공급사 · 운영자 · 매장 흐름으로 준비하는 역할입니다. CCTV 는 콘텐츠 표시 장비가 아니며,
            별도 고객 동선 분석 결과가 있다면 그 결과를 참고해 콘텐츠 배치 · 상품 노출 전략을 조정하는 정도로 활용합니다.
          </p>
        </section>

        {/* ── 8. 독자 제품·이벤트 오퍼를 매장 장비에 연결 ── */}
        <section>
          <SectionTitle eyebrow="핵심 차별">독자적 제품과 이벤트 오퍼 제품을 매장 장비에 연결</SectionTitle>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
            <Bullets
              items={[
                '자체 제품은 매장 안에서 눈에 띄어야 합니다.',
                '이벤트 오퍼 상품은 고객이 쉽게 이해해야 합니다.',
                '전문 제품은 콘텐츠가 있어야 선택 가능성이 높아집니다.',
                '공급사와 함께 만든 콘텐츠를 QR · POP · 사이니지 · 로봇 화면 · 타블렛에 연결합니다.',
                'POS / 판매 데이터로 반응을 확인하고 다음 상품 운영에 반영합니다.',
              ]}
            />
            <p className="mt-3 text-sm font-medium text-violet-700">상품 운영 → 콘텐츠 → 매장 접점 → 반응 확인</p>
          </div>
        </section>

        {/* ── 9. 주도 영역 vs 협력 영역 (2열) ── */}
        <section>
          <SectionTitle eyebrow="역할 구분">사업자가 주도할 영역과 공급사와 협력할 영역</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
              <p className="font-bold text-violet-700 mb-3">약국 또는 운영자가 주도할 수 있는 영역</p>
              <Bullets
                items={[
                  '자체 제품 기획 · 전용 상품 운영',
                  '전략 제품 선정',
                  '이벤트 오퍼 운영 요청',
                  '유통참여형 펀딩 기획',
                  'POS / 엑셀 데이터 기반 상품 후보 검토',
                  '매장 내 노출 위치와 콘텐츠 운영',
                  '하드웨어 접점별 콘텐츠 운영 방향',
                ]}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-700 mb-3">공급사와 협력할 영역</p>
              <Bullets
                items={[
                  '제품 생산 · 공급',
                  '차등 가격 · 단독 조건 협의',
                  '제품 설명 자료 제공',
                  '특가 조건 제공',
                  '공동 콘텐츠 제작',
                  '유통참여형 제품 개발 협의',
                  '매장 내 제품 노출 자료 협의',
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 10. 필요한 서비스는 추가 제작 가능 ── */}
        <section>
          <SectionTitle eyebrow="추가 제작">필요한 서비스는 추가 제작할 수 있습니다</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { t: 'POS / 엑셀 데이터 연계 서비스', items: ['POS 연동 검토', '엑셀 판매 데이터 업로드', '전략 제품 · 주문 후보 정리', '이벤트 오퍼 반응 · 세트 후보 확인', '매장 안내 콘텐츠 연결'] },
              { t: '하드웨어 연계 콘텐츠 서비스', items: ['사이니지 화면 콘텐츠', '로봇 화면용 제품 설명', '타블렛 안내 화면', 'QR · POP 연계', '고객 접점별 콘텐츠 구성'] },
              { t: '자체 제품 · 이벤트 오퍼 운영 서비스', items: ['자체 제품 후보 관리', '이벤트 오퍼 상품 노출 자료', '공급사 협의 상품 관리', '전용 상품 조건 관리', '매장 내 전략 상품 콘텐츠 연결'] },
              {
                t: '상비약 세트 안내 서비스',
                items: ['상비약 세트 구성', '세트 상자 QR 안내', '실제 상품명 기준 사용 안내', '관련 제품 함께 사용 안내', '모바일 화면 · 앱 형태 안내'],
                note: '진단 · 치료 지시가 아니라 제품 설명 · 사용 상황 안내 · 주의사항 · 약사 상담을 보완하는 자료 수준입니다. 성분명이 아니라 세트 안의 실제 상품명 기준 안내가 가능합니다.',
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
            창고형 약국의 운영 방식 · POS 환경 · 하드웨어 구성 · 자체 제품 운영 여부에 따라 필요한 서비스는{' '}
            <span className="font-semibold text-slate-800">별도 제작 협의가 가능</span>합니다.
          </p>
        </section>

        {/* ── 11. 수익성을 높일 수 있는 운영 지점 ── */}
        <section>
          <SectionTitle eyebrow="운영 성과">수익성을 높일 수 있는 운영 지점</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            창고형 약국은 매출 규모가 크지만 수익성을 만들기 쉽지 않습니다. 수익을 보장하지는 않지만, 다음은 수익성을 높일 수 있는 운영 지점입니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Bullets
              items={[
                '자체 제품 판매력 강화 · 전용 상품 운영',
                '이벤트 오퍼를 통한 가격 경쟁력',
                '유통참여형 펀딩을 통한 제품 개발',
                '고마진 · 전문 제품 설명 강화',
                '공급사 공동 콘텐츠 운영',
              ]}
            />
            <Bullets
              items={[
                'POS / 엑셀 데이터 기반 전략 상품 선정',
                '하드웨어 접점별 콘텐츠 노출',
                '상비약 세트 같은 상품군 구성',
                '단순 저가 판매에서 콘텐츠 기반 판매로 전환',
              ]}
            />
          </div>
        </section>

        {/* ── 12. 복합 활용을 통한 운영 확장 ── */}
        <section>
          <SectionTitle eyebrow="운영 확장">복합 활용을 통한 창고형 약국 운영 확장</SectionTitle>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 space-y-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              창고형 약국은 O4O 의 모든 기능을 사용할 필요는 없습니다. POS · 주문 · 하드웨어는 기존 시스템과 전문 업체를
              활용하고, O4O 는 자체 제품 · 이벤트 오퍼 · 전략 상품을 고객에게 설명하는 콘텐츠와 매장 접점 연결을 담당합니다.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              이를 통해 단순 대량 진열과 저가 판매를 넘어, 수익성 있는 상품 운영과 콘텐츠 기반 판매 환경을 만들 수 있습니다.
            </p>
          </div>
        </section>

        {/* ── 13. 상담 안내 ── */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-center text-white">
            <h2 className="text-xl font-bold mb-2">창고형 약국 적용 방식 상담하기</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              매장 규모 · POS 환경 · 판매 데이터 활용 가능성 · 자체 제품 여부 · 전략 제품군 · 공급사 협력 · 하드웨어 보유 ·
              이벤트 오퍼 운영 · 상비약 세트 같은 전용 서비스 필요 여부에 따라 적용 방식이 달라질 수 있습니다.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              창고형 약국 적용 방식 상담하기 →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GuideBusinessWarehousePharmacyPage;
