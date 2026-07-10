/**
 * ProductCandidateDetailPage — 후보 상세 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * candidate 필드 + 매칭 결과 + rawPayload 원문(접기/펼치기).
 * "승격/반려/수정" 등 mutation 버튼 금지.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProductCandidate, ProductCandidateRow } from '@/api/o4o-product-db.api';
// WO-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1
import { matchStatusBusinessLabel } from './candidate-status.util';

export default function ProductCandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<ProductCandidateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProductCandidate(id);
        if (alive) setRow(data);
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error || e?.message || '후보를 불러오지 못했습니다');
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
        <div className="text-gray-400 py-10 text-center">후보를 찾을 수 없습니다</div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">{row.candidateName || '(이름 없음)'}</h2>

          <Section title="후보 정보">
            <Field label="상품명" value={row.candidateName} />
            <Field label="브랜드" value={row.candidateBrand} />
            <Field label="제조/업체" value={row.candidateManufacturer} />
            <Field label="분류" value={row.candidateCategory} />
            <Field label="규격" value={row.candidateSpec} />
            <Field label="단위" value={row.candidateUnit} />
            <Field label="가격" value={row.candidatePrice} />
          </Section>

          <Section title="출처 / 식별자">
            <Field label="source type" value={row.sourceType} />
            <Field label="source label" value={row.sourceLabel} />
            <Field label="serviceKey" value={row.serviceKey} />
            <Field label="식별자 유형" value={row.identifierType} />
            <Field label="식별자 값" value={row.identifierValue} />
          </Section>

          <Section title="매칭 결과">
            <Field label="후보 상태" value={row.candidateStatus} />
            {/* 종료 후보는 매칭 표시 숨김(—), 등록 전 후보는 업무 의미 문구 */}
            <Field label="기본상품 매칭" value={matchStatusBusinessLabel(row.candidateStatus, row.matchStatus) ?? '—'} />
            <Field label="매칭 Master ID" value={row.matchedProductMasterId} />
            <Field label="신뢰도" value={row.confidenceScore} />
            <Field label="검토 노트" value={row.reviewNote} />
            <Field label="생성일" value={row.createdAt} />
          </Section>

          <div>
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="text-sm font-medium text-admin-blue hover:underline"
            >
              rawPayload 원문 {showRaw ? '접기 ▲' : '펼치기 ▼'}
            </button>
            {showRaw && (
              <pre className="mt-2 bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
                {row.rawPayload ? JSON.stringify(row.rawPayload, null, 2) : '(없음)'}
              </pre>
            )}
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
