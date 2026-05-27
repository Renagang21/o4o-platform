/**
 * StartProductionModal — 공통 제작 시작 모달
 *
 * WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1
 *
 * KPA StartProductionModal 을 canonical 기준으로 삼아 공통 컴포넌트로 승격.
 * KPA / GlycoPharm / K-Cosmetics 3 서비스가 동일 코드를 사용.
 * 서비스별 차이는 targets / getTemplates props 로만 제어한다.
 *
 * 제로-의존 원칙:
 *   - @o4o/* 직접 import 금지 — peerDeps(react, react-router-dom, lucide-react)만 사용
 *   - buildProductionState는 같은 패키지의 productionUtils 에서 import
 *   - 타입(ProductionSource 등)은 productionUtils 에서 가져온 인라인 정의 사용
 */

import { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { X, ArrowRight, Info, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { buildProductionState, type ProductionSource, type ProductionTarget } from '../utils/productionUtils';

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * 제작 대상 하나의 설정.
 * KPA: PRODUCTION_TARGET_CATALOG 배열 항목과 구조 호환 (superset OK).
 * GlycoPharm/K-Cosmetics: 서비스별 로컬 정의로 POP/QR만 포함.
 */
export interface StartProductionTargetConfig {
  key: ProductionTarget;
  label: string;
  Icon: LucideIcon;
  iconColor: string;
  route: string;
  supportsTemplates?: boolean;
  defaultTemplateId?: string;
}

/**
 * 템플릿 항목 최소 인터페이스.
 * KPA ProductionTemplate의 서브셋 — 모달 picker가 필요한 필드만 포함.
 */
export interface StartProductionTemplateItem {
  id: string;
  name: string;
  description?: string;
  style?: string;
}

export interface StartProductionModalProps {
  open: boolean;
  /** 제작 진입 소스. items 배열에 선택된 콘텐츠 포함. */
  source: ProductionSource | null;
  /** 노출할 제작 대상 목록. 서비스별 config. */
  targets: StartProductionTargetConfig[];
  onClose: () => void;
  /**
   * "AI 제작 자료 초안 만들기" 선택 시 콜백.
   * 미제공 시 AI 카드 미표시 (GlycoPharm/K-Cosmetics 이번 단계에서 미연결).
   */
  onAiAction?: (source: ProductionSource) => void;
  /**
   * target별 template 목록 반환 함수.
   * KPA: getTemplatesForTarget 전달. GlycoPharm/K-Cosmetics: 미제공 시 template step 건너뜀.
   */
  getTemplates?: (target: ProductionTarget) => StartProductionTemplateItem[];
}

// ─── Internal ─────────────────────────────────────────────────────────────────

// direct origin 항목만 선택된 경우 일부 제작 대상에 적용되는 제약
const DIRECT_ORIGIN_NOTES: Partial<Record<ProductionTarget, { disabled: boolean; note: string }>> = {
  qr: {
    disabled: true,
    note: 'QR 코드는 파일·링크 자료에서만 생성할 수 있습니다. 파일 또는 외부 링크 자료를 선택하세요.',
  },
  pop: {
    disabled: false,
    note: '제작 자료는 텍스트 정보만 전달됩니다. 파일이 없는 POP 레이아웃이 표시됩니다.',
  },
};

// Inline color tokens (Tailwind Slate + Blue — service-agnostic)
const c = {
  primary: '#2563EB',
  neutral800: '#1E293B',
  neutral700: '#334155',
  neutral500: '#64748B',
  neutral400: '#94A3B8',
  neutral300: '#CBD5E1',
  neutral200: '#E2E8F0',
  neutral100: '#F1F5F9',
  neutral50: '#F8FAFC',
  white: '#FFFFFF',
};

type ModalStep = 'target' | 'template';

export function StartProductionModal({
  open,
  source,
  targets,
  onClose,
  onAiAction,
  getTemplates,
}: StartProductionModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<ModalStep>('target');
  const [selectedTarget, setSelectedTarget] = useState<ProductionTarget | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [aiActionSelected, setAiActionSelected] = useState(false);

  const allDirect = useMemo(
    () => !!source && source.items.length > 0 && source.items.every((it) => it.origin === 'direct'),
    [source],
  );

  if (!open || !source) return null;

  const itemsCount = source.items.length;
  const targetMeta = selectedTarget ? targets.find((t) => t.key === selectedTarget) : undefined;
  const availableTemplates = selectedTarget && getTemplates ? getTemplates(selectedTarget) : [];

  const handleTargetSelect = (key: ProductionTarget) => {
    setSelectedTarget(key);
    setAiActionSelected(false);
    setSelectedTemplateId(null);
  };

  const handleGoToTemplateStep = () => {
    if (!selectedTarget || aiActionSelected) return;
    if (targetMeta?.supportsTemplates && availableTemplates.length > 0) {
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

  // ─── Step: target 선택 ──────────────────────────────────────────────────────
  const renderTargetStep = () => (
    <>
      <div style={styles.body}>
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>제작 대상 (편집기로 이동)</h3>
          <div style={styles.targetGrid}>
            {targets.map((t) => {
              const active = selectedTarget === t.key && !aiActionSelected;
              const directInfo = allDirect ? DIRECT_ORIGIN_NOTES[t.key] : undefined;
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
                    <t.Icon size={20} style={{ color: isDisabled ? c.neutral300 : t.iconColor }} />
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
            (!selectedTarget || (allDirect && !!selectedTarget && DIRECT_ORIGIN_NOTES[selectedTarget]?.disabled))
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

  // ─── Step: template 선택 ────────────────────────────────────────────────────
  const renderTemplateStep = () => (
    <>
      <div style={styles.body}>
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>{targetMeta?.label} 스타일 선택</h3>
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
                    {isActive && <CheckCircle2 size={14} style={{ color: c.primary, flexShrink: 0 }} />}
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
    background: c.white,
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
    borderBottom: `1px solid ${c.neutral200}`,
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: c.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: c.neutral500,
    margin: '4px 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: c.neutral400,
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
    color: c.neutral700,
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
    background: c.white,
    border: `1px solid ${c.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: c.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  targetCardActive: {
    background: '#EFF6FF',
    borderColor: c.primary,
    color: c.primary,
    fontWeight: 500,
  },
  targetCardDisabled: {
    background: c.neutral50,
    borderColor: c.neutral200,
    color: c.neutral400,
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
    color: c.neutral500,
    lineHeight: 1.5,
    padding: '0 4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 24px',
    borderTop: `1px solid ${c.neutral200}`,
  },
  cancelBtn: {
    padding: '8px 16px',
    background: c.white,
    border: `1px solid ${c.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: c.neutral700,
    cursor: 'pointer',
  },
  confirmBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: c.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: c.white,
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
    color: c.neutral700,
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
    color: c.neutral500,
  },
  templateStepDesc: {
    fontSize: '12px',
    color: c.neutral500,
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
    background: c.white,
    border: `1px solid ${c.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: c.neutral700,
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
  },
  templateCardActive: {
    background: '#EFF6FF',
    borderColor: c.primary,
  },
  templateCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  templateName: {
    fontSize: '14px',
    fontWeight: 500,
    color: c.neutral800,
    flex: 1,
  },
  templateStyleBadge: {
    fontSize: '11px',
    color: c.neutral500,
    background: c.neutral100,
    border: `1px solid ${c.neutral200}`,
    borderRadius: '4px',
    padding: '1px 6px',
  },
  templateDesc: {
    fontSize: '12px',
    color: c.neutral500,
    margin: 0,
    lineHeight: 1.5,
  },
  skipTemplateBtn: {
    marginTop: '8px',
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    color: c.neutral400,
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textAlign: 'left' as const,
  },
};
