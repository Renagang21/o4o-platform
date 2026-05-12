/**
 * ContactModal — 협업·강의 문의 모달
 *
 * WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1
 *
 * 두 가지 폼 유형:
 *  partner   — 운영자 / 단체 협력
 *  education — 강의 개설 / 협업
 */

import { useState } from 'react';
import type { ContactRequestType } from '../../api/contactRequest';
import { contactRequestApi } from '../../api/contactRequest';

interface ContactModalProps {
  type: ContactRequestType;
  onClose: () => void;
}

type FormState = {
  organization_name: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const INITIAL: FormState = {
  organization_name: '',
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

export function ContactModal({ type, onClose }: ContactModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPartner = type === 'partner';
  const title = isPartner ? '운영자 / 단체 협력 문의' : '강의 개설 / 협업 문의';

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await contactRequestApi.submit({
        type,
        organization_name: isPartner ? form.organization_name : undefined,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: isPartner ? undefined : form.subject || undefined,
        message: form.message,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err?.data?.error ||
        err?.message ||
        '문의 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>{title}</h2>
          <button style={s.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {success ? (
          <div style={s.successBox}>
            <div style={s.successIcon}>✅</div>
            <p style={s.successText}>문의가 등록되었습니다.</p>
            <p style={s.successSub}>빠른 시일 내에 담당자가 연락드리겠습니다.</p>
            <button style={s.btnPrimary} onClick={onClose}>확인</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={s.form}>
            {/* partner: 단체명 */}
            {isPartner && (
              <label style={s.label}>
                단체명 <span style={s.required}>*</span>
                <input
                  style={s.input}
                  value={form.organization_name}
                  onChange={update('organization_name')}
                  placeholder="약사회 / 전문약사 모임 / 협동조합 등"
                  required
                />
              </label>
            )}

            {/* education: 강의 주제 */}
            {!isPartner && (
              <label style={s.label}>
                소속 / 강의 주제
                <input
                  style={s.input}
                  value={form.subject}
                  onChange={update('subject')}
                  placeholder="소속 기관 또는 강의 주제"
                />
              </label>
            )}

            {/* 이름 */}
            <label style={s.label}>
              {isPartner ? '담당자명' : '이름'} <span style={s.required}>*</span>
              <input
                style={s.input}
                value={form.name}
                onChange={update('name')}
                placeholder="홍길동"
                required
              />
            </label>

            {/* 연락처 */}
            <label style={s.label}>
              연락처
              <input
                style={s.input}
                value={form.phone}
                onChange={update('phone')}
                placeholder="010-0000-0000"
                inputMode="tel"
              />
            </label>

            {/* 이메일 */}
            <label style={s.label}>
              이메일 <span style={s.required}>*</span>
              <input
                style={s.input}
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="example@email.com"
                required
              />
            </label>

            {/* 문의 내용 */}
            <label style={s.label}>
              문의 내용 <span style={s.required}>*</span>
              <textarea
                style={s.textarea}
                value={form.message}
                onChange={update('message')}
                placeholder="문의하실 내용을 입력해 주세요."
                rows={4}
                required
              />
            </label>

            {error && <p style={s.errorText}>{error}</p>}

            <div style={s.actions}>
              <button type="button" style={s.btnSecondary} onClick={onClose} disabled={loading}>
                취소
              </button>
              <button type="submit" style={s.btnPrimary} disabled={loading}>
                {loading ? '등록 중…' : '문의 보내기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  title: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },
  form: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
  },
  required: {
    color: '#ef4444',
    marginLeft: 2,
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.9375rem',
    color: '#0f172a',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.9375rem',
    color: '#0f172a',
    outline: 'none',
    resize: 'vertical' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#ef4444',
    margin: '0 0 4px',
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  btnPrimary: {
    padding: '10px 20px',
    backgroundColor: 'var(--color-primary, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  successBox: {
    padding: '40px 24px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    fontSize: '2.5rem',
  },
  successText: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  successSub: {
    fontSize: '0.9375rem',
    color: '#475569',
    margin: '0 0 8px',
  },
};
