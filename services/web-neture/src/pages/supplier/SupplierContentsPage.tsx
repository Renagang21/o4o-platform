/**
 * SupplierContentsPage - 공급자 콘텐츠 관리
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.1
 *
 * 기능:
 * - 콘텐츠 목록 조회
 * - 콘텐츠 생성/수정: 전용 편집 페이지로 이동
 * - 상태 관리: draft / published
 * - 삭제
 *
 * 금지:
 * - 자동 배포
 * - 강제 적용
 * - "적용하기" 버튼
 *
 * 명시 문구:
 * "이 콘텐츠는 파트너/판매자가 참고 자료로 활용합니다.
 *  자동 적용되거나 강제 배포되지 않습니다."
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Image,
  Flag,
  BookOpen,
  Plus,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  supplierApi,
  type SupplierContentItem,
  type ContentType,
  type ContentStatus,
} from '../../lib/api';
import { SimpleTable, type SimpleTableColumn, type SimpleTableRow } from '../../components/common/SimpleTable';

// WO-O4O-ICON-SYSTEM-MODERNIZATION-V1: 무채색 아이콘
const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: typeof FileText; color: string }> = {
  description: { label: '제품 설명', icon: FileText, color: '#64748b' },
  image: { label: '이미지', icon: Image, color: '#64748b' },
  banner: { label: '배너', icon: Flag, color: '#64748b' },
  guide: { label: '가이드', icon: BookOpen, color: '#64748b' },
};

export default function SupplierContentsPage() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<SupplierContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchContents = async () => {
    setLoading(true);
    const data = await supplierApi.getContents();
    setContents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const handleDelete = async (id: string) => {
    const result = await supplierApi.deleteContent(id);
    if (result.success) {
      setDeleteConfirm(null);
      fetchContents();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: ContentStatus) => {
    const newStatus: ContentStatus = currentStatus === 'draft' ? 'published' : 'draft';
    const result = await supplierApi.updateContent(id, { status: newStatus });
    if (result.success) {
      fetchContents();
    }
  };

  const stats = {
    total: contents.length,
    published: contents.filter((c) => c.status === 'published').length,
    draft: contents.filter((c) => c.status === 'draft').length,
  };

  // SimpleTable 컬럼 정의 (4개 - 축약형)
  const columns: SimpleTableColumn[] = [
    { id: 'content', label: '콘텐츠', width: '40%' },
    { id: 'type', label: '유형', width: '20%' },
    { id: 'updated', label: '수정일', width: '20%' },
    { id: 'status', label: '상태', width: '20%', align: 'center' },
  ];

  // SimpleTable 행 데이터 변환
  const tableRows: SimpleTableRow[] = contents.map((content) => {
    const typeConfig = CONTENT_TYPE_CONFIG[content.type];
    const TypeIcon = typeConfig.icon;

    return {
      id: content.id,
      data: {
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <TypeIcon size={18} style={{ color: typeConfig.color }} />
              <span className="font-medium text-gray-900">{content.title}</span>
            </div>
            {content.description && (
              <div className="text-sm text-gray-600">{content.description}</div>
            )}
          </div>
        ),
        type: (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: `${typeConfig.color}20`,
              color: typeConfig.color,
            }}
          >
            {typeConfig.label}
          </span>
        ),
        updated: (
          <div>
            <div className="text-sm text-gray-800">
              {new Date(content.updatedAt).toLocaleDateString('ko-KR')}
            </div>
            {content.availableServices.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {content.availableServices.length}개 서비스
              </div>
            )}
          </div>
        ),
        status: (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#f1f5f9',
              color: '#64748b',
            }}
          >
            {content.status === 'published' ? <Eye size={12} /> : <EyeOff size={12} />}
            {content.status === 'published' ? '공개' : '임시저장'}
          </span>
        ),
      },
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleToggleStatus(content.id, content.status)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {content.status === 'published' ? '비공개로 전환' : '공개로 전환'}
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => navigate(`/supplier/contents/${content.id}/edit`)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            수정
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setDeleteConfirm(content.id)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            삭제
          </button>
        </div>
      ),
    };
  });

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
        <button style={styles.createButton} onClick={() => navigate('/supplier/contents/new')}>
          <Plus size={18} />
          콘텐츠 추가
        </button>
      </div>

      {/* Notice */}
      <div style={styles.noticeBox}>
        <AlertCircle size={16} style={{ color: '#64748b', flexShrink: 0 }} />
        <p style={styles.noticeText}>
          이 콘텐츠는 파트너/판매자가 <strong>참고 자료로 활용</strong>합니다.
          자동 적용되거나 강제 배포되지 않습니다.
        </p>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FileText size={20} style={{ color: '#64748b' }} />
          <div>
            <p style={styles.statValue}>{stats.total}</p>
            <p style={styles.statLabel}>전체</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Eye size={20} style={{ color: '#64748b' }} />
          <div>
            <p style={styles.statValue}>{stats.published}</p>
            <p style={styles.statLabel}>공개</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <EyeOff size={20} style={{ color: '#64748b' }} />
          <div>
            <p style={styles.statValue}>{stats.draft}</p>
            <p style={styles.statLabel}>임시저장</p>
          </div>
        </div>
      </div>

      {/* Content List - SimpleTable */}
      {contents.length === 0 && !loading ? (
        <div style={styles.emptyState}>
          <FileText size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p style={styles.emptyTitle}>등록된 콘텐츠가 없습니다</p>
          <p style={styles.emptySubtext}>
            제품 설명, 이미지, 배너, 가이드 등 판매자가 활용할 수 있는 자료를 등록하세요.
          </p>
          <button
            style={{ ...styles.createButton, marginTop: '16px' }}
            onClick={() => navigate('/supplier/contents/new')}
          >
            <Plus size={18} />
            첫 콘텐츠 만들기
          </button>
        </div>
      ) : (
        <SimpleTable
          columns={columns}
          rows={tableRows}
          loading={loading}
          emptyMessage="등록된 콘텐츠가 없습니다"
          className="mb-6"
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.confirmTitle}>콘텐츠 삭제</h3>
            <p style={styles.confirmText}>정말 이 콘텐츠를 삭제하시겠습니까?</p>
            <div style={styles.confirmActions}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelButton}>
                취소
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} style={styles.deleteButton}>
                삭제
              </button>
            </div>
          </div>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '16px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
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
    alignItems: 'flex-start',
    gap: '14px',
    flex: 1,
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  contentTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  typeBadge: {
    fontSize: '10px',
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  contentDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 6px 0',
  },
  contentMeta: {
    display: 'flex',
    gap: '12px',
  },
  metaText: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  contentActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#64748b',
    cursor: 'pointer',
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
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '360px',
    textAlign: 'center',
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  confirmText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 16px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '10px 16px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
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
};
