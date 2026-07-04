/**
 * DescriptionReviewDetailPage — SharedProductDescription 상세 + canonical 승격
 *
 * WO-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1
 *
 * 대표상품/ProductMaster/식별자/공식 설명 content/이미지 표시.
 * 운영자 단건 canonical 승격(setDescriptionCanonical) + 반려(deprecated).
 * ProductMaster/Identifier/Image/Representative 는 변경하지 않는다.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  getDescriptionReviewDetail,
  setDescriptionCanonical,
  setDescriptionStatus,
  DescriptionReviewDetail,
} from '@/api/o4o-product-db.api';

export default function DescriptionReviewDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DescriptionReviewDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getDescriptionReviewDetail(id);
      if (!d) setError('설명을 찾을 수 없습니다');
      setDetail(d);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '상세를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const makeCanonical = async () => {
    if (!detail || acting) return;
    setActing(true);
    setToast(null);
    try {
      await setDescriptionCanonical(detail.id);
      setToast({ kind: 'ok', msg: '대표(canonical) 설명으로 지정했습니다' });
      await load();
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.response?.data?.error || e?.message || 'canonical 지정 실패' });
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!detail || acting) return;
    setActing(true);
    setToast(null);
    try {
      await setDescriptionStatus(detail.id, 'deprecated');
      setToast({ kind: 'ok', msg: '반려 처리했습니다' });
      await load();
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.response?.data?.error || e?.message || '반려 실패' });
    } finally {
      setActing(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </button>

      {toast && (
        <div className={`rounded p-3 mb-4 text-sm ${toast.kind === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4">{error}</div>}

      {loading ? (
        <div className="text-gray-400 py-10 text-center">불러오는 중…</div>
      ) : detail ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌: 메타 */}
          <div className="space-y-4">
            {detail.thumbnailUrl ? (
              <img src={detail.thumbnailUrl} alt="" className="w-full max-w-xs rounded-lg border border-gray-200 object-cover" />
            ) : (
              <div className="w-full max-w-xs aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">이미지 없음</div>
            )}
            <Card title="대표상품">
              <Field label="대표상품명" value={detail.representativeName} />
              <Field label="MFDS코드(품목기준)" value={detail.mfdsCode} />
              {detail.reviewFlags && (
                <div className="flex gap-1 mt-2">
                  {(detail.reviewFlags as any).multiManufacturer && <Flag>다제조사</Flag>}
                  {(detail.reviewFlags as any).multiName && <Flag>다품명</Flag>}
                </div>
              )}
            </Card>
            <Card title="기본 상품(SKU)">
              <Field label="상품명" value={detail.masterName} />
              <Field label="공식명" value={detail.regulatoryName} />
              <Field label="제조사" value={detail.manufacturerName} />
              <Field label="규격" value={detail.specification} />
              <Field label="바코드" value={detail.barcode} />
            </Card>
            <Card title="식별자">
              {detail.identifiers?.length ? (
                <ul className="text-sm space-y-1">
                  {detail.identifiers.map((idf, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-gray-500">{idf.identifierType}{idf.isPrimary ? ' ★' : ''}</span>
                      <span className="text-gray-800">{idf.identifierValue}</span>
                    </li>
                  ))}
                </ul>
              ) : <span className="text-gray-400 text-sm">—</span>}
            </Card>
          </div>

          {/* 우: 설명 content + 액션 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-gray-400">출처: {detail.sourceType}</span>
              {detail.curatedAt && <span className="text-xs text-gray-400">승격: {detail.curatedAt.slice(0, 10)}</span>}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              e약은요 공식 소비자 설명 원문입니다. 매장용 최종 설명이 아니며, 법적 표현 검토 후 canonical 로 승격하세요.
            </div>

            <Card title="공식 설명 (e약은요)">
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: detail.content }}
              />
            </Card>

            <div className="flex gap-3">
              <button
                onClick={makeCanonical}
                disabled={acting || detail.status === 'canonical'}
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                {detail.status === 'canonical' ? '이미 대표' : '대표(canonical)로 지정'}
              </button>
              <button
                onClick={reject}
                disabled={acting || detail.status === 'deprecated'}
                className="flex items-center gap-1.5 border border-red-300 text-red-600 px-4 py-2 rounded text-sm disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" /> 반려
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 text-right ml-2">{value || '—'}</span>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    needs_review: { label: '검토 대기', cls: 'bg-amber-100 text-amber-700' },
    canonical: { label: '대표', cls: 'bg-green-100 text-green-700' },
    candidate: { label: '후보', cls: 'bg-gray-100 text-gray-600' },
    deprecated: { label: '반려', cls: 'bg-red-100 text-red-600' },
    hidden: { label: '숨김', cls: 'bg-gray-100 text-gray-500' },
  };
  const m = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${m.cls}`}>{m.label}</span>;
}
function Flag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border bg-amber-50 text-amber-600 border-amber-200"><AlertTriangle className="w-3 h-3" />{children}</span>;
}
