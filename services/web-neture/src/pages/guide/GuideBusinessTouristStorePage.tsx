/**
 * GuideBusinessTouristStorePage — 관광지 약국 / 화장품 매장 사업자 상세 안내
 *
 * WO-O4O-NETURE-BUSINESS-TOURIST-STORE-DETAIL-PAGE-V1
 *
 * /guide/business/tourist-store 의 placeholder 를 실제 사업자 안내 페이지로 승격.
 * 관광지·교통 요지·외국인 방문이 많은 지역의 약국·화장품 매장 대상.
 * 카드 · 역할 구분 · 고객 여정 흐름도 · 서비스 카드 · 강조 박스로 시인성 중심 구성. 상담은 /contact.
 *
 * 정직성: 구매·매출 보장 표현 금지. 세금환급·POS·다국어 번역·지도·SNS 연동은 O4O 제공 완료 기능이
 * 아니라 "추가 제작 협의 / 안내 콘텐츠·외부 흐름 연결" 영역으로 표현. 약국은 의료행위 표현 회피.
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

export function GuideBusinessTouristStorePage() {
  return (
    <div>
      {/* ── 1. Hero ── */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-16">
          <p className="text-sm font-medium text-violet-300 mb-3">사업 운영 안내</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">관광지 약국 / 화장품 매장</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl">
            관광지와 외국인 방문이 많은 지역의 약국 · 화장품 매장을 상품 설명, 다국어 안내, 매장 화면, QR,
            영상 콘텐츠가 연결되는 오프라인 고객 접점으로 운영합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              관광지 매장 사업 상담하기 →
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
          <SectionTitle eyebrow="기대하는 방향">관광지 매장이 기대하는 사업 방향</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: '외국인 고객에게 쉽게 설명', d: '다국어 안내 · 영상 · QR로 짧은 체류 시간 안에 제품을 이해하도록 돕습니다.' },
              { t: '매장을 브랜드 홍보 접점으로', d: '진열을 넘어 공급자 · 브랜드의 제품을 노출하고 체험하게 하는 접점으로 활용합니다.' },
              { t: 'SNS 홍보를 매장 방문으로 연결', d: 'SNS · 인플루언서에서 본 제품을 매장에서 찾을 수 있도록 안내합니다.' },
              { t: '다국어 콘텐츠로 응대 보조', d: '다국어 설명과 영상으로 매장 직원의 고객 응대를 보조합니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900 mb-1.5">{c.t}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. 운영 모델 (역할 흐름) ── */}
        <section>
          <SectionTitle eyebrow="운영 구조">O4O로 구성할 수 있는 관광지 매장 운영 모델</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            관광지 매장은 상품을 진열하는 공간을 넘어, 공급자와 외국인 고객을 잇는 오프라인 접점이 됩니다.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {[
              { r: '공급자 / 브랜드', d: '제품 정보 · 이미지 · 영상 · 다국어 설명을 제공합니다.' },
              { r: '운영자', d: '매장별 상품 · 콘텐츠 · QR · POP · 타블렛 · 사이니지를 구성합니다.' },
              { r: '관광지 약국 / 화장품 매장', d: '외국인 고객에게 제품 설명 · 체험 · 구매 접점을 제공합니다.' },
              { r: '여행객 / 외국인 고객', d: 'SNS · 인플루언서 콘텐츠를 보고 매장을 방문해 제품을 확인하고 구매 또는 재방문으로 이어집니다.' },
            ].map((c, i, arr) => (
              <div key={c.r} className="flex items-center gap-3 md:flex-1 md:flex-col md:items-stretch md:gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 md:min-h-[140px]">
                  <p className="text-xs font-bold text-violet-500 mb-1">{`0${i + 1}`}</p>
                  <p className="font-semibold text-slate-900 text-sm mb-1.5">{c.r}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.d}</p>
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
              {
                t: '다국어 제품 안내',
                items: ['제품 설명 · 사용법', '성분 · 특징 · 주의사항', 'QR 연결 · 타블렛 화면', '영상 안내'],
                note: '다국어 콘텐츠는 자동 번역 완료 기능이 아니라, 사업자 필요에 따라 제작 · 운영하는 영역입니다.',
              },
              {
                t: '매장 내 홍보 접점',
                items: ['진열대 타블렛', 'TV · 사이니지', 'POP · QR-code', '매장 화면 · 상품별 안내 화면'],
              },
              {
                t: 'SNS · 인플루언서 홍보와 매장 방문 연결',
                items: ['SNS에서 본 제품을 매장에서 찾도록 안내', '제품 랜딩과 매장 위치 연결', '특정 제품을 취급하는 매장 안내', '브랜드별 QR · 랜딩 콘텐츠 연결'],
              },
              {
                t: '공급자와 매장의 공동 운영',
                items: ['공급자가 제품 정보 · 홍보 콘텐츠 제공', '운영자가 매장 활용 자료로 정리', '매장이 고객 응대 · 상품 설명에 활용', '공급자가 오프라인 고객 반응 확인'],
              },
            ].map((b) => (
              <div key={b.t} className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="font-bold text-slate-900 mb-3">{b.t}</p>
                <Bullets items={b.items} />
                {b.note && <p className="mt-3 text-xs text-slate-500 leading-relaxed">{b.note}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. 매장 방문과 구매로 이어지는 흐름 ── */}
        <section>
          <SectionTitle eyebrow="고객 여정">매장 방문과 구매로 이어질 수 있는 흐름</SectionTitle>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-2xl">
            온라인 홍보와 오프라인 매장 방문을 연결하는 구조입니다. 구매를 보장하지는 않지만, 구매로 이어질 수 있는 접점을 만듭니다.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            {[
              'SNS · 인플루언서 · 브랜드 홍보',
              '제품 관심 형성',
              '취급 매장 위치 확인',
              '관광지 약국 · 화장품 매장 방문',
              'QR · 영상 · 타블렛 · POP로 제품 이해',
              '체험 · 상담 · 구매 · 재방문 연결',
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
            약국에서는 진단 · 치료가 아니라 고객 안내 · 상담 보조 수준의 제품 설명에 활용합니다.
          </p>
        </section>

        {/* ── 6. 주도 영역 vs 협력 영역 (2열) ── */}
        <section>
          <SectionTitle eyebrow="역할 구분">사업자가 주도할 영역과 공급자가 협력할 영역</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
              <p className="font-bold text-violet-700 mb-3">사업자가 주도할 수 있는 영역</p>
              <Bullets
                items={[
                  '관광지 매장 네트워크 구성',
                  '외국인 고객 대상 상품군 기획',
                  '매장별 다국어 콘텐츠 운영',
                  '타블렛 · 사이니지 · QR 구성',
                  '특정 브랜드와 협력한 거점 매장 운영',
                  '제품 랜딩과 매장 위치 안내 운영',
                ]}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="font-bold text-slate-700 mb-3">공급자와 협력할 영역</p>
              <Bullets
                items={[
                  '제품 정보 제공',
                  '홍보 이미지 · 영상 제공',
                  '다국어 설명 원천 제공',
                  '특가 · 프로모션 협의',
                  '매장 내 노출 지원',
                  '인플루언서 / SNS 홍보 연계',
                ]}
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            홍보비나 광고 수익을 확정하는 구조가 아니라, 협의를 통해 운영할 수 있는 영역입니다.
          </p>
        </section>

        {/* ── 7. 필요한 서비스는 추가 제작 가능 ── */}
        <section>
          <SectionTitle eyebrow="추가 제작">필요한 서비스는 추가 제작할 수 있습니다</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { t: '다국어 제품 안내 서비스', items: ['다국어 제품 설명', '다국어 사용법 안내', '다국어 영상 연결', 'QR · 타블렛 화면'] },
              { t: '매장 위치 안내 서비스', items: ['제품별 취급 매장 안내', '관광객용 매장 위치 정보', '브랜드 · 상품 랜딩에서 매장 연결', '지도 · 위치 기반 안내 연계'] },
              { t: '인디 브랜드 매장 홍보 서비스', items: ['특정 매장에 진열된 제품 안내', '인플루언서 · SNS 홍보와 매장 방문 연결', '브랜드별 매장 노출 콘텐츠', 'QR · 영상 · POP 연계'] },
            ].map((s) => (
              <div key={s.t} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="font-bold text-slate-900 mb-3">{s.t}</p>
                <Bullets items={s.items} />
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-bold text-slate-900">세금 환급 안내 보조 서비스</p>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">선택</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-2">
              세금 환급은 POS 또는 별도 환급 시스템과 연결되는 영역이므로, O4O에서는 필요 시 안내 콘텐츠나
              외부 흐름 연결 방식으로 검토할 수 있습니다. (O4O가 세금 환급 · POS 기능을 직접 제공하지는 않습니다.)
            </p>
            <Bullets items={['세금 환급 안내 콘텐츠', '외부 환급 절차 안내 링크', '매장 화면 안내', 'QR 안내']} />
          </div>

          <p className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 leading-relaxed">
            관광지 매장의 운영 방식에 따라 필요한 서비스는 <span className="font-semibold text-slate-800">별도 제작 협의가 가능</span>합니다.
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
                '공급자 홍보 콘텐츠 운영',
                '브랜드별 매장 노출',
                '특정 제품 거점 매장 운영',
                '다국어 콘텐츠 제작 · 운영',
              ]}
            />
            <Bullets
              items={[
                'QR · 타블렛 · 사이니지 화면 운영',
                '인디 브랜드와 매장 연결',
                '관광객 대상 상품군 구성',
                '매장 방문 유도 콘텐츠 운영',
              ]}
            />
          </div>
        </section>

        {/* ── 9. 복합 활용을 통한 사업 확장 ── */}
        <section>
          <SectionTitle eyebrow="운영 확장">복합 활용을 통한 관광지 매장 사업 확장</SectionTitle>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 space-y-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              관광지 매장 사업은 O4O를 통해 온라인 홍보와 오프라인 매장을 연결할 수 있습니다. 공급자는 제품과 콘텐츠를
              제공하고, 운영자는 매장별 안내 자료와 화면 콘텐츠를 구성하며, 매장은 고객에게 다국어 설명과 체험 접점을 제공합니다.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              필요한 경우 매장 위치 안내, 다국어 영상, 인디 브랜드 홍보, 세금 환급 안내 보조 같은 전용 서비스를 추가 제작할 수 있습니다.
            </p>
          </div>
        </section>

        {/* ── 10. 상담 안내 ── */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-center text-white">
            <h2 className="text-xl font-bold mb-2">관광지 매장 사업 상담하기</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              관광지 · 교통 요지 · 외국인 고객 비중 · 취급 상품 · 공급자와의 관계 · 다국어 콘텐츠 필요 여부에 따라
              적용 방식이 달라질 수 있습니다. 필요한 전용 서비스는 상담을 통해 검토할 수 있습니다.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              관광지 매장 사업 상담하기 →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GuideBusinessTouristStorePage;
