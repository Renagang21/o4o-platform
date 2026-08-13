/**
 * PopQrSelector — POP 에 삽입할 QR 선택(선택 사항)
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 * (WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1 동작 유지 — QR 이 없으면 섹션 자체를 노출하지 않는다)
 */

import type { PopQrOption } from './types';

export interface PopQrSelectorProps {
  qrCodes: PopQrOption[];
  value: string;
  onChange: (id: string) => void;
}

export function PopQrSelector({ qrCodes, value, onChange }: PopQrSelectorProps) {
  if (qrCodes.length === 0) return null;

  return (
    <section style={{ marginTop: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>QR 연결 (선택)</span>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
        POP 에 삽입할 내 QR 코드를 선택하면 생성된 POP PDF 에 함께 표시됩니다.
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', maxWidth: 480, padding: '8px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}
      >
        <option value="">QR 연결 안 함</option>
        {qrCodes.map((qr) => (
          <option key={qr.id} value={qr.id}>
            {qr.title}{qr.landingType ? ` (${qr.landingType})` : ''}
          </option>
        ))}
      </select>
    </section>
  );
}
