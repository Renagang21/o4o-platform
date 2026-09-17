/**
 * PolicyAcceptanceGate — 기존 회원 이용약관 재동의 화면 (공통 · 닫을 수 없음)
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §17
 *
 * 세션(/auth/me · 로그인)의 `pendingPolicyAcceptances` 가 비어 있지 않으면 서비스 shell 대신 이 화면을 그린다.
 *   - dismiss 불가. 가능한 동작은 [약관 전문 보기] · [동의] · [로그아웃] 뿐이다.
 *   - 본문은 public policy API 로 연다(세션 응답에는 식별자만 온다). 불러온 문서의 id 가 pending 의
 *     policyDocumentId 와 다르면(게시 갱신 경합) 동의 버튼을 열지 않고 새로고침을 안내한다.
 *   - 4 서비스 본문이 동일한 통합약관이므로 pending 이 여러 서비스여도 전문은 한 번 보여주고
 *     한 번의 동의 행위로 전부 제출한다(`onAccept` 가 pending 을 순서대로 POST).
 *   - `allowPaths` 의 경로(예: 공개 /terms · /privacy)에서는 children 을 그대로 그린다 — 새 탭 전문 보기용.
 *   - 서버 게이트(428 TERMS_ACCEPTANCE_REQUIRED)가 최종 방어선이며 이 화면은 그 UX 표면이다.
 *
 * 실제 HTTP 호출은 service 측에서 주입한다(loadPolicy · onAccept · onLogout). 화면을 복사하지 않는다.
 */

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { PolicyDocumentDto } from './PolicyDocumentViewer';

export interface PendingPolicyAcceptanceLike {
  serviceKey: string;
  documentType: string;
  policyDocumentId: string;
  version: number;
  title: string;
}

export interface PolicyAcceptanceGateProps {
  /** 세션 응답의 pendingPolicyAcceptances. 비어 있으면 children 을 그대로 그린다. */
  pending: PendingPolicyAcceptanceLike[];
  /** public 정책 문서 조회(PolicyDocumentViewer 와 같은 주입). */
  loadPolicy: (serviceKey: string, documentType: string) => Promise<(PolicyDocumentDto & { id?: string }) | null>;
  /** pending 전부를 승낙 제출. throw 하지 않고 결과를 돌려준다. */
  onAccept: () => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void | Promise<void>;
  /** 게이트를 적용하지 않을 경로(정확 일치). 예: ['/terms', '/privacy'] */
  allowPaths?: string[];
  /** 서비스 표시명(제목에 사용). 예: 'KPA Society' */
  serviceName?: string;
  /** 약관 전문 페이지 경로(새 탭 링크). 예: '/terms' · KPA 는 '/policy' */
  termsPath?: string;
  children: ReactNode;
}

