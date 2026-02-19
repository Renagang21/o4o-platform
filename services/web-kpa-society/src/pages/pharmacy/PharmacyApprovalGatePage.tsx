/**
 * PharmacyApprovalGatePage - 약국 서비스 이용 신청 게이트
 *
 * WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1
 *
 * 약국 개설자(pharmacy_owner)가 약국 서비스에 접근할 때,
 * 운영자 승인이 없으면 이 페이지에서 신청하도록 안내한다.
 *
 * 필수 입력: 사업자등록증 번호, 세금계산서 이메일, 약국 이름, 약국 전화번호, 개설자 핸드폰 번호
 * 신청 후 또는 취소 시 이전 페이지로 돌아간다.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pharmacyRequestApi } from '../../api/pharmacyRequestApi';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

type PageState = 'form' | 'submitting' | 'success' | 'duplicate' | 'already_member' | 'error';

interface FormData {
  businessRegistrationNumber: string;
  taxInvoiceEmail: string;
  pharmacyName: string;
  pharmacyPhone: string;
  ownerPhone: string;
}

const initialForm: FormData = {
  businessRegistrationNumber: '',
  taxInvoiceEmail: '',
  pharmacyName: '',
  pharmacyPhone: '',
  ownerPhone: '',
};

export function PharmacyApprovalGatePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>('form');
  const [form, setForm] = useState<FormData>(initialForm);
  const [errorDetail, setErrorDetail] = useState<string>('');

  const isFormValid =
    form.businessRegistrationNumber.trim() !== '' &&
    form.taxInvoiceEmail.trim() !== '' &&
    form.pharmacyName.trim() !== '' &&
    form.pharmacyPhone.trim() !== '' &&
    form.ownerPhone.trim() !== '';

  /** 숫자 전용 필드: 비숫자 제거 */
  const DIGITS_ONLY_FIELDS: (keyof FormData)[] = ['businessRegistrationNumber', 'pharmacyPhone', 'ownerPhone'];

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = DIGITS_ONLY_FIELDS.includes(field) ? e.target.value.replace(/\D/g, '') : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setState('submitting');
    try {
      await pharmacyRequestApi.create({
        pharmacyName: form.pharmacyName.trim(),
        businessNumber: form.businessRegistrationNumber.trim(),
        pharmacyPhone: form.pharmacyPhone.trim(),
        ownerPhone: form.ownerPhone.trim(),
        taxInvoiceEmail: form.taxInvoiceEmail.trim(),
      });
      setState('success');
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const code = err?.code || '';
      console.error('[PharmacyApprovalGate] Submit failed:', { status, code, message: err?.message });
      if (status === 409) {
        if (code === 'ALREADY_MEMBER') {
          setState('already_member');
        } else {
          setState('duplicate');
        }
      } else if (status === 401) {
        if (code === 'AUTH_REQUIRED') {
          setErrorDetail('인증이 필요합니다. 다시 로그인해 주세요.');
        } else if (code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED') {
          setErrorDetail('인증이 만료되었습니다. 다시 로그인해 주세요.');
        } else {
          setErrorDetail('인증 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.');
        }
        setState('error');
      } else if (status === 403) {
        setErrorDetail('이 기능에 대한 접근 권한이 없습니다.');
        setState('error');
      } else {
        setErrorDetail(err?.message || `오류가 발생했습니다. (${status || '알 수 없음'})`);
        setState('error');
      }
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // 신청 완료
  if (state === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>✅</span>
            </div>
            <h1 style={styles.title}>신청이 접수되었습니다</h1>
            <p style={styles.desc}>
              운영자 승인 후 약국 서비스를 이용하실 수 있습니다.<br />
              승인 결과는 별도로 안내드리겠습니다.
            </p>
            <button type="button" onClick={handleGoBack} style={styles.backBtn}>
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 이미 신청됨
  if (state === 'duplicate') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>⏳</span>
            </div>
            <h1 style={styles.title}>이미 신청하셨습니다</h1>
            <p style={styles.desc}>
              승인 대기 중입니다. 잠시만 기다려 주세요.<br />
              승인이 완료되면 약국 서비스를 이용하실 수 있습니다.
            </p>
            <button type="button" onClick={handleGoBack} style={styles.backBtn}>
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 이미 멤버 (승인 완료 상태에서 재신청)
  if (state === 'already_member') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>✅</span>
            </div>
            <h1 style={styles.title}>이미 승인된 계정입니다</h1>
            <p style={styles.desc}>
              약국 서비스 이용이 승인된 상태입니다.<br />
              다시 로그인하시면 약국 서비스를 이용하실 수 있습니다.
            </p>
            <button type="button" onClick={() => navigate('/login')} style={styles.submitBtn}>
              다시 로그인
            </button>
            <div style={{ marginTop: spacing.sm }}>
              <button type="button" onClick={handleGoBack} style={styles.backBtn}>
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 신청 폼
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <span style={styles.icon}>💊</span>
          </div>
          <h1 style={styles.title}>약국 서비스 이용 신청</h1>
          <p style={styles.desc}>
            약국 서비스를 이용하려면 운영자 승인이 필요합니다.<br />
            아래 정보를 입력하여 신청해 주세요.
          </p>

          <div style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>사업자등록증 번호</label>
              <input
                type="text"
                placeholder="0000000000"
                value={form.businessRegistrationNumber}
                onChange={handleChange('businessRegistrationNumber')}
                style={styles.input}
                disabled={state === 'submitting'}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>세금계산서 이메일</label>
              <input
                type="email"
                placeholder="tax@example.com"
                value={form.taxInvoiceEmail}
                onChange={handleChange('taxInvoiceEmail')}
                style={styles.input}
                disabled={state === 'submitting'}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>약국 이름</label>
              <input
                type="text"
                placeholder="OO약국"
                value={form.pharmacyName}
                onChange={handleChange('pharmacyName')}
                style={styles.input}
                disabled={state === 'submitting'}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>약국 전화번호</label>
              <input
                type="tel"
                placeholder="0200000000"
                value={form.pharmacyPhone}
                onChange={handleChange('pharmacyPhone')}
                style={styles.input}
                disabled={state === 'submitting'}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>개설자 핸드폰 번호</label>
              <input
                type="tel"
                placeholder="01000000000"
                value={form.ownerPhone}
                onChange={handleChange('ownerPhone')}
                style={styles.input}
                disabled={state === 'submitting'}
              />
            </div>
          </div>

          {state === 'error' && (
            <p style={styles.error}>
              {errorDetail || '신청에 실패했습니다. 다시 시도해 주세요.'}
            </p>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || state === 'submitting'}
              style={{
                ...styles.submitBtn,
                opacity: isFormValid && state !== 'submitting' ? 1 : 0.5,
                cursor: isFormValid && state !== 'submitting' ? 'pointer' : 'not-allowed',
              }}
            >
              {state === 'submitting' ? '신청 중...' : '신청하기'}
            </button>
            <button
              type="button"
              onClick={handleGoBack}
              style={styles.backBtn}
              disabled={state === 'submitting'}
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  container: {
    maxWidth: '480px',
    width: '100%',
  },
  card: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: `${spacing.xl} ${spacing.xl}`,
    textAlign: 'center',
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: '3rem',
  },
  title: {
    ...typography.headingL,
    margin: `0 0 ${spacing.sm}`,
    color: colors.neutral900,
  },
  desc: {
    margin: `0 0 ${spacing.lg}`,
    fontSize: '0.938rem',
    color: colors.neutral600,
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'left',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '0.813rem',
    fontWeight: 600,
    color: colors.neutral700,
  },
  input: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.938rem',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    color: colors.neutral900,
    backgroundColor: colors.white,
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: spacing.md,
    justifyContent: 'center',
  },
  submitBtn: {
    padding: `${spacing.sm} ${spacing.xl}`,
    fontSize: '0.938rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    minWidth: '120px',
    textAlign: 'center',
  },
  backBtn: {
    padding: `${spacing.sm} ${spacing.xl}`,
    fontSize: '0.938rem',
    fontWeight: 600,
    color: colors.neutral700,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    minWidth: '120px',
  },
  error: {
    marginBottom: spacing.md,
    fontSize: '0.813rem',
    color: '#dc2626',
    textAlign: 'center',
  },
};

export default PharmacyApprovalGatePage;
