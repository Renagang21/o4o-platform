/**
 * KioskTemplates - 키오스크 채널 미리보기 4종
 *
 * 디자인 스타일: Modern / Emotional / Dry / Professional
 * 무인 안내/주문 키오스크 레이아웃 (세로형, 단계별 플로우, 큰 터치)
 */

import type { CSSProperties } from 'react';
import type { TemplatePreviewProps } from './BlogTemplates';

/* ─── Modern (현대적) ─── */
export function KioskModern({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #0F172A, #1E3A8A)', padding: '16px', textAlign: 'center' }}>
        <span style={{ color: '#60A5FA', fontSize: '8px', display: 'block', marginBottom: '4px', letterSpacing: '2px' }}>SELF SERVICE</span>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{pharmacyName}</span>
      </div>
      {/* Main Buttons */}
      <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
        {[
          { icon: '💊', label: '약품 조회', desc: '일반/전문 의약품 검색', bg: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
          { icon: '🛒', label: '건강식품 주문', desc: '영양제/건강기능식품', bg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
          { icon: '📋', label: '처방전 접수', desc: 'QR코드 스캔 접수', bg: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '16px', background: item.bg, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
            <span style={{ fontSize: '28px' }}>{item.icon}</span>
            <div>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, display: 'block' }}>{item.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px' }}>{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '12px', background: '#0F172A', textAlign: 'center' }}>
        <span style={{ color: '#475569', fontSize: '8px' }}>화면을 터치하여 시작하세요</span>
      </div>
    </div>
  );
}

/* ─── Emotional (감성적) ─── */
export function KioskEmotional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: 'linear-gradient(180deg, #FFFBEB, #FEF3C7)' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌿</div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#78350F' }}>{pharmacyName}</span>
        <p style={{ fontSize: '9px', color: '#92400E', margin: '6px 0 0', lineHeight: 1.5 }}>건강한 하루를 위한<br />첫 걸음을 시작하세요</p>
      </div>
      {/* Service Buttons */}
      <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { icon: '🔍', label: '약품 찾기', bg: '#FFF7ED', border: '#FDBA74' },
          { icon: '💛', label: '건강식품 추천', bg: '#FFFBEB', border: '#FCD34D' },
          { icon: '📝', label: '처방전 접수', bg: '#FDF2F8', border: '#F9A8D4' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '18px 16px', background: item.bg, borderRadius: '20px', border: `1.5px solid ${item.border}`, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>{item.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#78350F' }}>{item.label}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '14px', textAlign: 'center' }}>
        <span style={{ fontSize: '8px', color: '#D97706' }}>가볍게 터치해 주세요 ~</span>
      </div>
    </div>
  );
}

/* ─── Dry (건조한) ─── */
export function KioskDry({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', monospace", background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '3px solid #000', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#000', letterSpacing: '2px', display: 'block' }}>{pharmacyName}</span>
        <span style={{ fontSize: '7px', color: '#9CA3AF', letterSpacing: '1px', marginTop: '4px', display: 'block' }}>KIOSK TERMINAL</span>
      </div>
      {/* Menu */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {[
          { num: '01', label: '약품 조회', en: 'SEARCH' },
          { num: '02', label: '건강식품 주문', en: 'ORDER' },
          { num: '03', label: '처방전 접수', en: 'PRESCRIPTION' },
          { num: '04', label: '건강 정보', en: 'INFO' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '18px 20px', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#000' }}>{item.num}</span>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#000', display: 'block' }}>{item.label}</span>
              <span style={{ fontSize: '7px', color: '#9CA3AF', letterSpacing: '0.5px' }}>{item.en}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '3px solid #000', textAlign: 'center' }}>
        <span style={{ fontSize: '8px', color: '#6B7280', letterSpacing: '1px' }}>SELECT SERVICE</span>
      </div>
    </div>
  );
}

/* ─── Professional (전문적) ─── */
export function KioskProfessional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: '#F0FDF4' }}>
      {/* Header */}
      <div style={{ background: '#065F46', padding: '16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>+</span>
          </div>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{pharmacyName}</span>
        </div>
        <span style={{ color: '#6EE7B7', fontSize: '8px' }}>무인 안내 키오스크</span>
      </div>
      {/* Status */}
      <div style={{ padding: '10px 16px', background: '#ECFDF5', display: 'flex', justifyContent: 'space-around', borderBottom: '1px solid #A7F3D0' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#065F46', display: 'block' }}>2명</span>
          <span style={{ fontSize: '7px', color: '#047857' }}>현재 대기</span>
        </div>
        <div style={{ width: '1px', background: '#A7F3D0' }} />
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#065F46', display: 'block' }}>~5분</span>
          <span style={{ fontSize: '7px', color: '#047857' }}>예상 대기</span>
        </div>
      </div>
      {/* Service Grid */}
      <div style={{ flex: 1, padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { icon: '💊', label: '약품 조회', desc: '일반/전문의약품' },
          { icon: '🛒', label: '건강식품', desc: '영양제/기능식품' },
          { icon: '📋', label: '처방 접수', desc: 'QR / 직접입력' },
          { icon: '🏥', label: '건강 상담', desc: '약사 상담 예약' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '14px 8px', background: '#fff', borderRadius: '12px', border: '1px solid #D1FAE5', textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#065F46', display: 'block' }}>{item.label}</span>
            <span style={{ fontSize: '7px', color: '#059669' }}>{item.desc}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '12px', background: '#065F46', textAlign: 'center' }}>
        <span style={{ fontSize: '8px', color: '#6EE7B7' }}>서비스를 선택해 주세요</span>
      </div>
    </div>
  );
}

/* ─── Shared ─── */
function wrap(scale: number): CSSProperties {
  return {
    width: '280px',
    height: '360px',
    overflow: 'hidden',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    background: '#fff',
  };
}