const S: Record<string, CSSProperties> = {
  wrap: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' },
  card: { width: '100%', maxWidth: 820, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '28px 24px', boxSizing: 'border-box' },
  eyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#2563eb', margin: '0 0 6px' },
  h1: { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' },
  lead: { fontSize: 14, lineHeight: 1.7, color: '#334155', margin: '0 0 16px' },
  meta: { fontSize: 13, color: '#64748b', margin: '0 0 12px' },
  doc: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, maxHeight: 360, overflowY: 'auto', background: '#fcfcfd', fontSize: 14, lineHeight: 1.8, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  state: { padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: 10, margin: '16px 0 8px', fontSize: 14, color: '#0f172a', cursor: 'pointer' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  primary: { padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  primaryDisabled: { background: '#93c5fd', cursor: 'not-allowed' },
  secondary: { padding: '10px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 14, cursor: 'pointer' },
  link: { fontSize: 13, color: '#2563eb', textDecoration: 'underline', marginLeft: 'auto', alignSelf: 'center' },
  error: { marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 },
};

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return null; }
}

export function PolicyAcceptanceGate({
  pending,
  loadPolicy,
  onAccept,
  onLogout,
  allowPaths = [],
  serviceName,
  termsPath,
  children,
}: PolicyAcceptanceGateProps) {
  const location = useLocation();
  const first = pending[0];
  const bypass = pending.length === 0 || allowPaths.includes(location.pathname);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'empty' | 'error' | 'stale'>('idle');
  const [doc, setDoc] = useState<(PolicyDocumentDto & { id?: string }) | null>(null);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docKey = first ? `${first.serviceKey}:${first.documentType}:${first.policyDocumentId}` : '';

  useEffect(() => {
    if (bypass || !first) return;
    let cancelled = false;
    setStatus('loading');
    setChecked(false);
    setError(null);
    loadPolicy(first.serviceKey, first.documentType)
      .then((result) => {
        if (cancelled) return;
        if (!result) { setDoc(null); setStatus('empty'); return; }
        setDoc(result);
        // 보여준 문서 = 승낙할 문서 인지 확정한다. id 를 내려주지 않는 구버전 API 면 version 으로만 대조한다.
        const idMatches = result.id ? result.id === first.policyDocumentId : result.version === first.version;
        setStatus(idMatches ? 'ok' : 'stale');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
    // docKey 가 바뀔 때만 다시 불러온다(pending 배열 참조 변화로 재조회하지 않는다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bypass, docKey, loadPolicy]);

  const services = useMemo(() => Array.from(new Set(pending.map((p) => p.serviceKey))), [pending]);

  if (bypass) return <>{children}</>;

  const canSubmit = status === 'ok' && checked && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await onAccept();
      if (!result.success) setError(result.error ?? '약관 동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const effective = fmtDate(doc?.effectiveDate);

  return (
    <div style={S.wrap} role="dialog" aria-modal="true" aria-labelledby="policy-acceptance-title">
      <div style={S.card}>
        <p style={S.eyebrow}>{serviceName ? `${serviceName} · ` : ''}이용약관 동의</p>
        <h1 id="policy-acceptance-title" style={S.h1}>{first?.title || '서비스 이용약관'}에 동의해 주세요</h1>
        <p style={S.lead}>
          서비스를 계속 이용하려면 아래 이용약관을 확인하고 동의해야 합니다. 동의하기 전까지는 약관 열람, 문의, 로그아웃만 이용할 수 있습니다.
          {services.length > 1 && (
            <> 이 약관은 회원님이 가입한 {services.join(' · ')} 서비스에 공통으로 적용되며, 한 번의 동의로 함께 처리됩니다.</>
          )}
        </p>
        {first && (
          <p style={S.meta}>
            버전 v{first.version}
            {effective ? ` · 시행일 ${effective}` : ''}
          </p>
        )}

        {status === 'loading' && <div style={S.state}>약관을 불러오는 중입니다…</div>}
        {status === 'empty' && <div style={S.state}>게시된 약관을 찾을 수 없습니다. 잠시 후 새로고침해 주세요.</div>}
        {status === 'error' && <div style={S.state}>약관을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</div>}
        {status === 'stale' && (
          <div style={S.state}>약관이 갱신되었습니다. 최신 약관으로 다시 동의하려면 화면을 새로고침해 주세요.</div>
        )}
        {(status === 'ok' || status === 'stale') && doc && (
          <div style={S.doc} data-testid="policy-acceptance-content">{doc.content}</div>
        )}

        <label style={S.checkRow}>
          <input
            type="checkbox"
            checked={checked}
            disabled={status !== 'ok' || submitting}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>위 이용약관을 확인하였으며 이에 동의합니다. (필수)</span>
        </label>

        {error && <div style={S.error} role="alert">{error}</div>}

        <div style={S.actions}>
          <button
            type="button"
            style={{ ...S.primary, ...(canSubmit ? {} : S.primaryDisabled) }}
            disabled={!canSubmit}
            onClick={submit}
          >
            {submitting ? '처리 중…' : '동의하고 계속하기'}
          </button>
          <button type="button" style={S.secondary} onClick={() => { void onLogout(); }} disabled={submitting}>
            로그아웃
          </button>
          {termsPath && (
            <a href={termsPath} target="_blank" rel="noopener noreferrer" style={S.link}>
              약관 전문 새 탭에서 보기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
