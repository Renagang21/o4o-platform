import { useEffect, useRef, useState } from 'react';

export interface EnrollmentPolicyReference { policyDocumentId: string; version: number; documentType: 'terms' | 'privacy' }
export interface EnrollmentPolicyDocument extends EnrollmentPolicyReference { serviceKey: string; title: string; content: string }

export function useServiceEnrollmentPolicies(serviceKey: string, load: () => Promise<unknown>, identity = '') {
  const loader = useRef(load); loader.current = load;
  const [documents, setDocuments] = useState<EnrollmentPolicyDocument[] | null>(null);
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  const key = `${serviceKey}:${identity}`;
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setDocuments(null); setLoadedIdentity(null); setChecked([]); setError(false);
    const timer = setTimeout(() => { if (alive) { alive = false; setError(true); } }, 10000);
    Promise.resolve().then(() => loader.current()).then(value => {
      if (!alive) return;
      if (!Array.isArray(value) || value.length > 2 || new Set(value.map(doc => doc?.documentType)).size !== value.length
        || (serviceKey.startsWith('business:') && (value.length !== 2 || value[0]?.version !== value[1]?.version))
        || !value.every(doc => doc && doc.serviceKey === serviceKey && ['terms', 'privacy'].includes(doc.documentType)
          && typeof doc.policyDocumentId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doc.policyDocumentId)
          && Number.isInteger(doc.version) && doc.version > 0 && typeof doc.title === 'string' && !!doc.title.trim()
          && typeof doc.content === 'string' && !!doc.content.trim())) throw new Error('Unavailable enrollment policy');
      alive = false; clearTimeout(timer); setDocuments(value); setLoadedIdentity(key);
    }).catch(() => { if (alive) { alive = false; clearTimeout(timer); setError(true); } });
    return () => { alive = false; clearTimeout(timer); };
  }, [serviceKey, identity, attempt]);
  const ready = loadedIdentity === key && documents !== null && documents.every(doc => checked.includes(doc.policyDocumentId));
  return { documents: loadedIdentity === key ? documents : null, error, ready,
    references: ready ? documents.map(({ policyDocumentId, version, documentType }) => ({ policyDocumentId, version, documentType })) : undefined,
    checked, check: (id: string, value: boolean) => setChecked(ids => value ? [...new Set([...ids, id])] : ids.filter(item => item !== id)),
    reload: () => { setDocuments(null); setChecked([]); setAttempt(value => value + 1); } };
}

export function ServiceEnrollmentPolicyAgreement({ agreement }: { agreement: ReturnType<typeof useServiceEnrollmentPolicies> }) {
  if (agreement.error) return <div role="alert"><p>서비스 약관을 불러오지 못했습니다.</p><button type="button" onClick={agreement.reload}>약관 다시 확인</button></div>;
  if (agreement.documents === null) return <p role="status">서비스 약관을 확인하고 있습니다…</p>;
  if (agreement.documents.length === 0) return null;
  return <div style={{ display: 'grid', gap: 12, margin: '16px 0' }}>
    {agreement.documents.map(doc => <div key={doc.policyDocumentId}>
      <details><summary>{doc.title} · 버전 {doc.version}</summary><div style={{ maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 12 }}>{doc.content}</div></details>
      <label style={{ display: 'flex', gap: 8, marginTop: 8 }}><input type="checkbox" checked={agreement.checked.includes(doc.policyDocumentId)}
        onChange={event => agreement.check(doc.policyDocumentId, event.target.checked)} />{doc.documentType === 'terms' ? '서비스 이용약관 동의 (필수)' : '서비스 개인정보 안내 확인 (필수)'}</label>
    </div>)}
  </div>;
}
