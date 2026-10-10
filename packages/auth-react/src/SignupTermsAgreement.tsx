import { useEffect, useRef, useState } from 'react';
import type { SignupTermsDocument } from '@o4o/auth-client';
import { styles } from './email/shared';

export function SignupTermsAgreement({ load, checked, onChecked, onDocument, reloadKey = 0 }: {
  load: () => Promise<SignupTermsDocument>;
  checked: boolean;
  onChecked: (checked: boolean) => void;
  onDocument: (document: SignupTermsDocument | null) => void;
  reloadKey?: number;
}) {
  const ref = useRef({ load, onChecked, onDocument });
  ref.current = { load, onChecked, onDocument };
  const [document, setDocument] = useState<SignupTermsDocument | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState('loading'); setDocument(null);
    ref.current.onDocument(null); ref.current.onChecked(false);
    const timeout = setTimeout(() => {
      if (active) { active = false; setState('error'); }
    }, 10_000);
    Promise.resolve().then(() => {
      if (!ref.current.load) throw new Error('Signup terms loader unavailable');
      return ref.current.load();
    }).then(doc => {
      if (!active) return;
      if (!doc || !/^[0-9a-f-]{36}$/i.test(doc.policyDocumentId) || !Number.isInteger(doc.version) || doc.version < 1 || !doc.title || !doc.termsHref) throw new Error('Invalid published agreement');
      const href = new URL(doc.termsHref);
      if (href.protocol !== 'https:' || href.username || href.password) throw new Error('Invalid policy link');
      active = false; clearTimeout(timeout);
      setDocument(doc); setState('ready'); ref.current.onDocument(doc);
    }).catch(() => { if (active) { active = false; clearTimeout(timeout); setState('error'); } });
    return () => { active = false; clearTimeout(timeout); };
  }, [reloadKey, attempt]);
  return <div style={styles.field} data-testid="signup-terms-agreement">
    {state === 'loading' && <p role="status" style={styles.muted}>이용약관을 불러오고 있습니다…</p>}
    {state === 'error' && <><p role="alert" style={styles.error}>이용약관을 불러오지 못했습니다. 다시 확인해 주세요.</p><button type="button" style={styles.ghostBtn} onClick={() => setAttempt(value => value + 1)}>이용약관 다시 불러오기</button></>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <label style={styles.checkRow}><input type="checkbox" disabled={state !== 'ready'} checked={checked} onChange={e => onChecked(e.target.checked)} /><span>이용약관 동의 (필수)</span></label>
      {document && <a href={document.termsHref} target="_blank" rel="noopener noreferrer" style={styles.link}>내용 보기 · 버전 {document.version}</a>}
    </div>
  </div>;
}
