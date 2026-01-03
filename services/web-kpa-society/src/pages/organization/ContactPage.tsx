/**
 * ContactPage - 연락처 페이지
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { organizationApi } from '../../api';
import { colors, typography } from '../../styles/theme';

interface ContactInfo {
  address: string;
  phone: string;
  fax?: string;
  email: string;
  workingHours: string;
  map?: { lat: number; lng: number };
}

export function ContactPage() {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await organizationApi.getContactInfo();
      setContactInfo(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
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
        description="약사회 연락처 및 찾아오시는 길"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '조직소개', href: '/organization' },
          { label: '연락처' },
        ]}
      />

      <div style={styles.content}>
        {/* 연락처 정보 */}
        <Card padding="large">
          <h2 style={styles.sectionTitle}>연락처 정보</h2>
          <div style={styles.contactList}>
            {contactInfo?.address && (
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📍</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>주소</span>
                  <span style={styles.contactValue}>{contactInfo.address}</span>
                </div>
              </div>
            )}

            {contactInfo?.phone && (
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📞</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>전화</span>
                  <a href={`tel:${contactInfo.phone}`} style={styles.contactLink}>
                    {contactInfo.phone}
                  </a>
                </div>
              </div>
            )}

            {contactInfo?.fax && (
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📠</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>팩스</span>
                  <span style={styles.contactValue}>{contactInfo.fax}</span>
                </div>
              </div>
            )}

            {contactInfo?.email && (
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>✉️</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>이메일</span>
                  <a href={`mailto:${contactInfo.email}`} style={styles.contactLink}>
                    {contactInfo.email}
                  </a>
                </div>
              </div>
            )}

            {contactInfo?.workingHours && (
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>🕐</span>
                <div style={styles.contactInfo}>
                  <span style={styles.contactLabel}>업무 시간</span>
                  <span style={styles.contactValue}>{contactInfo.workingHours}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 지도 */}
        <Card padding="large" style={{ marginTop: '24px' }}>
          <h2 style={styles.sectionTitle}>찾아오시는 길</h2>
          <div style={styles.mapContainer}>
            <div style={styles.mapPlaceholder}>
              <span style={styles.mapIcon}>🗺️</span>
              <p>지도가 표시됩니다</p>
              {contactInfo?.address && (
                <p style={styles.mapAddress}>{contactInfo.address}</p>
              )}
            </div>
          </div>
        </Card>

        {/* 교통편 안내 */}
        <Card padding="large" style={{ marginTop: '24px' }}>
          <h2 style={styles.sectionTitle}>교통편 안내</h2>
          <div style={styles.transportList}>
            <div style={styles.transportItem}>
              <span style={styles.transportIcon}>🚇</span>
              <div style={styles.transportInfo}>
                <span style={styles.transportLabel}>지하철</span>
                <span style={styles.transportValue}>
                  OO역 O번 출구에서 도보 5분
                </span>
              </div>
            </div>
            <div style={styles.transportItem}>
              <span style={styles.transportIcon}>🚌</span>
              <div style={styles.transportInfo}>
                <span style={styles.transportLabel}>버스</span>
                <span style={styles.transportValue}>
                  간선: OOO, OOO번 / 지선: OOO, OOO번
                </span>
              </div>
            </div>
            <div style={styles.transportItem}>
              <span style={styles.transportIcon}>🚗</span>
              <div style={styles.transportInfo}>
                <span style={styles.transportLabel}>자가용</span>
                <span style={styles.transportValue}>
                  건물 지하 주차장 이용 가능 (2시간 무료)
                </span>
              </div>
            </div>
          </div>
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
  content: {},
  sectionTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: 0,
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
    alignItems: 'flex-start',
  },
  contactIcon: {
    fontSize: '24px',
    width: '40px',
    height: '40px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contactLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  contactValue: {
    ...typography.bodyL,
    color: colors.neutral800,
  },
  contactLink: {
    ...typography.bodyL,
    color: colors.primary,
    textDecoration: 'none',
  },
  mapContainer: {
    height: '400px',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.neutral500,
  },
  mapIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  mapAddress: {
    ...typography.bodyS,
    marginTop: '8px',
    color: colors.neutral600,
  },
  transportList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  transportItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  transportIcon: {
    fontSize: '24px',
  },
  transportInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  transportLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
    fontWeight: 500,
  },
  transportValue: {
    ...typography.bodyM,
    color: colors.neutral700,
  },
};
