/**
 * StartProductionModal — "내 자료함"에서 제작 시작 진입
 *
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1
 * WO-O4O-KPA-POP-PRODUCTION-FLOW-CANONICAL-CORRECTION-V1:
 *   - placeholder/mock 정리: 템플릿 선택 단계 제거 (모든 target에 default 1개만 있던 mock 흐름 제거)
 *   - dead flag 제거: aiPrefillRequested (수신측에서 누구도 사용 안 함)
 *   - 제작 흐름: 자료 선택 → 본 modal에서 제작 대상 선택 → 편집기 route 이동
 *
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-UNIFY-V1:
 *   - target 카탈로그를 productionTargets 로 추출. 라우트/라벨/아이콘 SSOT 단일화.
 *   - 타입(ProductionTarget/ProductionSource/ProductionSourceItem)도 동 파일로 이동.
 *     본 모듈은 호환성 위해 re-export 유지.
 *   - navigate payload 는 buildProductionState() 헬퍼로 표준화.
 *
 * WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1:
 *   - 제작 흐름에 template picker step 추가.
 *   - target 선택 → template 선택(supportsTemplates=true인 경우) → 편집기 route 이동.
 *   - selectedTemplateId가 buildProductionState()를 통해 router state에 포함됨.
 *   - AI 액션 흐름: template 선택 없이 onAiAction 경로 유지 (기존 호환).
 */

import { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Info, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { colors } from '../../styles/theme';
import {
  PRODUCTION_TARGET_CATALOG,
  buildProductionState,
  findProductionTarget,
  type ProductionTarget,
  type ProductionSource,
} from './productionTargets';
import { getTemplatesForTarget } from './productionTemplates';

// 외부 사용처 호환을 위한 type re-export (StoreLibraryContents/Resources/ProductionMaterials, ProductionTypeSelectorModal)
export type {
  ProductionTarget,
  ProductionSource,
  ProductionSourceItem,
} from './productionTargets';

// direct origin 한정 안내
const DIRECT_NOTES: Partial<Record<ProductionTarget, { disabled: boolean; note: string }>> = {
  qr: {
    disabled: true,
    note: 'QR 코드는 파일·링크 자료에서만 생성할 수 있습니다. 내 자료함 > 자료에서 파일 또는 외부 링크를 선택하세요.',
  },
  pop: {
    disabled: false,
    note: '제작 자료는 텍스트 정보만 전달됩니다. 파일이 없는 POP 레이아웃이 표시됩니다.',
  },
};

interface Props {
  open: boolean;
  source: ProductionSource | null;
  onClose: () => void;
  /**
   * WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-REALIGN-V1
   * "AI 제작 자료 초안 만들기" 선택 시 콜백.
   * - 호출 시점: 사용자가 AI 액션 카드 선택 → 확인 버튼 클릭
   * - 수신측(StoreLibraryContentsPage)이 AiContentModal 을 열고 initialText 주입
   * - 미제공 시 AI 카드 미표시 (하위 호환)
   */
  onAiAction?: (source: ProductionSource) => void;
}

// step: 'target' → target 선택 단계, 'template' → template 선택 단계
type ModalStep = 'target' | 'template';

export function StartProductionModal({ open, source, onClose, onAiAction }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<ModalStep>('target');
  const [selectedTarget, setSelectedTarget] = useState<ProductionTarget | null>(null);
  // WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1: 선택된 template id
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  // WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-REALIGN-V1: AI 액션 선택 여부
  const [aiActionSelected, setAiActionSelected] = useState(false);

  // direct origin 항목만 선택된 경우 일부 제작 대상에 제한/안내 적용
  const allDirect = useMemo(
    () => !!source && source.items.length > 0 && source.items.every((it) => it.origin === 'direct'),
    [source],
  );

  if (!open || !source) return null;

  const itemsCount = source.items.length;
  const targetMeta = selectedTarget ? findProductionTarget(selectedTarget) : undefined;

  // 현재 target의 template 목록
  const availableTemplates = selectedTarget ? getTemplatesForTarget(selectedTarget) : [];

  const handleTargetSelect = (key: ProductionTarget) => {
    const meta = findProductionTarget(key);
    setSelectedTarget(key);
    setAiActionSelected(false);
    // supportsTemplates=true이고 template이 있으면 template step으로 진행
    if (meta?.supportsTemplates && getTemplatesForTarget(key).length > 0) {
      // template은 아직 선택하지 않은 상태 — 다음 단계에서 선택
      setSelectedTemplateId(null);
    }
  };

  const handleGoToTemplateStep = () => {
    if (!selectedTarget || aiActionSelected) return;
    const meta = findProductionTarget(selectedTarget);
    if (meta?.supportsTemplates && availableTemplates.length > 0) {
      setStep('template');
    } else {
      handleFinalConfirm();
    }
  };

  const handleFinalConfirm = () => {
    if (!source) return;
    if (aiActionSelected) {
      onAiAction?.(source);
      handleClose();
      return;
    }
    if (!selectedTarget || !targetMeta) return;
    navigate(targetMeta.route, {
      state: buildProductionState({
        target: selectedTarget,
        source,
        // template 미선택 시 defaultTemplateId fallback
        selectedTemplateId: selectedTemplateId ?? targetMeta.defaultTemplateId ?? undefined,
      }),
    });
    handleClose();
  };

  const handleClose = () => {
    setStep('target');
    setSelectedTarget(null);
    setSelectedTemplateId(null);
    setAiActionSelected(false);
    onClose();
  };

  const handleBackToTarget = () => {
    setStep('target');
    setSelectedTemplateId(null);
  };

  // ─── Step: target 선택 ───────────────────────────────────────────────────────
  const renderTargetStep = () => (
    <>
      <div style={styles.body}>
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>제작 대상 (편집기로 이동)</h3>
          <div style={styles.targetGrid}>
            {PRODUCTION_TARGET_CATALOG.map((t) => {
              const active = selectedTarget === t.key && !aiActionSelected;
              const directInfo = allDirect ? DIRECT_NOTES[t.key] : undefined;
              const isDisabled = directInfo?.disabled === true;
              return (
                <div key={t.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => { if (!isDisabled) handleTargetSelect(t.key); }}
                    disabled={isDisabled}
                    style={{
                      ...styles.targetCard,
                      ...(active && !isDisabled ? styles.targetCardActive : {}),
                      ...(isDisabled ? styles.targetCardDisabled : {}),
                    }}
                  >
                    <t.Icon size={20} style={{ color: isDisabled ? colors.neutral300 : t.iconColor }} />
                    <span style={styles.targetLabel}>{t.label}</span>
                  </button>
                  {directInfo && (
                    <div style={styles.directNote}>
                      <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{directInfo.note}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-REALIGN-V1: AI 제작 자료 초안 만들기 */}
        {onAiAction && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>AI로 제작 자료 초안 만들기</h3>
            <button
              type="button"
              onClick={() => { setAiActionSelected(true); setSelectedTarget(null); }}
              style={{
                ...styles.aiActionCard,
                ...(aiActionSelected ? styles.aiActionCardActive : {}),
              }}
            >
              <Sparkles size={20} style={{ color: aiActionSelected ? '#15803d' : '#16a34a', flexShrink: 0 }} />
              <div style={styles.aiActionText}>
                <span style={styles.aiActionLabel}>AI 제작 자료 초안 만들기</span>
                <span style={styles.aiActionDesc}>선택한 콘텐츠를 AI가 POP·QR·블로그·상품설명 형태로 정리합니다</span>
              </div>
            </button>
          </section>
        )}
      </div>

      <div style={styles.footer}>
        <button onClick={handleClose} style={styles.cancelBtn}>취소</button>
        <button
          onClick={aiActionSelected ? handleFinalConfirm : handleGoToTemplateStep}
          disabled={
            !aiActionSelected &&
            (!selectedTarget || (allDirect && !!selectedTarget && DIRECT_NOTES[selectedTarget]?.disabled))
          }
          style={{
            ...styles.confirmBtn,
            ...(aiActionSelected ? styles.confirmBtnAi : {}),
            opacity: (aiActionSelected || selectedTarget) ? 1 : 0.5,
          }}
        >
          {aiActionSelected ? (
            <><Sparkles size={14} />AI 제작 시작</>
          ) : (
            <>다음<ArrowRight size={14} /></>
          )}
        </button>
      </div>
    </>
  );

  // ─── Step: template 선택 ─────────────────────────────────────────────────────
  const renderTemplateStep = () => (
    <>
      <div style={styles.body}>
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>
            {targetMeta?.label} 스타일 선택
          </h3>
          <p style={styles.templateStepDesc}>
            제작 방향에 맞는 스타일을 선택하면 AI 생성과 편집기 구조가 자동으로 설정됩니다.
          </p>
          <div style={styles.templateGrid}>
            {availableTemplates.map((tpl) => {
              const isActive = selectedTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(isActive ? null : tpl.id)}
                  style={{
                    ...styles.templateCard,
                    ...(isActive ? styles.templateCardActive : {}),
                  }}
                >
                  <div style={styles.templateCardTop}>
                    {isActive && <CheckCircle2 size={14} style={{ color: colors.primary, flexShrink: 0 }} />}
                    <span style={styles.templateName}>{tpl.name}</span>
                    {tpl.style && (
                      <span style={styles.templateStyleBadge}>{tpl.style}</span>
                    )}
                  </div>
                  {tpl.description && (
                    <p style={styles.templateDesc}>{tpl.description}</p>
                  )}
                </button>
              );
            })}
          </div>
          {/* template-less 진입 옵션 */}
          <button
            type="button"
            onClick={() => { setSelectedTemplateId(null); handleFinalConfirm(); }}
            style={styles.skipTemplateBtn}
          >
            스타일 없이 빈 편집기로 시작
          </button>
        </section>
      </div>

      <div style={styles.footer}>
        <button onClick={handleBackToTarget} style={{ ...styles.cancelBtn, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={13} />이전
        </button>
        <button
          onClick={handleFinalConfirm}
          disabled={!selectedTemplateId}
          style={{
            ...styles.confirmBtn,
            opacity: selectedTemplateId ? 1 : 0.5,
          }}
        >
          편집기로 이동<ArrowRight size={14} />
        </button>
      </div>
    </>
  );

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {step === 'template' ? `${targetMeta?.label} 스타일 선택` : '제작 시작'}
            </h2>
            <p style={styles.subtitle}>
              {step === 'template'
                ? `선택한 자료 ${itemsCount}개 · ${targetMeta?.label} 제작`
                : `선택한 자료 ${itemsCount}개를 기반으로 제작을 시작합니다.`}
            </p>
          </div>
          <button onClick={handleClose} style={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {step === 'target' ? renderTargetStep() : renderTemplateStep()}
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
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    margin: 0,
  },
  targetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  targetCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  targetCardActive: {
    background: '#EFF6FF',
    borderColor: colors.primary,
    color: colors.primary,
    fontWeight: 500,
  },
  targetCardDisabled: {
    background: colors.neutral50,
    borderColor: colors.neutral200,
    color: colors.neutral400,
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  targetLabel: {
    fontSize: '14px',
  },
  directNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
    fontSize: '11px',
    color: colors.neutral500,
    lineHeight: 1.5,
    padding: '0 4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelBtn: {
    padding: '8px 16px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  confirmBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmBtnAi: {
    background: '#16a34a',
  },
  aiActionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  aiActionCardActive: {
    background: '#dcfce7',
    borderColor: '#16a34a',
  },
  aiActionText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  aiActionLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#15803d',
  },
  aiActionDesc: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  // ─── Template picker styles ────────────────────────────────────────────────
  templateStepDesc: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '0 0 8px',
    lineHeight: 1.5,
  },
  templateGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  templateCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '12px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
  },
  templateCardActive: {
    background: '#EFF6FF',
    borderColor: colors.primary,
  },
  templateCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  templateName: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    flex: 1,
  },
  templateStyleBadge: {
    fontSize: '11px',
    color: colors.neutral500,
    background: colors.neutral100,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '4px',
    padding: '1px 6px',
  },
  templateDesc: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: 0,
    lineHeight: 1.5,
  },
  skipTemplateBtn: {
    marginTop: '8px',
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    color: colors.neutral400,
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textAlign: 'left' as const,
  },
};
