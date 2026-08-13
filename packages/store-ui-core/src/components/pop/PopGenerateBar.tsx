/**
 * PopGenerateBar — POP PDF 생성 버튼 + 미선택 안내
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 */

import { FileDown, Loader2 } from 'lucide-react';
import { popGenerateBtnStyle } from './popStyles';
import type { PopAccentTheme } from './types';

export interface PopGenerateBarProps {
  accent: PopAccentTheme;
  generating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
}

export function PopGenerateBar({ accent, generating, canGenerate, onGenerate }: PopGenerateBarProps) {
  const disabled = generating || !canGenerate;

  return (
    <>
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onGenerate}
          disabled={disabled}
          style={{
            ...popGenerateBtnStyle(accent),
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {generating
            ? <><Loader2 size={16} className="animate-spin" /> POP 생성 중...</>
            : <><FileDown size={16} /> POP PDF 생성</>
          }
        </button>
      </div>

      {!canGenerate && (
        <p style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          자료를 1개 이상 선택하면 POP를 생성할 수 있습니다
        </p>
      )}
    </>
  );
}
