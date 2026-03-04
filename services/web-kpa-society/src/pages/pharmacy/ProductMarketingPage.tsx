/**
 * ProductMarketingPage — 상품 마케팅 그래프
 *
 * WO-O4O-PRODUCT-MARKETING-GRAPH-V1
 *
 * 개별 상품에 연결된 마케팅 자산(QR, Library)을 조회하고 관리.
 * Route: /store/commerce/products/:productId/marketing
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  QrCode,
  BookOpen,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Link2,
  BarChart3,
} from 'lucide-react';
import { colors } from '../../styles/theme';
import {
  getProductMarketing,
  unlinkProductMarketingAsset,
} from '../../api/productMarketing';
import type {
  ProductMarketingData,
  ProductQrAsset,
  ProductLibraryAsset,
} from '../../api/productMarketing';

export function ProductMarketingPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProductMarketingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await getProductMarketing(productId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUnlink = async (linkId: string) => {
    if (!productId) return;
    try {
      const res = await unlinkProductMarketingAsset(productId, linkId);
      if (res.success) fetchData();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <RefreshCw size={24} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <Link2 size={48} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/store/commerce/products" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
              상품 관리
            </Link>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>마케팅 자산</span>
          </div>
          <h1 style={styles.title}>마케팅 자산 그래프</h1>
          <p style={styles.subtitle}>이 상품에 연결된 QR 코드, 자료실 항목 등을 확인합니다</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={14} />
            돌아가기
          </button>
          <button onClick={fetchData} style={styles.refreshBtn}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* Summary KPI */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <Link2 size={20} style={{ color: colors.primary, marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{data.summary.totalLinks}</p>
          <p style={styles.kpiLabel}>총 연결</p>
        </div>
        <div style={styles.kpiCard}>
          <QrCode size={20} style={{ color: '#059669', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{data.summary.qrCount}</p>
          <p style={styles.kpiLabel}>QR 코드</p>
        </div>
        <div style={styles.kpiCard}>
          <BookOpen size={20} style={{ color: '#7c3aed', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{data.summary.libraryCount}</p>
          <p style={styles.kpiLabel}>자료실</p>
        </div>
        <div style={styles.kpiCard}>
          <BarChart3 size={20} style={{ color: '#f59e0b', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{data.summary.totalScans.toLocaleString()}</p>
          <p style={styles.kpiLabel}>총 스캔</p>
        </div>
      </div>

      {/* QR Assets */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QrCode size={16} style={{ color: '#059669' }} />
            <h2 style={styles.sectionTitle}>연결된 QR 코드</h2>
          </div>
        </div>
        {data.qrAssets.length === 0 ? (
          <p style={styles.emptyText}>연결된 QR 코드가 없습니다</p>
        ) : (
          <div style={styles.assetList}>
            {data.qrAssets.map((qr: ProductQrAsset) => {
              const link = data.links.find(l => l.assetType === 'qr' && l.assetId === qr.id);
              return (
                <div key={qr.id} style={styles.assetItem}>
                  <div style={styles.assetIcon}>
                    <QrCode size={14} style={{ color: '#059669' }} />
                  </div>
                  <div style={styles.assetInfo}>
                    <p style={styles.assetTitle}>{qr.title}</p>
                    <span style={styles.assetMeta}>
                      /qr/{qr.slug} · 스캔 {qr.scanCount}회
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      to={`/store/marketing/qr`}
                      style={styles.assetAction}
                      title="QR 관리"
                    >
                      <ExternalLink size={13} />
                    </Link>
                    {link && (
                      <button
                        onClick={() => handleUnlink(link.id)}
                        style={styles.unlinkBtn}
                        title="연결 해제"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Library Assets */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} style={{ color: '#7c3aed' }} />
            <h2 style={styles.sectionTitle}>연결된 자료실 항목</h2>
          </div>
        </div>
        {data.libraryAssets.length === 0 ? (
          <p style={styles.emptyText}>연결된 자료실 항목이 없습니다</p>
        ) : (
          <div style={styles.assetList}>
            {data.libraryAssets.map((lib: ProductLibraryAsset) => {
              const link = data.links.find(l => l.assetType === 'library' && l.assetId === lib.id);
              return (
                <div key={lib.id} style={styles.assetItem}>
                  <div style={{ ...styles.assetIcon, borderColor: '#7c3aed20', backgroundColor: '#f5f3ff' }}>
                    <BookOpen size={14} style={{ color: '#7c3aed' }} />
                  </div>
                  <div style={styles.assetInfo}>
                    <p style={styles.assetTitle}>{lib.title}</p>
                    <span style={styles.assetMeta}>
                      {lib.category || '기타'} · {lib.mimeType || '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {lib.id && (
                      <Link
                        to={`/store/operation/library/${lib.id}`}
                        style={styles.assetAction}
                        title="자료 상세"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    )}
                    {link && (
                      <button
                        onClick={() => handleUnlink(link.id)}
                        style={styles.unlinkBtn}
                        title="연결 해제"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 스타일 ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '960px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
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
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  kpiCard: {
    padding: '20px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  kpiLabel: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  section: {
    padding: '20px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
    marginBottom: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  emptyText: {
    fontSize: '13px',
    color: colors.neutral400,
    textAlign: 'center',
    padding: '20px 0',
    margin: 0,
  },
  assetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  assetItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: colors.neutral50,
  },
  assetIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #05966920',
    flexShrink: 0,
  },
  assetInfo: {
    flex: 1,
    minWidth: 0,
  },
  assetTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  assetMeta: {
    fontSize: '11px',
    color: colors.neutral400,
    fontFamily: 'monospace',
  },
  assetAction: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    color: colors.neutral400,
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
  },
  unlinkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    color: '#DC2626',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
  },
};
