/**
 * AiSummaryButton - AI 요약 버튼 공통 컴포넌트
 *
 * WO-O4O-AI-COMPONENTS-CORE-EXTRACTION-V1
 *
 * AI 요약 버튼을 일관된 UX로 제공.
 * 클릭 시 AiSummaryModal을 열어 실제 AI API 호출.
 */

import { useState } from 'react';
import { SparklesIcon } from './icons';
import { AiSummaryModal } from './AiSummaryModal';
import type { AiSummaryButtonProps } from '../types';

export function AiSummaryButton({
  label = 'AI 요약',
  contextLabel,
  size = 'md',
  variant = 'default',
  contextData,
  serviceId,
  getAccessToken,
}: AiSummaryButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const buttonStyle = {
    ...styles.button,
    ...(size === 'sm' ? styles.buttonSm : styles.buttonMd),
    ...(variant === 'outline' ? styles.buttonOutline : styles.buttonDefault),
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={buttonStyle}
        aria-label={label}
        title="AI가 이 영역의 데이터를 요약해 드립니다"
      >
        <SparklesIcon size={size === 'sm' ? 14 : 16} />
        {label}
      </button>

      <AiSummaryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        contextLabel={contextLabel}
        contextData={contextData}
        serviceId={serviceId}
        getAccessToken={getAccessToken}
      />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid',
    borderRadius: '8px',
  },
  buttonSm: {
    padding: '6px 12px',
    fontSize: '12px',
  },
  buttonMd: {
    padding: '8px 14px',
    fontSize: '13px',
  },
  buttonDefault: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    borderColor: '#bfdbfe',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    color: '#2563eb',
    borderColor: '#2563eb',
  },
};

export default AiSummaryButton;
