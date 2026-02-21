/**
 * BlogTemplates - 블로그 채널 미리보기 4종
 *
 * 디자인 스타일: Modern / Emotional / Dry / Professional
 * 약국 건강정보 블로그용 레이아웃 미리보기
 */

import type { CSSProperties } from 'react';

export interface TemplatePreviewProps {
  pharmacyName?: string;
  scale?: number;
}

/* ─── Modern (현대적) ─── */
export function BlogModern({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E40AF)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.3px' }}>{pharmacyName} Blog</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['건강정보', '약품안내', '이벤트'].map(t => (
            <span key={t} style={{ color: '#93C5FD', fontSize: '10px' }}>{t}</span>
          ))}
        </div>
      </div>
      {/* Hero Post */}
      <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ width: '100%', height: '80px', borderRadius: '8px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', marginBottom: '10px', display: 'flex', alignItems: 'flex-end', padding: '10px' }}>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>겨울철 면역력 높이는 5가지 방법</span>
        </div>
        <p style={{ fontSize: '9px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>추운 겨울, 건강을 지키기 위한 약사의 전문 조언을 확인하세요...</p>
      </div>
      {/* Post Grid */}
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { title: '비타민D 부족 증상', cat: '영양제' },
          { title: '올바른 약 복용법', cat: '약품안내' },
          { title: '혈압 관리 팁', cat: '건강정보' },
          { title: '신년 건강 이벤트', cat: '이벤트' },
        ].map((p, i) => (
          <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '36px', background: `linear-gradient(135deg, ${['#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B'][i]}, ${['#1D4ED8', '#6D28D9', '#0891B2', '#D97706'][i]})` }} />
            <div style={{ padding: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '2px' }}>{p.title}</span>
              <span style={{ fontSize: '7px', color: '#3B82F6', background: '#EFF6FF', padding: '1px 4px', borderRadius: '3px' }}>{p.cat}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Emotional (감성적) ─── */
export function BlogEmotional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: '#FFF7ED' }}>
      {/* Header */}
      <div style={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(180deg, #FEFCE8, #FFF7ED)' }}>
        <div style={{ fontSize: '16px', marginBottom: '4px' }}>💊</div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>{pharmacyName}</span>
        <p style={{ fontSize: '9px', color: '#B45309', margin: '4px 0 0' }}>당신의 건강을 따뜻하게 돌보는 약국</p>
      </div>
      {/* Featured Card */}
      <div style={{ margin: '0 12px', padding: '14px', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(251,146,60,0.1)' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            🌿
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#78350F', display: 'block' }}>봄맞이 건강 체크리스트</span>
            <p style={{ fontSize: '8px', color: '#92400E', margin: '4px 0', lineHeight: 1.5 }}>환절기 건강 관리, 약사가 알려드리는 따뜻한 조언</p>
            <span style={{ fontSize: '7px', color: '#D97706' }}>2분 읽기</span>
          </div>
        </div>
      </div>
      {/* Post List */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {['가족 건강을 위한 필수 영양제', '감기 예방, 이것만 기억하세요', '잠이 보약! 수면 건강 가이드'].map((title, i) => (
          <div key={i} style={{ padding: '10px 12px', background: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>{['🍊', '🧣', '🌙'][i]}</span>
            <div>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#78350F', display: 'block' }}>{title}</span>
              <span style={{ fontSize: '7px', color: '#B45309' }}>2026.02.{19 - i}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Dry (건조한) ─── */
export function BlogDry({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', monospace", background: '#FAFAFA' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '2px solid #000' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#000', letterSpacing: '1px', textTransform: 'uppercase' }}>{pharmacyName}</span>
      </div>
      {/* Category Bar */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: '16px' }}>
        {['ALL', 'HEALTH', 'MEDICINE', 'NEWS'].map((c, i) => (
          <span key={c} style={{ fontSize: '8px', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#000' : '#9CA3AF', letterSpacing: '0.5px' }}>{c}</span>
        ))}
      </div>
      {/* Articles */}
      <div style={{ padding: '0' }}>
        {[
          { title: '혈당 관리의 기본 원칙', date: '2026.02.19', read: '4min' },
          { title: '겨울철 피부 보습 약품 비교', date: '2026.02.17', read: '3min' },
          { title: '독감 백신 접종 안내', date: '2026.02.15', read: '2min' },
          { title: '약품 보관 온도 가이드', date: '2026.02.13', read: '3min' },
        ].map((a, i) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#000', display: 'block' }}>{a.title}</span>
              <span style={{ fontSize: '7px', color: '#9CA3AF', marginTop: '2px', display: 'block' }}>{a.date}</span>
            </div>
            <span style={{ fontSize: '7px', color: '#6B7280', whiteSpace: 'nowrap' }}>{a.read}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '2px solid #000', marginTop: 'auto' }}>
        <span style={{ fontSize: '7px', color: '#9CA3AF', letterSpacing: '0.5px' }}>TOTAL 24 ARTICLES</span>
      </div>
    </div>
  );
}

/* ─── Professional (전문적) ─── */
export function BlogProfessional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: '#F0FDF4' }}>
      {/* Header */}
      <div style={{ background: '#065F46', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>+</span>
          </div>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{pharmacyName}</span>
        </div>
        <span style={{ color: '#6EE7B7', fontSize: '8px' }}>건강정보</span>
      </div>
      {/* Certification Banner */}
      <div style={{ margin: '12px', padding: '10px 12px', background: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>🏥</span>
        <div>
          <span style={{ fontSize: '8px', fontWeight: 700, color: '#065F46', display: 'block' }}>약사가 직접 작성하는 건강 컬럼</span>
          <span style={{ fontSize: '7px', color: '#047857' }}>전문 지식 기반의 신뢰할 수 있는 정보</span>
        </div>
      </div>
      {/* Category Sections */}
      {[
        { cat: '질환 관리', items: ['당뇨 관리 가이드', '고혈압 일상 관리법'] },
        { cat: '약품 정보', items: ['OTC 약품 선택 가이드', '영양제 복용 시간표'] },
      ].map((section, si) => (
        <div key={si} style={{ padding: '0 12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <div style={{ width: '3px', height: '12px', borderRadius: '2px', background: '#059669' }} />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#065F46' }}>{section.cat}</span>
          </div>
          {section.items.map((item, ii) => (
            <div key={ii} style={{ padding: '8px 10px', background: '#fff', borderRadius: '6px', marginBottom: '4px', border: '1px solid #D1FAE5' }}>
              <span style={{ fontSize: '9px', fontWeight: 500, color: '#1E293B' }}>{item}</span>
            </div>
          ))}
        </div>
      ))}
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
