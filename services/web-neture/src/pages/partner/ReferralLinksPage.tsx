/**
 * ReferralLinksPage - 내 Referral 링크 관리
 *
 * Work Order: WO-O4O-PARTNER-HUB-CORE-V1
 *
 * 파트너의 referral 링크 목록 + URL 복사 기능.
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Referral Links</h1>
        <p style={styles.subtitle}>생성한 Referral 링크를 관리하고 공유하세요</p>
      </div>

      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : links.length === 0 ? (
        <div style={styles.emptyState}>
          <Link2 size={40} style={{ color: '#94a3b8' }} />
          <p style={styles.emptyText}>생성된 Referral 링크가 없습니다.</p>
          <p style={styles.emptyHint}>Product Pool에서 제품을 선택하여 링크를 생성하세요.</p>
        </div>
      ) : (
        <div style={styles.list}>
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
                      ...styles.copyBtn,
                      ...(isCopied ? styles.copyBtnDone : {}),
                    }}
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isCopied ? '복사됨' : 'URL 복사'}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.openBtn}
                  >
                    <ExternalLink size={14} />
                    열기
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
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
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
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
  urlCode: {
    fontSize: '12px',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
    wordBreak: 'break-all' as const,
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
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #2563eb',
    backgroundColor: '#fff',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  copyBtnDone: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    color: '#166534',
  },
  openBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
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
