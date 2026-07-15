/**
 * PublicScreenSetViewer — screen_set QR 모바일 세로형 공개 뷰어
 *
 * WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1 / WO-B
 *
 * Route 진입: /qr/:slug (landingType='screen_set') → QrLandingPage 가 이 컴포넌트로 위임.
 * 태블릿과 **같은 Screen Set 원본**(공용 resolveScreenSetSections 산출 sections)을 소비하되,
 * 렌더 채널이 다르므로 다음처럼 분리한다.
 *
 *   태블릿 화면 : 대기 영상(idle_media) → 터치 안내 → 본 콘텐츠
 *   QR 모바일   : (대기 영상 없이) 코너 설명 → 정보 콘텐츠 → 제품 목록 → 상세
 *
 * - idle_media(대기 영상)는 **태블릿 전용** — 여기서 렌더하지 않는다(사용자는 이미 스캔해 열람 의사 표시).
 * - qr_guide 의 QR 이미지도 렌더하지 않는다(모바일에서 자기 자신 QR 중복 표시 방지).
 * - 무인증 접근. 콘텐츠 원본을 복사/재작성하지 않는다.
 */

import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { colors } from '../../styles/theme';
import { ContentRenderer } from '@o4o/content-editor';
import type { QrScreenSet, QrScreenSetSection } from '../../api/storeQr';

interface ContentCard {
  itemId: string;
  sourceBadge?: string;
  title?: string;
  summary?: string;
  thumbnailUrl?: string;
  relatedProductName?: string;
  hasDetail?: boolean;
  detail?: { html?: string } | null;
}

interface ProductCard {
  id: string;
  type?: string;
  name?: string;
  price?: number | null;
  priceDisplay?: string | null;
  imageUrl?: string | null;
}

function formatPrice(p: ProductCard): string | null {
  if (typeof p.price === 'number' && p.price > 0) return `${p.price.toLocaleString('ko-KR')}원`;
  if (p.priceDisplay && p.priceDisplay.trim()) return p.priceDisplay;
  return null;
}

