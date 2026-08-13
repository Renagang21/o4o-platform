/**
 * POP Composer 공통 상태 블록 (loading / error / empty)
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * 두 서비스에 동일 마크업으로 복사돼 있던 블록. 조회 실패를 empty 로 위장하지 않는 4상태 계약을 유지한다.
 */

import { AlertCircle, Loader2 } from 'lucide-react';
import { popRetryBtnStyle } from './popStyles';

export function PopLoadingBlock({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
      <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}

export function PopErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <AlertCircle size={24} style={{ margin: '0 auto 8px', color: '#dc2626' }} />
      <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{message}</p>
      <button onClick={onRetry} style={popRetryBtnStyle}>다시 시도</button>
    </div>
  );
}

export function PopEmptyBlock({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}

/** 인라인(섹션 내부) 로딩 — 매장 자체 상품 섹션용 */
export function PopInlineLoading({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
      <Loader2 size={16} className="animate-spin" />
      {message}
    </div>
  );
}

/** 인라인(섹션 내부) 오류 + 재시도 */
export function PopInlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <AlertCircle size={16} color="#dc2626" />
      <span style={{ fontSize: 13, color: '#dc2626' }}>{message}</span>
      <button onClick={onRetry} style={popRetryBtnStyle}>
        다시 시도
      </button>
    </div>
  );
}
