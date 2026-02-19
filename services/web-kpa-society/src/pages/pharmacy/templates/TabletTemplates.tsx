/**
 * TabletTemplates - 태블릿 채널 미리보기 4종
 *
 * 디자인 스타일: Modern / Emotional / Dry / Professional
 * 매장 내 태블릿 디스플레이용 레이아웃 (터치 최적화, 큰 버튼)
 */

import type { CSSProperties } from 'react';
import type { TemplatePreviewProps } from './BlogTemplates';

/* ─── Modern (현대적) ─── */
export function TabletModern({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif" }}>
      {/* Status Bar */}
      <div style={{ background: '#0F172A', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{pharmacyName}</span>
        <span style={{ color: '#60A5FA', fontSize: '8px' }}>10:30 AM</span>
      </div>
      {/* Welcome */}
      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)' }}>
        <span style={{ color: '#DBEAFE', fontSize: '9px', display: 'block' }}>환영합니다</span>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>무엇을 도와드릴까요?</span>
      </div>
      {/* Quick Actions Grid */}
      <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
        {[
          { icon: '💊', label: '약품 조회', bg: '#EFF6FF' },
          { icon: '📋', label: '처방전 접수', bg: '#F0FDF4' },
          { icon: '🏥', label: '건강 상담', bg: '#FFF7ED' },
          { icon: '🛒', label: '건강식품', bg: '#FDF2F8' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '16px 12px', background: item.bg, borderRadius: '12px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#1E293B' }}>{item.label}</span>
          </div>
        ))}
      </div>
      {/* Bottom Info */}
      <div style={{ padding: '10px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
        <span style={{ fontSize: '8px', color: '#94A3B8' }}>화면을 터치하여 시작하세요</span>
      </div>
    </div>
  );
}

/* ─── Emotional (감성적) ─── */
export function TabletEmotional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: '#FFFBEB' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px', textAlign: 'center', background: 'linear-gradient(180deg, #FEF3C7, #FFFBEB)' }}>
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>🌸</div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#78350F' }}>{pharmacyName}</span>
        <p style={{ fontSize: '9px', color: '#B45309', margin: '6px 0 0' }}>건강한 하루를 시작하세요</p>
      </div>
      {/* Service Buttons */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {[
          { icon: '🩺', label: '건강 체크', desc: '오늘의 건강 상태를 확인해보세요', bg: '#FFF7ED', border: '#FDBA74' },
          { icon: '💝', label: '맞춤 추천', desc: '나에게 맞는 건강식품 찾기', bg: '#FDF2F8', border: '#F9A8D4' },
          { icon: '📖', label: '건강 이야기', desc: '약사님이 들려주는 건강 이야기', bg: '#FEF3C7', border: '#FCD34D' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '14px', background: item.bg, borderRadius: '16px', border: `1px solid ${item.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#78350F', display: 'block' }}>{item.label}</span>
              <span style={{ fontSize: '8px', color: '#92400E' }}>{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '8px', color: '#D97706' }}>터치하여 시작 ~</span>
      </div>
    </div>
  );
}

/* ─── Dry (건조한) ─── */
export function TabletDry({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', monospace", background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#000', letterSpacing: '1px' }}>{pharmacyName}</span>
        <span style={{ fontSize: '8px', color: '#6B7280' }}>TABLET</span>
      </div>
      {/* Menu List */}
      <div style={{ flex: 1 }}>
        {[
          { label: '01 — 약품 검색', desc: 'SEARCH MEDICINE' },
          { label: '02 — 처방전 접수', desc: 'PRESCRIPTION' },
          { label: '03 — 건강 상담 예약', desc: 'CONSULTATION' },
          { label: '04 — 건강식품 구매', desc: 'HEALTH FOOD' },
          { label: '05 — 공지사항', desc: 'NOTICE' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#000' }}>{item.label}</span>
            <span style={{ fontSize: '7px', color: '#9CA3AF', letterSpacing: '0.5px' }}>{item.desc}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '2px solid #000' }}>
        <span style={{ fontSize: '7px', color: '#9CA3AF', letterSpacing: '1px' }}>SELECT A SERVICE</span>
      </div>
    </div>
  );
}

/* ─── Professional (전문적) ─── */
export function TabletProfessional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: '#F0FDF4' }}>
      {/* Header */}
      <div style={{ background: '#065F46', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#6EE7B7', fontSize: '14px' }}>+</span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{pharmacyName}</span>
        </div>
        <div style={{ background: '#10B981', padding: '2px 8px', borderRadius: '10px' }}>
          <span style={{ color: '#fff', fontSize: '7px', fontWeight: 600 }}>영업중</span>
        </div>
      </div>
      {/* Info Bar */}
      <div style={{ padding: '10px 16px', background: '#ECFDF5', display: 'flex', justifyContent: 'space-around', borderBottom: '1px solid #A7F3D0' }}>
        {[
          { label: '대기', value: '2명' },
          { label: '예상 대기', value: '~5분' },
          { label: '오늘 상담', value: '12건' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#065F46', display: 'block' }}>{s.value}</span>
            <span style={{ fontSize: '7px', color: '#047857' }}>{s.label}</span>
          </div>
        ))}
      </div>
      {/* Service Grid */}
      <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
        {[
          { icon: '💊', label: '약품 조회', color: '#059669' },
          { icon: '📋', label: '처방 접수', color: '#0D9488' },
          { icon: '🩺', label: '건강 상담', color: '#0891B2' },
          { icon: '📊', label: '건강 기록', color: '#2563EB' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '14px 10px', background: '#fff', borderRadius: '10px', border: '1px solid #D1FAE5', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
            <span style={{ fontSize: '9px', fontWeight: 600, color: item.color }}>{item.label}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '10px 16px', background: '#065F46', textAlign: 'center' }}>
        <span style={{ fontSize: '8px', color: '#6EE7B7' }}>화면을 터치하여 서비스를 선택하세요</span>
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
