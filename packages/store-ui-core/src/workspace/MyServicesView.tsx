/**
 * MyServicesView — 이 매장이 이용 중인 서비스 목록 · 상태 · 진입 (최소 All view)
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 (§7)
 *
 *   출처   : GET /api/v1/work-scope/store-services (organization_service_enrollments 기반)
 *   표시   : enrollmentStatus=active AND workspaceAvailable=true → 진입 / 그 외 → 상태만 (진입 없음)
 *   진입   : 현재 서비스 → 내부 Link(My Store) · 다른 서비스 → 기존 /auth/handoff → 대상 서비스 My Store
 *   없음   : 새 membership 테이블 · 권한 판정 · 서비스별 분기(serviceKey === ...)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { STORE_ACCENT_CLASSES } from '../theme/storeAccent';
import type { StoreAccent } from '../theme/storeAccent';
import {
  selectMyServices,
  type StoreServiceMembership,
  type StoreServicesApi,
} from '../api/createStoreServicesApi';
import { getStoreWorkspacePathsForService } from './storeWorkspace';
import { useStoreServices } from './useStoreServices';

export interface MyServicesViewProps {
  api: StoreServicesApi;
  /** 현재 서비스의 canonical key (예: 'kpa-society') — 같은 서비스는 내부 Link 로 진입 */
  currentServiceKey: string;
  /** 현재 서비스 My Store 경로 (resolveStoreWorkspacePaths(config).myStore) */
  currentMyStorePath: string;
  /** 알고 있으면 넘긴다 — 복수 매장 사용자의 ambiguous 를 피한다. 몰라도 된다. */
  organizationId?: string | null;
  accent?: StoreAccent;
  title?: string;
}

const REASON_MESSAGES: Record<string, string> = {
  NO_ACCESSIBLE_STORE: '이 계정으로 운영 중인 매장이 없습니다.',
  MULTIPLE_ACCESSIBLE_STORES: '운영 중인 매장이 여러 개입니다. 각 서비스의 내 매장 화면에서 확인해 주세요.',
  NOT_STORE_MEMBER: '이 매장의 구성원이 아닙니다.',
};

function statusLabel(s: StoreServiceMembership): string {
  if (s.enrollmentStatus !== 'active') return '이용 중지';
  if (!s.workspaceAvailable) return '매장 화면 미제공';
  return '이용 중';
}

export function MyServicesView({
  api,
  currentServiceKey,
  currentMyStorePath,
  organizationId,
  accent = 'blue',
  title = '내 서비스',
}: MyServicesViewProps) {
  const tokens = STORE_ACCENT_CLASSES[accent];
  const { loading, error, resolution, reload } = useStoreServices(api, organizationId);
  const { available, unavailable } = selectMyServices(resolution);
  const [entering, setEntering] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);

  async function enterOther(serviceKey: string) {
    const target = getStoreWorkspacePathsForService(serviceKey);
    if (!target) return;
    setEntering(serviceKey);
    setEntryError(null);
    try {
      const url = await api.resolveServiceEntryUrl(serviceKey, target.myStore);
      window.location.assign(url);
    } catch {
      setEntryError('서비스로 이동하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setEntering(null);
    }
  }

  const unresolvedMessage =
    resolution && resolution.status !== 'resolved'
      ? REASON_MESSAGES[resolution.reason ?? ''] ?? '이용 중인 서비스를 확인하지 못했습니다.'
      : null;

  return (
    <section data-testid="my-services-view" className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 m-0">{title}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">이 매장이 가입한 서비스와 이용 상태입니다.</p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${tokens.outlineBtn} disabled:opacity-50`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {entryError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {entryError}
        </div>
      )}
      {unresolvedMessage && !loading && (
        <div className={`rounded-md border px-4 py-3 text-sm text-slate-700 ${tokens.noticeBox}`}>{unresolvedMessage}</div>
      )}

      {loading && !resolution && <p className="text-sm text-slate-500">불러오는 중...</p>}

      {resolution?.status === 'resolved' && available.length === 0 && unavailable.length === 0 && !loading && (
        <p className="text-sm text-slate-500">가입한 서비스가 없습니다.</p>
      )}

      {available.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 list-none p-0 m-0">
          {available.map((s) => {
            const isCurrent = s.serviceKey === currentServiceKey;
            const canEnter = isCurrent || Boolean(getStoreWorkspacePathsForService(s.serviceKey));
            return (
              <li key={s.serviceKey} className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 m-0">{s.serviceName}</p>
                    <p className="text-xs text-slate-500 mt-0.5 mb-0">{isCurrent ? '현재 서비스' : '다른 서비스'}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${tokens.badge}`}>{statusLabel(s)}</span>
                </div>
                {isCurrent ? (
                  <Link to={currentMyStorePath} className={`self-start rounded-md px-3 py-1.5 text-sm ${tokens.solidBtn}`}>
                    내 매장으로
                  </Link>
                ) : canEnter ? (
                  <button
                    type="button"
                    onClick={() => void enterOther(s.serviceKey)}
                    disabled={entering !== null}
                    className={`self-start rounded-md px-3 py-1.5 text-sm ${tokens.solidBtn} disabled:opacity-50`}
                  >
                    {entering === s.serviceKey ? '이동 중...' : `${s.serviceName} 내 매장으로`}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">진입 경로 준비 중</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {unavailable.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-2 mt-0">이용할 수 없는 서비스</h2>
          <ul className="grid gap-2 sm:grid-cols-2 list-none p-0 m-0">
            {unavailable.map((s) => (
              <li
                key={s.serviceKey}
                className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 flex items-center justify-between"
              >
                <span className="text-sm text-slate-600">{s.serviceName}</span>
                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500">{statusLabel(s)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
