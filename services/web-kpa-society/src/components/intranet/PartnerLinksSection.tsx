/**
 * PartnerLinksSection - 협력업체 링크 영역 (흘러가는 아이콘)
 * WO-KPA-INTRANET-MAIN-V1-FINAL
 *
 * 권한: 지부 전용 관리, 분회는 노출만
 */

import { useEffect, useRef } from 'react';
import { colors } from '../../styles/theme';
import { PartnerLink } from '../../types/mainpage';

interface PartnerLinksSectionProps {
  partners: PartnerLink[];
  canEdit?: boolean;
  onEdit?: () => void;
}

export function PartnerLinksSection({ partners, canEdit = false, onEdit }: PartnerLinksSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activePartners = partners.filter((p) => p.isActive).sort((a, b) => a.order - b.order);

  // 자동 스크롤 효과
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || activePartners.length <= 4) return;

    let scrollAmount = 0;
    const scrollSpeed = 1;

    const scroll = () => {
      scrollAmount += scrollSpeed;
      if (scrollAmount >= scrollContainer.scrollWidth / 2) {
        scrollAmount = 0;
      }
      scrollContainer.scrollLeft = scrollAmount;
    };

    const interval = setInterval(scroll, 30);

    // 마우스 호버 시 정지
    const handleMouseEnter = () => clearInterval(interval);
    const handleMouseLeave = () => {
      const newInterval = setInterval(scroll, 30);
      scrollContainer.dataset.interval = String(newInterval);
    };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(interval);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [activePartners.length]);

  if (activePartners.length === 0) {
    if (!canEdit) return null;

    return (
      <div style={styles.emptySection}>
        <span style={styles.emptyText}>협력업체 링크가 없습니다.</span>
        <button style={styles.addButton} onClick={onEdit}>
          협력업체 추가
        </button>
      </div>
    );
  }

  // 무한 스크롤을 위해 아이템 복제
  const displayPartners = activePartners.length > 4
    ? [...activePartners, ...activePartners]
    : activePartners;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🤝 지역 협력업체</h3>
        {canEdit && (
          <button style={styles.editButton} onClick={onEdit}>
            관리
          </button>
        )}
      </div>

      <div ref={scrollRef} style={styles.scrollContainer}>
        <div style={styles.partnersWrapper}>
          {displayPartners.map((partner, idx) => (
            <a
              key={`${partner.id}-${idx}`}
              href={partner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.partnerItem}
              title={partner.name}
            >
              {partner.logoUrl ? (
                <img
                  src={partner.logoUrl}
                  alt={partner.name}
                  style={styles.partnerLogo}
                />
              ) : (
                <div style={styles.partnerPlaceholder}>
                  {partner.name.charAt(0)}
                </div>
              )}
              <span style={styles.partnerName}>{partner.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  scrollContainer: {
    overflow: 'hidden',
    width: '100%',
  },
  partnersWrapper: {
    display: 'flex',
    gap: '24px',
    width: 'max-content',
  },
  partnerItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
    minWidth: '100px',
  },
  partnerLogo: {
    width: '60px',
    height: '60px',
    objectFit: 'contain',
    borderRadius: '8px',
    backgroundColor: colors.neutral50,
  },
  partnerPlaceholder: {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    backgroundColor: colors.neutral200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
    color: colors.neutral500,
  },
  partnerName: {
    fontSize: '12px',
    color: colors.neutral600,
    textAlign: 'center',
    maxWidth: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptySection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
    marginBottom: '24px',
  },
  emptyText: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
