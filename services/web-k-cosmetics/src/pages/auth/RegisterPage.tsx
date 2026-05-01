/**
 * RegisterPage - K-Cosmetics 회원가입
 * 소비자/판매자 가입 (공급자/운영자는 Neture에서 관리)
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';

type UserRole = 'consumer' | 'seller';

const roleOptions: Array<{ role: UserRole; label: string; description: string; emoji: string }> = [
  {
    role: 'consumer',
    label: '소비자',
    description: 'K-뷰티 제품을 구매하는 고객입니다',
    emoji: '🛍️',
  },
  {
    role: 'seller',
    label: '판매자',
    description: 'K-뷰티 제품을 판매하는 사업자입니다',
    emoji: '🏪',
  },
];

const SERVICE_LABELS: Record<string, string> = {
  neture: 'Neture', glycopharm: 'GlycoPharm', glucoseview: 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics', 'kpa-society': 'KPA-Society', platform: 'O4O 플랫폼',
};

export default function RegisterPage() {
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
    lastName: '',
    firstName: '',
    nickname: '',
    phone: '',
    businessName: '',
    businessNumber: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'phone' ? value.replace(/\D/g, '') : value,
    }));
  };

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const res = await api.post('/auth/check-email', { email: formData.email, service: 'k-cosmetics' });
      const result = res.data;
      if (result.success && result.data.exists) {
        if (result.data.alreadyJoined) {
          setError('이미 K-Cosmetics 서비스에 가입된 계정입니다. 로그인해 주세요.');
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
      const response = await api.post('/auth/register', {
        ...formData,
        name: `${formData.lastName}${formData.firstName}`,
        nickname: formData.nickname,
        phone: formData.phone.replace(/\D/g, ''),
        role: selectedRole,
        service: 'k-cosmetics',
      });

      const data = response.data;

      if (!data.success) {
        if (data.code === 'PASSWORD_MISMATCH') {
          setExistingAccountMode(true);
          if (data.services) setExistingServices(data.services);
          throw new Error('비밀번호가 일치하지 않습니다. O4O 계정 가입 시 사용한 기존 비밀번호를 입력해주세요.');
        }
        if (response.status === 409) {
          if (data.code === 'SERVICE_ALREADY_JOINED') {
            throw new Error('이미 K-Cosmetics 서비스에 가입된 계정입니다. 로그인해 주세요.');
          }
          throw new Error('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
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

  const isPhoneValid = /^\d{10,11}$/.test(formData.phone);

  const isFormValid = () => {
    const base = formData.email && formData.lastName && formData.firstName && formData.nickname &&
      formData.phone && isPhoneValid && formData.agreeTerms && formData.agreePrivacy;
    if (existingAccountMode) return base && formData.password.length > 0;
    return base && isPasswordStrong && formData.password === formData.passwordConfirm;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>💄</div>
        <h1 style={styles.title}>회원가입</h1>
        <p style={styles.subtitle}>K-Cosmetics와 함께 시작하세요</p>

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
                placeholder="example@email.com"
                style={styles.input}
                required
              />
            </div>

            {existingAccountMode && (
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                <strong>이미 O4O 플랫폼 계정이 존재합니다</strong>
                <p style={{ margin: '8px 0 4px', fontSize: '13px' }}>기존 비밀번호를 입력하면 K-Cosmetics 서비스 가입이 진행됩니다.</p>
                {existingServices.length > 0 && (
                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748b' }}>가입된 서비스: {existingServices.map(s => SERVICE_LABELS[s.key] || s.key).join(', ')}</p>
                )}
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <Link to="/login" style={{ color: '#e91e63', marginRight: '12px' }}>로그인</Link>
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
                {!existingAccountMode && formData.password && (
                  <ul style={styles.passwordChecklist}>
                    <li style={passwordChecks.length ? styles.checkPass : styles.checkFail}>8자 이상</li>
                    <li style={passwordChecks.letter ? styles.checkPass : styles.checkFail}>영문 포함</li>
                    <li style={passwordChecks.number ? styles.checkPass : styles.checkFail}>숫자 포함</li>
                    <li style={passwordChecks.special ? styles.checkPass : styles.checkFail}>특수문자 포함</li>
                  </ul>
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
                {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                  <span style={styles.fieldError}>비밀번호가 일치하지 않습니다</span>
                )}
              </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '12px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>성 *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="홍"
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>이름 *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="길동"
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
                <span style={styles.helpText}>숫자만 입력 (예: 01012345678)</span>
                {formData.phone && !isPhoneValid && (
                  <span style={styles.fieldError}>핸드폰 번호는 10~11자리 숫자여야 합니다</span>
                )}
              </div>
            </div>

            {/* Nickname */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>닉네임 *</label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="서비스에서 사용할 표시 이름"
                style={styles.input}
                maxLength={50}
                required
              />
              <span style={styles.helpText}>포럼, 댓글 등 공개 화면에 표시되는 이름입니다. (최대 50자)</span>
            </div>

            {/* Business Info (판매자 전용) */}
            {selectedRole === 'seller' && (
              <div style={styles.businessSection}>
                <h3 style={styles.businessTitle}>사업자 정보</h3>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>상호명</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="OO뷰티샵"
                    style={styles.input}
                  />
                </div>
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
    backgroundColor: '#e91e63',
    color: '#fff',
  },
  progressLine: {
    width: '48px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: '#e2e8f0',
  },
  progressLineActive: {
    backgroundColor: '#e91e63',
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
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
    color: '#e91e63',
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
    backgroundColor: '#fce4ec',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#880e4f',
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
    backgroundColor: '#e91e63',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    marginTop: '8px',
  },
  helpText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  fieldError: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '2px',
  },
  passwordChecklist: {
    listStyle: 'none',
    padding: 0,
    margin: '4px 0 0 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    fontSize: '12px',
  },
  checkPass: {
    color: '#16a34a',
  },
  checkFail: {
    color: '#94a3b8',
  },
};
