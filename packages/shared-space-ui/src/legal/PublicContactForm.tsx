/**
 * PublicContactForm — 공개 문의(Contact) 폼 (공통)
 *
 * WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1
 *
 * serviceKey + submitInquiry 어댑터 주입으로 동작. 실제 HTTP 호출은 service 측이 주입.
 * backend: POST /api/v1/public/services/:serviceKey/contact-inquiries (저장 + 운영자 in-app 알림).
 *
 * 원칙:
 *   - 개인정보 동의 필수. honeypot(company_website) 으로 봇 차단.
 *   - 성공/실패 상태 명확 표시. 본문 plain text.
 *   - 미입력/형식 오류 client 검증 + 서버 검증 이중.
 */

import { type CSSProperties, useState } from 'react';

export interface ContactInquiryPayload {
  inquiryType: string;
  name: string;
  email: string;
  phone?: string;
  organizationName?: string;
  subject: string;
  message: string;
  privacyConsent: boolean;
  sourcePath?: string;
  /** honeypot — 정상 사용자는 빈 값. */
  company_website?: string;
}

export interface PublicContactFormTheme {
  accent?: string; // 버튼/포커스 색
}

export interface PublicContactFormProps {
  serviceKey: string;
  /** service 측 주입: 접수 API 호출. 실패 시 throw(메시지). */
  submitInquiry: (payload: ContactInquiryPayload) => Promise<void>;
  /** 문의 유형 옵션. 기본 공통 5종. */
  inquiryTypes?: { value: string; label: string }[];
  /** 소속명 라벨(예: '약국명' / '매장명'). 기본 '소속/회사명'. */
  organizationLabel?: string;
  /** 개인정보처리방침 링크(있으면 동의 문구에 연결). */
  privacyHref?: string;
  /** 상단 안내 문구(선택). */
  introText?: string;
  theme?: PublicContactFormTheme;
}

const DEFAULT_TYPES: { value: string; label: string }[] = [
  { value: 'service_usage', label: '서비스 이용 문의' },
  { value: 'account_permission', label: '가입/권한 문의' },
  { value: 'partnership', label: '공급·제휴 문의' },
  { value: 'technical_issue', label: '오류 신고' },
  { value: 'other', label: '기타 문의' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PublicContactForm({
  // serviceKey 는 API 명료성을 위해 props 에 유지하나, 실제 endpoint 는 submitInquiry 어댑터가 캡슐화하므로
  // 컴포넌트 내부에서는 사용하지 않는다.
  submitInquiry,
  inquiryTypes = DEFAULT_TYPES,
  organizationLabel = '소속/회사명',
  privacyHref,
  introText,
  theme,
}: PublicContactFormProps) {
  const accent = theme?.accent || '#0f172a';
  const [form, setForm] = useState({
    inquiryType: inquiryTypes[0]?.value ?? 'other',
    name: '',
    email: '',
    phone: '',
    organizationName: '',
    subject: '',
    message: '',
    privacyConsent: false,
    company_website: '', // honeypot
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  function validate(): string | null {
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      return '필수 항목을 입력해 주세요.';
    }
    if (!EMAIL_RE.test(form.email.trim())) return '올바른 이메일 주소를 입력해 주세요.';
    if (form.message.trim().length < 10) return '문의 내용을 10자 이상 입력해 주세요.';
    if (!form.privacyConsent) return '개인정보 수집·이용 동의가 필요합니다.';
    return null;
  }

  async function handleSubmit() {
    if (submitting) return;
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true);
    setError(null);
    try {
      await submitInquiry({
        inquiryType: form.inquiryType,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        organizationName: form.organizationName.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
        privacyConsent: true,
        sourcePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
        company_website: form.company_website,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={S.card}>
        <div style={{ ...S.successIcon, background: accent }}>✓</div>
        <h2 style={S.successTitle}>문의가 접수되었습니다.</h2>
        <p style={S.successDesc}>운영자가 확인 후 필요한 경우 회신드립니다.</p>
      </div>
    );
  }

  return (
    <div style={S.card}>
      {introText && <p style={S.intro}>{introText}</p>}
      {error && <div style={S.error}>{error}</div>}

      <div style={S.field}>
        <label style={S.label}>문의 유형</label>
        <select style={S.input} value={form.inquiryType} onChange={(e) => set('inquiryType', e.target.value)}>
          {inquiryTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div style={S.row}>
        <div style={{ ...S.field, flex: 1 }}>
          <label style={S.label}>이름 *</label>
          <input style={S.input} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div style={{ ...S.field, flex: 1 }}>
          <label style={S.label}>이메일 *</label>
          <input style={S.input} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
      </div>

      <div style={S.row}>
        <div style={{ ...S.field, flex: 1 }}>
          <label style={S.label}>연락처</label>
          <input style={S.input} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="010-0000-0000" />
        </div>
        <div style={{ ...S.field, flex: 1 }}>
          <label style={S.label}>{organizationLabel}</label>
          <input style={S.input} value={form.organizationName} onChange={(e) => set('organizationName', e.target.value)} />
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>제목 *</label>
        <input style={S.input} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
      </div>

      <div style={S.field}>
        <label style={S.label}>문의 내용 *</label>
        <textarea style={S.textarea} value={form.message} onChange={(e) => set('message', e.target.value)} />
      </div>

      {/* honeypot — 사용자 비표시 */}
      <input
        type="text"
        name="company_website"
        value={form.company_website}
        onChange={(e) => set('company_website', e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      <label style={S.consent}>
        <input type="checkbox" checked={form.privacyConsent} onChange={(e) => set('privacyConsent', e.target.checked)} />
        <span>
          문의 접수와 회신을 위해 입력한 개인정보를 수집·이용하는 데 동의합니다.
          {privacyHref && (
            <> (<a href={privacyHref} style={{ color: accent, textDecoration: 'underline' }}>개인정보처리방침</a>)</>
          )}
        </span>
      </label>

      <button
        type="button"
        style={{ ...S.btn, background: accent, opacity: submitting ? 0.6 : 1 }}
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? '접수 중…' : '문의 보내기'}
      </button>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  card: { maxWidth: 640, margin: '0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 },
  intro: { fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 },
  error: { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
  field: { marginBottom: 14 },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, minHeight: 140, fontFamily: 'inherit' },
  consent: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#334155', margin: '4px 0 16px', lineHeight: 1.6 },
  btn: { width: '100%', padding: '11px 16px', fontSize: 15, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  successIcon: { width: 48, height: 48, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '8px auto 16px' },
  successTitle: { fontSize: 18, fontWeight: 700, color: '#0f172a', textAlign: 'center', margin: '0 0 6px' },
  successDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', margin: 0 },
};
