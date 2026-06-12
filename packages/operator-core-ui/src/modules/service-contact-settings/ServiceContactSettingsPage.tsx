/**
 * ServiceContactSettingsPage — GP/KCos 공통 "문의 설정" Admin UI
 *
 * WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *
 * Contact Us 문의 수신·알림 설정(serviceKey 기준):
 *   - 알림 설정: in-app / email 사용 여부
 *   - 이메일 수신자: 목록 추가/삭제(형식 검증)
 *   - 문의 유형: enabled 토글
 *   - 안내 문구: 개인정보 동의 / 접수 완료 (plain text)
 *
 * inline style(포터빌리티). 안내 문구는 plain text 처리(HTML 렌더 안 함).
 */

import { useEffect, useState, type CSSProperties } from 'react';
import type {
  ContactSettingsDto,
  ContactInquiryTypeConfig,
  ServiceContactSettingsPageProps,
} from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const S = {
  page: { maxWidth: 880, margin: '0 auto', padding: '24px 16px' } as CSSProperties,
  h1: { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' } as CSSProperties,
  lead: { color: '#64748b', fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 } as CSSProperties,
  banner: (t: 'success' | 'error'): CSSProperties => ({ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, background: t === 'success' ? '#ecfdf5' : '#fef2f2', color: t === 'success' ? '#047857' : '#b91c1c', border: `1px solid ${t === 'success' ? '#a7f3d0' : '#fecaca'}` }),
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 16 } as CSSProperties,
  cardH: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' } as CSSProperties,
  cardSub: { fontSize: 12, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.6 } as CSSProperties,
  toggleRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' } as CSSProperties,
  toggleLabel: { fontSize: 14, color: '#1e293b', fontWeight: 600 } as CSSProperties,
  toggleHint: { fontSize: 12, color: '#94a3b8' } as CSSProperties,
  emailRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } as CSSProperties,
  emailText: { flex: 1, fontSize: 14, color: '#1e293b' } as CSSProperties,
  addRow: { display: 'flex', gap: 8, marginTop: 8 } as CSSProperties,
  input: { flex: 1, padding: '8px 10px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' } as CSSProperties,
  textarea: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, minHeight: 64, fontFamily: 'inherit' } as CSSProperties,
  btn: { padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#334155', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' } as CSSProperties,
  btnDanger: { padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#b91c1c', background: '#fff', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' } as CSSProperties,
  btnPrimary: { padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#fff', background: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer' } as CSSProperties,
  field: { marginBottom: 12 } as CSSProperties,
  label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 } as CSSProperties,
  empty: { fontSize: 13, color: '#94a3b8', padding: '6px 0' } as CSSProperties,
  noticeBox: { fontSize: 12, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 14, lineHeight: 1.6 } as CSSProperties,
  state: { padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 } as CSSProperties,
  bar: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 } as CSSProperties,
};

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label style={S.toggleRow}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={S.toggleLabel}>{label}</span>
      {hint ? <span style={S.toggleHint}>{hint}</span> : null}
    </label>
  );
}

