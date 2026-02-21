/**
 * EcommerceTemplates - 전자상거래 채널 미리보기 4종
 *
 * 디자인 스타일: Modern / Emotional / Dry / Professional
 * B2C 온라인 쇼핑몰 레이아웃 (상품 그리드, 카트, 프로모션)
 */

import type { CSSProperties } from 'react';
import type { TemplatePreviewProps } from './BlogTemplates';

/* ─── Modern (현대적) ─── */
export function EcommerceModern({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#0F172A', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{pharmacyName} STORE</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#94A3B8', fontSize: '9px' }}>검색</span>
          <div style={{ position: 'relative' }}>
            <span style={{ color: '#fff', fontSize: '12px' }}>🛒</span>
            <div style={{ position: 'absolute', top: '-4px', right: '-6px', width: '12px', height: '12px', background: '#EF4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '6px', fontWeight: 700 }}>3</span>
            </div>
          </div>
        </div>
      </div>
      {/* Promo Banner */}
      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
        <span style={{ color: '#DBEAFE', fontSize: '8px', display: 'block' }}>WINTER SALE</span>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, display: 'block' }}>겨울 건강 대전 최대 30% OFF</span>
      </div>
      {/* Category Chips */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: '6px', overflowX: 'hidden' }}>
        {['전체', '영양제', '의약품', '건강식품', '뷰티'].map((c, i) => (
          <span key={c} style={{ padding: '4px 10px', borderRadius: '14px', fontSize: '8px', fontWeight: 500, background: i === 0 ? '#0F172A' : '#F1F5F9', color: i === 0 ? '#fff' : '#64748B', whiteSpace: 'nowrap' }}>{c}</span>
        ))}
      </div>
      {/* Product Grid */}
      <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
        {[
          { name: '종합비타민 프리미엄', price: '32,000', sale: '22,400', color: '#3B82F6' },
          { name: '오메가3 1000mg', price: '28,000', sale: '19,600', color: '#8B5CF6' },
          { name: '프로바이오틱스', price: '35,000', sale: '', color: '#06B6D4' },
          { name: '콜라겐 파우더', price: '42,000', sale: '33,600', color: '#F59E0B' },
        ].map((p, i) => (
          <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '44px', background: `linear-gradient(135deg, ${p.color}22, ${p.color}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px' }}>💊</span>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <span style={{ fontSize: '8px', fontWeight: 600, color: '#1E293B', display: 'block' }}>{p.name}</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '3px' }}>
                {p.sale && <span style={{ fontSize: '7px', color: '#94A3B8', textDecoration: 'line-through' }}>{p.price}</span>}
                <span style={{ fontSize: '9px', fontWeight: 700, color: p.sale ? '#EF4444' : '#1E293B' }}>{p.sale || p.price}원</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Emotional (감성적) ─── */
export function EcommerceEmotional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: '#FFF1F2' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', textAlign: 'center', background: 'linear-gradient(180deg, #FFF1F2, #FFE4E6)' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#9F1239' }}>{pharmacyName}</span>
        <p style={{ fontSize: '8px', color: '#BE185D', margin: '2px 0 0' }}>당신만을 위한 건강 솔루션</p>
      </div>
      {/* Recommendation */}
      <div style={{ margin: '0 12px', padding: '12px', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(244,63,94,0.08)' }}>
        <span style={{ fontSize: '8px', color: '#F43F5E', fontWeight: 600, display: 'block', marginBottom: '8px' }}>💝 약사님 추천</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['🧴', '💊', '🍯'].map((icon, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: ['#FFF1F2', '#FEF3C7', '#F0FDF4'][i], borderRadius: '12px' }}>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>{icon}</div>
              <span style={{ fontSize: '7px', fontWeight: 500, color: '#78350F' }}>{['콜라겐 앰플', '철분 영양제', '마누카 허니'][i]}</span>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#BE185D', marginTop: '2px' }}>{['34,000', '28,000', '45,000'][i]}원</div>
            </div>
          ))}
        </div>
      </div>
      {/* Products */}
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <span style={{ fontSize: '9px', fontWeight: 600, color: '#9F1239', marginBottom: '8px', display: 'block' }}>인기 상품</span>
        {[
          { name: '히알루론산 보습 크림', price: '38,000' },
          { name: '멀티비타민 30일분', price: '25,000' },
          { name: '유산균 패밀리 세트', price: '52,000' },
        ].map((p, i) => (
          <div key={i} style={{ padding: '8px 10px', background: '#fff', borderRadius: '12px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#78350F', fontWeight: 500 }}>{p.name}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#E11D48' }}>{p.price}원</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Dry (건조한) ─── */
export function EcommerceDry({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', monospace", background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#000', letterSpacing: '1px' }}>{pharmacyName}</span>
        <span style={{ fontSize: '8px', color: '#000', border: '1px solid #000', padding: '2px 6px' }}>CART (3)</span>
      </div>
      {/* Filter */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: '12px' }}>
        {['ALL', 'SUPPLEMENTS', 'OTC', 'FOOD'].map((c, i) => (
          <span key={c} style={{ fontSize: '7px', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#000' : '#9CA3AF', letterSpacing: '0.5px' }}>{c}</span>
        ))}
      </div>
      {/* Product List */}
      <div style={{ flex: 1 }}>
        {[
          { name: '종합비타민 프리미엄 90정', sku: 'VIT-001', price: '32,000' },
          { name: '오메가3 고함량 60캡슐', sku: 'OMG-002', price: '28,000' },
          { name: '프로바이오틱스 30포', sku: 'PRO-003', price: '35,000' },
          { name: '비타민C 1000mg 120정', sku: 'VTC-004', price: '18,000' },
          { name: '칼슘 마그네슘 아연', sku: 'CMZ-005', price: '24,000' },
        ].map((p, i) => (
          <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#000', display: 'block' }}>{p.name}</span>
              <span style={{ fontSize: '7px', color: '#9CA3AF' }}>{p.sku}</span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#000' }}>{p.price}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '7px', color: '#9CA3AF' }}>5 ITEMS</span>
        <span style={{ fontSize: '8px', fontWeight: 700, color: '#000' }}>TOTAL: 137,000</span>
      </div>
    </div>
  );
}

/* ─── Professional (전문적) ─── */
export function EcommerceProfessional({ pharmacyName = '우리약국', scale = 1 }: TemplatePreviewProps) {
  return (
    <div style={{ ...wrap(scale), fontFamily: "'Pretendard', sans-serif", background: '#F0FDF4' }}>
      {/* Header */}
      <div style={{ background: '#065F46', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#6EE7B7', fontSize: '12px', fontWeight: 700 }}>+</span>
          <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>{pharmacyName}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#A7F3D0', fontSize: '9px' }}>검색</span>
          <span style={{ color: '#fff', fontSize: '11px' }}>🛒</span>
        </div>
      </div>
      {/* Trust Banner */}
      <div style={{ padding: '8px 16px', background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px' }}>✅</span>
        <span style={{ fontSize: '7px', color: '#065F46', fontWeight: 500 }}>약사가 엄선한 정품 의약품 · 당일 배송</span>
      </div>
      {/* Categories */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: '6px' }}>
        {['전체', '비타민', '소화제', '감기약', '외용제'].map((c, i) => (
          <span key={c} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '7px', fontWeight: 500, background: i === 0 ? '#065F46' : '#ECFDF5', color: i === 0 ? '#fff' : '#065F46' }}>{c}</span>
        ))}
      </div>
      {/* Product Grid */}
      <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
        {[
          { name: '종합비타민 플러스', price: '32,000', badge: '약사추천' },
          { name: '오메가3 프리미엄', price: '28,000', badge: '' },
          { name: '유산균 골드', price: '35,000', badge: 'BEST' },
          { name: '비타민D 3000IU', price: '15,000', badge: '' },
        ].map((p, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #D1FAE5' }}>
            <div style={{ height: '40px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span style={{ fontSize: '16px' }}>💊</span>
              {p.badge && (
                <span style={{ position: 'absolute', top: '3px', left: '3px', background: '#059669', color: '#fff', fontSize: '6px', fontWeight: 600, padding: '1px 4px', borderRadius: '3px' }}>{p.badge}</span>
              )}
            </div>
            <div style={{ padding: '6px 8px' }}>
              <span style={{ fontSize: '8px', fontWeight: 500, color: '#1E293B', display: 'block' }}>{p.name}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#065F46', marginTop: '2px', display: 'block' }}>{p.price}원</span>
            </div>
          </div>
        ))}
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
