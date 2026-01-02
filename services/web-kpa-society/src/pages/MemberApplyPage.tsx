import { useState } from 'react';
import { Link } from 'react-router-dom';
import { kpaApi, ApplyRoleRequest } from '../api/kpa';

/**
 * Member Application Page
 * (B) 회원 신청 페이지
 */

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export function MemberApplyPage() {
  const [formData, setFormData] = useState<ApplyRoleRequest>({
    role: 'partner', // Default role for KPA member
    businessName: '',
    businessNumber: '',
    note: '',
  });
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      await kpaApi.applyForRole(formData);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      if (err.code === 'UNAUTHORIZED' || err.status === 401) {
        setErrorMessage('로그인이 필요합니다. 먼저 로그인해주세요.');
      } else if (err.code === 'ROLE_ALREADY_GRANTED') {
        setErrorMessage('이미 회원 권한이 부여되어 있습니다.');
      } else if (err.code === 'APPLICATION_PENDING') {
        setErrorMessage('이미 심사 대기 중인 신청이 있습니다.');
      } else {
        setErrorMessage(err.message || '신청 중 오류가 발생했습니다.');
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (status === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>신청이 완료되었습니다</h2>
          <p style={styles.successMessage}>
            신청서가 접수되었습니다. 심사 후 결과를 알려드리겠습니다.
          </p>
          <div style={styles.successActions}>
            <Link to="/applications" style={styles.primaryButton}>
              내 신청 목록 보기
            </Link>
            <Link to="/" style={styles.secondaryButton}>
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>회원 신청</h1>
        <p style={styles.subtitle}>약사회 회원으로 가입하시려면 아래 정보를 입력해주세요.</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>신청 역할</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            style={styles.select}
            required
          >
            <option value="partner">약사회 회원 (Partner)</option>
            <option value="seller">판매자 (Seller)</option>
            <option value="supplier">공급자 (Supplier)</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>상호명 / 약국명</label>
          <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            placeholder="예: OO약국"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>사업자등록번호</label>
          <input
            type="text"
            name="businessNumber"
            value={formData.businessNumber}
            onChange={handleChange}
            placeholder="예: 123-45-67890"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>추가 메모 (선택)</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="심사에 참고할 내용이 있으면 입력해주세요."
            style={styles.textarea}
            rows={4}
          />
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            ...styles.submitButton,
            ...(status === 'loading' ? styles.submitButtonDisabled : {}),
          }}
        >
          {status === 'loading' ? '신청 중...' : '신청하기'}
        </button>
      </form>

      <div style={styles.note}>
        <p>
          * 신청 후 관리자 심사를 거쳐 승인됩니다.
        </p>
        <p>
          * 이미 신청하셨다면 <Link to="/applications" style={styles.link}>내 신청 목록</Link>에서 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    background: '#fff',
    borderRadius: 12,
    padding: 32,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #ddd',
    borderRadius: 8,
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #ddd',
    borderRadius: 8,
    boxSizing: 'border-box',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #ddd',
    borderRadius: 8,
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  errorBox: {
    padding: '12px 16px',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
  },
  submitButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#0066cc',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  submitButtonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
  note: {
    marginTop: 24,
    padding: 16,
    fontSize: 14,
    color: '#666',
    lineHeight: 1.6,
  },
  link: {
    color: '#0066cc',
    textDecoration: 'none',
  },
  successCard: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: 12,
    padding: 48,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  successIcon: {
    width: 64,
    height: 64,
    lineHeight: '64px',
    fontSize: 32,
    background: '#e8f5e9',
    color: '#4caf50',
    borderRadius: '50%',
    margin: '0 auto 24px',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  successActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 280,
    margin: '0 auto',
  },
  primaryButton: {
    display: 'block',
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#0066cc',
    borderRadius: 8,
    textDecoration: 'none',
    textAlign: 'center',
  },
  secondaryButton: {
    display: 'block',
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#0066cc',
    background: '#e3f2fd',
    borderRadius: 8,
    textDecoration: 'none',
    textAlign: 'center',
  },
};
