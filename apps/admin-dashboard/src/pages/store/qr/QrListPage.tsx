/**
 * QrListPage
 *
 * WO-STORE-QR-PRODUCT-DIRECT-LINK-V1
 *
 * QR 코드 목록 페이지
 * - 내 QR 코드 목록 조회
 * - QR 이미지/전단지 다운로드
 * - QR 코드 삭제
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { qrApi, QrCode } from '@/api/qr.api';

const LANDING_TYPE_LABELS: Record<string, string> = {
  product: '상품',
  promotion: '프로모션',
  page: '페이지',
  link: '링크',
};

export default function QrListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<QrCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const LIMIT = 20;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await qrApi.list({ page: p, limit: LIMIT });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" QR 코드를 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      await qrApi.remove(id);
      await load(page);
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadImage = async (id: string) => {
    setDownloadingId(id);
    try {
      const blob = await qrApi.downloadImage(id, 'png', 256);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('다운로드에 실패했습니다.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadFlyer = async (id: string) => {
    setDownloadingId(id);
    try {
      const blob = await qrApi.downloadFlyer(id, 1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flyer-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('전단지 다운로드에 실패했습니다.');
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>QR 코드 관리</h1>
          <p style={styles.subtitle}>총 {total}개의 QR 코드</p>
        </div>
        <button style={styles.createBtn} onClick={() => navigate('/store/qr/create')}>
          + 새 QR 생성
        </button>
      </div>

      {loading ? (
        <div style={styles.center}>불러오는 중...</div>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>등록된 QR 코드가 없습니다.</p>
          <button style={styles.createBtn} onClick={() => navigate('/store/qr/create')}>
            첫 QR 코드 만들기
          </button>
        </div>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>제목</th>
                  <th style={styles.th}>슬러그</th>
                  <th style={styles.th}>유형</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>스캔 수</th>
                  <th style={styles.th}>생성일</th>
                  <th style={styles.th}>작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.itemTitle}>{item.title}</span>
                      {item.description && (
                        <span style={styles.itemDesc}>{item.description}</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <code style={styles.slug}>{item.slug}</code>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge}>
                        {LANDING_TYPE_LABELS[item.landingType] ?? item.landingType}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, ...(item.isActive ? styles.statusActive : styles.statusInactive) }}>
                        {item.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{item.scanCount.toLocaleString()}</td>
                    <td style={styles.td}>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionBtn}
                          onClick={() => handleDownloadImage(item.id)}
                          disabled={downloadingId === item.id}
                          title="QR 이미지 다운로드"
                        >
                          QR
                        </button>
                        <button
                          style={styles.actionBtn}
                          onClick={() => handleDownloadFlyer(item.id)}
                          disabled={downloadingId === item.id}
                          title="전단지 PDF 다운로드"
                        >
                          전단지
                        </button>
                        <button
                          style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                          onClick={() => handleDelete(item.id, item.title)}
                          disabled={deletingId === item.id}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </button>
              <span style={styles.pageInfo}>{page} / {totalPages}</span>
              <button
                style={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  createBtn: {
    padding: '10px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  center: {
    textAlign: 'center',
    padding: '80px',
    color: '#6b7280',
  },
  empty: {
    textAlign: 'center',
    padding: '80px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  tableWrap: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    padding: '12px 16px',
    background: '#f9fafb',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 16px',
    color: '#374151',
    verticalAlign: 'middle' as const,
  },
  itemTitle: {
    display: 'block',
    fontWeight: 500,
    color: '#111827',
  },
  itemDesc: {
    display: 'block',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  slug: {
    background: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    background: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusActive: {
    background: '#f0fdf4',
    color: '#16a34a',
  },
  statusInactive: {
    background: '#f9fafb',
    color: '#9ca3af',
  },
  actions: {
    display: 'flex',
    gap: '6px',
  },
  actionBtn: {
    padding: '4px 10px',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  deleteBtn: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
};
