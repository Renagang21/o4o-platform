/**
 * AiSummaryButton - AI 요약 버튼 공통 컴포넌트
 *
 * Work Order: WO-AI-SUMMARY-INTEGRATION-V1
 *
 * 목적:
 * - AI 요약 버튼을 일관된 UX로 제공
 * - 클릭 시 실제 AI API 호출하여 요약 제공
 *
 * 사용:
 * - 대시보드 카드 헤더
 * - 요약/지표/리스트 상단
 * - 보조 액션 위치에 배치
 */

import { useState } from 'react';
import { SparklesIcon } from './icons';
import { AiSummaryModal } from './AiSummaryModal';

interface AiSummaryButtonProps {
  /** 버튼 라벨 (기본: "AI 요약") */
  label?: string;
  /** Modal의 contextLabel (예: "대시보드 요약", "상품 요약") */
  contextLabel?: string;
  /** 버튼 크기 */
  size?: 'sm' | 'md';
  /** 버튼 스타일 변형 */
  variant?: 'default' | 'outline';
  /** 추가 className (Tailwind용) */
  className?: string;
  /** 요약할 데이터 컨텍스트 */
  contextData?: Record<string, unknown>;
  /** 서비스 ID */
  serviceId?: string;
}

export function AiSummaryButton({
  label = 'AI 요약',
  contextLabel,
  size = 'md',
  variant = 'default',
  contextData,
  serviceId,
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
