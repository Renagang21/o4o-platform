/**
 * SaveTemplateModal — 현재 에디터 콘텐츠를 템플릿으로 저장
 *
 * WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';

interface SaveTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, category: string, isPublic: boolean) => void;
  saving?: boolean;
  canCreatePublic?: boolean;
}

const CATEGORIES = ['general', 'product', 'notice', 'guide', 'email', 'forum'];

export function SaveTemplateModal({ open, onClose, onSave, saving, canCreatePublic }: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [isPublic, setIsPublic] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), category, isPublic && !!canCreatePublic);
    setName('');
    setCategory('general');
    setIsPublic(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>템플릿으로 저장</h3>
          <button style={styles.closeBtn} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>템플릿 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 상품 상세 설명 기본 구조"
              style={styles.input}
              maxLength={200}
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={styles.select}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {canCreatePublic && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="template-public"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="template-public" style={{ fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                공용 템플릿으로 저장
              </label>
            </div>
          )}

          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              style={{
                ...styles.saveBtn,
                opacity: !name.trim() || saving ? 0.5 : 1,
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#1e293b',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px 8px',
  },
  form: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    backgroundColor: 'white',
  },
  select: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: 'white',
    color: '#475569',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 24px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    background: '#059669',
    color: 'white',
    cursor: 'pointer',
  },
};
