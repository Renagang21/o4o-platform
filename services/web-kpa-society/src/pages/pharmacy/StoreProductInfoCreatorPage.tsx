/**
 * StoreProductInfoCreatorPage — 상품 정보 제작
 *
 * WO-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-MENU-V1
 *
 * 매장 실행용 상품 정보 제작 도구.
 *
 * SSOT: store_execution_assets (category='product-info', assetType='content').
 *   → directContentApi(kpa_store_contents)는 POST(create) 엔드포인트가 없어 재사용 불가.
 *   → store_execution_assets.category는 varchar(100) free-form — DB/API 변경 없이 사용.
 *
 * 기능:
 *   목록 — getStoreExecutionAssets({ category: 'product-info' })
 *   생성 — 모달에서 제목 + 내용 입력 → createStoreExecutionAsset
 *   삭제 — deleteStoreExecutionAsset (soft-delete)
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { FileText, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  getStoreExecutionAssets,
  createStoreExecutionAsset,
  deleteStoreExecutionAsset,
  type StoreExecutionAsset,
} from '../../api/storeExecutionAssets';
import { colors } from '../../styles/theme';

// ─── 생성 모달 ────────────────────────────────────────────────────────────────

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (item: StoreExecutionAsset) => void;
}

function CreateProductInfoModal({ open, onClose, onCreated }: CreateModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setContent('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력하세요');
      return;
    }
    if (!content.trim()) {
      toast.error('내용을 입력하세요');
      return;
    }
    setSaving(true);
    try {
      const res = await createStoreExecutionAsset({
        title: title.trim(),
        assetType: 'content',
        category: 'product-info',
        htmlContent: content.trim(),
        sourceType: 'manual',
      });
      onCreated(res.data);
      toast.success('상품 정보가 저장되었습니다');
      handleClose();
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={modalStyles.overlay} onClick={handleClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>상품 정보 새로 만들기</h2>
          <p style={modalStyles.headerSub}>
            상품에 대한 정보를 작성합니다. 저장된 내용은 POP·QR 등 제작 자료로 활용할 수 있습니다.
          </p>
        </div>
        <div style={modalStyles.body}>
          <label style={modalStyles.label}>
            제목 <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 어린이 종합비타민 상품 소개"
            style={modalStyles.input}
            maxLength={200}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <label style={{ ...modalStyles.label, marginTop: 16 }}>
            내용 <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상품의 특징, 효능, 복용법, 홍보 문구 등을 자유롭게 작성하세요"
            style={modalStyles.textarea}
            rows={8}
          />
        </div>
        <div style={modalStyles.footer}>
          <button onClick={handleClose} style={modalStyles.cancelBtn} disabled={saving}>
            취소
          </button>
          <button onClick={handleSave} style={modalStyles.saveBtn} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function StoreProductInfoCreatorPage() {
  const [items, setItems] = useState<StoreExecutionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStoreExecutionAssets({ category: 'product-info', limit: 100 });
      setItems(res.data.items);
    } catch (e: any) {
      setError(e?.message || '불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreated = (item: StoreExecutionAsset) => {
    setItems((prev) => [item, ...prev]);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}"을(를) 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      await deleteStoreExecutionAsset(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success('삭제되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <FileText size={20} style={{ color: colors.primary }} />
            상품 정보 제작
          </h1>
          <p style={styles.subtitle}>
            내 매장 상품의 상세 정보 콘텐츠를 만들고 관리합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchAll} style={styles.refreshBtn} disabled={loading}>
            <RefreshCw size={14} />
            새로고침
          </button>
          <button onClick={() => setModalOpen(true)} style={styles.createBtn}>
            <Plus size={14} />
            새로 만들기
          </button>
        </div>
      </div>

      {/* 본문 */}
      {loading ? (
        <div style={styles.empty}>불러오는 중...</div>
      ) : error ? (
        <div style={styles.empty}>
          <p style={{ margin: 0, color: '#DC2626', fontSize: 14 }}>{error}</p>
          <button onClick={fetchAll} style={{ ...styles.refreshBtn, marginTop: 12 }}>
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <FileText size={36} style={{ color: colors.neutral300, marginBottom: 14 }} />
          <p style={{ margin: 0, color: colors.neutral600, fontSize: 15, fontWeight: 500 }}>
            작성된 상품 정보가 없습니다.
          </p>
          <p style={{ margin: '8px 0 16px', color: colors.neutral400, fontSize: 13, lineHeight: 1.6 }}>
            상품 상세 설명, 홍보 문구, 복용법 안내 등을 작성하고 POP·QR 제작에 활용하세요.
          </p>
          <button onClick={() => setModalOpen(true)} style={styles.createBtn}>
            <Plus size={14} />
            새로 만들기
          </button>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          {/* 테이블 헤더 */}
          <div style={styles.tableHead}>
            <div style={{ ...styles.col, flex: 3 }}>제목</div>
            <div style={{ ...styles.col, width: 120 }}>생성일</div>
            <div style={{ ...styles.col, width: 44 }} />
          </div>

          {/* 테이블 행 */}
          {items.map((item) => (
            <div key={item.id} style={styles.tableRow}>
              <div style={{ ...styles.col, flex: 3, minWidth: 0 }}>
                <span style={styles.titleCell}>{item.title}</span>
              </div>
              <div style={{ ...styles.col, width: 120 }}>
                <span style={styles.metaText}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '-'}
                </span>
              </div>
              <div style={{ ...styles.col, width: 44 }}>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  disabled={deletingId === item.id}
                  style={styles.deleteBtn}
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateProductInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  tableWrap: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tableHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral500,
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  col: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleCell: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metaText: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: colors.neutral400,
    cursor: 'pointer',
    borderRadius: '4px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    textAlign: 'center',
  },
};

const modalStyles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: colors.white,
    borderRadius: '12px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  headerSub: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
  body: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    display: 'block',
    marginBottom: 6,
    margin: 0,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.neutral800,
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.neutral800,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelBtn: {
    padding: '8px 16px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 16px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
