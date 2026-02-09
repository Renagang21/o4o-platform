/**
 * CopyOptionsModal - 복사 옵션 선택 모달
 *
 * WO-APP-DATA-HUB-COPY-PHASE2B-V1
 *
 * 복사 시 초기 형태를 결정하는 경량 모달
 * - 제목 처리 방식
 * - 설명 처리 방식
 * - 템플릿 선택
 */

import React, { useState } from 'react';

export type TitleMode = 'keep' | 'edit';
export type DescriptionMode = 'keep' | 'empty';
export type TemplateType = 'info' | 'promo' | 'guide';

export interface CopyOptions {
  titleMode: TitleMode;
  title?: string;
  descriptionMode: DescriptionMode;
  templateType: TemplateType;
}

export interface CopyOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: CopyOptions) => void;
  originalTitle: string;
  originalDescription?: string;
  loading?: boolean;
}

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: 'info', label: '정보형', description: '정보 전달 목적' },
  { value: 'promo', label: '프로모션형', description: '홍보/이벤트 목적' },
  { value: 'guide', label: '안내형', description: '안내/공지 목적' },
];

export function CopyOptionsModal({
  isOpen,
  onClose,
  onConfirm,
  originalTitle,
  originalDescription,
  loading = false,
}: CopyOptionsModalProps) {
  const [titleMode, setTitleMode] = useState<TitleMode>('keep');
  const [customTitle, setCustomTitle] = useState(originalTitle);
  const [descriptionMode, setDescriptionMode] = useState<DescriptionMode>('keep');
  const [templateType, setTemplateType] = useState<TemplateType>('info');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      titleMode,
      title: titleMode === 'edit' ? customTitle : undefined,
      descriptionMode,
      templateType,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>내 대시보드로 복사</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* 제목 옵션 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>제목</h3>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="titleMode"
                checked={titleMode === 'keep'}
                onChange={() => setTitleMode('keep')}
                disabled={loading}
              />
              <span>원본 제목 그대로 사용</span>
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="titleMode"
                checked={titleMode === 'edit'}
                onChange={() => setTitleMode('edit')}
                disabled={loading}
              />
              <span>제목 직접 수정</span>
            </label>
            {titleMode === 'edit' && (
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={styles.textInput}
                placeholder="새 제목 입력"
                disabled={loading}
              />
            )}
          </div>

          {/* 설명 옵션 */}
          {originalDescription && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>설명</h3>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="descriptionMode"
                  checked={descriptionMode === 'keep'}
                  onChange={() => setDescriptionMode('keep')}
                  disabled={loading}
                />
                <span>원본 요약 사용</span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="descriptionMode"
                  checked={descriptionMode === 'empty'}
                  onChange={() => setDescriptionMode('empty')}
                  disabled={loading}
                />
                <span>설명 비우기 (직접 작성 예정)</span>
              </label>
            </div>
          )}

          {/* 템플릿 선택 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>템플릿</h3>
            <div style={styles.templateGrid}>
              {TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  style={{
                    ...styles.templateButton,
                    ...(templateType === option.value ? styles.templateButtonActive : {}),
                  }}
                  onClick={() => setTemplateType(option.value)}
                  disabled={loading}
                >
                  <span style={styles.templateLabel}>{option.label}</span>
                  <span style={styles.templateDescription}>{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            취소
          </button>
          <button
            style={styles.confirmButton}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? '복사 중...' : '복사하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '440px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '16px',
    color: '#6B7280',
  },
  content: {
    padding: '20px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4B5563',
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    marginTop: '8px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  templateButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: '#F9FAFB',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  templateButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  templateLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px',
  },
  templateDescription: {
    fontSize: '11px',
    color: '#6B7280',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 20px',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    padding: '10px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  confirmButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2563EB',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
  },
};
