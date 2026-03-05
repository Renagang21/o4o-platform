/**
 * SupplierProductSettingsPage - 공급자 제품 설정
 *
 * 유통 채널 설정:
 * - 서비스 유통 (기존)
 * - B2B 조달 유통 (신규)
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1: mock 제거, API 연동 준비
 */

import { Link } from 'react-router-dom';

export function SupplierProductSettingsPage() {
  // API 연동 준비 중 - Product 타입 매핑 및 API 통합 필요
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/workspace/supplier/products" style={styles.backLink}>
          ← 상품 목록
        </Link>
      </div>
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>상품 정보가 없습니다.</p>
        <p style={styles.emptySubText}>
          상품을 선택하면 유통 설정이 표시됩니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '32px',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '12px',
  },
  emptyState: {
    padding: '60px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  emptySubText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
};
