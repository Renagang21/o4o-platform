/**
 * ActivitySetupPage - 직능 분류 설정 + 근무지 정보 수집 (2단계)
 *
 * WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
 * WO-KPA-A-PHARMACIST-ACTIVITY-TYPE-BUSINESS-INFO-FLOW-V1
 *
 * Step 1: 직능 분류 선택
 * Step 2: 근무지/사업장 정보 입력 (직능에 따라 분기)
 *   - pharmacy_owner: 약국명, 주소, 전화번호 (Full)
 *   - 기타 근무 직능: 근무지명, 전화번호 (Minimal)
 *   - inactive/other/student: Step 2 없이 바로 완료
 *
 * AuthGate가 activityType 미설정 + 비면제 사용자를 이 페이지로 리다이렉트.
 * API 호출은 최종 제출 시에만 수행 (중간 이탈 시 activityType=null 유지).
 */

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isActivityTypeExempt } from '../lib/role-constants';

const PHARMACIST_OPTIONS = [
  { value: 'pharmacy_owner', label: '약국 개설약사', desc: '약국을 운영하고 있습니다' },
  { value: 'pharmacy_employee', label: '약국 근무약사', desc: '약국에서 근무하고 있습니다' },
  { value: 'hospital', label: '병원 약사', desc: '의료기관에서 근무합니다' },
  { value: 'manufacturer', label: '제약회사', desc: '제약/바이오 분야' },
  { value: 'wholesaler', label: '도매회사', desc: '의약품 유통 분야' },
  { value: 'government', label: '공공기관/교육', desc: '공무원, 교육기관 등' },
  { value: 'other', label: '기타', desc: '' },
  { value: 'inactive', label: '미활동', desc: '현재 약사 활동을 하지 않습니다' },
] as const;

const STUDENT_OPTIONS = [
  { value: 'student', label: '약대생', desc: '약학대학 재학 중입니다' },
  { value: 'student_graduate', label: '약대 졸업생', desc: '약학대학을 졸업했습니다' },
] as const;

// Step 2 분기 상수
const FULL_BIZ_TYPES = ['pharmacy_owner'];
const MINIMAL_BIZ_TYPES = [
  'pharmacy_employee', 'hospital', 'manufacturer', 'wholesaler',
  'importer', 'government', 'school', 'other_industry',
];

function getStep2Type(activityType: string): 'full' | 'minimal' | 'skip' {
  if (FULL_BIZ_TYPES.includes(activityType)) return 'full';
  if (MINIMAL_BIZ_TYPES.includes(activityType)) return 'minimal';
  return 'skip';
}