export default function PublicScreenSetViewer({ screenSet }: { screenSet: QrScreenSet }) {
  const [openCard, setOpenCard] = useState<ContentCard | null>(null);

  // idle_media(대기영상) + qr_guide(QR 중복) + product_content(비활성)는 모바일에서 제외.
  //   나머지 섹션을 sortOrder 순서대로 세로 렌더.
  const sections = [...screenSet.sections]
    .filter((s) => s.blockType !== 'idle_media' && s.blockType !== 'qr_guide' && s.blockType !== 'product_content')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const cornerBody = (() => {
    const s = screenSet.sections.find((x) => x.blockType === 'corner_description');
    const d = (s?.data ?? {}) as { title?: string; body?: string };
    return d.body && d.body.trim() ? d.body : null;
  })();

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <h1 style={styles.cornerTitle}>{screenSet.name || '코너 안내'}</h1>
          {cornerBody && <p style={styles.cornerBody}>{cornerBody}</p>}
        </header>

        {sections.map((section, idx) => (
          <SectionBlock
            key={`${section.blockType}-${idx}`}
            section={section}
            onOpenCard={setOpenCard}
          />
        ))}

        <footer style={styles.footer}>
          <QrCode size={14} style={{ color: colors.neutral400 }} />
          <span style={styles.footerText}>O4O Platform</span>
        </footer>
      </div>

      {/* 콘텐츠 상세 — content_list 카드 탭 시 모달(ContentRenderer, DOMPurify) */}
      {openCard && openCard.detail?.html && (
        <div style={styles.modalOverlay} onClick={() => setOpenCard(null)} role="presentation">
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ minWidth: 0 }}>
                {openCard.sourceBadge && <span style={styles.badge}>{openCard.sourceBadge}</span>}
                <h2 style={styles.modalTitle}>{openCard.title}</h2>
              </div>
              <button onClick={() => setOpenCard(null)} style={styles.modalClose} aria-label="닫기">✕</button>
            </div>
            <div style={styles.modalBody}>
              <ContentRenderer html={openCard.detail.html} variant="guide" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  onOpenCard,
}: {
  section: QrScreenSetSection;
  onOpenCard: (c: ContentCard) => void;
}) {
  // corner_description 은 header 에서 이미 렌더 → 본문 반복 안 함.
  if (section.blockType === 'corner_description') return null;

  if (section.blockType === 'content_list') {
    const items = (section.data?.items as ContentCard[] | undefined) ?? [];
    if (items.length === 0) return null;
    return (
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>코너 콘텐츠</h2>
        <div style={styles.cardList}>
          {items.map((c) => {
            const clickable = !!c.hasDetail && !!c.detail?.html;
            return (
              <div
                key={c.itemId}
                onClick={clickable ? () => onOpenCard(c) : undefined}
                style={{ ...styles.card, cursor: clickable ? 'pointer' : 'default' }}
              >
                {c.thumbnailUrl && (
                  <div style={styles.cardThumb}>
                    <img src={c.thumbnailUrl} alt="" style={styles.cardThumbImg} />
                  </div>
                )}
                <div style={styles.cardBody}>
                  {c.sourceBadge && <span style={styles.badge}>{c.sourceBadge}</span>}
                  {c.title && <span style={styles.cardTitle}>{c.title}</span>}
                  {c.summary && <span style={styles.cardSummary}>{c.summary}</span>}
                  {c.relatedProductName && <span style={styles.cardRelated}>{c.relatedProductName}</span>}
                  {clickable && <span style={styles.cardMore}>자세히 보기 ›</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (section.blockType === 'product_list') {
    const products = (section.data?.products as ProductCard[] | undefined) ?? [];
    if (products.length === 0) return null;
    return (
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>제품</h2>
        <div style={styles.productGrid}>
          {products.map((p) => {
            const price = formatPrice(p);
            return (
              <div key={`${p.type}-${p.id}`} style={styles.productCard}>
                <div style={styles.productImgArea}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name || ''} style={styles.productImg} />
                  ) : (
                    <span style={{ fontSize: 28, color: colors.neutral300 }}>📦</span>
                  )}
                </div>
                <div style={styles.productInfo}>
                  <span style={styles.productName}>{p.name || '상품'}</span>
                  {price && <span style={styles.productPrice}>{price}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return null;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.neutral100,
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
  },
  wrap: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  cornerTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
    lineHeight: 1.3,
    wordBreak: 'keep-all',
  },
  cornerBody: {
    fontSize: '15px',
    color: colors.neutral600,
    lineHeight: 1.6,
    margin: '12px 0 0',
    whiteSpace: 'pre-wrap',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '18px 20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: colors.neutral500,
    margin: '0 0 12px',
    letterSpacing: '0.02em',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    display: 'flex',
    gap: '12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardThumb: {
    width: '84px',
    flexShrink: 0,
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 12px 12px 0',
    minWidth: 0,
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    padding: '2px 8px',
  },
  cardTitle: { fontSize: '15px', fontWeight: 600, color: colors.neutral800, lineHeight: 1.35, wordBreak: 'keep-all' },
  cardSummary: { fontSize: '13px', color: colors.neutral500, lineHeight: 1.5 },
  cardRelated: { fontSize: '12px', color: colors.neutral400 },
  cardMore: { fontSize: '13px', fontWeight: 600, color: colors.primary, marginTop: '2px' },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  productCard: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  productImgArea: {
    width: '100%',
    aspectRatio: '1/1',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImg: { width: '100%', height: '100%', objectFit: 'cover' },
  productInfo: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' },
  productName: { fontSize: '14px', fontWeight: 500, color: colors.neutral800, lineHeight: 1.35, wordBreak: 'keep-all' },
  productPrice: { fontSize: '14px', fontWeight: 700, color: colors.primary },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 0 16px',
  },
  footerText: { fontSize: '12px', color: colors.neutral400 },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: '480px',
    maxHeight: '88vh',
    backgroundColor: '#fff',
    borderRadius: '16px 16px 0 0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '18px 18px 12px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  modalTitle: { fontSize: '17px', fontWeight: 700, color: colors.neutral800, margin: '6px 0 0', lineHeight: 1.35, wordBreak: 'keep-all' },
  modalClose: {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    fontSize: '16px',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '16px 18px 24px',
    overflowY: 'auto',
    fontSize: '15px',
    color: colors.neutral700,
    lineHeight: 1.7,
  },
};
