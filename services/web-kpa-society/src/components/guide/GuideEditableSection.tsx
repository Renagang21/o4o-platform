/**
 * WO-O4O-GUIDE-INLINE-EDIT-V1
 *
 * GuideEditableSection
 *
 * 가이드/서비스 페이지의 "설명 텍스트 블록"을 운영자가 인라인 편집할 수 있게 하는 컴포넌트.
 *
 * 동작:
 * - defaultContent 표시 (DB 오버라이드가 있으면 DB 값 우선)
 * - 운영자(kpa:operator/admin)일 때 ✏ 아이콘 hover 표시
 * - 클릭 시 RichTextEditor 모달 open
 * - 저장 시 API POST → 즉시 반영
 *
 * 제약:
 * - 본문 텍스트만 수정 (구조/레이아웃 변경 불가)
 * - 한 번에 한 section만 편집
 * - 일반 사용자에게는 편집 UI 비노출
 */

import { useState, useEffect, useRef } from 'react';
import { RichTextEditor, sanitizeHtml } from '@o4o/content-editor';
import { useAuth } from '../../contexts/AuthContext';
import { fetchGuidePageContent, saveGuideContent } from '../../api/guideContent';

const SERVICE_KEY = 'kpa-society';

interface Props {
  pageKey: string;
  sectionKey: string;
  defaultContent: string;
}

function isOperatorOrAbove(roles?: string[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(
    (r) =>
      r.endsWith(':operator') ||
      r.endsWith(':admin') ||
      r === 'admin' ||
      r === 'super_admin'
  );
}

export function GuideEditableSection({ pageKey, sectionKey, defaultContent }: Props) {
  const { user } = useAuth();
  const canEdit = isOperatorOrAbove(user?.roles);

  const [dbContent, setDbContent] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editorValue, setEditorValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 페이지 마운트 시 해당 페이지 전체 콘텐츠 1회 fetch
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchGuidePageContent(SERVICE_KEY, pageKey).then((sections) => {
      const value = sections[sectionKey] ?? null;
      setDbContent(value);
    });
  }, [pageKey, sectionKey]);

  const displayContent = dbContent !== null ? dbContent : defaultContent;

  function openEditor() {
    setEditorValue(displayContent);
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (typeof editorValue !== 'string') {
        setSaveError('편집기 오류: 내용을 다시 입력해주세요.');
        return;
      }
      await saveGuideContent(SERVICE_KEY, pageKey, sectionKey, editorValue);
      setDbContent(editorValue);
      setModalOpen(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : '저장 오류');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* 텍스트 표시 영역 */}
      <span
        style={{ position: 'relative', display: 'inline' }}
        onMouseEnter={() => canEdit && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* DB HTML 콘텐츠 — sanitizeHtml로 XSS 방어 후 렌더링 */}
        {dbContent !== null ? (
          String(dbContent).trim() ? (
            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(dbContent)) }} />
          ) : (
            /* 빈 DB 값: 운영자에게만 플레이스홀더 표시 */
            canEdit ? (
              <span style={{ color: '#aaa', fontStyle: 'italic' }}>
                (내용을 작성하려면 편집 버튼을 누르세요)
              </span>
            ) : null
          )
        ) : (
          defaultContent
        )}

        {/* 운영자 편집 버튼 */}
        {canEdit && hovered && (
          <button
            onClick={openEditor}
            title="본문 편집"
            style={{
              marginLeft: 6,
              padding: '2px 6px',
              fontSize: 11,
              lineHeight: 1,
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: 3,
              cursor: 'pointer',
              verticalAlign: 'middle',
              color: '#555',
            }}
          >
            ✏
          </button>
        )}
      </span>

      {/* 에디터 모달 */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 720,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>본문 편집</h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 200 }}>
              <RichTextEditor
                value={editorValue}
                onChange={(content) => setEditorValue(content.html)}
                preset="compact"
                minHeight="200px"
              />
            </div>

            {saveError && (
              <p style={{ margin: 0, color: '#d32f2f', fontSize: 13 }}>{saveError}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#1976d2',
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
