/**
 * SellerQRGuidePage - 매장용 QR 배치 문안 가이드 & QR 생성 허브
 *
 * WO-NETURE-O4O-SELLER-ENABLEMENT-MASTER-V1 > Track A
 * WO-NETURE-QR-CODE-GENERATION-AND-ASSETIZATION-V1: QR 코드 생성 및 다운로드
 *
 * - /seller/qr-guide 경로
 * - 매장 내 TV, 계산대, 입구 등에 QR 배치 시 사용할 문안
 * - 실제 QR 코드 생성 및 PNG 다운로드 제공
 * - QR 링크 대상: /seller/overview, /seller/overview/pharmacy 등
 */

import { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

// Base URL for QR codes (production URL)
const BASE_URL = 'https://neture.o4o.kr';

interface QRTemplate {
  id: string;
  title: string;
  usage: string;
  text: string[];
  note?: string;
}

interface QRTarget {
  id: string;
  label: string;
  path: string;
  description: string;
  filename: string;
}

const QR_TEMPLATES: QRTemplate[] = [
  {
    id: 'common',
    title: '공통 안내문',
    usage: 'TV 화면, 입구, 계산대 등 어디서나',
    text: [
      '이 매장은',
      'o4o 플랫폼 구조에 참여하고 있습니다.',
      '자세한 안내는 QR로 확인하세요.',
    ],
  },
  {
    id: 'customer',
    title: '매장 방문 고객용',
    usage: '대기 공간, 고객 안내판',
    text: [
      '매장의 운영은 그대로,',
      '새로운 참여 구조를 안내합니다.',
    ],
    note: '판매 유도가 아닌 정보 안내임을 명확히',
  },
  {
    id: 'staff',
    title: '관계자용 (간결)',
    usage: '직원용, 파트너 방문 시',
    text: [
      '매장 참여 안내',
      '(운영·설계 아님)',
    ],
  },
];

const QR_TARGETS: QRTarget[] = [
  {
    id: 'common',
    label: '공통',
    path: '/seller/overview',
    description: '모든 업종 공통 안내',
    filename: 'neture_qr_seller_overview',
  },
  {
    id: 'pharmacy',
    label: '약국',
    path: '/seller/overview/pharmacy',
    description: '약국 전용 안내',
    filename: 'neture_qr_pharmacy',
  },
  {
    id: 'beauty',
    label: '미용실·헬스장',
    path: '/seller/overview/beauty',
    description: '미용실·헬스장 전용 안내',
    filename: 'neture_qr_beauty',
  },
  {
    id: 'market',
    label: '시장·상가',
    path: '/seller/overview/market',
    description: '시장·상가 전용 안내',
    filename: 'neture_qr_market',
  },
];

export default function SellerQRGuidePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('common');
  const [selectedTarget, setSelectedTarget] = useState<string>('common');
  const qrRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const handlePrint = () => {
    window.print();
  };

  const currentTemplate = QR_TEMPLATES.find(t => t.id === selectedTemplate) || QR_TEMPLATES[0];
  const currentTarget = QR_TARGETS.find(t => t.id === selectedTarget) || QR_TARGETS[0];

  const downloadQR = useCallback((targetId: string, size: number = 512) => {
    const target = QR_TARGETS.find(t => t.id === targetId);
    if (!target) return;

    // Create a temporary canvas for download with specified size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Get the source canvas from refs
    const sourceCanvas = qrRefs.current[targetId];
    if (sourceCanvas) {
      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw scaled QR code
      ctx.drawImage(sourceCanvas, 0, 0, size, size);

      // Trigger download
      const link = document.createElement('a');
      link.download = `${target.filename}_${size}px.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    }
  }, []);

  const downloadAllQRs = useCallback(() => {
    QR_TARGETS.forEach((target, index) => {
      setTimeout(() => {
        downloadQR(target.id, 512);
      }, index * 300); // Stagger downloads to prevent browser blocking
    });
  }, [downloadQR]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>QR 코드 생성 & 배치 가이드</h1>
          <p style={styles.subtitle}>
            매장 내 TV, 계산대, 입구 등에 QR 코드와 함께 배치할 문안입니다.
            <br />
            QR 코드를 직접 생성하고 PNG로 다운로드할 수 있습니다.
          </p>
        </header>

        {/* QR Code Generation Hub */}
        <section style={styles.qrHub} className="no-print">
          <h2 style={styles.sectionTitle}>QR 코드 다운로드</h2>
          <p style={styles.sectionDesc}>
            각 업종별 안내 페이지로 연결되는 QR 코드입니다. 클릭하여 PNG 이미지로 다운로드하세요.
          </p>

          <div style={styles.qrGrid}>
            {QR_TARGETS.map((target) => (
              <div
                key={target.id}
                style={{
                  ...styles.qrGridItem,
                  ...(selectedTarget === target.id ? styles.qrGridItemActive : {}),
                }}
                onClick={() => setSelectedTarget(target.id)}
              >
                <div style={styles.qrCodeWrapper}>
                  <QRCodeCanvas
                    value={`${BASE_URL}${target.path}`}
                    size={120}
                    level="M"
                    includeMargin={true}
                    ref={(el: HTMLCanvasElement | null) => {
                      if (el) qrRefs.current[target.id] = el;
                    }}
                  />
                </div>
                <h3 style={styles.qrLabel}>{target.label}</h3>
                <p style={styles.qrDesc}>{target.description}</p>
                <code style={styles.qrPath}>{target.path}</code>
                <div style={styles.downloadButtons}>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadQR(target.id, 512); }}
                    style={styles.downloadBtn}
                  >
                    512px
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadQR(target.id, 1024); }}
                    style={styles.downloadBtn}
                  >
                    1024px
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.downloadAllWrapper}>
            <button onClick={downloadAllQRs} style={styles.downloadAllBtn}>
              모든 QR 일괄 다운로드 (512px)
            </button>
          </div>
        </section>

        {/* Template Selector */}
        <div style={styles.selector} className="no-print">
          <p style={styles.selectorLabel}>문안 선택:</p>
          <div style={styles.selectorButtons}>
            {QR_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                style={{
                  ...styles.selectorButton,
                  ...(selectedTemplate === template.id ? styles.selectorButtonActive : {}),
                }}
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>

        {/* QR Card Preview with Real QR */}
        <div style={styles.previewSection}>
          <h2 style={styles.previewTitle}>배치 미리보기</h2>
          <div style={styles.qrCard}>
            <div style={styles.qrCardCode}>
              <QRCodeCanvas
                value={`${BASE_URL}${currentTarget.path}`}
                size={100}
                level="M"
                includeMargin={false}
              />
            </div>
            <div style={styles.qrContent}>
              {currentTemplate.text.map((line, index) => (
                <p key={index} style={styles.qrLine}>{line}</p>
              ))}
            </div>
          </div>
          <p style={styles.usageNote}>
            <strong>사용처:</strong> {currentTemplate.usage}
          </p>
          <p style={styles.targetNote}>
            <strong>연결 페이지:</strong> {currentTarget.label} ({currentTarget.path})
          </p>
          {currentTemplate.note && (
            <p style={styles.templateNote}>※ {currentTemplate.note}</p>
          )}
        </div>

        {/* Print Section */}
        <div style={styles.printSection} className="no-print">
          <button onClick={handlePrint} style={styles.printButton}>
            이 문안 인쇄하기
          </button>
          <p style={styles.printNote}>
            인쇄하거나 위에서 QR 코드를 다운로드하여 사용하세요.
          </p>
        </div>

        {/* All Templates Reference */}
        <section style={styles.allTemplates} className="no-print">
          <h2 style={styles.allTemplatesTitle}>전체 문안 목록</h2>
          {QR_TEMPLATES.map((template) => (
            <div key={template.id} style={styles.templateCard}>
              <h3 style={styles.templateCardTitle}>{template.title}</h3>
              <p style={styles.templateCardUsage}>{template.usage}</p>
              <div style={styles.templateCardText}>
                {template.text.map((line, index) => (
                  <p key={index} style={styles.templateLine}>{line}</p>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Guidelines */}
        <section style={styles.guidelines} className="no-print">
          <h2 style={styles.guidelinesTitle}>배치 가이드라인</h2>
          <ul style={styles.guidelinesList}>
            <li style={styles.guidelineItem}>
              <strong>플랫폼 설명 ❌</strong> - o4o가 무엇인지 장황하게 설명하지 마세요
            </li>
            <li style={styles.guidelineItem}>
              <strong>판매 유도 ❌</strong> - 구매, 가입, 결제를 암시하지 마세요
            </li>
            <li style={styles.guidelineItem}>
              <strong>안내 / 참여 / 정보 ✔</strong> - 중립적인 정보 안내 톤 유지
            </li>
            <li style={styles.guidelineItem}>
              QR 스캔 시 선택한 업종별 안내 페이지로 연결됩니다
            </li>
          </ul>
        </section>
      </div>

      {/* Print Styles */}
      <style>{printStyles}</style>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 24px',
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: 1.6,
  },

  // QR Hub Section
  qrHub: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '8px',
  },
  sectionDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '24px',
  },
  qrGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
  },
  qrGridItem: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  qrGridItemActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#eff6ff',
  },
  qrCodeWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  qrLabel: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '4px',
  },
  qrDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '8px',
  },
  qrPath: {
    display: 'inline-block',
    fontSize: '0.75rem',
    backgroundColor: '#e2e8f0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    marginBottom: '12px',
  },
  downloadButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  downloadBtn: {
    padding: '6px 12px',
    fontSize: '0.8rem',
    backgroundColor: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  downloadAllWrapper: {
    textAlign: 'center',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  downloadAllBtn: {
    padding: '12px 24px',
    fontSize: '0.95rem',
    fontWeight: 600,
    backgroundColor: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  // Selector
  selector: {
    marginBottom: '32px',
  },
  selectorLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '12px',
  },
  selectorButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  selectorButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  selectorButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
    color: '#fff',
  },

  // Preview Section
  previewSection: {
    marginBottom: '40px',
  },
  previewTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '16px',
  },
  qrCard: {
    backgroundColor: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    maxWidth: '500px',
  },
  qrCardCode: {
    flexShrink: 0,
  },
  qrContent: {
    flex: 1,
  },
  qrLine: {
    fontSize: '1.1rem',
    color: '#0f172a',
    lineHeight: 1.5,
    margin: '4px 0',
  },
  usageNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginTop: '16px',
  },
  targetNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginTop: '8px',
  },
  templateNote: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: '8px',
    fontStyle: 'italic',
  },

  // Print Section
  printSection: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '40px',
  },
  printButton: {
    padding: '14px 32px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '16px',
  },
  printNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.6,
  },

  // All Templates
  allTemplates: {
    marginBottom: '40px',
  },
  allTemplatesTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '20px',
  },
  templateCard: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  },
  templateCardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '4px',
  },
  templateCardUsage: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '12px',
  },
  templateCardText: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
  },
  templateLine: {
    fontSize: '0.95rem',
    color: '#334155',
    margin: '4px 0',
  },

  // Guidelines
  guidelines: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
  },
  guidelinesTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '16px',
  },
  guidelinesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  guidelineItem: {
    fontSize: '0.95rem',
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: '12px',
    paddingLeft: '8px',
  },
};

const printStyles = `
  @media print {
    .no-print {
      display: none !important;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 20mm;
    }
  }
`;
