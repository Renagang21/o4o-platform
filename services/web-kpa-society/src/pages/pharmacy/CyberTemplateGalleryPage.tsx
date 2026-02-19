/**
 * CyberTemplateGalleryPage — 사이버 공간 템플릿 갤러리
 *
 * 경로: /pharmacy/store/cyber-templates
 * 인증 필수 + PharmacyGuard
 *
 * 4 채널(블로그, 태블릿, 전자상거래, 키오스크) × 4 디자인 스타일(현대적, 감성적, 건조한, 전문적)
 * 약국이 사이버 공간에서 사용할 디자인을 미리보기하고 선택하는 갤러리
 */

import { useState } from 'react';
import { colors } from '../../styles/theme';
import {
  BlogModern, BlogEmotional, BlogDry, BlogProfessional,
  TabletModern, TabletEmotional, TabletDry, TabletProfessional,
  EcommerceModern, EcommerceEmotional, EcommerceDry, EcommerceProfessional,
  KioskModern, KioskEmotional, KioskDry, KioskProfessional,
} from './templates';

type ChannelType = 'blog' | 'tablet' | 'ecommerce' | 'kiosk';
type DesignStyle = 'modern' | 'emotional' | 'dry' | 'professional';

interface ChannelInfo {
  id: ChannelType;
  label: string;
  icon: string;
  description: string;
}

interface StyleInfo {
  id: DesignStyle;
  label: string;
  labelEn: string;
  description: string;
  colors: string[];
}

const CHANNELS: ChannelInfo[] = [
  { id: 'blog', label: '블로그', icon: '📝', description: '약국 건강정보 블로그' },
  { id: 'tablet', label: '태블릿', icon: '📱', description: '매장 내 태블릿 디스플레이' },
  { id: 'ecommerce', label: '전자상거래', icon: '🛒', description: 'B2C 온라인 쇼핑몰' },
  { id: 'kiosk', label: '키오스크', icon: '🖥️', description: '무인 안내/주문 키오스크' },
];

const STYLES: StyleInfo[] = [
  {
    id: 'modern', label: '현대적', labelEn: 'Modern',
    description: '깔끔한 선, 볼드 타이포그래피, 그라디언트 포인트',
    colors: ['#0F172A', '#3B82F6', '#8B5CF6'],
  },
  {
    id: 'emotional', label: '감성적', labelEn: 'Emotional',
    description: '따뜻한 색감, 둥근 모서리, 부드러운 그림자',
    colors: ['#F59E0B', '#EC4899', '#FBBF24'],
  },
  {
    id: 'dry', label: '건조한', labelEn: 'Dry',
    description: '초미니멀, 모노크롬, 날카로운 모서리, 데이터 중심',
    colors: ['#000000', '#6B7280', '#D1D5DB'],
  },
  {
    id: 'professional', label: '전문적', labelEn: 'Professional',
    description: '의료/약국 전문, 신뢰감 있는 구조적 디자인',
    colors: ['#065F46', '#059669', '#10B981'],
  },
];

// Template component lookup
const TEMPLATE_MAP: Record<ChannelType, Record<DesignStyle, React.FC<{ pharmacyName?: string; scale?: number }>>> = {
  blog: { modern: BlogModern, emotional: BlogEmotional, dry: BlogDry, professional: BlogProfessional },
  tablet: { modern: TabletModern, emotional: TabletEmotional, dry: TabletDry, professional: TabletProfessional },
  ecommerce: { modern: EcommerceModern, emotional: EcommerceEmotional, dry: EcommerceDry, professional: EcommerceProfessional },
  kiosk: { modern: KioskModern, emotional: KioskEmotional, dry: KioskDry, professional: KioskProfessional },
};

