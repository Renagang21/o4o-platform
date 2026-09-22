/**
 * UnifiedStoreHandoffGate — 기존 서비스 매장 진입 → 통합 Store Workspace handoff
 * (WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-4)
 *
 *   enabled=false : children(기존 매장 화면) 그대로 — 프로덕션 기본.
 *   enabled=true  : `POST /auth/handoff { targetWorkspace: 'store', returnPath }` → targetUrl 로 이동.
 *                   handoff 실패(네트워크 · 매장 없음 등)는 기존 화면으로 안전 복귀한다(매장 경영자 업무 중단 0).
 *
 * 인증·매장 판정은 하지 않는다 — 서비스의 기존 가드(PharmacyGuard · StoreOwnerRoute · StoreOwnerShell) 안에
 * 두어 로그인·역할 판정을 그대로 통과한 뒤에만 발급된다. 서버가 organization 접근을 다시 검증한다.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { StoreServicesApi } from '../api/createStoreServicesApi';
import { mapLegacyStorePathToUnified, type UnifiedStoreServiceKey } from './unifiedStoreHandoff';

export interface UnifiedStoreHandoffGateProps {
  enabled: boolean;
  serviceKey: UnifiedStoreServiceKey;
  api: Pick<StoreServicesApi, 'resolveWorkspaceEntryUrl'>;
  children: ReactNode;
  /** 이동 중 표시 (기본: 짧은 안내 문구) */
  pending?: ReactNode;
}

export function UnifiedStoreHandoffGate({ enabled, serviceKey, api, children, pending }: UnifiedStoreHandoffGateProps) {
  const { pathname, search } = useLocation();
  const [state, setState] = useState<'idle' | 'redirecting' | 'fallback'>(enabled ? 'idle' : 'fallback');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState('idle');
    const returnPath = mapLegacyStorePathToUnified(serviceKey, pathname, search);
    api.resolveWorkspaceEntryUrl(returnPath)
      .then((url) => {
        if (cancelled) return;
        setState('redirecting');
        window.location.replace(url);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[UnifiedStoreHandoffGate] handoff 실패 — 기존 매장 화면으로 계속합니다.', err);
        setState('fallback');
      });
    return () => { cancelled = true; };
    // pathname/search 변경마다 재발급하지 않는다 — 최초 진입 1회 (이후는 이미 이동했거나 fallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, serviceKey]);

  if (!enabled || state === 'fallback') return <>{children}</>;
  return (
    <>{pending ?? (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-slate-500" data-testid="unified-store-handoff-pending">
        매장 업무공간으로 이동 중...
      </div>
    )}</>
  );
}