export function ActivitySetupPage() {
  const navigate = useNavigate();
  const { user, isLoading, setActivityType } = useAuth();

  // Step control
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Full business info (pharmacy_owner)
  const [pharmacyName, setPharmacyName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [bizPhone, setBizPhone] = useState('');

  // Minimal business info (other work types)
  const [workplaceName, setWorkplaceName] = useState('');
  const [workplacePhone, setWorkplacePhone] = useState('');

  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (
    user.activityType ||
    isActivityTypeExempt(user.roles, user.membershipRole, user.membershipType)
  ) {
    // WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1
    return <Navigate to="/mypage" replace />;
  }

  // Build businessInfo payload from form state
  const buildBusinessInfo = (): Record<string, any> | undefined => {
    const type = getStep2Type(selected);
    if (type === 'full') {
      return {
        businessName: pharmacyName.trim(),
        phone: bizPhone.trim(),
        zipCode: zipCode.trim() || undefined,
        address: baseAddress.trim(),
        address2: detailAddress.trim() || undefined,
        storeAddress: {
          zipCode: zipCode.trim() || undefined,
          baseAddress: baseAddress.trim(),
          detailAddress: detailAddress.trim() || undefined,
        },
      };
    }
    if (type === 'minimal') {
      return {
        businessName: workplaceName.trim(),
        phone: workplacePhone.trim(),
      };
    }
    return undefined;
  };

  // Final submit — activityType + businessInfo
  const handleFinalSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await setActivityType(selected, buildBusinessInfo());
      navigate('/mypage', { replace: true });
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // Step 1 → Step 2 (or direct submit for skip types)
  const handleStep1Next = () => {
    if (!selected) return;
    if (getStep2Type(selected) === 'skip') {
      handleFinalSubmit();
    } else {
      setStep(2);
    }
  };

  // Step 2 → Step 1
  const handleStep2Back = () => {
    setStep(1);
    setError('');
  };

  // Step 2 validation
  const isStep2Valid = (): boolean => {
    const type = getStep2Type(selected);
    if (type === 'full') return !!(pharmacyName.trim() && baseAddress.trim() && bizPhone.trim());
    if (type === 'minimal') return !!(workplaceName.trim() && workplacePhone.trim());
    return true;
  };

  // Determine step 1 button text
  const step1BtnText = (): string => {
    if (saving) return '저장 중...';
    if (!selected) return '다음';
    return getStep2Type(selected) === 'skip' ? '시작하기' : '다음';
  };

  const totalSteps = !selected || getStep2Type(selected) === 'skip' ? 1 : 2;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Step indicator */}
        {totalSteps > 1 && (
          <div style={styles.stepIndicator}>
            <div style={step === 1 ? styles.stepDotActive : styles.stepDotDone} />
            <div style={step === 2 ? styles.stepDotActive : styles.stepDot} />
          </div>
        )}

        {step === 1 && (
          <>
            <div style={styles.header}>
              <div style={styles.stepBadge}>
                {totalSteps > 1 ? '1단계: 직능 분류' : '필수 설정'}
              </div>
              <h1 style={styles.title}>
                {user.membershipType === 'student' ? '학생 분류를 선택해주세요' : '직능 분류를 선택해주세요'}
              </h1>
              <p style={styles.subtitle}>
                {user.name}님, 환영합니다. 맞춤 서비스 제공을 위해 현재 {user.membershipType === 'student' ? '상태' : '직능'}를 선택해주세요.
              </p>
            </div>

            <div style={styles.options}>
              {(user.membershipType === 'student' ? STUDENT_OPTIONS : PHARMACIST_OPTIONS).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  style={{
                    ...styles.optionBtn,
                    ...(selected === opt.value ? styles.optionSelected : {}),
                  }}
                >
                  <span style={styles.optionLabel}>{opt.label}</span>
                  {opt.desc && <span style={styles.optionDesc}>{opt.desc}</span>}
                </button>
              ))}
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              onClick={handleStep1Next}
              disabled={!selected || saving}
              style={{
                ...styles.submitBtn,
                opacity: (!selected || saving) ? 0.5 : 1,
                cursor: (!selected || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              {step1BtnText()}
            </button>

            <p style={styles.footnote}>
              프로필에서 언제든 변경할 수 있습니다.
            </p>
          </>
        )}

        {step === 2 && getStep2Type(selected) === 'full' && (
          <>
            <div style={styles.header}>
              <div style={styles.stepBadge}>2단계: 약국 정보</div>
              <h1 style={styles.title}>약국 정보를 입력해주세요</h1>
              <p style={styles.subtitle}>
                개설약사로서의 약국 정보를 입력해주세요.
              </p>
            </div>

            <div style={styles.formSection}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>약국명 <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  value={pharmacyName}
                  onChange={e => setPharmacyName(e.target.value)}
                  placeholder="예: 건강약국"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>우편번호</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  placeholder="예: 06234"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>기본주소 <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  value={baseAddress}
                  onChange={e => setBaseAddress(e.target.value)}
                  placeholder="예: 서울특별시 강남구 테헤란로 123"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>상세주소</label>
                <input
                  type="text"
                  value={detailAddress}
                  onChange={e => setDetailAddress(e.target.value)}
                  placeholder="예: 1층 101호"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>전화번호 <span style={styles.required}>*</span></label>
                <input
                  type="tel"
                  value={bizPhone}
                  onChange={e => setBizPhone(e.target.value)}
                  placeholder="예: 02-1234-5678"
                  style={styles.input}
                />
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              onClick={handleStep2Back}
              style={styles.backBtn}
            >
              이전
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={!isStep2Valid() || saving}
              style={{
                ...styles.submitBtn,
                opacity: (!isStep2Valid() || saving) ? 0.5 : 1,
                cursor: (!isStep2Valid() || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '저장 중...' : '시작하기'}
            </button>

            <p style={styles.footnote}>
              프로필에서 언제든 변경할 수 있습니다.
            </p>
          </>
        )}

        {step === 2 && getStep2Type(selected) === 'minimal' && (
          <>
            <div style={styles.header}>
              <div style={styles.stepBadge}>2단계: 근무지 정보</div>
              <h1 style={styles.title}>근무지 정보를 입력해주세요</h1>
              <p style={styles.subtitle}>
                현재 근무하시는 곳의 정보를 입력해주세요.
              </p>
            </div>

            <div style={styles.formSection}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>근무지명 <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  value={workplaceName}
                  onChange={e => setWorkplaceName(e.target.value)}
                  placeholder="예: 서울대학교병원 약제부"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>근무지 전화번호 <span style={styles.required}>*</span></label>
                <input
                  type="tel"
                  value={workplacePhone}
                  onChange={e => setWorkplacePhone(e.target.value)}
                  placeholder="예: 02-1234-5678"
                  style={styles.input}
                />
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              onClick={handleStep2Back}
              style={styles.backBtn}
            >
              이전
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={!isStep2Valid() || saving}
              style={{
                ...styles.submitBtn,
                opacity: (!isStep2Valid() || saving) ? 0.5 : 1,
                cursor: (!isStep2Valid() || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '저장 중...' : '시작하기'}
            </button>

            <p style={styles.footnote}>
              프로필에서 언제든 변경할 수 있습니다.
            </p>
          </>
        )}
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  stepBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px',
  },
  optionBtn: {
    padding: '14px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s',
    textAlign: 'left' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  optionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionLabel: {
    fontWeight: 500,
  },
  optionDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 400,
  },
  error: {
    color: '#dc2626',
    fontSize: '13px',
    textAlign: 'center',
    margin: '0 0 16px 0',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
  },
  footnote: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '16px',
    marginBottom: 0,
  },
  // Step indicator
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
  },
  stepDotActive: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
  },
  stepDotDone: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#93c5fd',
  },
  // Step 2 form styles
  formSection: {
    marginBottom: '24px',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  backBtn: {
    width: '100%',
    padding: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#fff',
    color: '#64748b',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '8px',
  },
};

export default ActivitySetupPage;
