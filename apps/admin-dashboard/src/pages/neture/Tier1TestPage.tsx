/**
 * Neture Tier1 JSON Test Center
 *
 * WO-NETURE-TIER1-PUBLIC-JSON-TEST-CENTER-V1
 *
 * 로그인 없이 독립 실행. 페이지 내 자체 로그인 or Bearer 토큰 직접 입력.
 * raw fetch 사용 (authClient 의존 없음).
 *
 * 접근: /__debug__/neture-tier1  (공개 라우트)
 */

import React, { useState, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// API base
// ─────────────────────────────────────────────────────────────
const rawApiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
const API_BASE = rawApiUrl.replace(/\/api\/?$/, '');

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type StepStatus = 'idle' | 'running' | 'pass' | 'fail';

interface Assertion {
  label: string;
  pass: boolean;
  actual?: unknown;
}

interface StepResult {
  status: StepStatus;
  request?: { method: string; url: string; body?: unknown };
  response?: unknown;
  error?: string;
  duration?: number;
  assertions?: Assertion[];
}

type StepKey = 'step1' | 'step2' | 'step3' | 'step4' | 'step5';
type TestState = Record<StepKey, StepResult>;

const INITIAL: TestState = {
  step1: { status: 'idle' },
  step2: { status: 'idle' },
  step3: { status: 'idle' },
  step4: { status: 'idle' },
  step5: { status: 'idle' },
};

// ─────────────────────────────────────────────────────────────
// Raw fetch helper
// ─────────────────────────────────────────────────────────────
async function apiFetch(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown; duration: number }> {
  const t0 = Date.now();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data, duration: Date.now() - t0 };
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
const Badge: React.FC<{ status: StepStatus }> = ({ status }) => {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    idle:    { label: '대기',    cls: 'bg-gray-100 text-gray-500' },
    running: { label: '실행 중', cls: 'bg-blue-100 text-blue-700 animate-pulse' },
    pass:    { label: 'PASS',   cls: 'bg-green-100 text-green-700 font-bold' },
    fail:    { label: 'FAIL',   cls: 'bg-red-100 text-red-700 font-bold' },
  };
  const { label, cls } = map[status];
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>;
};

const Json: React.FC<{ value: unknown }> = ({ value }) => (
  <pre className="bg-gray-950 text-green-300 text-xs rounded p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-56 mt-2">
    {JSON.stringify(value, null, 2)}
  </pre>
);

