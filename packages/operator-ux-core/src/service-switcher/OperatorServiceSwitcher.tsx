/**
 * OperatorServiceSwitcher — 다중 서비스 운영자의 서비스 전환 바 (최소 구현)
 *
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 (2026-09-16)
 *
 *   출처 : GET /api/v1/work-scope/operator-services (createOperatorServicesApi) — 유일한 읽기 출처
 *   표시 : 운영 가능 서비스가 2개 이상일 때만 렌더. 1개 이하면 아무것도 그리지 않는다 (현재 서비스 = 단독 진입).
 *   진입 : 현재 서비스 → 내부 Link(/operator) · 다른 서비스 → 기존 POST /auth/handoff → 대상 /operator
 *   없음 : 새 membership 테이블 · 권한 판정 · 서비스별 분기(serviceKey === ...) · 프런트 하드코딩 목록
 *
 * 서비스 wrapper 가 OperatorAreaShell 의 `header` 슬롯에 GlobalHeader 아래로 합성한다 —
 * Shell · DomainIASidebar 는 수정하지 않는다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import {
  defaultOperatorEntryPath,
  selectOperatorServices,
  type OperatorServiceMembership,
  type OperatorServicesApi,
} from './createOperatorServicesApi';

export interface OperatorServiceSwitcherProps {
  api: OperatorServicesApi;
  /** 현재 서비스의 canonical key (예: 'kpa-society') */
  currentServiceKey: string;
  /** 현재 서비스 운영자 홈 경로 (기본 '/operator') */
  currentOperatorPath?: string;
  /** 대상 서비스의 운영자 진입 경로. null 이면 링크 없이 이름만 표시 (기본: standard/special → '/operator') */
  entryPathFor?: (s: OperatorServiceMembership) => string | null;
  /** 라벨 (기본 '운영 중인 서비스') */
  label?: string;
}

const PILL = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors';

export function OperatorServiceSwitcher({
  api,
  currentServiceKey,
  currentOperatorPath = '/operator',
  entryPathFor = defaultOperatorEntryPath,
  label = '운영 중인 서비스',
}: OperatorServiceSwitcherProps) {
  const [services, setServices] = useState<OperatorServiceMembership[] | null>(null);
  const [entering, setEntering] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .fetchOperatorServices()
      .then((list) => {
        if (!cancelled) setServices(list);
      })
      .catch(() => {
        // 조회 실패 = 전환 바를 숨긴다 (권한이나 목록을 추측해 그리지 않는다)
        if (!cancelled) setServices(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const { available } = selectOperatorServices(services);
  // 운영 가능 서비스가 1개 이하면 전환할 대상이 없다 — 렌더하지 않는다.
  if (available.length < 2) return null;

  async function enterOther(s: OperatorServiceMembership, path: string) {
    setEntering(s.serviceKey);
    setEntryError(null);
    try {
      const url = await api.resolveServiceEntryUrl(s.serviceKey, path);
      window.location.assign(url);
    } catch {
      setEntryError('서비스로 이동하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setEntering(null);
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white" data-testid="operator-service-switcher">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-gray-500 mr-1">
          <ArrowRightLeft size={14} aria-hidden />
          {label}
        </span>
        {available.map((s) => {
          const isCurrent = s.serviceKey === currentServiceKey;
          if (isCurrent) {
            return (
              <Link
                key={s.serviceKey}
                to={currentOperatorPath}
                aria-current="page"
                className={`${PILL} bg-blue-50 text-blue-700 border-blue-200`}
              >
                {s.serviceName}
              </Link>
            );
          }
          const path = entryPathFor(s);
          if (!path) {
            return (
              <span
                key={s.serviceKey}
                className={`${PILL} bg-gray-50 text-gray-400 border-gray-200`}
                title="이 서비스의 운영자 화면은 해당 서비스에서 직접 진입합니다"
              >
                {s.serviceName}
              </span>
            );
          }
          const busy = entering === s.serviceKey;
          return (
            <button
              key={s.serviceKey}
              type="button"
              disabled={busy}
              onClick={() => enterOther(s, path)}
              className={`${PILL} bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-60`}
            >
              {busy && <Loader2 size={12} className="animate-spin" aria-hidden />}
              {s.serviceName}
            </button>
          );
        })}
        {entryError && <span className="text-xs text-red-600 ml-2">{entryError}</span>}
      </div>
    </div>
  );
}