export function ServiceContactSettingsPage({ serviceKey, api, title }: ServiceContactSettingsPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [inApp, setInApp] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [types, setTypes] = useState<ContactInquiryTypeConfig[]>([]);
  const [privacyNotice, setPrivacyNotice] = useState('');
  const [completionNotice, setCompletionNotice] = useState('');

  function applyDto(d: ContactSettingsDto) {
    setInApp(d.inAppNotificationEnabled);
    setEmailEnabled(d.emailNotificationEnabled);
    setRecipients(Array.isArray(d.recipientEmails) ? d.recipientEmails : []);
    setTypes(Array.isArray(d.inquiryTypes) ? d.inquiryTypes : []);
    setPrivacyNotice(d.privacyNotice || '');
    setCompletionNotice(d.completionNotice || '');
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getSettings(serviceKey)
      .then((d) => { if (alive) { applyDto(d); setError(null); } })
      .catch((e) => { if (alive) setError(e?.message || '설정을 불러오지 못했습니다.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [serviceKey, api]);

  function addEmail() {
    const e = newEmail.trim().toLowerCase();
    if (!e) return;
    if (!EMAIL_RE.test(e)) { setError('올바른 이메일 주소를 입력해 주세요.'); return; }
    if (recipients.includes(e)) { setNewEmail(''); return; }
    setRecipients([...recipients, e]);
    setNewEmail('');
    setError(null);
  }

  function removeEmail(e: string) {
    setRecipients(recipients.filter((r) => r !== e));
  }

  function toggleType(value: string, enabled: boolean) {
    setTypes(types.map((t) => (t.value === value ? { ...t, enabled } : t)));
  }

  async function save() {
    setError(null);
    setNotice(null);
    if (emailEnabled && recipients.length === 0) {
      setError('이메일 알림을 사용하려면 수신 이메일을 1개 이상 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      const d = await api.updateSettings(serviceKey, {
        inAppNotificationEnabled: inApp,
        emailNotificationEnabled: emailEnabled,
        recipientEmails: recipients,
        inquiryTypes: types.length > 0 ? types : null,
        privacyNotice: privacyNotice.trim() || null,
        completionNotice: completionNotice.trim() || null,
      });
      applyDto(d);
      setNotice('저장되었습니다.');
    } catch (e: any) {
      setError(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={S.page}><div style={S.state}>불러오는 중…</div></div>;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{title || '문의 설정'}</h1>
      <p style={S.lead}>
        Contact Us로 접수된 문의의 알림 방식을 설정합니다. in-app 알림은 운영자 화면 알림으로 표시되며,
        이메일 알림은 수신 이메일이 설정된 경우에만 발송됩니다. 이메일 수신자는 실제 운영자가 확인 가능한 주소만 입력하세요.
      </p>

      {notice ? <div style={S.banner('success')}>{notice}</div> : null}
      {error ? <div style={S.banner('error')}>{error}</div> : null}

      {/* 알림 설정 */}
      <div style={S.card}>
        <h2 style={S.cardH}>알림 설정</h2>
        <p style={S.cardSub}>문의 접수 시 사용할 알림 채널을 선택합니다.</p>
        <Toggle checked={inApp} onChange={setInApp} label="in-app 운영자 알림 사용" hint="운영자 화면 알림 벨에 표시" />
        <Toggle checked={emailEnabled} onChange={setEmailEnabled} label="이메일 알림 사용" hint="수신 이메일로 발송" />
      </div>

      {/* 이메일 수신자 */}
      <div style={S.card}>
        <h2 style={S.cardH}>이메일 수신자</h2>
        <p style={S.cardSub}>문의 알림을 받을 이메일을 입력합니다. 여러 개 입력할 수 있습니다.</p>
        <div style={S.noticeBox}>
          이메일 알림을 사용하려면 수신 이메일을 1개 이상 입력해야 합니다.
          수신 이메일이 없으면 문의는 접수되지만 이메일은 발송되지 않습니다.
        </div>
        {recipients.length === 0 ? (
          <div style={S.empty}>등록된 수신 이메일이 없습니다.</div>
        ) : (
          recipients.map((e) => (
            <div key={e} style={S.emailRow}>
              <span style={S.emailText}>{e}</span>
              <button type="button" style={S.btnDanger} onClick={() => removeEmail(e)}>삭제</button>
            </div>
          ))
        )}
        <div style={S.addRow}>
          <input
            style={S.input}
            type="email"
            placeholder="operator@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
          />
          <button type="button" style={S.btn} onClick={addEmail}>추가</button>
        </div>
      </div>

      {/* 문의 유형 */}
      {types.length > 0 ? (
        <div style={S.card}>
          <h2 style={S.cardH}>문의 유형</h2>
          <p style={S.cardSub}>공개 Contact form 에서 사용할 문의 유형을 선택합니다.</p>
          {types.map((t) => (
            <Toggle key={t.value} checked={t.enabled} onChange={(v) => toggleType(t.value, v)} label={t.label} hint={t.value} />
          ))}
        </div>
      ) : null}

      {/* 안내 문구 */}
      <div style={S.card}>
        <h2 style={S.cardH}>안내 문구</h2>
        <p style={S.cardSub}>공개 Contact 화면에 표시할 안내 문구입니다. (일반 텍스트)</p>
        <div style={S.field}>
          <label style={S.label}>개인정보 수집·이용 동의 안내</label>
          <textarea style={S.textarea} value={privacyNotice} onChange={(e) => setPrivacyNotice(e.target.value)} placeholder="예: 문의 처리를 위해 이름·이메일을 수집하며, 처리 완료 후 파기합니다." />
        </div>
        <div style={S.field}>
          <label style={S.label}>접수 완료 안내</label>
          <textarea style={S.textarea} value={completionNotice} onChange={(e) => setCompletionNotice(e.target.value)} placeholder="예: 문의가 정상 접수되었습니다. 영업일 기준 1~2일 내 회신드립니다." />
        </div>
      </div>

      <div style={S.bar}>
        <button type="button" style={S.btnPrimary} onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
      </div>
    </div>
  );
}
