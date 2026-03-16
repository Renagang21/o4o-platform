/**
 * RegisterPage - Neture 회원가입
 * 공급자/파트너 가입 (운영자는 내부 승인 필요)
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/apiClient';

type UserRole = 'supplier' | 'partner' | 'seller' | 'user';

const roleOptions: Array<{ role: UserRole; label: string; description: string; emoji: string }> = [
  {
    role: 'user',
    label: '일반 사용자',
    description: '서비스를 이용하는 일반 사용자',
    emoji: '👤',
  },
  {
    role: 'supplier',
    label: '공급자',
    description: '제품을 공급하는 공급사/제조사',
    emoji: '🏭',
  },
  {
    role: 'partner',
    label: '파트너',
    description: '제품을 홍보하는 파트너',
    emoji: '🤝',
  },
  {
    role: 'seller',
    label: '셀러',
    description: '매장을 운영하는 판매자',
    emoji: '🏪',
  },
];

const SERVICE_LABELS: Record<string, string> = {
  neture: 'Neture', glycopharm: 'GlycoPharm', glucoseview: 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics', 'kpa-society': '대한약사회', platform: 'O4O 플랫폼',
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccountMode, setExistingAccountMode] = useState(false);
  const [existingServices, setExistingServices] = useState<Array<{key: string, status: string}>>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    companyName: '',
    businessNumber: '',
    businessType: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name } = target;
    let { value } = target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    const type = target instanceof HTMLInputElement ? target.type : 'text';

    // 핸드폰 번호: 숫자만 허용
    if (name === 'phone') {
      value = value.replace(/\D/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const { data: result } = await api.post('/auth/check-email', { email: formData.email, service: 'neture' });
      if (result.success && result.data.exists) {
        if (result.data.alreadyJoined) {
          setError('이미 Neture 서비스에 가입된 계정입니다. 로그인해 주세요.');
        } else {
          setExistingAccountMode(true);
          setExistingServices(result.data.services || []);
          setError(null);
        }
      } else {
        setExistingAccountMode(false);
        setExistingServices([]);
      }
    } catch { /* silent */ }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/register', {
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
        role: selectedRole,
        service: 'neture',
      });

      // 가입 신청 완료 - 승인 대기 페이지로 이동
      navigate('/register/pending');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { code?: string; error?: string; services?: Array<{key: string, status: string}> } } };
      const status = axiosErr.response?.status;
      const data = axiosErr.response?.data;
      if (status === 401 && data?.code === 'PASSWORD_MISMATCH') {
        setExistingAccountMode(true);
        if (data.services) setExistingServices(data.services);
        setError('비밀번호가 일치하지 않습니다. O4O 계정 가입 시 사용한 기존 비밀번호를 입력해주세요.');
      } else if (status === 409) {
        if (data?.code === 'SERVICE_ALREADY_JOINED') {
          setError('이미 Neture 서비스에 가입된 계정입니다. 로그인해 주세요.');
        } else {
          setError('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
      } else {
        setError(data?.error || (err instanceof Error ? err.message : '회원가입에 실패했습니다.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = {
    length: formData.password.length >= 8,
    letter: /[a-zA-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z\d\s]/.test(formData.password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const isFormValid = () => {
    const base = formData.email && formData.password && formData.name &&
      formData.phone && formData.phone.length >= 10 && formData.phone.length <= 11 &&
      (selectedRole === 'user' || formData.companyName) && formData.agreeTerms && formData.agreePrivacy;

    if (existingAccountMode) {
      return base && formData.password.length > 0;
    }
    return base && isPasswordStrong && formData.password === formData.passwordConfirm;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🌿</div>
        <h1 style={styles.title}>회원가입</h1>
        <p style={styles.subtitle}>Neture 유통 정보 플랫폼에 가입하세요</p>

        {/* Progress Steps */}
        <div style={styles.progress}>
          <div style={{ ...styles.progressStep, ...(step >= 1 ? styles.progressStepActive : {}) }}>
            {step > 1 ? '✓' : '1'}
          </div>
          <div style={{ ...styles.progressLine, ...(step >= 2 ? styles.progressLineActive : {}) }} />
          <div style={{ ...styles.progressStep, ...(step >= 2 ? styles.progressStepActive : {}) }}>
            2
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div style={styles.roleSection}>
            <h2 style={styles.sectionTitle}>어떤 역할로 가입하시겠습니까?</h2>
            <div style={styles.roleGrid}>
              {roleOptions.map((option) => (
                <button
                  key={option.role}
                  onClick={() => handleRoleSelect(option.role)}
                  style={styles.roleButton}
                >
                  <span style={styles.roleEmoji}>{option.emoji}</span>
                  <h3 style={styles.roleLabel}>{option.label}</h3>
                  <p style={styles.roleDesc}>{option.description}</p>
                </button>
              ))}
            </div>
            <p style={styles.loginLink}>
              이미 계정이 있으신가요?{' '}
              <Link to="/login" style={styles.link}>로그인</Link>
            </p>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={styles.backButton}
            >
              ← 역할 다시 선택
            </button>

            <div style={styles.selectedRole}>
              <span style={styles.roleEmoji}>
                {roleOptions.find(r => r.role === selectedRole)?.emoji}
              </span>
              <span>{roleOptions.find(r => r.role === selectedRole)?.label}로 가입합니다</span>
            </div>

            {/* Basic Info */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>이메일 *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleEmailBlur}
                placeholder="example@company.com"
                style={styles.input}
                required
              />
            </div>

            {existingAccountMode && (
              <div style={styles.existingAccountBanner}>
                <strong>이미 O4O 플랫폼 계정이 존재합니다</strong>
                <p style={{ margin: '8px 0 4px', fontSize: '13px' }}>
                  기존 비밀번호를 입력하면 Neture 서비스 가입이 진행됩니다.
                </p>
                {existingServices.length > 0 && (
                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748b' }}>
                    가입된 서비스: {existingServices.map(s => SERVICE_LABELS[s.key] || s.key).join(', ')}
                  </p>
                )}
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <Link to="/login" style={{ color: '#16a34a', marginRight: '12px' }}>로그인</Link>
                  <Link to="/forgot-password" style={{ color: '#64748b' }}>비밀번호 찾기</Link>
                </div>
              </div>
            )}

            <div style={existingAccountMode ? undefined : styles.inputRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{existingAccountMode ? '기존 비밀번호 *' : '비밀번호 *'}</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={existingAccountMode ? 'O4O 계정 비밀번호 입력' : '영문, 숫자, 특수문자 포함 8자 이상'}
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {!existingAccountMode && formData.password.length > 0 && !isPasswordStrong && (
                  <div style={{ fontSize: '12px', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                    <span style={{ color: passwordChecks.length ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.length ? '\u2713' : '\u2717'} 8자 이상
                    </span><br />
                    <span style={{ color: passwordChecks.letter ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.letter ? '\u2713' : '\u2717'} 영문 포함
                    </span><br />
                    <span style={{ color: passwordChecks.number ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.number ? '\u2713' : '\u2717'} 숫자 포함
                    </span><br />
                    <span style={{ color: passwordChecks.special ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.special ? '\u2713' : '\u2717'} 특수문자 포함
                    </span>
                  </div>
                )}
              </div>
              {!existingAccountMode && (
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
                {formData.passwordConfirm.length > 0 && formData.password !== formData.passwordConfirm && (
                  <span style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                    비밀번호가 일치하지 않습니다
                  </span>
                )}
              </div>
              )}
            </div>

            <div style={styles.inputRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{selectedRole === 'user' ? '이름' : '담당자명'} *</label>
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
                <label style={styles.label}>핸드폰 번호 *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="하이픈(-) 없이 숫자만 입력"
                  style={styles.input}
                  required
                />
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  숫자만 입력 (예: 01012345678)
                </span>
                {formData.phone.length > 0 && (formData.phone.length < 10 || formData.phone.length > 11) && (
                  <span style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                    핸드폰 번호는 10~11자리 숫자여야 합니다
                  </span>
                )}
              </div>
            </div>

            {/* Business Info — 일반 사용자는 표시하지 않음 */}
            {selectedRole !== 'user' && (
            <div style={styles.businessSection}>
              <h3 style={styles.businessTitle}>사업자 정보</h3>
              <div style={styles.inputGroup}>
                <label style={styles.label}>회사명 *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="OO주식회사"
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputRow}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>사업자등록번호</label>
                  <input
                    type="text"
                    name="businessNumber"
                    value={formData.businessNumber}
                    onChange={handleInputChange}
                    placeholder="000-00-00000"
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>업종</label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="">선택</option>
                    <option value="cosmetics">화장품</option>
                    <option value="health">건강식품</option>
                    <option value="medical">의료기기</option>
                    <option value="food">식품</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>
            </div>
            )}

            {/* Agreements */}
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
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="agreeMarketing"
                  checked={formData.agreeMarketing}
                  onChange={handleInputChange}
                  style={styles.checkbox}
                />
                <span>마케팅 정보 수신에 동의합니다 (선택)</span>
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
              {loading ? '가입 처리 중...' : '가입하기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
  },
  logo: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  progressStep: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  progressStepActive: {
    backgroundColor: '#16a34a',
    color: '#fff',
  },
  progressLine: {
    width: '48px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: '#e2e8f0',
  },
  progressLineActive: {
    backgroundColor: '#16a34a',
  },
  existingAccountBanner: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  roleSection: {
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '20px',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  roleButton: {
    padding: '20px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  roleEmoji: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '8px',
  },
  roleLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  roleDesc: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  loginLink: {
    fontSize: '14px',
    color: '#64748b',
  },
  link: {
    color: '#16a34a',
    textDecoration: 'none',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: '8px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '14px',
    cursor: 'pointer',
  },
  selectedRole: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#166534',
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
    fontSize: '16px',
  },
  businessSection: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  businessTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#334155',
    margin: 0,
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
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    marginTop: '8px',
  },
};
