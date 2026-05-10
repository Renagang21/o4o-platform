/**
 * GuideEditableSection — O4O 공통 guide content inline editor
 * WO-O4O-GUIDE-CLIENT-EXTRACTION-V1
 *
 * 가이드/서비스 페이지의 "설명 텍스트 블록"을 운영자가 인라인 편집할 수 있게 하는 컴포넌트.
 * 기존 KPA / GlycoPharm / K-Cosmetics 의 GuideEditableSection 을 1:1 동작으로 이식.
 *
 * 동작:
 * - defaultContent 표시 (DB 오버라이드가 있으면 DB 값 우선)
 * - canEdit 일 때 "수정" 버튼 항상 표시 (WO-O4O-GUIDE-CONTENT-VISIBLE-EDIT-BUTTON-V1)
 * - 클릭 시 RichTextEditor 모달 open
 * - 저장 시 client.saveGuideContent 호출 → 즉시 반영
 *
 * Service-specific 의존성(AuthContext, getAccessToken 등) 은 props 로 주입한다 —
 * 이 컴포넌트 자체는 서비스에 무관하다.
 */

import { useState, useEffect, useRef } from 'react';
import { RichTextEditor, sanitizeRichHtml } from '@o4o/content-editor';
import type { GuideClient } from './createGuideClient';

export interface GuideEditableSectionProps {
  /** 'kpa-society' | 'glycopharm' | 'k-cosmetics' | 'neture' 등 */
  serviceKey: string;
  pageKey: string;
  sectionKey: string;
  /** DB 값이 없을 때 표시할 기본 텍스트 */
  defaultContent: string;
  /** 운영자/관리자 권한 여부 — 호출 측에서 useAuth 등으로 판정 후 전달 */
  canEdit?: boolean;
  /** createGuideClient() 로 만든 인스턴스 */
  client: GuideClient;
}

export function GuideEditableSection({
  serviceKey,
  pageKey,
  sectionKey,
  defaultContent,
  canEdit = false,
  client,
}: GuideEditableSectionProps) {
  const [dbContent, setDbContent] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editorValue, setEditorValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 페이지 마운트 시 해당 페이지 전체 콘텐츠 1회 fetch
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    client.fetchGuidePageContent(serviceKey, pageKey).then((sections) => {
      const value = sections[sectionKey] ?? null;
      setDbContent(value);
    });
  }, [client, serviceKey, pageKey, sectionKey]);

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
      await client.saveGuideContent(serviceKey, pageKey, sectionKey, editorValue);
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
      {/* 콘텐츠 표시 영역 — 리치 콘텐츠(이미지·동영상) 지원을 위해 block 컨테이너 사용 */}
      <div style={{ position: 'relative' }}>
        {dbContent !== null ? (
          String(dbContent).trim() ? (
            <div
              className="guide-rich-content"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(String(dbContent)) }}
              style={{ lineHeight: 1.7 }}
            />
          ) : (
            canEdit ? (
              <span style={{ color: '#aaa', fontStyle: 'italic' }}>
                (내용을 작성하려면 수정 버튼을 누르세요)
              </span>
            ) : null
          )
        ) : (
          <span>{defaultContent}</span>
        )}

        {/* 운영자 수정 버튼 — canEdit 시 항상 표시 */}
        {canEdit && (
          <button
            onClick={openEditor}
            title="본문 수정"
            style={{
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              fontSize: 11,
              lineHeight: 1,
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: 3,
              cursor: 'pointer',
              color: '#555',
            }}
          >
            ✏ 수정
          </button>
        )}
      </div>

      {/* 리치 콘텐츠 렌더링 CSS */}
      <style>{`
        .guide-rich-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; display: block; }
        .guide-rich-content iframe { width: 100%; max-width: 640px; aspect-ratio: 16/9; border: none; border-radius: 6px; margin: 8px 0; display: block; }
        .guide-rich-content h2 { font-size: 1.25em; font-weight: 700; margin: 1em 0 0.4em; }
        .guide-rich-content h3 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.3em; }
        .guide-rich-content ul, .guide-rich-content ol { padding-left: 1.5em; margin: 0.4em 0; }
        .guide-rich-content li { margin: 0.2em 0; }
        .guide-rich-content a { color: #2563eb; text-decoration: underline; }
        .guide-rich-content p { margin: 0 0 0.5em; }
      `}</style>

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
                preset="guide"
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

/**
 * 표준 권한 판정 — 4 서비스 동일 패턴.
 * 호출 측에서 useAuth() 결과의 user.roles 를 전달하면
 * canEdit 값으로 그대로 사용 가능.
 */
export function isOperatorOrAbove(roles?: string[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(
    (r) =>
      r.endsWith(':operator') ||
      r.endsWith(':admin') ||
      r === 'admin' ||
      r === 'super_admin',
  );
}
