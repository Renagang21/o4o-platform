/**
 * ProductDescriptionCurationModal — O4O 공용 상품설명 후보 정비
 *
 * WO-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1
 *
 * ProductMaster 1개 기준으로 shared_product_descriptions 후보를 조회/정비한다.
 * - 기존 설명에서 후보 가져오기(seed)
 * - 후보를 canonical 대표 설명으로 지정 (전용 endpoint, 1개/master)
 * - 상태 변경 (candidate / needs_review / hidden / deprecated)
 * - 삭제(soft)
 *
 * 안전: content 는 HTML 가능 → preview 는 태그 제거 plain text (raw HTML 실행 금지).
 * 매장별 override/selection 없음 · bulk seed 없음 · AI batch 없음.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  sharedProductDescriptionApi,
  type SharedProductDescription,
  type SharedDescriptionStatus,
  type SharedDescriptionAssignableStatus,
} from '../../lib/api/sharedProductDescription';

interface Props {
  master: { id: string; name: string } | null;
  onClose: () => void;
}

const STATUS_LABEL: Record<SharedDescriptionStatus, string> = {
  canonical: '대표',
  candidate: '후보',
  needs_review: '검토필요',
  hidden: '숨김',
  deprecated: '폐기',
};

const STATUS_BADGE: Record<SharedDescriptionStatus, string> = {
  canonical: 'bg-emerald-100 text-emerald-700',
  candidate: 'bg-slate-100 text-slate-600',
  needs_review: 'bg-amber-100 text-amber-700',
  hidden: 'bg-slate-100 text-slate-400',
  deprecated: 'bg-red-50 text-red-400',
};

const SOURCE_LABEL: Record<string, string> = {
  supplier: '공급자',
  operator: '운영자',
  ai: 'AI',
  store_contribution: '매장기여',
  drug_extension: '의약품정보',
  migration: '이관',
  manual: '수동',
};

const ASSIGNABLE: SharedDescriptionAssignableStatus[] = [
  'candidate',
  'needs_review',
  'hidden',
  'deprecated',
];

/** HTML 태그 제거 plain text preview (raw HTML 실행 금지) */
function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ProductDescriptionCurationModal({ master, onClose }: Props) {
  const [items, setItems] = useState<SharedProductDescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!master) return;
    setLoading(true);
    try {
      const data = await sharedProductDescriptionApi.listByMaster(master.id);
      setItems(data);
    } catch {
      setNotice('후보 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [master]);

  useEffect(() => {
    if (master) load();
  }, [master, load]);

  if (!master) return null;

  const handleSeed = async () => {
    setSeeding(true);
    setNotice(null);
    try {
      const r = await sharedProductDescriptionApi.seed(master.id);
      setNotice(`가져오기 완료 — 생성 ${r.created} / 건너뜀 ${r.skipped}`);
      await load();
    } catch {
      setNotice('가져오기 실패');
    } finally {
      setSeeding(false);
    }
  };

  const handleCanonical = async (item: SharedProductDescription) => {
    if (item.status === 'canonical') return;
    if (!window.confirm('이 후보를 대표 상품설명으로 지정하면 상품 상세에 노출됩니다. 진행할까요?')) return;
    setBusyId(item.id);
    try {
      await sharedProductDescriptionApi.setCanonical(item.id);
      setNotice('대표 설명으로 지정했습니다.');
      await load();
    } catch {
      setNotice('대표 지정 실패');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatus = async (item: SharedProductDescription, status: SharedDescriptionAssignableStatus) => {
    setBusyId(item.id);
    try {
      await sharedProductDescriptionApi.setStatus(item.id, status);
      await load();
    } catch {
      setNotice('상태 변경 실패');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: SharedProductDescription) => {
    if (!window.confirm('이 후보를 삭제(숨김)할까요?')) return;
    setBusyId(item.id);
    try {
      await sharedProductDescriptionApi.remove(item.id);
      await load();
    } catch {
      setNotice('삭제 실패');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">상품설명 정비</h2>
            <p className="text-sm text-slate-500">{master.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
            >
              {seeding ? '가져오는 중…' : '기존 설명에서 후보 가져오기'}
            </button>
            <button onClick={onClose} className="px-3 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
              닫기
            </button>
          </div>
        </div>

        {notice && <div className="px-6 py-2 text-sm text-slate-600 bg-slate-50 border-b">{notice}</div>}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              후보가 없습니다. "기존 설명에서 후보 가져오기"로 공급자/AI/의약품 정보 후보를 생성하세요.
            </p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span className="text-xs text-slate-500">출처: {SOURCE_LABEL[item.sourceType] || item.sourceType}</span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>

                {item.summary && <p className="text-sm text-slate-600 mb-1">{toPlainText(item.summary)}</p>}
                <p className="text-sm text-slate-500 line-clamp-3">{toPlainText(item.content)}</p>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={() => handleCanonical(item)}
                    disabled={busyId === item.id || item.status === 'canonical'}
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    대표로 지정
                  </button>
                  <select
                    value=""
                    disabled={busyId === item.id}
                    onChange={(e) => {
                      const v = e.target.value as SharedDescriptionAssignableStatus;
                      if (v) handleStatus(item, v);
                    }}
                    className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600"
                  >
                    <option value="">상태 변경…</option>
                    {ASSIGNABLE.filter((s) => s !== item.status).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}(으)로
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