export function CyberTemplateGalleryPage() {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('blog');
  const [previewStyle, setPreviewStyle] = useState<{ channel: ChannelType; style: DesignStyle } | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<ChannelType, DesignStyle | null>>({
    blog: null, tablet: null, ecommerce: null, kiosk: null,
  });

  const handleSelect = (channel: ChannelType, style: DesignStyle) => {
    setSelectedTemplates(prev => ({ ...prev, [channel]: style }));
  };

  const activeChannelInfo = CHANNELS.find(c => c.id === activeChannel)!;

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>사이버 공간 템플릿</h1>
        <p style={styles.pageDesc}>
          약국의 온라인 채널별 디자인을 미리보기하고 선택하세요. 4가지 디자인 스타일 중 원하는 것을 선택할 수 있습니다.
        </p>
      </div>

      {/* Channel Tabs */}
      <div style={styles.channelTabs}>
        {CHANNELS.map(ch => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            style={{
              ...styles.channelTab,
              ...(activeChannel === ch.id ? styles.channelTabActive : {}),
            }}
          >
            <span style={styles.channelTabIcon}>{ch.icon}</span>
            <span>{ch.label}</span>
          </button>
        ))}
      </div>

      {/* Channel Description */}
      <div style={styles.channelDesc}>
        <span style={styles.channelDescIcon}>{activeChannelInfo.icon}</span>
        <div>
          <span style={styles.channelDescTitle}>{activeChannelInfo.label}</span>
          <span style={styles.channelDescText}>{activeChannelInfo.description}</span>
        </div>
      </div>

      {/* Template Grid (2×2) */}
      <div style={styles.templateGrid}>
        {STYLES.map(st => {
          const TemplateComponent = TEMPLATE_MAP[activeChannel][st.id];
          const isSelected = selectedTemplates[activeChannel] === st.id;

          return (
            <div
              key={st.id}
              style={{
                ...styles.templateCard,
                borderColor: isSelected ? colors.primary : '#E2E8F0',
                boxShadow: isSelected ? `0 0 0 2px ${colors.primary}30` : 'none',
              }}
            >
              {/* Style Header */}
              <div style={styles.styleHeader}>
                <div>
                  <span style={styles.styleLabel}>{st.label}</span>
                  <span style={styles.styleLabelEn}> {st.labelEn}</span>
                </div>
                <div style={styles.colorDots}>
                  {st.colors.map((c, i) => (
                    <span key={i} style={{ ...styles.colorDot, backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <p style={styles.styleDesc}>{st.description}</p>

              {/* Preview */}
              <div style={styles.previewWrapper}>
                <div style={styles.previewScaleContainer}>
                  <TemplateComponent scale={0.72} />
                </div>
              </div>

              {/* Actions */}
              <div style={styles.cardActions}>
                <button
                  style={styles.previewBtn}
                  onClick={() => setPreviewStyle({ channel: activeChannel, style: st.id })}
                >
                  미리보기
                </button>
                <button
                  style={{
                    ...styles.selectBtn,
                    backgroundColor: isSelected ? colors.primary : '#fff',
                    color: isSelected ? '#fff' : colors.primary,
                    borderColor: colors.primary,
                  }}
                  onClick={() => handleSelect(activeChannel, st.id)}
                >
                  {isSelected ? '선택됨 ✓' : '선택'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {Object.values(selectedTemplates).some(Boolean) && (
        <div style={styles.summary}>
          <h3 style={styles.summaryTitle}>선택한 템플릿</h3>
          <div style={styles.summaryGrid}>
            {CHANNELS.map(ch => {
              const selected = selectedTemplates[ch.id];
              const styleInfo = STYLES.find(s => s.id === selected);
              return (
                <div key={ch.id} style={styles.summaryItem}>
                  <span style={styles.summaryIcon}>{ch.icon}</span>
                  <span style={styles.summaryChannel}>{ch.label}</span>
                  <span style={styles.summaryStyle}>
                    {styleInfo ? styleInfo.label : '미선택'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewStyle && (() => {
        const PreviewComponent = TEMPLATE_MAP[previewStyle.channel][previewStyle.style];
        const styleInfo = STYLES.find(s => s.id === previewStyle.style)!;
        const channelInfo = CHANNELS.find(c => c.id === previewStyle.channel)!;
        return (
          <div style={styles.modalOverlay} onClick={() => setPreviewStyle(null)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <span style={styles.modalTitle}>
                    {channelInfo.icon} {channelInfo.label} — {styleInfo.label} ({styleInfo.labelEn})
                  </span>
                  <p style={styles.modalDesc}>{styleInfo.description}</p>
                </div>
                <button style={styles.modalClose} onClick={() => setPreviewStyle(null)}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <PreviewComponent scale={1} />
              </div>
              <div style={styles.modalFooter}>
                <button
                  style={styles.modalSelectBtn}
                  onClick={() => {
                    handleSelect(previewStyle.channel, previewStyle.style);
                    setPreviewStyle(null);
                  }}
                >
                  이 템플릿 선택
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '24px',
  },
  pageHeader: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  pageDesc: {
    fontSize: '14px',
    color: '#64748B',
    margin: '6px 0 0',
    lineHeight: 1.5,
  },

  // Channel Tabs
  channelTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  channelTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    background: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  channelTabActive: {
    background: colors.primary,
    color: '#fff',
    borderColor: colors.primary,
  },
  channelTabIcon: {
    fontSize: '16px',
  },
  channelDesc: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: '#F8FAFC',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  channelDescIcon: {
    fontSize: '20px',
  },
  channelDescTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1E293B',
    display: 'block',
  },
  channelDescText: {
    fontSize: '12px',
    color: '#64748B',
  },

  // Template Grid
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  templateCard: {
    background: '#fff',
    borderRadius: '14px',
    border: '2px solid #E2E8F0',
    padding: '16px',
    transition: 'all 0.15s',
  },
  styleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  styleLabel: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0F172A',
  },
  styleLabelEn: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#94A3B8',
  },
  colorDots: {
    display: 'flex',
    gap: '4px',
  },
  colorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '1px solid rgba(0,0,0,0.08)',
  },
  styleDesc: {
    fontSize: '12px',
    color: '#64748B',
    margin: '0 0 12px',
    lineHeight: 1.4,
  },

  // Preview
  previewWrapper: {
    width: '100%',
    height: '260px',
    overflow: 'hidden',
    borderRadius: '10px',
    background: '#F8FAFC',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: '12px',
    padding: '8px',
  },
  previewScaleContainer: {
    transformOrigin: 'top center',
  },

  // Card Actions
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  previewBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    background: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748B',
    cursor: 'pointer',
  },
  selectBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Summary
  summary: {
    padding: '16px',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    marginBottom: '24px',
  },
  summaryTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1E293B',
    margin: '0 0 12px',
  },
  summaryGrid: {
    display: 'flex',
    gap: '12px',
  },
  summaryItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '10px',
    background: '#F8FAFC',
    borderRadius: '10px',
  },
  summaryIcon: {
    fontSize: '18px',
  },
  summaryChannel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#1E293B',
  },
  summaryStyle: {
    fontSize: '11px',
    color: '#64748B',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: '#fff',
    borderRadius: '16px',
    maxWidth: '400px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    padding: '20px 20px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: '12px',
    color: '#64748B',
    margin: '4px 0 0',
  },
  modalClose: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid #E2E8F0',
    background: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94A3B8',
    flexShrink: 0,
  },
  modalBody: {
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'center',
  },
  modalFooter: {
    padding: '16px 20px 20px',
    display: 'flex',
    justifyContent: 'center',
  },
  modalSelectBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: colors.primary,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default CyberTemplateGalleryPage;
