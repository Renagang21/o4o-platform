/**
 * /__debug__/pharmacy-gate — 약국 게이트 진단 페이지
 *
 * CLAUDE.md Section 14 표준 진단 인프라
 *
 * 무한 루프를 유발하지 않고 약국 관련 상태를 수동으로 진단:
 * 1. Auth 상태 (user, roles, pharmacistRole)
 * 2. PharmacyGuard 판정 결과
 * 3. PharmacyPage 분기 결과
 * 4. /pharmacy-requests/my API 수동 호출
 * 5. 기존 /organization-join-requests/my (레거시) 비교
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
  : '/api/v1/kpa';

interface ApiResult {
  url: string;
  status: number | null;
  ok: boolean;
  body: unknown;
  error: string | null;
  durationMs: number;
}

const NON_PHARMACIST_ROLES = ['admin', 'super_admin', 'district_admin', 'branch_admin', 'operator'];

export function PharmacyGateDebugPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [pharmacyResult, setPharmacyResult] = useState<ApiResult | null>(null);
  const [legacyResult, setLegacyResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  const callApi = useCallback(async (path: string): Promise<ApiResult> => {
    const url = `${API_BASE_URL}${path}`;
    const token = getAccessToken();
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const body = await res.json().catch(() => null);
      return {
        url,
        status: res.status,
        ok: res.ok,
        body,
        error: null,
        durationMs: Math.round(performance.now() - start),
      };
    } catch (err: any) {
      return {
        url,
        status: null,
        ok: false,
        body: null,
        error: err?.message || String(err),
        durationMs: Math.round(performance.now() - start),
      };
    }
  }, []);

  const handleFetchPharmacy = useCallback(async () => {
    setLoading(true);
    const result = await callApi('/pharmacy-requests/my');
    setPharmacyResult(result);
    setLoading(false);
  }, [callApi]);

  const handleFetchLegacy = useCallback(async () => {
    setLoading(true);
    const result = await callApi('/organization-join-requests/my');
    setLegacyResult(result);
    setLoading(false);
  }, [callApi]);

  const handleFetchBoth = useCallback(async () => {
    setLoading(true);
    const [p, l] = await Promise.all([
      callApi('/pharmacy-requests/my'),
      callApi('/organization-join-requests/my'),
    ]);
    setPharmacyResult(p);
    setLegacyResult(l);
    setLoading(false);
  }, [callApi]);

  // Compute gate decisions
  const isAdminOrOperator = user?.roles?.some((r: string) => NON_PHARMACIST_ROLES.includes(r)) ?? false;
  const isPharmacyOwner = !!user && !isAdminOrOperator && user.pharmacistRole === 'pharmacy_owner';
  const needsFunctionSelection = !!user && !isAdminOrOperator && !user.pharmacistRole;

  // PharmacyGuard decision
  let guardDecision = 'UNKNOWN';
  if (isLoading) guardDecision = 'LOADING';
  else if (!isAuthenticated || !user) guardDecision = 'REDIRECT → /login';
  else if (isAdminOrOperator) guardDecision = 'REDIRECT → /operator';
  else if (user.pharmacistRole !== 'pharmacy_owner') guardDecision = 'REDIRECT → /dashboard';
  else guardDecision = 'PASS (pharmacy_owner)';

  // PharmacyPage decision
  let pageDecision = 'UNKNOWN';
  if (!user) pageDecision = '1. 미로그인 화면';
  else if (isAdminOrOperator) pageDecision = '2. 관리자 접근 불가';
  else if (needsFunctionSelection) pageDecision = '3. 직능 선택 모달';
  else if (!isPharmacyOwner && user.pharmacistRole !== 'pharmacy_owner') pageDecision = '4. 비개설자 안내';
  else if (isPharmacyOwner) pageDecision = '5. pharmacy_owner → API 호출하여 승인 상태 확인';

  // Derive approval status from API result
  let approvalDecision = '(API 미호출)';
  if (pharmacyResult?.ok && pharmacyResult?.body) {
    const data = (pharmacyResult.body as any)?.data;
    const items = data?.items || [];
    const approved = items.find((r: any) => r.status === 'approved');
    if (approved) approvalDecision = '6. approved → /pharmacy/dashboard';
    else if (items.some((r: any) => r.status === 'pending')) approvalDecision = '7. pending → 대기 안내';
    else approvalDecision = '9. 미신청 → /pharmacy/approval';
  } else if (pharmacyResult?.error || (pharmacyResult && !pharmacyResult.ok)) {
    approvalDecision = `8. API 에러 (${pharmacyResult.status})`;
  }

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', padding: '0 20px', fontFamily: 'monospace', fontSize: 13 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>/__debug__/pharmacy-gate</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        약국 게이트 진단 — 수동 호출만 (자동 API 호출 없음, 무한 루프 방지)
      </p>

      {/* Section 1: Auth State */}
      <Section title="1. Auth State">
        <JsonBlock data={{
          isLoading,
          isAuthenticated,
          userId: user?.id || null,
          name: user?.name || null,
          roles: user?.roles || [],
          pharmacistRole: user?.pharmacistRole || null,
          pharmacistFunction: (user as any)?.pharmacistFunction || null,
          token: getAccessToken() ? `${getAccessToken()!.substring(0, 20)}...` : null,
        }} />
      </Section>

      {/* Section 2: Gate Decisions */}
      <Section title="2. Gate Decisions (computed, no API)">
        <JsonBlock data={{
          isAdminOrOperator,
          isPharmacyOwner,
          needsFunctionSelection,
          pharmacyGuard: guardDecision,
          pharmacyPage: pageDecision,
        }} />
      </Section>

      {/* Section 3: Manual API Calls */}
      <Section title="3. API Calls (수동)">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button onClick={handleFetchPharmacy} disabled={loading}>
            /pharmacy-requests/my
          </Button>
          <Button onClick={handleFetchLegacy} disabled={loading}>
            /organization-join-requests/my (legacy)
          </Button>
          <Button onClick={handleFetchBoth} disabled={loading}>
            둘 다 호출
          </Button>
        </div>

        {pharmacyResult && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '8px 0 4px', fontSize: 13 }}>
              /pharmacy-requests/my — {pharmacyResult.status} ({pharmacyResult.durationMs}ms)
            </h4>
            <JsonBlock data={pharmacyResult.body} />
          </div>
        )}

        {legacyResult && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '8px 0 4px', fontSize: 13 }}>
              /organization-join-requests/my (legacy) — {legacyResult.status} ({legacyResult.durationMs}ms)
            </h4>
            <JsonBlock data={legacyResult.body} />
          </div>
        )}
      </Section>

      {/* Section 4: Approval Decision */}
      <Section title="4. Approval Decision (API 결과 기반)">
        <JsonBlock data={{
          approvalDecision,
          pharmacyApiCalled: !!pharmacyResult,
          pharmacyApiStatus: pharmacyResult?.status ?? null,
        }} />
      </Section>

      {/* Section 5: Route Map */}
      <Section title="5. Route Map (참고)">
        <pre style={{ background: '#f1f5f9', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
{`/pharmacy          → PharmacyPage (자체 게이트, PharmacyGuard 없음)
/pharmacy/hub      → PharmacyGuard > PharmacyHubPage
/pharmacy/dashboard → PharmacyGuard > PharmacyDashboardPage
/pharmacy/approval  → PharmacyApprovalGatePage (자체 인증 체크)
/pharmacy/store/*   → PharmacyGuard > Store관리`}
        </pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#1e293b' }}>{title}</h3>
      {children}
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre style={{
      background: '#0f172a',
      color: '#e2e8f0',
      padding: 12,
      borderRadius: 6,
      overflow: 'auto',
      maxHeight: 400,
      fontSize: 12,
      lineHeight: 1.5,
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Button({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 600,
        background: disabled ? '#94a3b8' : '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
