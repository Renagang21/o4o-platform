/**
 * JoinInquiryForm - 참여 문의 폼 컴포넌트
 *
 * WO-KPA-JOIN-CONVERSION-V1
 *
 * 최소 입력으로 문의/참여 의사 표현이 가능한 간단한 폼
 */

import React, { useState } from 'react';

export type InquiryType = 'branch' | 'division' | 'pharmacy';

export interface JoinInquiryFormProps {
  /** 참여 유형 */
  inquiryType: InquiryType;
  /** 버튼 문구 */
  submitLabel?: string;
}

const TYPE_LABELS: Record<InquiryType, string> = {
  branch: '지부 도입',
  division: '분회 참여',
  pharmacy: '약국 참여',
};

const DEFAULT_SUBMIT_LABELS: Record<InquiryType, string> = {
  branch: '도입 문의 보내기',
  division: '참여 문의 보내기',
  pharmacy: '참여 문의 보내기',
};

export function JoinInquiryForm({
  inquiryType,
  submitLabel,
}: JoinInquiryFormProps) {
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonText = submitLabel || DEFAULT_SUBMIT_LABELS[inquiryType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!contact.trim()) {
      setError('연락처를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/join/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: inquiryType,
          contact: contact.trim(),
          message: message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('문의 제출에 실패했습니다.');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div style={styles.successBox}>
        <div style={styles.successIcon}>✓</div>
        <h3 style={styles.successTitle}>문의가 접수되었습니다</h3>
        <p style={styles.successMessage}>
          확인 후 안내드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.formTitle}>
        {TYPE_LABELS[inquiryType]} 문의
      </h3>

      <div style={styles.fieldGroup}>
        <label style={styles.label} htmlFor="contact">
          연락처 <span style={styles.required}>*</span>
        </label>
        <input
          id="contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="이메일 또는 전화번호"
          style={styles.input}
          disabled={isSubmitting}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label} htmlFor="message">
          문의 내용
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="궁금한 점이나 간단한 설명을 적어주세요 (선택)"
          style={styles.textarea}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      <button
        type="submit"
        style={{
          ...styles.submitButton,
          opacity: isSubmitting ? 0.7 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
        disabled={isSubmitting}
      >
        {isSubmitting ? '제출 중...' : buttonText}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
  },
  formTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 20px 0',
  },
  fieldGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '6px',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    fontSize: '0.875rem',
    color: '#dc2626',
  },
  submitButton: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  successBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
  },
  successIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: '#10b981',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    margin: '0 auto 16px auto',
  },
  successTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#065f46',
    margin: '0 0 8px 0',
  },
  successMessage: {
    fontSize: '1rem',
    color: '#047857',
    margin: 0,
  },
};

export default JoinInquiryForm;
