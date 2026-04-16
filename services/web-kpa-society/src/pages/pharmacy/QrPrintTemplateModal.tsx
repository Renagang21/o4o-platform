/**
 * QrPrintTemplateModal
 *
 * WO-O4O-STORE-QR-TEMPLATE-PRINT-UX-FINISH-V1
 *
 * QR 출력 템플릿 선택 모달.
 * 템플릿: 기본 QR 시트 / Flyer 1장형 / Flyer 4분할 / Flyer 8분할
 * Flyer는 product landingType + landingTargetId 있는 QR에만 활성화.
 */

import type { StoreQrCode } from '../../api/storeQr';
import { colors } from '../../styles/theme';

export type PrintTemplate = 'sheet' | 'flyer1' | 'flyer4' | 'flyer8';

interface TemplateOption {
  key: PrintTemplate;
  label: string;
  description: string;
  flyerOnly: boolean;
  templateNum?: number;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    key: 'sheet',
    label: '기본 QR 시트',
    description: '여러 QR 일괄 출력 (A4 8-up 시트)',
    flyerOnly: false,
  },
  {
    key: 'flyer1',
    label: '상품 Flyer 1장형',
    description: '상품 1개 강조 · 매장 내 포스터/안내용',
    flyerOnly: true,
    templateNum: 1,
  },
  {
    key: 'flyer4',
    label: '상품 Flyer 4분할',
    description: '소형 안내물 · 선반/전단용',
    flyerOnly: true,
    templateNum: 4,
  },
  {
    key: 'flyer8',
    label: '상품 Flyer 8분할',
    description: '다량 인쇄용 · QR 카드',
    flyerOnly: true,
    templateNum: 8,
  },
];

interface Props {
  open: boolean;
  selectedQrs: StoreQrCode[];
  onConfirm: (template: PrintTemplate) => void;
  onClose: () => void;
}

export function QrPrintTemplateModal({ open, selectedQrs, onConfirm, onClose }: Props) {
  if (!open) return null;

  const productQrs = selectedQrs.filter(
    (q) => q.landingType === 'product' && q.landingTargetId,
  );
  const hasNonProduct = selectedQrs.some(
    (q) => q.landingType !== 'product' || !q.landingTargetId,
  );
  const allProduct = selectedQrs.length > 0 && !hasNonProduct;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>출력 유형 선택</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <p style={countLabel}>
          선택된 QR: <strong>{selectedQrs.length}개</strong>
          {hasNonProduct && productQrs.length > 0 && (
            <span style={warnText}> (상품형 {productQrs.length}개 포함)</span>
          )}
        </p>

        <div style={optionList}>
          {TEMPLATE_OPTIONS.map((opt) => {
            const disabled = opt.flyerOnly && productQrs.length === 0;
            return (
              <button
                key={opt.key}
                onClick={() => !disabled && onConfirm(opt.key)}
                disabled={disabled}
                style={{ ...optionCard, ...(disabled ? optionDisabled : {}) }}
              >
                <div style={optionLabelRow}>
                  <span style={optionName}>{opt.label}</span>
                  {opt.flyerOnly && (
                    <span style={flyerBadge}>상품형</span>
                  )}
                </div>
                <p style={optionDesc}>{opt.description}</p>
                {opt.flyerOnly && !allProduct && !disabled && (
                  <p style={warnText}>비상품형 QR은 건너뜁니다 ({productQrs.length}개 출력)</p>
                )}
                {disabled && (
                  <p style={warnText}>이 템플릿은 상품 QR에만 사용할 수 있습니다</p>
                )}
              </button>
            );
          })}
        </div>

        <div style={modalFooter}>
          <button onClick={onClose} style={cancelBtn}>취소</button>
        </div>
      </div>
    </div>
  );
}

// ── 스타일 ──

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const modal: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  width: '460px',
  maxWidth: 'calc(100vw - 32px)',
  padding: '24px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
};
const modalHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};
const modalTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: colors.neutral800,
  margin: 0,
};
const closeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  color: colors.neutral400,
  padding: '0 4px',
};
const countLabel: React.CSSProperties = {
  fontSize: '13px',
  color: colors.neutral600,
  margin: '0 0 16px',
};
const warnText: React.CSSProperties = {
  fontSize: '11px',
  color: '#d97706',
  margin: '4px 0 0',
};
const optionList: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '20px',
};
const optionCard: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  border: `1px solid ${colors.neutral200}`,
  borderRadius: '8px',
  backgroundColor: '#fff',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
};
const optionDisabled: React.CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
  backgroundColor: colors.neutral50,
};
const optionLabelRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
};
const optionName: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: colors.neutral800,
};
const flyerBadge: React.CSSProperties = {
  padding: '2px 7px',
  borderRadius: '10px',
  backgroundColor: '#dbeafe',
  fontSize: '10px',
  color: '#1d4ed8',
  fontWeight: 500,
};
const optionDesc: React.CSSProperties = {
  fontSize: '12px',
  color: colors.neutral500,
  margin: 0,
};
const modalFooter: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};
const cancelBtn: React.CSSProperties = {
  padding: '8px 16px',
  border: `1px solid ${colors.neutral200}`,
  borderRadius: '8px',
  backgroundColor: '#fff',
  fontSize: '13px',
  color: colors.neutral600,
  cursor: 'pointer',
};
