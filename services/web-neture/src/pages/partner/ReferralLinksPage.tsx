/**
 * ReferralLinksPage - 내 Referral 링크 관리
 *
 * Work Order: WO-O4O-PARTNER-HUB-CORE-V1
 * Refined: WO-O4O-PARTNER-HUB-REFINEMENT-V1
 *
 * Desktop: Table (Product | Store | Referral URL | Created date | Actions)
 * Mobile: Card list
 */

import { useState, useEffect, useCallback } from 'react';
import { Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { partnerAffiliateApi } from '../../lib/api/index.js';
import type { ReferralLink } from '../../lib/api/index.js';

export default function ReferralLinksPage() {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await partnerAffiliateApi.getReferralLinks();
      setLinks(data);
      setLoading(false);
    })();
  }, []);

  const buildUrl = useCallback((link: ReferralLink) => {
    if (link.store_slug && link.product_slug) {
      return `/store/${link.store_slug}/product/${link.product_slug}?ref=${link.referral_token}`;
    }
    return `/store/product/${link.product_id}?ref=${link.referral_token}`;
  }, []);

  const handleCopy = useCallback(async (link: ReferralLink) => {
    const url = `${window.location.origin}${buildUrl(link)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, [buildUrl]);

  const handleOpen = useCallback((link: ReferralLink) => {
    window.open(buildUrl(link), '_blank', 'noopener,noreferrer');
  }, [buildUrl]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Links</h1>
        <p style={styles.subtitle}>생성한 Referral 링크를 관리하고 공유하세요</p>
      </div>

      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : links.length === 0 ? (
        <div style={styles.emptyState}>
          <Link2 size={40} style={{ color: '#94a3b8' }} />
          <p style={styles.emptyText}>생성된 Referral 링크가 없습니다.</p>
          <p style={styles.emptyHint}>Products에서 제품을 선택하여 링크를 생성하세요.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="referral-links-table" style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Store</th>
                  <th style={styles.th}>Referral URL</th>
                  <th style={styles.th}>Created</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const url = buildUrl(link);
                  const isCopied = copiedId === link.id;
                  return (
                    <tr key={link.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{link.product_name}</div>
                        {link.commission_per_unit != null && (
                          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>
                            커미션 ₩{link.commission_per_unit.toLocaleString()}/개
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, color: '#64748b', fontSize: '13px' }}>
                        {link.store_slug || '-'}
                      </td>
                      <td style={styles.td}>
                        <code style={styles.urlCode}>{url}</code>
                      </td>
                      <td style={{ ...styles.td, color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {new Date(link.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleCopy(link)}
                            style={{
                              ...styles.actionBtn,
                              ...(isCopied ? styles.actionBtnDone : {}),
                            }}
                            title="URL 복사"
                          >
                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                            {isCopied ? '복사됨' : 'Copy'}
                          </button>
                          <button
                            onClick={() => handleOpen(link)}
                            style={styles.actionBtnOpen}
                            title="URL 열기"
                          >
                            <ExternalLink size={14} />
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="referral-links-cards" style={{ display: 'none' }}>
            {links.map((link) => {
              const url = buildUrl(link);
              const isCopied = copiedId === link.id;
              return (
                <div key={link.id} style={styles.card}>
                  <div style={styles.cardInfo}>
                    <h3 style={styles.cardName}>{link.product_name}</h3>
                    <p style={styles.cardMeta}>
                      가격: ₩{link.price_general.toLocaleString()}
                      {link.commission_per_unit != null && (
                        <> · 커미션: ₩{link.commission_per_unit.toLocaleString()}/개</>
                      )}
                    </p>
                    <div style={styles.urlRow}>
                      <code style={styles.urlCode}>{url}</code>
                    </div>
                    <p style={styles.cardDate}>
                      생성일: {new Date(link.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      onClick={() => handleCopy(link)}
                      style={{
                        ...styles.actionBtn,
                        ...(isCopied ? styles.actionBtnDone : {}),
                      }}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      {isCopied ? '복사됨' : 'URL 복사'}
                    </button>
                    <button onClick={() => handleOpen(link)} style={styles.actionBtnOpen}>
                      <ExternalLink size={14} />
                      열기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Responsive CSS */}
          <style>{`
            @media (max-width: 768px) {
              .referral-links-table { display: none !important; }
              .referral-links-cards { display: flex !important; flex-direction: column; gap: 12px; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    textAlign: 'left' as const,
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#1e293b',
  },
  urlCode: {
    fontSize: '12px',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    wordBreak: 'break-all' as const,
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #2563eb',
    backgroundColor: '#fff',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnDone: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    color: '#166534',
  },
  actionBtnOpen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  cardInfo: {
    flex: 1,
    minWidth: '200px',
  },
  cardName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  cardMeta: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  urlRow: {
    marginBottom: '4px',
  },
  cardDate: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '4px 0 0 0',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '14px',
    margin: 0,
  },
  emptyHint: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: 0,
  },
};
