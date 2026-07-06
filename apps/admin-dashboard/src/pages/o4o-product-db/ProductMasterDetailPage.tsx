/**
 * ProductMasterDetailPage — 기본 상품 상세 (관리 콘솔형, read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-BASE-CONSOLE-V1
 * (기반: WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1)
 *
 * 상품 관리 콘솔의 중심 화면. 향후 write 기능이 붙을 자리를 섹션으로 마련하되,
 * 이번 WO 는 GET-only 이며 어떤 mutation 버튼도 두지 않는다.
 * 현재 상세 API(GET /neture/products/library/:id)에 없는 정보(추가 식별자/원천 연결/
 * 사용 상태/메모/이력)는 "후속 GET API 필요" placeholder 로 명확히 표시한다.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProductMaster, ProductMasterDetail } from '@/api/o4o-product-db.api';

export default function ProductMasterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<ProductMasterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProductMaster(id);
        if (alive) setRow(data);
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error || e?.message || '기본 상품을 불러오지 못했습니다');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </button>

      {loading ? (
        <div className="text-gray-400 py-10 text-center">불러오는 중…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4">{error}</div>
      ) : !row ? (
        <div className="text-gray-400 py-10 text-center">상품을 찾을 수 없습니다</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{row.name || '(이름 없음)'}</h2>
            {row.regulatoryType && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">{row.regulatoryType}</span>
            )}
            {row.isMfdsVerified && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">MFDS 검증</span>
            )}
          </div>

          {/* 기본 정보 */}
          <Section title="기본 정보">
            <Field label="상품명" value={row.name} />
            <Field label="공식명" value={row.regulatoryName} />
            <Field label="제조사" value={row.manufacturerName} />
            <Field label="브랜드" value={row.brandName || row.brand?.name} />
            <Field label="분류" value={row.category?.name} />
            <Field label="규격" value={row.specification} />
            <Field label="원산지" value={row.originCountry} />
            <Field label="태그" value={row.tags?.length ? row.tags.join(', ') : null} />
            <Field label="생성일" value={row.createdAt} />
          </Section>

          {/* 규제 정보 */}
          <Section title="규제 정보">
            <Field label="규제 구분" value={row.regulatoryType} />
            <Field label="MFDS 검증 여부" value={row.isMfdsVerified ? '검증됨' : '미검증'} />
          </Section>

          {/* 식별자 — 현재 상세 API 는 barcode 만 제공 */}
          <Section title="식별자">
            <Field label="바코드" value={row.barcode} />
            <FollowupNote>
              추가 식별자(MFDS_CODE / KOREA_DRUG_CODE / ATC_CODE / 보험코드 등)는 후속 GET API 필요
              (<code className="text-gray-500">GET /neture/products/library/:id/identifiers</code>)
            </FollowupNote>
          </Section>

          {/* 이미지 */}
          <PanelSection
            title={`이미지 (${row.images?.length ?? 0})`}
            badge={
              (row.images?.length ?? 0) > 0
                ? <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">있음</span>
                : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">없음</span>
            }
          >
            {row.images?.length ? (
              <div className="flex flex-wrap gap-3">
                {row.images.map((img) => (
                  <div key={img.id} className="relative">
                    <img src={img.imageUrl} alt="" className="w-28 h-28 object-cover rounded border border-gray-200" />
                    {img.isPrimary && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">primary</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                이미지 없음
                <div className="text-xs text-gray-400 mt-1">이미지 업로드/교체/보강은 후속 WO (이번 WO 는 상태 확인만).</div>
              </div>
            )}
          </PanelSection>

          {/* 설명 — WO-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1: 공식 소비자 설명 (매장용 AI 설명 아님) */}
          <PanelSection
            title="공식 소비자 설명"
            badge={row.canonicalDescription
              ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">canonical</span>
              : undefined}
          >
            {row.canonicalDescription ? (
              <>
                <div className="text-xs text-gray-400 mb-2">
                  출처: {row.canonicalDescription.sourceType === 'mfds_easy_drug' ? '식품의약품안전처 e약은요' : row.canonicalDescription.sourceType}
                  {row.canonicalDescription.curatedAt && ` · 승격 ${row.canonicalDescription.curatedAt.slice(0, 10)}`}
                  {' · 매장용 AI 설명이 아닌 공식 소비자 설명입니다'}
                </div>
                <div
                  className="prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: row.canonicalDescription.content }}
                />
              </>
            ) : (
              <div className="text-sm text-gray-400">
                공식 설명 없음
                <div className="text-xs text-gray-400 mt-1">draft / needs_review 설명 및 설명 생성·검수는 후속 WO.</div>
              </div>
            )}
          </PanelSection>

          {/* 후보/원천 연결 — 후속 GET API */}
          <PanelSection title="후보 / 원천 연결">
            <FollowupNote>
              이 상품을 만든 후보(ProductCandidate) 및 원천(source) 연결 정보는 후속 GET API 필요
              (<code className="text-gray-500">GET /neture/products/library/:id/source-links</code>)
            </FollowupNote>
          </PanelSection>

          {/* 사용 상태 — 후속 */}
          <PanelSection title="사용 상태">
            <FollowupNote>
              O4O 주문 가능 상품 / 매장 취급 상품 연결 상태는 후속 GET API 필요
              (<code className="text-gray-500">GET /neture/products/library/:id/usage-summary</code>)
            </FollowupNote>
          </PanelSection>

          {/* 관리 메모 — 후속 write */}
          <PanelSection title="관리 메모">
            <FollowupNote>관리 메모(write) 기능은 후속 WO 에서 제공됩니다. 이번 WO 는 GET-only.</FollowupNote>
          </PanelSection>

          {/* 작업 이력 — 후속 audit */}
          <PanelSection title="작업 이력">
            <FollowupNote>변경/승격/검수 audit log 는 후속 WO 에서 제공됩니다.</FollowupNote>
          </PanelSection>
        </div>
      )}
    </div>
  );
}

/** 라벨-값 dl 리스트 섹션 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">{title}</div>
      <dl className="divide-y divide-gray-100">{children}</dl>
    </div>
  );
}

/** 자유 콘텐츠(이미지/설명/placeholder) 패널 섹션 — 헤더에 선택적 badge */
function PanelSection({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex px-4 py-2 text-sm">
      <dt className="w-40 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900 break-all">{value ?? '—'}</dd>
    </div>
  );
}

/** 후속 기능/후속 API 자리 표시 (write 아님) */
function FollowupNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded px-3 py-2 bg-gray-50/50">
      {children}
    </div>
  );
}
