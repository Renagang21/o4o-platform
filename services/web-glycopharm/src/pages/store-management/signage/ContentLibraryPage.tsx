/**
 * ContentLibraryPage - 디지털 사이니지
 *
 * Signage Extension의 핵심 화면
 * - 디지털 사이니지용 동영상 콘텐츠
 * - 출처별 필터링 (본부 / 공급자 / 약국 직접 등록 / 광고)
 *
 * WO-O4O-SIGNAGE-HUB-TEMPLATE-FOUNDATION-V1:
 *   인라인 구현 → SignageHubTemplate + glycopharmSignageConfig 구조로 전환.
 *   ContentRegisterModal은 서비스 코드에 보존.
 */

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Video,
  BookOpen,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { SignageHubTemplate } from '@o4o/shared-space-ui';
import type { SignageHubConfig, SignageHubItem } from '@o4o/shared-space-ui';
import { apiClient } from '@/services/api';
import { toast } from '@o4o/error-handling';
import type { ContentItem, ContentType } from '@/types';

// ─── Badge Mappings ───────────────────────────────────────

const GLYCO_SOURCE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  neture:      { label: 'Neture',  bg: '#dcfce7', text: '#166534' },
  hq:          { label: '본부',    bg: '#dbeafe', text: '#1d4ed8' },
  supplier:    { label: '공급자',  bg: '#f3e8ff', text: '#7e22ce' },
  pharmacy:    { label: '내 등록', bg: '#f1f5f9', text: '#475569' },
  operator_ad: { label: '광고',    bg: '#fee2e2', text: '#b91c1c' },
};

const GLYCO_MEDIA_TYPE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  video: { label: '영상', bg: '#f3e8ff', text: '#7e22ce' },
  lms:   { label: 'LMS',  bg: '#dbeafe', text: '#1d4ed8' },
  link:  { label: '링크', bg: '#f1f5f9', text: '#475569' },
};

// ─── Main Component ───────────────────────────────────────

export default function ContentLibraryPage() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const config: SignageHubConfig = {
    serviceKey: 'glycopharm',
    heroTitle: '디지털 사이니지',
    heroDesc: '사이니지에 표시할 동영상 콘텐츠를 선택하세요',
    headerAction: (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setShowRegisterModal(true)}
          style={styles.createBtn}
        >
          + 콘텐츠 등록
        </button>
        <NavLink to="/store/signage/my" style={styles.myPageLink}>
          My Page →
        </NavLink>
      </div>
    ),
    searchPlaceholder: '콘텐츠 검색...',
    filters: [
      { key: 'all', label: '전체' },
      { key: 'hq', label: '본부' },
      { key: 'supplier', label: '공급자' },
      { key: 'pharmacy', label: '내 등록' },
      { key: 'operator_ad', label: '광고' },
    ],
    fetchItems: async (params) => {
      const response = await apiClient.get<ContentItem[]>('/api/v1/glycopharm/signage/contents');
      let data: ContentItem[] = (response.data as any) ?? [];
      if (!Array.isArray(data)) data = [];

      // Client-side filtering (existing behavior)
      if (params.filter && params.filter !== 'all') {
        data = data.filter(c => c.source === params.filter);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        data = data.filter(c =>
          c.title.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false)
        );
      }

      const items: SignageHubItem[] = data.map(c => ({
        id: c.id,
        name: c.title,
        description: c.description || null,
        mediaType: c.type || null,
        source: c.source || null,
        creatorName: c.sourceName || null,
        createdAt: c.createdAt,
        url: c.url || null,
      }));

      return { items, total: items.length };
    },
    onCopy: async (item) => {
      try {
        await apiClient.post('/api/v1/glycopharm/signage/my-signage', { contentId: item.id });
      } catch {
        // silently handle (toast is shown by template)
      }
    },
    sourceLabels: GLYCO_SOURCE_LABELS,
    mediaTypeLabels: GLYCO_MEDIA_TYPE_LABELS,
    emptyMessage: '아직 등록된 콘텐츠가 없습니다. 콘텐츠를 등록해주세요.',
    emptyFilteredMessage: '검색 조건에 맞는 콘텐츠가 없습니다.',
  };

  return (
    <>
      <SignageHubTemplate config={config} />
      {showRegisterModal && (
        <ContentRegisterModal onClose={() => setShowRegisterModal(false)} />
      )}
    </>
  );
}

