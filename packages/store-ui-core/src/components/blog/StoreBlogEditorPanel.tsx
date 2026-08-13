/**
 * StoreBlogEditorPanel — 매장 블로그 게시글 편집 화면 (공통)
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1
 *
 * KCos / GP / KPA 3서비스의 editor view 는 본문 편집기 주입 지점을 제외하면 동일했다.
 * 서비스별 추가 요소(KPA template badge · AI 안내문)는 slot 으로만 받는다 —
 * 없는 서비스에 새 요소를 추가하지 않는다(기능 개수 동일화 금지).
 */

import type { ReactNode } from 'react';
import {
  storeBlogBtnStyle,
  storeBlogLabelStyle,
  storeBlogInputStyle,
} from './storeBlogTypes';

export interface StoreBlogEditorPanelProps {
  /** 수정 모드 여부 (기존 게시글 편집) */
  isEditing: boolean;
  title: string;
  onTitleChange: (v: string) => void;
  slug: string;
  onSlugChange: (v: string) => void;
  excerpt: string;
  onExcerptChange: (v: string) => void;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  /** 본문 편집기 slot (RichTextEditor 주입) */
  renderEditor: () => ReactNode;
  /** 제목 옆 badge slot (KPA: 선택된 템플릿) */
  headerBadge?: ReactNode;
  /** 본문 위 안내 slot (KPA: 외부 AI 도구 붙여넣기 안내) */
  beforeEditor?: ReactNode;
}

export function StoreBlogEditorPanel({
  isEditing,
  title,
  onTitleChange,
  slug,
  onSlugChange,
  excerpt,
  onExcerptChange,
  saving,
  canSave,
  onSave,
  onCancel,
  renderEditor,
  headerBadge,
  beforeEditor,
}: StoreBlogEditorPanelProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
            {isEditing ? '게시글 수정' : '새 게시글'}
          </h1>
          {headerBadge}
        </div>
        <button onClick={onCancel} style={{ ...storeBlogBtnStyle, backgroundColor: '#f1f5f9', color: '#475569' }}>
          취소
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={storeBlogLabelStyle}>제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="게시글 제목"
            style={storeBlogInputStyle}
          />
        </div>
        <div>
          <label style={storeBlogLabelStyle}>슬러그 (URL)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="자동 생성됨 (선택 입력)"
            style={storeBlogInputStyle}
          />
        </div>
        <div>
          <label style={storeBlogLabelStyle}>요약 (excerpt)</label>
          <input
            type="text"
            value={excerpt}
            onChange={(e) => onExcerptChange(e.target.value)}
            placeholder="목록에 표시될 요약 (선택)"
            style={storeBlogInputStyle}
          />
        </div>

        {beforeEditor}

        <div>
          <label style={storeBlogLabelStyle}>본문</label>
          {renderEditor()}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            style={{ ...storeBlogBtnStyle, backgroundColor: '#3b82f6', color: '#fff', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? '저장 중...' : isEditing ? '수정 저장' : '임시 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
