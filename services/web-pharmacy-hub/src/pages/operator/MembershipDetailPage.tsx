/**
 * MembershipDetailPage — Pharmacy-Hub 운영자 회원 승인 콘솔 (상세)
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-D
 *
 * 신청자 / 신청 역할 / 신청 일시 / 현재 상태 / 최소 프로필 을 확인하고
 * 승인 · 반려(사유 필수) 를 처리한다. 그 외 회원 조작(삭제·역할 직접 부여)은 제공하지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { ROLE_LABELS, SERVICE_KEY } from '../../config/service';

interface MembershipDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: string;
  roleType: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
  updatedAt: string | null;
  profile: {
    businessName: string | null;
    contactName: string | null;
    managerPhone: string | null;
    businessNumber: string | null;
    businessAddress: string | null;
  };
}

const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  active: '승인 완료',
  rejected: '반려',
  suspended: '정지',
  withdrawn: '탈퇴',
};

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR') : '-');

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-3 border-b border-gray-100 py-2 text-sm last:border-0">
      <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-800">{value || '-'}</dd>
    </div>
  );
}

export default function MembershipDetailPage() {
  const { membershipId } = useParams<{ membershipId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<MembershipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!membershipId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/pharmacy-hub/operator/memberships/${membershipId}`);
      setData(res.data?.data ?? null);
    } catch {
      setError('가입 신청 상세를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [membershipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async () => {
    if (!membershipId) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/pharmacy-hub/operator/memberships/${membershipId}/approve`);
      navigate('/operator/memberships');
    } catch {
      setError('가입 승인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!membershipId) return;
    if (!reason.trim()) {
      setError('반려 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/pharmacy-hub/operator/memberships/${membershipId}/reject`, {
        reason: reason.trim(),
      });
      navigate('/operator/memberships');
    } catch {
      setError('가입 반려에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">불러오는 중…</div>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="mb-4 text-sm text-red-600">{error ?? '가입 신청을 찾을 수 없습니다.'}</p>
        <Link to="/operator/memberships" className="text-sm text-primary-600 underline">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">가입 신청 상세</h1>

      <dl className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-2">
        <Row label="신청자" value={data.name} />
        <Row label="이메일" value={data.email} />
        <Row label="연락처" value={data.phone} />
        <Row
          label="신청 역할"
          value={data.roleType ? ROLE_LABELS[`${SERVICE_KEY}:${data.roleType}`] ?? data.roleType : null}
        />
        <Row label="약국/회사명" value={data.profile?.businessName} />
        <Row label="담당자" value={data.profile?.contactName} />
        <Row label="신청 일시" value={fmt(data.appliedAt)} />
        <Row label="현재 상태" value={STATUS_LABEL[data.status] ?? data.status} />
        {data.status === 'active' && <Row label="승인 일시" value={fmt(data.approvedAt)} />}
        {data.status === 'rejected' && <Row label="반려 사유" value={data.rejectionReason} />}
        {data.status === 'rejected' && <Row label="처리 일시" value={fmt(data.updatedAt)} />}
      </dl>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {data.status === 'pending' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">처리</h2>
          <label className="mb-3 block text-sm">
            반려 사유 (반려 시 필수)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void approve()}
              className="rounded bg-primary-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              승인
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void reject()}
              className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              반려
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">이미 처리된 신청입니다.</p>
      )}

      <p className="mt-6 text-sm">
        <Link to="/operator/memberships" className="text-gray-500 underline">
          목록으로
        </Link>
      </p>
    </div>
  );
}
