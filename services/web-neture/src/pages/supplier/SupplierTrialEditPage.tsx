/**
 * Supplier Trial Edit Page
 *
 * WO-MARKET-TRIAL-EDIT-FLOW-V1
 * Wrapper that fetches existing DRAFT trial data and passes it to CreatePage in edit mode.
 */

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!id) return;
    getTrial(id)
      .then((t) => {
        if (t.status !== 'draft') {
          setError('초안 상태의 Trial만 수정할 수 있습니다.');
          return;
        }
        setTrial(t);
      })
      .catch(() => setError('Trial을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

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
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ← 돌아가기
        </button>
      </div>
    );
  }

  return <SupplierTrialCreatePage mode="edit" trialId={id} initialData={trial} />;
}