// ─── Content Register Modal ───────────────────────────────

function ContentRegisterModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    type: 'video' as ContentType,
    url: '',
    title: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/api/v1/glycopharm/signage/contents', formData);
      if (response.error) {
        toast.error(response.error.message || '등록에 실패했습니다.');
        return;
      }
      toast.success('콘텐츠가 등록되었습니다.');
      onClose();
    } catch {
      toast.success('콘텐츠가 등록되었습니다.');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.backdropClick} onClick={onClose} />
      <div style={styles.modalDialog}>
        <h2 style={styles.modalTitle}>콘텐츠 등록</h2>
        <p style={styles.modalDesc}>URL을 입력하여 새 콘텐츠를 등록하세요.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Type */}
          <div>
            <label style={styles.formLabel}>콘텐츠 유형</label>
            <div style={styles.typeRow}>
              {(['video', 'lms', 'link'] as ContentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  style={{
                    ...styles.typeBtn,
                    ...(formData.type === type ? styles.typeBtnActive : {}),
                  }}
                >
                  {type === 'video' && <Video style={{ width: 16, height: 16 }} />}
                  {type === 'lms' && <BookOpen style={{ width: 16, height: 16 }} />}
                  {type === 'link' && <LinkIcon style={{ width: 16, height: 16 }} />}
                  {type === 'video' ? '영상' : type === 'lms' ? 'LMS' : '링크'}
                </button>
              ))}
            </div>
          </div>

          {/* URL */}
          <div>
            <label style={styles.formLabel}>URL *</label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder={formData.type === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
              style={styles.formInput}
            />
          </div>

          {/* Title */}
          <div>
            <label style={styles.formLabel}>제목 *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="콘텐츠 제목을 입력하세요"
              style={styles.formInput}
            />
          </div>

          {/* Description */}
          <div>
            <label style={styles.formLabel}>설명 (선택)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="콘텐츠 설명을 입력하세요"
              rows={3}
              style={styles.formTextarea}
            />
          </div>

          {/* Actions */}
          <div style={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={styles.cancelBtn}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={styles.submitBtn}
            >
              {isSubmitting ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  등록 중...
                </span>
              ) : (
                '등록'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  createBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', fontSize: '14px', fontWeight: 500,
    backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer',
  },
  myPageLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', fontSize: '14px', fontWeight: 500,
    border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px',
    textDecoration: 'none',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  backdropClick: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalDialog: {
    position: 'relative', backgroundColor: '#fff', borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    width: '100%', maxWidth: '420px', margin: '0 16px', padding: '24px',
  },
  modalTitle: { margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#1e293b' },
  modalDesc: { margin: '0 0 20px', fontSize: '14px', color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' } as React.CSSProperties,
  formLabel: {
    display: 'block', fontSize: '14px', fontWeight: 500,
    color: '#334155', marginBottom: '8px',
  },
  formInput: {
    width: '100%', padding: '10px 14px', fontSize: '14px',
    borderRadius: '8px', border: '1px solid #e2e8f0',
    outline: 'none', boxSizing: 'border-box',
  } as React.CSSProperties,
  formTextarea: {
    width: '100%', padding: '10px 14px', fontSize: '14px',
    borderRadius: '8px', border: '1px solid #e2e8f0',
    outline: 'none', resize: 'none', boxSizing: 'border-box',
  } as React.CSSProperties,
  typeRow: { display: 'flex', gap: '8px' },
  typeBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px', padding: '8px 12px', fontSize: '14px', fontWeight: 500,
    borderRadius: '8px', border: '2px solid transparent',
    backgroundColor: '#f1f5f9', color: '#475569', cursor: 'pointer',
  } as React.CSSProperties,
  typeBtnActive: {
    backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#93c5fd',
  },
  modalFooter: {
    display: 'flex', gap: '12px', paddingTop: '8px',
  },
  cancelBtn: {
    flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 500,
    color: '#475569', backgroundColor: '#f1f5f9', border: 'none',
    borderRadius: '8px', cursor: 'pointer',
  },
  submitBtn: {
    flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 500,
    color: '#fff', backgroundColor: '#2563eb', border: 'none',
    borderRadius: '8px', cursor: 'pointer',
  },
};
