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
 * WO-O4O-KPA-TABLET-QR-MOBILE-VIEWER-CONTENT-PARITY-FIX-V1:
 *   같은 Screen Set 원본은 콘텐츠 누락 없이 소비한다. 채널 차이는 콘텐츠 유무가 아니라 배치·이용 방식.
 *   - idle_media(대기 영상)는 **모바일에서도 표시**(상단 안내 미디어). 단 태블릿과 달리 "터치해서 진입"이
 *     아니라 영상 아래 본문을 바로 스크롤한다("화면을 터치하세요" 문구 미사용).
 *   - product_content 도 공통 원본의 일부 → 제외하지 않는다(산출 데이터 있을 때 ContentRenderer/카드 렌더).
 *   - **qr_guide 만 제외**(모바일에서 자기 자신 QR 중복 표시 방지).
 * - 무인증 접근. 콘텐츠 원본을 복사/재작성하지 않는다.
 */

import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { colors } from '../../styles/theme';
import { ContentRenderer } from '@o4o/content-editor';
import { toVideoEmbed } from '../../utils/videoEmbed';
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

interface IdleItem {
  type?: 'image' | 'video' | 'youtube' | 'vimeo';
  url?: string;
}

function formatPrice(p: ProductCard): string | null {
  if (typeof p.price === 'number' && p.price > 0) return `${p.price.toLocaleString('ko-KR')}원`;
  if (p.priceDisplay && p.priceDisplay.trim()) return p.priceDisplay;
  return null;
}

export default function PublicScreenSetViewer({ screenSet }: { screenSet: QrScreenSet }) {
  const [openCard, setOpenCard] = useState<ContentCard | null>(null);

  // WO-...-CONTENT-PARITY-FIX-V1: 모바일 제외는 **qr_guide 만**(자기 QR 중복 방지).
  //   idle_media 는 상단 미디어로 별도 렌더, corner_description 은 헤더에서 렌더 → 본문 섹션 루프에선 제외.
  const idleSection = screenSet.sections.find((s) => s.blockType === 'idle_media');
  const bodySections = [...screenSet.sections]
    .filter((s) => s.blockType !== 'qr_guide' && s.blockType !== 'idle_media' && s.blockType !== 'corner_description')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const cornerBody = (() => {
    const s = screenSet.sections.find((x) => x.blockType === 'corner_description');
    const d = (s?.data ?? {}) as { title?: string; body?: string };
    return d.body && d.body.trim() ? d.body : null;
  })();

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        {/* 상단 안내 미디어(대기영상) — 태블릿과 달리 터치 진입 없이 아래 본문을 바로 스크롤한다. */}
        {idleSection && <IdleMediaBlock section={idleSection} />}

        <header style={styles.header}>
          <h1 style={styles.cornerTitle}>{screenSet.name || '코너 안내'}</h1>
          {cornerBody && <p style={styles.cornerBody}>{cornerBody}</p>}
        </header>

        {bodySections.map((section, idx) => (
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

// 상단 안내 미디어 — idle_media 첫 항목. 태블릿 attract(터치 진입)과 달리 모바일은 표시만.
function IdleMediaBlock({ section }: { section: QrScreenSetSection }) {
  const items = (section.data?.items as IdleItem[] | undefined) ?? [];
  const first = items[0];
  if (!first || !first.url) return null;
  const type = first.type ?? 'image';
  const embed = type === 'youtube' || type === 'vimeo' ? toVideoEmbed(first.url).embedUrl : null;
  return (
    <section style={styles.idleWrap}>
      <div style={styles.idleMediaBox}>
        {type === 'image' && <img src={first.url} alt="" style={styles.idleMedia} />}
        {type === 'video' && (
          <video src={first.url} style={styles.idleMedia} controls playsInline preload="metadata" />
        )}
        {(type === 'youtube' || type === 'vimeo') && embed && (
          <iframe
            src={embed}
            title="코너 안내 영상"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={styles.idleMedia}
          />
        )}
      </div>
      {/* 태블릿의 "화면을 터치하세요"는 사용하지 않는다(모바일은 스크롤). */}
      <p style={styles.idleCaption}>
        이 코너의 안내 영상을 확인하세요
        <span style={styles.idleCaptionEn}>Watch this corner introduction</span>
      </p>
    </section>
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

  // WO-...-CONTENT-PARITY-FIX-V1: product_content 도 공통 원본의 일부 → 제외하지 않는다.
  //   공용 resolver 산출(data)에 표시 가능한 본문/제목이 있으면 기존 ContentRenderer/카드로 렌더한다.
  //   (현재 resolver 는 productRef/contentId 참조만 산출 → 표시 본문 없으면 태블릿과 동일하게 미표시.
  //    resolver 변경 없이 데이터가 채워지면 자동 렌더되도록 방어적으로 처리.)
  if (section.blockType === 'product_content') {
    const d = (section.data ?? {}) as { title?: string; summary?: string; html?: string; body?: string };
    const html = (d.html || d.body || '').trim();
    const title = (d.title || '').trim();
    const summary = (d.summary || '').trim();
    if (!html && !title && !summary) return null; // 참조만 있고 표시 본문 없음 → 태블릿과 동일 미표시
    return (
      <section style={styles.section}>
        {title && <h2 style={styles.sectionLabel}>{title}</h2>}
        {summary && <p style={styles.cardSummary}>{summary}</p>}
        {html && (
          <div style={{ marginTop: title || summary ? 12 : 0 }}>
            <ContentRenderer html={html} variant="guide" />
          </div>
        )}
      </section>
    );
  }

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
  idleWrap: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  idleMediaBox: {
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  idleMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    border: 'none',
    display: 'block',
  },
  idleCaption: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    margin: 0,
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
    textAlign: 'center',
  },
  idleCaptionEn: {
    fontSize: '12px',
    fontWeight: 400,
    color: colors.neutral400,
    letterSpacing: '0.02em',
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
