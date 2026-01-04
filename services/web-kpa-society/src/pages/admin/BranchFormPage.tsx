/**
 * BranchFormPage - 분회 생성/수정
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { adminApi } from '../../api/admin';
import { colors } from '../../styles/theme';

interface BranchFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  workingHours: string;
  description: string;
  isActive: boolean;
}

const initialFormData: BranchFormData = {
  name: '',
  code: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  workingHours: '평일 09:00 - 18:00',
  description: '',
  isActive: true,
};

export function BranchFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState<BranchFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BranchFormData, string>>>({});

  useEffect(() => {
    if (isEdit) {
      loadBranch();
    }
  }, [id]);

  const loadBranch = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getBranch(id!);
      const branch = res.data;
      setFormData({
        name: branch.name || '',
        code: branch.code || '',
        address: branch.metadata?.address || '',
        phone: branch.metadata?.phone || '',
        fax: branch.metadata?.fax || '',
        email: branch.metadata?.email || '',
        workingHours: branch.metadata?.workingHours || '평일 09:00 - 18:00',
        description: branch.metadata?.description || '',
        isActive: branch.isActive ?? true,
      });
    } catch (err) {
      alert('분회 정보를 불러오는데 실패했습니다.');
      navigate('/admin/branches');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BranchFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '분회명을 입력해주세요.';
    }

    if (!formData.code.trim()) {
      newErrors.code = '분회 코드를 입력해주세요.';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = '영문 대문자, 숫자, 언더스코어만 사용 가능합니다.';
    }

    if (!formData.address.trim()) {
      newErrors.address = '주소를 입력해주세요.';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name,
        code: formData.code,
        type: 'branch' as const,
        isActive: formData.isActive,
        metadata: {
          address: formData.address,
          phone: formData.phone,
          fax: formData.fax,
          email: formData.email,
          workingHours: formData.workingHours,
          description: formData.description,
        },
      };

      if (isEdit) {
        await adminApi.updateBranch(id!, payload);
        alert('분회가 수정되었습니다.');
      } else {
        await adminApi.createBranch(payload);
        alert('분회가 생성되었습니다.');
      }

      navigate('/admin/branches');
    } catch (err: any) {
      alert(err.message || '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof BranchFormData, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  if (loading) {
    return <LoadingSpinner message="분회 정보를 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={isEdit ? '분회 수정' : '새 분회 등록'}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '관리자', href: '/admin' },
          { label: '분회 관리', href: '/admin/branches' },
          { label: isEdit ? '수정' : '등록' },
        ]}
      />

      <Card padding="large">
        <form onSubmit={handleSubmit}>
          {/* 기본 정보 */}
          <h3 style={styles.sectionTitle}>기본 정보</h3>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>분회명 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.name ? styles.inputError : {}),
                }}
                placeholder="예: 강남분회"
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>분회 코드 * {!isEdit && '(생성 후 변경 불가)'}</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                style={{
                  ...styles.input,
                  ...(errors.code ? styles.inputError : {}),
                }}
                placeholder="예: GANGNAM"
                disabled={isEdit}
              />
              {errors.code && <span style={styles.errorText}>{errors.code}</span>}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>주소 *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={{
                ...styles.input,
                ...(errors.address ? styles.inputError : {}),
              }}
              placeholder="예: 서울특별시 강남구 테헤란로 123"
            />
            {errors.address && <span style={styles.errorText}>{errors.address}</span>}
          </div>

          {/* 연락처 정보 */}
          <h3 style={{ ...styles.sectionTitle, marginTop: '32px' }}>연락처 정보</h3>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>전화번호</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                style={styles.input}
                placeholder="예: 02-1234-5678"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>팩스</label>
              <input
                type="tel"
                value={formData.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                style={styles.input}
                placeholder="예: 02-1234-5679"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.email ? styles.inputError : {}),
                }}
                placeholder="예: gangnam@yaksa.or.kr"
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>업무 시간</label>
              <input
                type="text"
                value={formData.workingHours}
                onChange={(e) => handleChange('workingHours', e.target.value)}
                style={styles.input}
                placeholder="예: 평일 09:00 - 18:00"
              />
            </div>
          </div>

          {/* 추가 정보 */}
          <h3 style={{ ...styles.sectionTitle, marginTop: '32px' }}>추가 정보</h3>

          <div style={styles.formGroup}>
            <label style={styles.label}>분회 소개</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              style={styles.textarea}
              placeholder="분회에 대한 간단한 소개를 입력하세요."
              rows={4}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                style={styles.checkbox}
              />
              활성화 (비활성화 시 분회 사이트에 접근할 수 없습니다)
            </label>
          </div>

          {/* 버튼 */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => navigate('/admin/branches')}
            >
              취소
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: colors.neutral700,
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    display: 'block',
    marginTop: '6px',
    fontSize: '13px',
    color: '#DC2626',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '15px',
    resize: 'vertical' as const,
    lineHeight: 1.6,
    boxSizing: 'border-box' as const,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelButton: {
    padding: '14px 28px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '14px 28px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
