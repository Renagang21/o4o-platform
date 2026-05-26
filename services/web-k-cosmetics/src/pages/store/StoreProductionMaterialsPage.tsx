/**
 * StoreProductionMaterialsPage — K-Cosmetics 내 자료함 / 제작 자료
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CROSSSERVICE-PHASE2-C-V1
 *
 * 기본 진입 구조. Phase 2-C 범위: 목록 표시만.
 * AI 생성·편집 흐름은 후속 WO 대상.
 */

import { type CSSProperties } from 'react';
import { FileEdit } from 'lucide-react';

export default function StoreProductionMaterialsPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.breadcrumb}>
          <span>내 자료함</span>
          <span style={{ color: '#94a3b8' }}>/</span>
          <span style={{ color: '#334155' }}>제작 자료</span>
        </div>
        <h1 style={styles.title}>
          <FileEdit size={20} style={{ color: '#3b82f6' }} />
          제작 자료
        </h1>
        <p style={styles.subtitle}>
          AI로 생성하거나 편집한 POP·QR·블로그·상품 상세설명 제작 결과물을 관리합니다.
        </p>
      </div>

      <div style={styles.empty}>
        <FileEdit size={36} style={{ color: '#cbd5e1', marginBottom: 14 }} />
        <p style={{ margin: 0, color: '#475569', fontSize: 15, fontWeight: 500 }}>
          저장된 제작 자료가 없습니다.
        </p>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
          내 자료함 → 콘텐츠에서 콘텐츠를 선택한 뒤 제작 작업을 시작하세요.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '6px 0 0',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textAlign: 'center',
  },
};
