/**
 * ProductionTypeSelectorModal — 매장 제작 자료 만들기 (유형 선택)
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-CREATE-FLOW-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-UNIFY-V1:
 *   - target/route/icon 카탈로그를 productionTargets 로 추출 (StartProductionModal 과 공유).
 *   - navigate payload 를 buildProductionState() 헬퍼로 표준화.
 *
 * "매장 제작 자료" 화면의 [매장 제작 자료 만들기] 버튼 진입용 모달.
 * 사용자가 원본 자료를 선택하지 않고 곧장 제작 유형을 고르는 흐름.
 *
 * StartProductionModal 과의 차이:
 *   - StartProductionModal: 자료 선택 후 진입 (source.items 필수)
 *   - ProductionTypeSelectorModal: 자료 없이 빈 source 로 진입 (메뉴 직접 진입과 동등)
 *
 * 카드 4종 화이트리스트 고정 (productionTargets.PRODUCTION_TARGET_CATALOG):
 *   POP / QR 코드 / 블로그 / 상품 상세설명
 *
 * 디지털 사이니지는 의도적으로 제외 (KPA Signage 구조 freeze 보호).
 * 상품 정보 제작(product-info-creator)도 본 모달 범위 외.
 *
 * 수신측(StorePopPage / StoreQRPage / StoreProductDescriptionsPage / PharmacyBlogPage)은
 * source.items.length === 0 일 때 early return 으로 메뉴 직접 진입과 동일하게 동작한다.
 */

import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { colors } from '../../styles/theme';
import {
  PRODUCTION_TARGET_CATALOG,
  buildProductionState,
  type ProductionTargetMeta,
} from './productionTargets';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProductionTypeSelectorModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleSelect = (card: ProductionTargetMeta) => {
    navigate(card.route, { state: buildProductionState({ target: card.key }) });
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>매장 제작 자료 만들기</h2>
            <p style={styles.subtitle}>제작할 유형을 선택하세요.</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.grid}>
            {PRODUCTION_TARGET_CATALOG.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => handleSelect(card)}
                style={styles.card}
              >
                <div style={{ ...styles.iconWrap, color: card.iconColor }}>
                  <card.Icon size={22} />
                </div>
                <div style={styles.cardBody}>
                  <span style={styles.cardLabel}>{card.label}</span>
                  <span style={styles.cardDescription}>{card.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: colors.white,
    borderRadius: '12px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.neutral400,
    cursor: 'pointer',
    padding: '4px',
  },
  body: {
    padding: '20px 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.1s, background 0.1s',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    flexShrink: 0,
    background: colors.neutral50,
    borderRadius: '8px',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  cardLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  cardDescription: {
    fontSize: '12px',
    color: colors.neutral500,
    lineHeight: 1.4,
  },
};
