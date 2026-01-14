/**
 * SupplierContentsPage - 공급자 콘텐츠 관리
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.5
 *
 * 공급자가 제공하는 콘텐츠:
 * - 제품 설명 자료
 * - 이미지
 * - 배너 소재
 * - 가이드 문구
 *
 * 기능:
 * - 콘텐츠 등록/수정
 * - 콘텐츠 상태 관리 (draft/published)
 *
 * 명시 문구:
 * "이 콘텐츠는 파트너/판매자가 참고 자료로 활용합니다.
 *  자동 적용되거나 강제 배포되지 않습니다."
 */

import { useState } from 'react';
import { FileText, Image, Flag, BookOpen, Plus, AlertCircle, Eye, EyeOff } from 'lucide-react';

type ContentType = 'description' | 'image' | 'banner' | 'guide';
type ContentStatus = 'draft' | 'published';

interface SupplierContent {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: typeof FileText; color: string }> = {
  description: { label: '제품 설명', icon: FileText, color: '#3b82f6' },
  image: { label: '이미지', icon: Image, color: '#8b5cf6' },
  banner: { label: '배너', icon: Flag, color: '#f59e0b' },
  guide: { label: '가이드', icon: BookOpen, color: '#10b981' },
};

// P0: 콘텐츠 API 연동 전 Placeholder UI
export default function SupplierContentsPage() {
  const [contents] = useState<SupplierContent[]>([]);
  const [showCreateHint, setShowCreateHint] = useState(false);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>콘텐츠 관리</h1>
          <p style={styles.subtitle}>
            판매자/파트너가 참고할 수 있는 제품 자료를 관리합니다.
          </p>
        </div>
        <button
          style={styles.createButton}
          onClick={() => setShowCreateHint(true)}
        >
          <Plus size={18} />
          콘텐츠 추가
        </button>
      </div>

      {/* Notice */}
      <div style={styles.noticeBox}>
        <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
        <p style={styles.noticeText}>
          이 콘텐츠는 파트너/판매자가 <strong>참고 자료로 활용</strong>합니다.
          자동 적용되거나 강제 배포되지 않습니다.
        </p>
      </div>

      {/* Content Types Overview */}
      <div style={styles.typesGrid}>
        {(Object.entries(CONTENT_TYPE_CONFIG) as [ContentType, typeof CONTENT_TYPE_CONFIG[ContentType]][]).map(
          ([type, config]) => {
            const Icon = config.icon;
            const count = contents.filter((c) => c.type === type).length;
            return (
              <div key={type} style={styles.typeCard}>
                <Icon size={24} style={{ color: config.color }} />
                <div>
                  <p style={styles.typeLabel}>{config.label}</p>
                  <p style={styles.typeCount}>{count}개</p>
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* Create Hint Modal */}
      {showCreateHint && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateHint(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>콘텐츠 추가</h2>
            <p style={styles.modalText}>
              콘텐츠 등록 기능은 현재 준비 중입니다.
            </p>
            <p style={styles.modalSubtext}>
              P0에서는 콘텐츠 구조와 UI만 확정하고,
              실제 등록/수정 기능은 P1에서 구현됩니다.
            </p>
            <button
              style={styles.modalButton}
              onClick={() => setShowCreateHint(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Content List - Empty State */}
      {contents.length === 0 ? (
        <div style={styles.emptyState}>
          <FileText size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p style={styles.emptyTitle}>등록된 콘텐츠가 없습니다</p>
          <p style={styles.emptySubtext}>
            제품 설명, 이미지, 배너, 가이드 등
            판매자가 활용할 수 있는 자료를 등록하세요.
          </p>
        </div>
      ) : (
        <div style={styles.contentList}>
          {contents.map((content) => {
            const typeConfig = CONTENT_TYPE_CONFIG[content.type];
            const TypeIcon = typeConfig.icon;

            return (
              <div key={content.id} style={styles.contentCard}>
                <div style={styles.contentInfo}>
                  <TypeIcon size={20} style={{ color: typeConfig.color }} />
                  <div>
                    <h3 style={styles.contentTitle}>{content.title}</h3>
                    <p style={styles.contentDesc}>{content.description}</p>
                  </div>
                </div>
                <div style={styles.contentMeta}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: content.status === 'published' ? '#dcfce7' : '#f1f5f9',
                      color: content.status === 'published' ? '#16a34a' : '#64748b',
                    }}
                  >
                    {content.status === 'published' ? (
                      <>
                        <Eye size={12} /> 공개
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} /> 임시저장
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>콘텐츠 활용 안내</h3>
        <ul style={styles.infoList}>
          <li>등록된 콘텐츠는 판매자/파트너가 자유롭게 참고할 수 있습니다.</li>
          <li>"임시저장" 상태의 콘텐츠는 공개되지 않습니다.</li>
          <li>콘텐츠는 각 서비스에서 자동으로 적용되지 않으며, 참고 자료로만 활용됩니다.</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '24px',
  },
  noticeText: {
    fontSize: '13px',
    color: '#1e40af',
    margin: 0,
    lineHeight: 1.5,
  },
  typesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  typeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '16px',
  },
  typeLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#475569',
    margin: 0,
  },
  typeCount: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '2px 0 0 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#94a3b8',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '24px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
  contentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  contentCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
  },
  contentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  contentTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  contentDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  contentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '4px',
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 12px 0',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.8,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '400px',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  modalText: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 8px 0',
  },
  modalSubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 0 20px 0',
  },
  modalButton: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
