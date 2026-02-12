/**
 * RegisterPage - KPA Society 회원가입
 * Phase 6: 가입 시 약사/약대생만 구분
 * 승인 후 로그인 시 직능 분류(activity_type) 미설정이면 추가 입력 유도
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const PHARMACY_SCHOOLS = [
  '가천대학교 약학대학',
  '가톨릭대학교 약학대학',
  '강원대학교 약학대학',
  '경북대학교 약학대학',
  '경상국립대학교 약학대학',
  '경성대학교 약학대학',
  '경희대학교 약학대학',
  '고려대학교 약학대학',
  '단국대학교 약학대학',
  '대구가톨릭대학교 약학대학',
  '덕성여자대학교 약학대학',
  '동국대학교 약학대학',
  '동아대학교 약학대학',
  '목포대학교 약학대학',
  '부산대학교 약학대학',
  '삼육대학교 약학대학',
  '서울대학교 약학대학',
  '성균관대학교 약학대학',
  '숙명여자대학교 약학대학',
  '순천대학교 약학대학',
  '아주대학교 약학대학',
  '연세대학교 약학대학',
  '영남대학교 약학대학',
  '우석대학교 약학대학',
  '원광대학교 약학대학',
  '이화여자대학교 약학대학',
  '인제대학교 약학대학',
  '전남대학교 약학대학',
  '전북대학교 약학대학',
  '제주대학교 약학대학',
  '조선대학교 약학대학',
  '중앙대학교 약학대학',
  '차의과학대학교 약학대학',
  '충남대학교 약학대학',
  '충북대학교 약학대학',
  '한양대학교 약학대학',
];

const PHARMACY_DEPARTMENTS = [
  '약학과',
  '한약학과',
  '제약학과',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    lastName: '',
    firstName: '',
    nickname: '',
    phone: '',
    membershipType: 'pharmacist' as 'pharmacist' | 'student',
    licenseNumber: '',
    universityName: '',
    department: '',
    branchId: '',
    groupId: '',
    agreeTerms: false,
    agreePrivacy: false,
  });

  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [groups, setGroups] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    fetch(`${baseUrl}/kpa/organizations?type=branch&active_only=true`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => setBranches(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!formData.branchId) {
      setGroups([]);
      return;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    fetch(`${baseUrl}/kpa/organizations?type=group&parent_id=${formData.branchId}&active_only=true`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => setGroups(res.data || []))
      .catch(() => {});
  }, [formData.branchId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    const type = target instanceof HTMLInputElement ? target.type : 'text';
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, phone: value.replace(/\D/g, '') }));
      return;
    }
    if (name === 'branchId') {
      setFormData(prev => ({ ...prev, branchId: value, groupId: '' }));
      return;
    }
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
      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          lastName: formData.lastName,
          firstName: formData.firstName,
          nickname: formData.nickname,
          phone: formData.phone,
          membershipType: formData.membershipType,
          licenseNumber: formData.membershipType === 'pharmacist' ? formData.licenseNumber : undefined,
          universityName: formData.membershipType === 'student'
            ? `${formData.universityName} ${formData.department}`.trim()
            : undefined,
          organizationId: formData.groupId || undefined,
          service: 'kpa-society',
          tos: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }
      navigate('/register/pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = {
    length: formData.password.length >= 8,
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[@$!%*?&]/.test(formData.password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const isFormValid = () => {
    const baseValid =
      formData.email &&
      formData.password &&
      isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      formData.lastName &&
      formData.firstName &&
      formData.nickname &&
      formData.phone.length >= 10 && formData.phone.length <= 11 &&
      formData.groupId &&
      formData.agreeTerms &&
      formData.agreePrivacy;

    if (!baseValid) return false;

    if (formData.membershipType === 'pharmacist') {
      return !!formData.licenseNumber;
    }
    if (formData.membershipType === 'student') {
      return !!formData.universityName && !!formData.department;
    }
    return true;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>KPA</div>
        <h1 style={styles.title}>회원가입</h1>
        <p style={styles.subtitle}>KPA-Society 회원가입을 신청합니다</p>

        <div style={styles.notice}>
          <span style={styles.noticeIcon}>!</span>
          <div>
            <strong>승인제 가입 안내</strong>
            <p style={styles.noticeText}>
              가입 신청 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.
            </p>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* 계정 정보 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>계정 정보</h3>

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
                    placeholder="영문 대/소문자, 숫자, 특수문자 포함"
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
                {formData.password.length > 0 && !isPasswordStrong && (
                  <div style={{ fontSize: '12px', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                    <span style={{ color: passwordChecks.length ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.length ? '\u2713' : '\u2717'} 8자 이상
                    </span><br />
                    <span style={{ color: passwordChecks.uppercase ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.uppercase ? '\u2713' : '\u2717'} 영문 대문자
                    </span><br />
                    <span style={{ color: passwordChecks.lowercase ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.lowercase ? '\u2713' : '\u2717'} 영문 소문자
                    </span><br />
                    <span style={{ color: passwordChecks.number ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.number ? '\u2713' : '\u2717'} 숫자
                    </span><br />
                    <span style={{ color: passwordChecks.special ? '#16a34a' : '#dc2626' }}>
                      {passwordChecks.special ? '\u2713' : '\u2717'} 특수문자(@$!%*?&)
                    </span>
                  </div>
                )}
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
                {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: '4px 0 0 0' }}>
                    비밀번호가 일치하지 않습니다
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 개인 정보 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>개인 정보</h3>

            <div style={styles.inputRow}>
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
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>닉네임 (포럼 표시명) *</label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="포럼에서 사용할 닉네임"
                style={styles.input}
                required
              />
              <p style={styles.helpText}>실명 대신 포럼에 표시될 이름입니다</p>
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
              <p style={styles.helpText}>숫자만 입력 (예: 01012345678)</p>
              {formData.phone.length > 0 &&
                (formData.phone.length < 10 || formData.phone.length > 11) && (
                <p style={{ fontSize: '12px', color: '#dc2626', margin: '4px 0 0 0' }}>
                  핸드폰 번호는 10~11자리 숫자여야 합니다
                </p>
              )}
            </div>
          </div>

          {/* 회원 구분 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>회원 구분</h3>

            <div style={styles.inputGroup}>
              <label style={styles.label}>가입 유형 *</label>
              <select
                name="membershipType"
                value={formData.membershipType}
                onChange={handleInputChange}
                style={styles.select}
              >
                <option value="pharmacist">약사</option>
                <option value="student">약대생</option>
              </select>
            </div>

            {formData.membershipType === 'pharmacist' && (
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
                <p style={styles.helpText}>약사면허증에 기재된 면허번호</p>
              </div>
            )}

            {formData.membershipType === 'student' && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>재학 약대 *</label>
                  <select
                    name="universityName"
                    value={formData.universityName}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="">약대를 선택하세요</option>
                    {PHARMACY_SCHOOLS.map(school => (
                      <option key={school} value={school}>{school}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>학과 *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="">학과를 선택하세요</option>
                    {PHARMACY_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* 소속 분회 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>소속 분회</h3>

            <div style={styles.inputGroup}>
              <label style={styles.label}>지부 (시/도) *</label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleInputChange}
                style={styles.select}
              >
                <option value="">지부를 선택하세요</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>분회 (시/군/구) *</label>
              <select
                name="groupId"
                value={formData.groupId}
                onChange={handleInputChange}
                style={{
                  ...styles.select,
                  opacity: formData.branchId ? 1 : 0.5,
                  cursor: formData.branchId ? 'pointer' : 'not-allowed',
                }}
                disabled={!formData.branchId}
              >
                <option value="">
                  {formData.branchId ? '분회를 선택하세요' : '지부를 먼저 선택하세요'}
                </option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
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
