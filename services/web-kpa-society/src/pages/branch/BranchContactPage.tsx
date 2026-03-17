/**
 * BranchContactPage - 분회 연락처
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { useBranchContext } from '../../contexts/BranchContext';
import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';

interface ContactInfo {
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  workingHours?: string;
  mapUrl?: string;
}

export function BranchContactPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branchName, basePath } = useBranchContext();
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getContactInfo(branchId!);
      setContact(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('필수 항목을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      await branchApi.sendContactMessage(branchId!, formData);
      toast.success('문의가 접수되었습니다.');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      toast.error('문의 접수에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="연락처 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="연락처"
        breadcrumb={[
          { label: '홈', href: `${basePath}` },
          { label: '분회 소개', href: `${basePath}/about` },
          { label: '연락처' },
        ]}
      />

      <div style={styles.grid}>
        {/* Contact Info */}
        <div>
          <Card padding="large">
            <h2 style={styles.sectionTitle}>{branchName} 분회</h2>
            <div style={styles.contactList}>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📍</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>주소</span>
                  <span style={styles.contactValue}>{contact?.address || '-'}</span>
                </div>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📞</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>전화</span>
                  <span style={styles.contactValue}>{contact?.phone || '-'}</span>
                </div>
              </div>
              {contact?.fax && (
                <div style={styles.contactItem}>
                  <span style={styles.contactIcon}>📠</span>
                  <div style={styles.contactInfo}>
                    <span style={styles.contactLabel}>팩스</span>
                    <span style={styles.contactValue}>{contact.fax}</span>
                  </div>
                </div>
              )}
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>✉️</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>이메일</span>
                  <span style={styles.contactValue}>{contact?.email || '-'}</span>
                </div>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>🕐</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>업무시간</span>
                  <span style={styles.contactValue}>{contact?.workingHours || '평일 09:00 - 18:00'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Map Placeholder */}
          <Card style={{ marginTop: '24px' }}>
            <div style={styles.mapPlaceholder}>
              <span style={styles.mapIcon}>🗺️</span>
              <span style={styles.mapText}>지도</span>
            </div>
          </Card>
        </div>

        {/* Contact Form */}
        <Card padding="large">
          <h2 style={styles.sectionTitle}>문의하기</h2>
          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
                placeholder="이름을 입력하세요"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>이메일 *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
                placeholder="이메일을 입력하세요"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>연락처</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={styles.input}
                placeholder="연락처를 입력하세요"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>문의 내용 *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={styles.textarea}
                placeholder="문의 내용을 입력하세요"
                rows={6}
                required
              />
            </div>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? '전송 중...' : '문의하기'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '24px',
  },
  contactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  contactItem: {
    display: 'flex',
    gap: '16px',
  },
  contactIcon: {
    fontSize: '24px',
    width: '32px',
    textAlign: 'center',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contactLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  contactValue: {
    fontSize: '15px',
    fontWeight: 500,
    color: colors.neutral900,
  },
  mapPlaceholder: {
    height: '200px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  mapIcon: {
    fontSize: '48px',
  },
  mapText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '15px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
  },
};
