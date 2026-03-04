/**
 * StoreQRPage — 매장 QR 자료 관리
 *
 * WO-O4O-STORE-QR-LIBRARY-INTEGRATION-V1
 *
 * Library에서 자료를 선택하여 QR 코드로 연결할 수 있는 관리 페이지.
 * 선택된 자료의 fileUrl을 QR 코드 대상으로 사용.
 */

import { useState } from 'react';
import { QrCode, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';
import { StoreLibrarySelectorModal } from '../../components/store/StoreLibrarySelectorModal';
import type { LibrarySelectorResult } from '../../components/store/StoreLibrarySelectorModal';

interface QRItem {
  id: string;
  title: string;
  category: string | null;
  fileUrl: string | null;
}

export function StoreQRPage() {
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const handleSelect = (item: LibrarySelectorResult) => {
    // 중복 방지
    if (qrItems.some((q) => q.id === item.id)) {
      setShowSelector(false);
      return;
    }
    setQrItems((prev) => [...prev, item]);
    setShowSelector(false);
  };

  const handleRemove = (id: string) => {
    setQrItems((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/store" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
              매장 관리
            </Link>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>QR 자료</span>
          </div>
          <h1 style={styles.title}>QR 자료 관리</h1>
          <p style={styles.subtitle}>Library에서 자료를 선택하여 QR 코드로 연결합니다</p>
        </div>
        <button onClick={() => setShowSelector(true)} style={styles.addBtn}>
          <Plus size={16} />
          자료 선택
        </button>
      </div>

      {/* QR Item List */}
      <div style={styles.body}>
        {qrItems.length === 0 ? (
          <div style={styles.emptyState}>
            <QrCode size={48} style={{ color: colors.neutral300, marginBottom: '12px' }} />
            <p style={{ color: colors.neutral500, fontSize: '14px', margin: 0 }}>
              QR 코드에 연결할 자료가 없습니다
            </p>
            <p style={{ color: colors.neutral400, fontSize: '13px', marginTop: '4px' }}>
              "자료 선택" 버튼을 눌러 Library에서 자료를 추가하세요
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {qrItems.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardIcon}>
                  <QrCode size={24} style={{ color: colors.primary }} />
                </div>
                <div style={styles.cardInfo}>
                  <p style={styles.cardTitle}>{item.title}</p>
                  {item.category && (
                    <span style={styles.cardCategory}>{item.category}</span>
                  )}
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.cardLink}
                    >
                      <ExternalLink size={12} /> URL 열기
                    </a>
                  )}
                </div>
                <button onClick={() => handleRemove(item.id)} style={styles.removeBtn}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Library Selector Modal */}
      <StoreLibrarySelectorModal
        open={showSelector}
        onSelect={handleSelect}
        onClose={() => setShowSelector(false)}
      />
    </div>
  );
}

// ── 스타일 ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  body: {
    minHeight: '300px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    border: `1px dashed ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: colors.neutral50,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    backgroundColor: '#fff',
  },
  cardIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  cardCategory: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: colors.neutral100,
    fontSize: '11px',
    color: colors.neutral500,
  },
  cardLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '6px',
    fontSize: '12px',
    color: colors.primary,
    textDecoration: 'none',
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.neutral400,
    cursor: 'pointer',
    borderRadius: '6px',
    flexShrink: 0,
  },
};
