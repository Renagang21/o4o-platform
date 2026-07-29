/**
 * Supplier Trial Edit Page
 *
 * WO-MARKET-TRIAL-EDIT-FLOW-V1
 * Wrapper that fetches existing DRAFT trial data and passes it to CreatePage in edit mode.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTrial } from '../../api/trial';
import type { Trial } from '../../api/trial';
import SupplierTrialCreatePage from './SupplierTrialCreatePage';

export default function SupplierTrialEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 조회 실패는 '새 펀딩'이 아니다 — 빈 폼으로 떨어뜨리지 않고 오류 표시 후 재시도.
  // 비초안(non-draft) 확정 상태는 재시도로 해결되지 않으므로 retry 미노출.
  const [canRetry, setCanRetry] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setCanRetry(false);
    getTrial(id)
      .then((t) => {
        if (t.status !== 'draft') {
          setError('초안 상태의 유통참여형 펀딩만 수정할 수 있습니다.');
          return;
        }
        setTrial(t);
      })
      .catch(() => {
        setError('유통참여형 펀딩을 불러오지 못했습니다.');
        setCanRetry(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (error || !trial) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600 mb-4">{error || '알 수 없는 오류'}</p>
        <div className="flex gap-3">
          {canRetry && (
            <button
              onClick={load}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              다시 시도
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <SupplierTrialCreatePage mode="edit" trialId={id} initialData={trial} />;
}