const AssertList: React.FC<{ items?: Assertion[] }> = ({ items }) => {
  if (!items?.length) return null;
  return (
    <ul className="mt-2 space-y-0.5">
      {items.map((a, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs">
          <span className={a.pass ? 'text-green-600 shrink-0' : 'text-red-600 shrink-0'}>
            {a.pass ? '✓' : '✗'}
          </span>
          <span className={a.pass ? 'text-gray-700' : 'text-red-700'}>
            {a.label}
            {a.actual !== undefined && (
              <span className="ml-1 text-gray-400">(실제: {JSON.stringify(a.actual)})</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};

const StepCard: React.FC<{
  n: number;
  title: string;
  desc: string;
  result: StepResult;
  onRun?: () => void;
  disabled?: boolean;
}> = ({ n, title, desc, result, onRun, disabled }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
            {n}
          </span>
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-8">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge status={result.status} />
        {onRun && (
          <button
            onClick={onRun}
            disabled={disabled || result.status === 'running'}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-40"
          >
            단독 실행
          </button>
        )}
      </div>
    </div>

    {result.duration !== undefined && (
      <p className="text-xs text-gray-400 ml-8 mt-1">{result.duration}ms</p>
    )}

    {result.assertions && (
      <div className="ml-8">
        <AssertList items={result.assertions} />
      </div>
    )}

    {result.error && (
      <div className="ml-8 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-mono break-all">
        {result.error}
      </div>
    )}

    {result.response !== undefined && (
      <div className="ml-8">
        <Json value={result.response} />
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
const Tier1TestPage: React.FC = () => {
  // Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [token, setToken] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [loginMsg, setLoginMsg] = useState('');

  // Test
  const [state, setState] = useState<TestState>(INITIAL);
  const [isRunning, setIsRunning] = useState(false);

  // IDs propagated from Step 1
  const productIdRef = useRef('');
  const supplierIdRef = useRef('');
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');

  // Manual overrides
  const [manualProductId, setManualProductId] = useState('');
  const [manualSupplierId, setManualSupplierId] = useState('');
  const [productName, setProductName] = useState('');

  // ── Login ──────────────────────────────────────────────────
  const doLogin = useCallback(async () => {
    if (manualToken.trim()) {
      setToken(manualToken.trim());
      setLoginStatus('ok');
      setLoginMsg('토큰 직접 사용');
      return;
    }

    if (!email || !password) {
      setLoginStatus('fail');
      setLoginMsg('이메일 + 비밀번호를 입력하세요.');
      return;
    }

    setLoginStatus('idle');
    setLoginMsg('로그인 중...');

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoginStatus('fail');
        setLoginMsg(`로그인 실패 (${res.status}): ${data?.error?.message || data?.message || '인증 오류'}`);
        return;
      }

      // Extract token from response or cookie
      const accessToken =
        data?.data?.accessToken ||
        data?.data?.token ||
        data?.accessToken ||
        data?.token ||
        '';

      if (accessToken) {
        setToken(accessToken);
        setLoginStatus('ok');
        setLoginMsg(`로그인 성공 (${data?.data?.user?.email || email})`);
      } else {
        // Cookie-based: token stored in HttpOnly cookie, Authorization header won't work
        // Try making a test request with credentials to see if it works
        setToken('__cookie__');
        setLoginStatus('ok');
        setLoginMsg(`로그인 성공 — 쿠키 기반 세션 (${data?.data?.user?.email || email})`);
      }
    } catch (err) {
      setLoginStatus('fail');
      setLoginMsg(`네트워크 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [email, password, manualToken]);

  // ── Patch helper ──────────────────────────────────────────
  const patch = useCallback((key: StepKey, p: Partial<StepResult>) => {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));
  }, []);

  // ── fetch with current token ───────────────────────────────
  const call = useCallback(
    async (method: string, path: string, body?: unknown) => {
      const tkn = token === '__cookie__' ? '' : token;
      return apiFetch(method, path, tkn, body);
    },
    [token],
  );

  // ── Step 1: Create PUBLIC product ─────────────────────────
  const step1 = useCallback(async () => {
    patch('step1', { status: 'running', error: undefined, response: undefined, assertions: undefined });
    const url = '/api/v1/neture/__test__/tier1/create';
    const body = productName ? { name: productName } : {};
    try {
      const { ok, status, data, duration } = await call('POST', url, body);
      const res = data as {
        success: boolean;
        data?: { id: string; supplierId?: string; approvalStatus: string; isActive: boolean };
      };

      if (!ok) {
        patch('step1', { status: 'fail', error: `HTTP ${status}`, response: res, request: { method: 'POST', url, body }, duration });
        return;
      }

      const assertions: Assertion[] = [
        { label: 'success = true', pass: res.success === true, actual: res.success },
        { label: 'approvalStatus = PENDING', pass: res.data?.approvalStatus === 'PENDING', actual: res.data?.approvalStatus },
        { label: 'isActive = false', pass: res.data?.isActive === false, actual: res.data?.isActive },
      ];

      if (res.data?.id) {
        productIdRef.current = res.data.id;
        setProductId(res.data.id);
      }
      if (res.data?.supplierId) {
        supplierIdRef.current = res.data.supplierId;
        setSupplierId(res.data.supplierId);
      }

      patch('step1', {
        status: assertions.every((a) => a.pass) ? 'pass' : 'fail',
        request: { method: 'POST', url, body },
        response: res,
        duration,
        assertions,
      });
    } catch (err) {
      patch('step1', { status: 'fail', error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch, call, productName]);

  // ── Step 2: Approve ────────────────────────────────────────
  const step2 = useCallback(async () => {
    const pid = manualProductId || productIdRef.current;
    if (!pid) { patch('step2', { status: 'fail', error: 'Product ID 없음 — Step 1 먼저 실행 또는 수동 입력' }); return; }

    patch('step2', { status: 'running', error: undefined, response: undefined, assertions: undefined });
    const url = `/api/v1/neture/__test__/tier1/approve/${pid}`;
    try {
      const { ok, status, data, duration } = await call('POST', url);
      const res = data as {
        success: boolean;
        data?: { approvalStatus: string; listingCount: number; activeOrgCount: number };
      };

      if (!ok) {
        patch('step2', { status: 'fail', error: `HTTP ${status}`, response: res, request: { method: 'POST', url }, duration });
        return;
      }

      const assertions: Assertion[] = [
        { label: 'success = true', pass: res.success === true, actual: res.success },
        { label: 'approvalStatus = APPROVED', pass: res.data?.approvalStatus === 'APPROVED', actual: res.data?.approvalStatus },
        { label: 'listingCount > 0', pass: (res.data?.listingCount ?? 0) > 0, actual: res.data?.listingCount },
        { label: 'listingCount = activeOrgCount', pass: res.data?.listingCount === res.data?.activeOrgCount, actual: `${res.data?.listingCount} vs ${res.data?.activeOrgCount}` },
      ];

      patch('step2', {
        status: assertions.every((a) => a.pass) ? 'pass' : 'fail',
        request: { method: 'POST', url },
        response: res,
        duration,
        assertions,
      });
    } catch (err) {
      patch('step2', { status: 'fail', error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch, call, manualProductId]);

  // ── Step 3: Listings ───────────────────────────────────────
  const step3 = useCallback(async () => {
    const pid = manualProductId || productIdRef.current;
    if (!pid) { patch('step3', { status: 'fail', error: 'Product ID 없음' }); return; }

    patch('step3', { status: 'running', error: undefined, response: undefined, assertions: undefined });
    const url = `/api/v1/neture/__test__/tier1/listings/${pid}`;
    try {
      const { ok, status, data, duration } = await call('GET', url);
      const res = data as {
        success: boolean;
        data?: { totalListings: number; activeListings: number };
      };

      if (!ok) {
        patch('step3', { status: 'fail', error: `HTTP ${status}`, response: res, request: { method: 'GET', url }, duration });
        return;
      }

      const assertions: Assertion[] = [
        { label: 'success = true', pass: res.success === true, actual: res.success },
        { label: 'totalListings > 0', pass: (res.data?.totalListings ?? 0) > 0, actual: res.data?.totalListings },
        { label: 'activeListings = 0 (기본값 false)', pass: res.data?.activeListings === 0, actual: res.data?.activeListings },
      ];

      patch('step3', {
        status: assertions.every((a) => a.pass) ? 'pass' : 'fail',
        request: { method: 'GET', url },
        response: res,
        duration,
        assertions,
      });
    } catch (err) {
      patch('step3', { status: 'fail', error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch, call, manualProductId]);

  // ── Step 4: Hub KPI ────────────────────────────────────────
  const step4 = useCallback(async () => {
    const pid = manualProductId || productIdRef.current;
    if (!pid) { patch('step4', { status: 'fail', error: 'Product ID 없음' }); return; }

    patch('step4', { status: 'running', error: undefined, response: undefined, assertions: undefined });
    const url = `/api/v1/neture/__test__/tier1/hub-kpi/${pid}`;
    try {
      const { ok, status, data, duration } = await call('GET', url);
      const res = data as {
        success: boolean;
        data?: { publicProductCount: number; listingCount: number; activeOrgs: number };
      };

      if (!ok) {
        patch('step4', { status: 'fail', error: `HTTP ${status}`, response: res, request: { method: 'GET', url }, duration });
        return;
      }

      const assertions: Assertion[] = [
        { label: 'success = true', pass: res.success === true, actual: res.success },
        { label: 'publicProductCount >= 1', pass: (res.data?.publicProductCount ?? 0) >= 1, actual: res.data?.publicProductCount },
        { label: 'listingCount >= 1', pass: (res.data?.listingCount ?? 0) >= 1, actual: res.data?.listingCount },
      ];

      patch('step4', {
        status: assertions.every((a) => a.pass) ? 'pass' : 'fail',
        request: { method: 'GET', url },
        response: res,
        duration,
        assertions,
      });
    } catch (err) {
      patch('step4', { status: 'fail', error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch, call, manualProductId]);

  // ── Step 5: Supplier INACTIVE ──────────────────────────────
  const step5 = useCallback(async () => {
    const sid = manualSupplierId || supplierIdRef.current;
    if (!sid) { patch('step5', { status: 'fail', error: 'Supplier ID 없음 — Step 1 먼저 실행 또는 수동 입력' }); return; }

    patch('step5', { status: 'running', error: undefined, response: undefined, assertions: undefined });
    const url = `/api/v1/neture/__test__/tier1/supplier-deactivate/${sid}`;
    try {
      const { ok, status, data, duration } = await call('POST', url);
      const res = data as {
        success: boolean;
        data?: { supplierStatus: string; revokedApprovals: number; listingsDisabled: number };
      };

      if (!ok) {
        patch('step5', { status: 'fail', error: `HTTP ${status}`, response: res, request: { method: 'POST', url }, duration });
        return;
      }

      const assertions: Assertion[] = [
        { label: 'success = true', pass: res.success === true, actual: res.success },
        { label: 'supplierStatus = INACTIVE', pass: res.data?.supplierStatus === 'INACTIVE', actual: res.data?.supplierStatus },
        { label: 'revokedApprovals > 0', pass: (res.data?.revokedApprovals ?? 0) > 0, actual: res.data?.revokedApprovals },
        { label: 'listingsDisabled > 0', pass: (res.data?.listingsDisabled ?? 0) > 0, actual: res.data?.listingsDisabled },
      ];

      patch('step5', {
        status: assertions.every((a) => a.pass) ? 'pass' : 'fail',
        request: { method: 'POST', url },
        response: res,
        duration,
        assertions,
      });
    } catch (err) {
      patch('step5', { status: 'fail', error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch, call, manualSupplierId]);

  // ── Run all ────────────────────────────────────────────────
  const runAll = useCallback(async () => {
    if (!token) { setLoginMsg('먼저 로그인하세요.'); return; }
    setIsRunning(true);
    setState(INITIAL);
    productIdRef.current = '';
    supplierIdRef.current = '';
    setProductId('');
    setSupplierId('');

    await step1();
    await new Promise((r) => setTimeout(r, 300)); // let state settle
    await step2();
    await step3();
    await step4();
    await step5();
    setIsRunning(false);
  }, [token, step1, step2, step3, step4, step5]);

  // ── Summary ────────────────────────────────────────────────
  const steps = Object.values(state);
  const passCount = steps.filter((s) => s.status === 'pass').length;
  const failCount = steps.filter((s) => s.status === 'fail').length;
  const ran = steps.filter((s) => s.status !== 'idle').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neture Tier1 — JSON Test Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            PUBLIC 상품 승인 → 자동 확산 → Listing → Hub KPI → Supplier INACTIVE 차단 검증
          </p>
          <p className="text-xs font-mono text-gray-400 mt-0.5">
            {API_BASE}/api/v1/neture/__test__/tier1/…
          </p>
        </div>

        {/* ── Auth Panel ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">인증 설정</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                placeholder="admin@example.com"
                className="w-full px-3 py-1.5 border rounded text-sm"
                disabled={!!manualToken}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 border rounded text-sm"
                disabled={!!manualToken}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">또는 Bearer 토큰 직접 입력</label>
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="eyJhbGc... (이메일/비밀번호 대체)"
              className="w-full px-3 py-1.5 border rounded text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={doLogin}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              {manualToken ? '토큰 적용' : '로그인'}
            </button>
            {loginMsg && (
              <span className={`text-xs ${loginStatus === 'ok' ? 'text-green-600' : loginStatus === 'fail' ? 'text-red-600' : 'text-gray-500'}`}>
                {loginStatus === 'ok' ? '✓ ' : loginStatus === 'fail' ? '✗ ' : ''}{loginMsg}
              </span>
            )}
          </div>
        </div>

        {/* ── Options Panel ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">테스트 옵션 (선택)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">상품명 (Step 1)</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="비워두면 자동 생성"
                className="w-full px-3 py-1.5 border rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Product ID 수동</label>
              <input
                type="text"
                value={manualProductId}
                onChange={(e) => setManualProductId(e.target.value)}
                placeholder="Step 1에서 자동 감지"
                className="w-full px-3 py-1.5 border rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Supplier ID 수동</label>
              <input
                type="text"
                value={manualSupplierId}
                onChange={(e) => setManualSupplierId(e.target.value)}
                placeholder="Step 1에서 자동 감지"
                className="w-full px-3 py-1.5 border rounded text-xs font-mono"
              />
            </div>
          </div>
          {(productId || supplierId) && (
            <p className="mt-2 text-xs font-mono text-gray-400">
              {productId && <span>Product: <span className="text-blue-600">{productId}</span>  </span>}
              {supplierId && <span>Supplier: <span className="text-blue-600">{supplierId}</span></span>}
            </p>
          )}
        </div>

        {/* ── Run Controls ── */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runAll}
            disabled={isRunning || !token}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            {isRunning ? '실행 중...' : '전체 순차 실행 (Step 1→5)'}
          </button>
          <button
            onClick={() => { setState(INITIAL); setProductId(''); setSupplierId(''); productIdRef.current = ''; supplierIdRef.current = ''; }}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-40"
          >
            초기화
          </button>
          <span className="text-xs text-gray-400 self-center ml-1">
            {!token && '(로그인 후 실행 가능)'}
          </span>
        </div>

        {/* Summary bar */}
        {ran > 0 && (
          <div className={`rounded-lg p-3 flex items-center gap-3 text-sm ${
            failCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <span className={`font-semibold ${failCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {failCount > 0 ? '일부 FAIL' : 'ALL PASS'}
            </span>
            <span className="text-gray-500 text-xs">
              {ran}/5 실행 · PASS {passCount} · FAIL {failCount}
            </span>
          </div>
        )}

        {/* Step cards */}
        <div className="space-y-3">
          <StepCard n={1} title="PUBLIC 상품 생성"
            desc="distributionType=PUBLIC, approvalStatus=PENDING, isActive=false"
            result={state.step1} onRun={step1} disabled={isRunning || !token} />
          <StepCard n={2} title="Neture Admin 승인 + 자동 확산"
            desc="approvalStatus=APPROVED, 전체 ACTIVE 조직에 listing 자동 생성"
            result={state.step2} onRun={step2} disabled={isRunning || !token} />
          <StepCard n={3} title="Listing 상태 조회"
            desc="totalListings > 0, activeListings = 0 (기본값 false)"
            result={state.step3} onRun={step3} disabled={isRunning || !token} />
          <StepCard n={4} title="Hub KPI 반영 확인"
            desc="publicProductCount >= 1, listingCount >= 1"
            result={state.step4} onRun={step4} disabled={isRunning || !token} />
          <StepCard n={5} title="Supplier INACTIVE → 즉시 차단"
            desc="supplierStatus=INACTIVE, revokedApprovals > 0, listingsDisabled > 0"
            result={state.step5} onRun={step5} disabled={isRunning || !token} />
        </div>

        {/* Footer note */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <strong>주의:</strong> Step 5는 실제 Supplier를 INACTIVE 처리합니다. 테스트용 Supplier ID를 사용하세요.
          이 페이지에서 생성된 데이터는 실제 DB에 기록됩니다.
        </div>

      </div>
    </div>
  );
};

export default Tier1TestPage;
