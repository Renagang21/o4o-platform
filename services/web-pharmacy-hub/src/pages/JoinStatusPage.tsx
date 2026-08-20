/**
 * JoinStatusPage — Pharmacy-Hub 가입 신청 상태
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-B / §6-F
 *
 * 상태 축은 service_memberships.status 와 1:1 이다.
 *   none / pending / active / rejected / suspended / withdrawn
 * 승인 완료(active) 시에만 역할별 진입점을 노출한다.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MembershipStatusBadge } from '@o4o/account-ui';
import type { MembershipStatusConfig } from '@o4o/account-ui';
import { api } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { BRAND, ROLE_LABELS, ROLES, SERVICE_KEY } from '../config/service';

interface JoinStatus {
  status: string;
  roleType: string | null;
  rejectionReason?: string | null;
  appliedAt?: string | null;
  approvedAt?: string | null;
}

const STATUS_TITLE: Record<string, string> = {
  none: '가입 신청 내역이 없습니다',
  pending: '승인 대기 중입니다',
  active: '가입이 승인되었습니다',
  rejected: '가입 신청이 반려되었습니다',
  suspended: '이용이 정지된 계정입니다',
  withdrawn: '탈퇴 처리된 계정입니다',
};

const STATUS_MESSAGE: Record<string, string> = {
  none: `${BRAND.nameKo} 가입 신청을 진행해 주세요.`,
  pending: '서비스 운영자가 신청 내용을 검토하고 있습니다. 승인 후 역할별 화면을 이용할 수 있습니다.',
  active: '역할별 화면으로 이동할 수 있습니다.',
  rejected: '아래 반려 사유를 확인한 뒤 서비스 운영자에게 재검토를 요청해 주세요.',
  suspended: '서비스 운영자에게 문의해 주세요.',
  withdrawn: '서비스 운영자에게 문의해 주세요.',
};

/**
 * WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1 §9
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §10
 *
 * service_memberships.status enum 은 재설계하지 않는다. 상태 표현은 5 서비스 공통
 * `MembershipStatusBadge`(DEFAULT_MEMBERSHIP_STATUS_CONFIG) 를 쓰고, 이 화면에서만
 * 다른 표현(가입 신청 화면이므로 '미가입' 대신 '신청 전')만 override 로 남긴다.
 */
const STATUS_BADGE_OVERRIDES: Record<string, MembershipStatusConfig> = {
  none: { label: '신청 전', tone: 'slate' },
};

const ENTRY_PATH: Record<string, string> = {
  [ROLES.storeOwner]: '/store-owner',
  [ROLES.supplier]: '/supplier',
  [ROLES.operator]: '/operator',
};

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR') : '-');

export default function JoinStatusPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const justSubmitted = params.get('submitted') === '1';

  const [data, setData] = useState<JoinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/pharmacy-hub/join/status');
        if (alive) setData(res.data?.data ?? null);
      } catch {
        if (alive) setError('가입 상태를 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authLoading, isAuthenticated]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">{BRAND.name} 가입 상태</h1>

      {justSubmitted && (
        <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm">
          가입 신청이 접수되었습니다. 서비스 운영자 승인 후 이용할 수 있습니다.
        </div>
      )}

      {authLoading || loading ? (
        <p className="text-sm text-gray-500">확인 중…</p>
      ) : !isAuthenticated ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="mb-4 text-sm text-gray-600">
            가입 상태를 확인하려면 로그인해 주세요. 아직 신청 전이라면 가입 신청을 먼저 진행해 주세요.
          </p>
          <div className="flex gap-2">
            <Link to="/login" className="rounded bg-primary-600 px-3 py-2 text-sm text-white">
              로그인
            </Link>
            <Link to="/join" className="rounded border border-gray-300 px-3 py-2 text-sm">
              가입 신청
            </Link>
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">
              {STATUS_TITLE[data?.status ?? 'none'] ?? STATUS_TITLE.none}
            </h2>
            <MembershipStatusBadge
              status={data?.status ?? 'none'}
              overrides={STATUS_BADGE_OVERRIDES}
            />
          </div>
          <p className="mb-4 text-sm text-gray-600">
            {STATUS_MESSAGE[data?.status ?? 'none'] ?? STATUS_MESSAGE.none}
          </p>

          {data && data.status !== 'none' && (
            <dl className="mb-4 space-y-1 text-sm text-gray-700">
              <div className="flex gap-2">
                <dt className="w-24 text-gray-500">신청 역할</dt>
                <dd>
                  {data.roleType
                    ? ROLE_LABELS[`${SERVICE_KEY}:${data.roleType}`] ?? data.roleType
                    : '-'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-gray-500">신청 일시</dt>
                <dd>{fmt(data.appliedAt)}</dd>
              </div>
              {data.status === 'active' && (
                <div className="flex gap-2">
                  <dt className="w-24 text-gray-500">승인 일시</dt>
                  <dd>{fmt(data.approvedAt)}</dd>
                </div>
              )}
            </dl>
          )}

          {data?.status === 'rejected' && data.rejectionReason && (
            <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              반려 사유: {data.rejectionReason}
            </p>
          )}

          <div className="flex gap-2">
            {data?.status === 'active' && data.roleType && (
              <Link
                to={ENTRY_PATH[`${SERVICE_KEY}:${data.roleType}`] ?? '/'}
                className="rounded bg-primary-600 px-3 py-2 text-sm text-white"
              >
                내 화면으로 이동
              </Link>
            )}
            {(!data || data.status === 'none') && (
              <Link to="/join" className="rounded bg-primary-600 px-3 py-2 text-sm text-white">
                가입 신청
              </Link>
            )}
            <Link to="/" className="rounded border border-gray-300 px-3 py-2 text-sm">
              처음으로
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
