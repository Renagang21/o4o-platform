/**
 * RegisterPage - KPA Society 회원가입
 * 약사회원 가입 (자격여부는 운영자가 판단)
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    licenseNumber: '',
    pharmacyName: '',
    pharmacyAddress: '',
    branch: '',
    agreeTerms: false,
    agreePrivacy: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    const type = target instanceof HTMLInputElement ? target.type : 'text';

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'pharmacist',
          service: 'kpa-society',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입 신청에 실패했습니다.');
      }

      // 가입 신청 후 승인 대기 안내 페이지로 이동
      navigate('/register/pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 신청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.email &&
      formData.password &&
      formData.password.length >= 8 &&
      formData.password === formData.passwordConfirm &&
      formData.name &&
      formData.phone &&
      formData.licenseNumber &&
      formData.agreeTerms &&
      formData.agreePrivacy
    );
  };

  // 분회 목록 (예시)
  const branchOptions = [
    { value: '', label: '분회 선택' },
    { value: 'branch-1', label: '제1분회' },
    { value: 'branch-2', label: '제2분회' },
    { value: 'branch-3', label: '제3분회' },
    { value: 'branch-4', label: '제4분회' },
    { value: 'branch-5', label: '제5분회' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>KPA</div>
        <h1 style={styles.title}>회원가입 신청</h1>
        <p style={styles.subtitle}>청명광역약사회 회원가입을 신청합니다</p>

        <div style={styles.notice}>
          <span style={styles.noticeIcon}>!</span>
          <div>
            <strong>승인제 가입 안내</strong>
            <p style={styles.noticeText}>
              약사면허 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.
            </p>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* 기본 정보 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>기본 정보</h3>

            <div style={styles.inputGroup}>
              <label style={styles.label}>이메일 *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="example@email.com"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>비밀번호 *</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="8자 이상"
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>비밀번호 확인 *</label>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleInputChange}
                  placeholder="비밀번호 재입력"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.inputRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>성명 *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="홍길동"
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>연락처 *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="010-1234-5678"
                  style={styles.input}
                  required
                />
              </div>
            </div>
          </div>

          {/* 약사 정보 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>약사 정보</h3>

            <div style={styles.inputGroup}>
              <label style={styles.label}>약사면허번호 *</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                placeholder="00000"
                style={styles.input}
                required
              />
              <p style={styles.helpText}>약사면허증에 기재된 면허번호를 입력하세요</p>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>소속 분회</label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                style={styles.select}
              >
                {branchOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 약국 정보 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>약국 정보 (선택)</h3>

            <div style={styles.inputGroup}>
              <label style={styles.label}>약국명</label>
              <input
                type="text"
                name="pharmacyName"
                value={formData.pharmacyName}
                onChange={handleInputChange}
                placeholder="OO약국"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>약국 주소</label>
              <input
                type="text"
                name="pharmacyAddress"
                value={formData.pharmacyAddress}
                onChange={handleInputChange}
                placeholder="청명시 OO구 OO로 123"
                style={styles.input}
              />
            </div>
          </div>

          {/* 약관 동의 */}
          <div style={styles.agreements}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                style={styles.checkbox}
                required
              />
              <span><span style={styles.required}>*</span> 이용약관에 동의합니다</span>
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="agreePrivacy"
                checked={formData.agreePrivacy}
                onChange={handleInputChange}
                style={styles.checkbox}
                required
              />
              <span><span style={styles.required}>*</span> 개인정보처리방침에 동의합니다</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!isFormValid() || loading}
            style={{
              ...styles.submitButton,
              opacity: (!isFormValid() || loading) ? 0.5 : 1,
              cursor: (!isFormValid() || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '신청 처리 중...' : '가입 신청하기'}
          </button>

          <p style={styles.loginLink}>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={styles.link}>로그인</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
  logo: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
    textAlign: 'center',
  },
  notice: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #bfdbfe',
  },
  noticeIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '13px',
    color: '#1e40af',
    margin: '4px 0 0 0',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#334155',
    margin: 0,
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  },
  helpText: {
    fontSize: '12px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#64748b',
  },
  agreements: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 0',
    borderTop: '1px solid #e2e8f0',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '14px',
    color: '#475569',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    marginTop: '2px',
  },
  required: {
    color: '#dc2626',
  },
  submitButton: {
    padding: '14px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
  },
  loginLink: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
