/**
 * DescriptionSelectionModal — 매장 경영활용 제품(O4O 기반)의 사용 설명서 선택
 *
 * WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1 (F12)
 *
 * DESCRIPTION Resource 중 STORE / SUPPLIER_STORE canonical 을 선택한다.
 * ProductMaster 무변경(Freeze #6) — 선택 관계는 store_product_description_selections 에 저장.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { X, Loader2, Check, FileText } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  fetchDescriptionSelections,
  saveDescriptionSelections,
  type DescriptionSelectionItem,
} from '../../api/handledProducts';
import { colors } from '../../styles/theme';

export interface DescriptionSelectionTarget {
  listingId: string;
  name: string;
}

interface Props {
  open: boolean;
  product: DescriptionSelectionTarget | null;
  onClose: () => void;
}

export function DescriptionSelectionModal({ open, product, onClose }: Props) {
  const [items, setItems] = useState<DescriptionSelectionItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDescriptionSelections(product.listingId)
      .then((v) => {
        if (cancelled) return;
        setItems(v.available);
        setChecked(new Set(v.available.filter((a) => a.selected && a.descriptionId).map((a) => a.descriptionId as string)));
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '설명서 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, product]);

  const toggle = useCallback((descriptionId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(descriptionId)) next.delete(descriptionId);
      else next.add(descriptionId);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!product) return;
    setSaving(true);
    try {
      const v = await saveDescriptionSelections(product.listingId, Array.from(checked));
      setItems(v.available);
      setChecked(new Set(v.available.filter((a) => a.selected && a.descriptionId).map((a) => a.descriptionId as string)));
      toast.success('사용 설명서 선택을 저장했습니다');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }, [product, checked, onClose]);

  if (!open || !product) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}><FileText size={17} style={{ color: colors.primary }} /> 사용 설명서</h2>
            <p style={styles.subtitle} title={product.name}>{product.name}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기"><X size={18} /></button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.state}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 불러오는 중…</div>
          ) : error ? (
            <div style={{ ...styles.state, color: '#DC2626' }}>{error}</div>
          ) : (
            items.map((it) => {
              const disabled = !it.exists || !it.descriptionId;
              const isChecked = it.descriptionId ? checked.has(it.descriptionId) : false;
              return (
                <label
                  key={it.descriptionType}
                  style={{ ...styles.option, ...(disabled ? styles.optionDisabled : {}) }}
                >
                  <span style={{ ...styles.checkbox, ...(isChecked ? styles.checkboxOn : {}) }}>
                    {isChecked && <Check size={13} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled}
                    onChange={() => it.descriptionId && toggle(it.descriptionId)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span style={styles.optionLabel}>{it.label}</span>
                    <span style={styles.optionDesc}>
                      {it.descriptionType === 'STORE'
                        ? '중립적인 표준 상품 설명서입니다.'
                        : '공급업체가 제공한 매장 안내용 설명서입니다.'}
                    </span>
                    <span style={styles.optionStatus}>
                      {disabled ? '없음' : isChecked ? '사용중' : '사용 가능'}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={saving}>취소</button>
          <button onClick={handleSave} style={{ ...styles.saveBtn, ...(saving || loading ? styles.saveBtnBusy : {}) }} disabled={saving || loading}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
            저장
          </button>
        </div>
        <p style={styles.footnote}>
          ※ O4O 매장 설명서는 처음 등록 시 자동 선택됩니다. 공급업체 설명서는 존재할 때 직접 선택할 수 있습니다.
          선택은 이 매장에만 적용되며 상품 원본(ProductMaster)은 변경되지 않습니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '48px 16px', overflowY: 'auto' },
  modal: { background: colors.white, borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: '20px 22px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' },
  title: { display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '17px', fontWeight: 600, color: colors.neutral800, margin: 0 },
  subtitle: { fontSize: '13px', color: colors.neutral500, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '420px' },
  closeBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: colors.neutral500, padding: '4px' },
  body: { display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '120px' },
  state: { padding: '30px 12px', textAlign: 'center', color: colors.neutral400, fontSize: '13px' },
  option: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', border: `1px solid ${colors.neutral200}`, borderRadius: '8px', cursor: 'pointer', background: colors.white },
  optionDisabled: { opacity: 0.55, cursor: 'not-allowed', background: colors.neutral100 },
  checkbox: { flexShrink: 0, width: '20px', height: '20px', borderRadius: '5px', border: `1.5px solid ${colors.neutral300}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.white, marginTop: '1px' },
  checkboxOn: { background: colors.primary, borderColor: colors.primary },
  optionLabel: { display: 'block', fontSize: '14px', fontWeight: 600, color: colors.neutral800 },
  optionDesc: { display: 'block', fontSize: '12px', color: colors.neutral500, marginTop: '3px' },
  optionStatus: { display: 'inline-block', fontSize: '11px', color: colors.neutral400, marginTop: '5px' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' },
  cancelBtn: { padding: '7px 16px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '6px', fontSize: '13px', color: colors.neutral700, cursor: 'pointer' },
  saveBtn: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 18px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '13px', fontWeight: 500, color: colors.white, cursor: 'pointer' },
  saveBtnBusy: { opacity: 0.6, cursor: 'default' },
  footnote: { marginTop: '12px', fontSize: '12px', color: colors.neutral500, lineHeight: 1.6, padding: '10px 12px', background: colors.neutral100, borderRadius: '6px' },
};
