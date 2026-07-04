/**
 * ProductMasterDetailPage — 기본 상품 상세 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * 상품 기본 정보 + 규제 구분 + 이미지 목록. 설명/콘텐츠 생성 버튼 없음.
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{row.name || '(이름 없음)'}</h2>
            {row.isMfdsVerified && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">MFDS 검증</span>
            )}
          </div>

          <Section title="상품 기본 정보">
            <Field label="상품명" value={row.name} />
            <Field label="공식명" value={row.regulatoryName} />
            <Field label="규제 구분" value={row.regulatoryType} />
            <Field label="제조사" value={row.manufacturerName} />
            <Field label="브랜드" value={row.brandName || row.brand?.name} />
            <Field label="분류" value={row.category?.name} />
            <Field label="규격" value={row.specification} />
            <Field label="원산지" value={row.originCountry} />
            <Field label="바코드" value={row.barcode} />
            <Field label="태그" value={row.tags?.length ? row.tags.join(', ') : null} />
            <Field label="생성일" value={row.createdAt} />
          </Section>

          {/* WO-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1: 공식 소비자 설명 (매장용 AI 설명 아님) */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">공식 소비자 설명</span>
              {row.canonicalDescription && (
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">canonical</span>
              )}
            </div>
            <div className="p-4">
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
                <div className="text-sm text-gray-400">공식 설명 없음</div>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
              이미지 ({row.images?.length ?? 0})
            </div>
            <div className="p-4">
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
                <div className="text-sm text-gray-400">이미지 없음</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">{title}</div>
      <dl className="divide-y divide-gray-100">{children}</dl>
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
