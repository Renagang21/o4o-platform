/**
 * ProductPoolPage - 파트너 제품 풀
 *
 * Work Order: WO-O4O-PARTNER-HUB-CORE-V1
 *
 * 커미션 정책이 설정된 제품 목록.
 * 파트너가 홍보할 제품을 선택하고 Referral 링크를 생성.
 */

import { useState, useEffect, useCallback } from 'react';
import { Package, Link2, Check } from 'lucide-react';
import { partnerAffiliateApi } from '../../lib/api/index.js';
import type { PoolProduct } from '../../lib/api/index.js';

export default function ProductPoolPage() {
  const [products, setProducts] = useState<PoolProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await partnerAffiliateApi.getProductPool();
      setProducts(data);
      setLoading(false);
    })();
  }, []);

  const handleGenerateLink = useCallback(async (productId: string) => {
    setGenerating(productId);
    const result = await partnerAffiliateApi.createReferralLink(productId);
    setGenerating(null);

    if (result) {
      const fullUrl = `${window.location.origin}${result.referral_url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(productId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Product Pool</h1>
        <p style={styles.subtitle}>커미션이 설정된 제품을 홍보하고 수익을 얻으세요</p>
      </div>

      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          <Package size={40} style={{ color: '#94a3b8' }} />
          <p style={styles.emptyText}>현재 홍보 가능한 제품이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {products.map((p) => (
            <div key={p.product_id} style={styles.card}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.product_name} style={styles.cardImage} />
              ) : (
                <div style={styles.cardImagePlaceholder}>
                  <Package size={32} style={{ color: '#94a3b8' }} />
                </div>
              )}
              <div style={styles.cardBody}>
                <p style={styles.cardSupplier}>{p.supplier_name}</p>
                <h3 style={styles.cardName}>{p.product_name}</h3>
                <p style={styles.cardPrice}>₩{p.price_general.toLocaleString()}</p>
                <div style={styles.commissionBadge}>
                  커미션 ₩{p.commission_per_unit.toLocaleString()} / 개
                </div>
                <button
                  onClick={() => handleGenerateLink(p.product_id)}
                  disabled={generating === p.product_id}
                  style={{
                    ...styles.linkBtn,
                    ...(copiedId === p.product_id ? styles.linkBtnCopied : {}),
                  }}
                >
                  {copiedId === p.product_id ? (
                    <><Check size={14} /> 복사 완료</>
                  ) : generating === p.product_id ? (
                    '생성 중...'
                  ) : (
                    <><Link2 size={14} /> Referral 링크 생성</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover' as const,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '180px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: '16px',
  },
  cardSupplier: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 4px 0',
  },
  cardName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
    lineHeight: 1.3,
  },
  cardPrice: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  commissionBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  linkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #2563eb',
    backgroundColor: '#fff',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  linkBtnCopied: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    color: '#166534',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '14px',
    margin: 0,
  },
};
