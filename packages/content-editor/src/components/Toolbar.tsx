/**
 * Editor Toolbar Component
 * 편집 도구 모음
 */

import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link,
  Image,
  Youtube,
  Undo,
  Redo,
  Minus,
  Highlighter,
  Sparkles,
  Table2,
  // WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1: ShoppingBag(매장 활용 아이콘)은 후속 WO 재사용을 위해 import 제거.
  // StoreUseModal 컴포넌트는 packages/content-editor/src/components/StoreUseModal.tsx 에 유지됨.
} from 'lucide-react';
import type { EditorPreset, MediaInsert } from '../types';
import { AiContentModal } from './AiContentModal';

interface ExistingImage {
  id: string;
  url: string;
  label?: string;
}

interface ToolbarProps {
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string>;
  existingImages?: ExistingImage[];
  preset?: EditorPreset;
  onMediaLibraryPick?: (insertMedia: (media: MediaInsert) => void) => void;
  /** WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1: URL 확보 후 삽입 설정 모달로 라우팅 (미제공 시 즉시 삽입) */
  onRequestImageInsert?: (url: string) => void;
  /** WO-O4O-CONTENT-EDITOR-AI-AUTH-HEADERS-V1: AiContentModal로 전달할 AI API 추가 헤더 */
  aiRequestHeaders?: Record<string, string>;
  /** WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1: AI 결과를 커뮤니티(포럼)에 저장 버튼 표시 */
  showCommunitySave?: boolean;
  /** WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1: AI 결과를 내 매장 콘텐츠로 저장 버튼 표시 */
  showStoreSave?: boolean;
}

export function Toolbar({ editor, onImageUpload, existingImages, preset = 'full', onMediaLibraryPick, onRequestImageInsert, aiRequestHeaders, showCommunitySave, showStoreSave }: ToolbarProps) {
  // WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1: 삽입 설정 모달 경유(있으면), 없으면 즉시 삽입(back-compat)
  const insertImg = (url: string) => {
    if (onRequestImageInsert) onRequestImageInsert(url);
    else editor?.chain().focus().setImage({ src: url }).run();
  };
  // WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1 §8 + WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1:
  //   Media Type 인지형 삽입. sourceType 3종 분기(youtube=iframe / o4o_storage·external=HTML5 <video>).
  const insertMediaIntoEditor = (media: MediaInsert) => {
    if (media.type === 'video') {
      if (!media.url) return;
      const st = media.sourceType;
      // o4o_storage / external → HTML5 <video>. youtube(및 미지정 youtube/vimeo URL) → iframe.
      if (st === 'o4o_storage' || st === 'external') {
        editor?.chain().focus().setVideo({ src: media.url, poster: media.thumbnailUrl ?? null, sourceType: st, title: media.title ?? null }).run();
      } else {
        editor?.chain().focus().setYoutubeVideo({ src: media.url }).run();
      }
      return;
    }
    insertImg(media.url);
  };
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  // WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1: showStoreModal 상태는 후속 WO에서 복원 예정.
  const [linkUrl, setLinkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // WO-NETURE-RICHTEXT-IMAGE-POPUP-STATE-ALIGNMENT-V1: 복수 에디터 팝업 중첩 방지
  const toolbarId = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail !== toolbarId.current) {
        setShowImageInput(false);
        setShowLinkInput(false);
        setShowVideoInput(false);
        setShowTableMenu(false);
      }
    };
    window.addEventListener('content-editor-popup-open', handler);
    return () => window.removeEventListener('content-editor-popup-open', handler);
  }, []);

  if (!editor) return null;

  const ToolButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 8px',
        border: 'none',
        background: isActive ? '#e0e7ff' : 'transparent',
        color: isActive ? '#4f46e5' : '#374151',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <div style={{ width: '1px', height: '24px', background: '#e5e7eb', margin: '0 4px' }} />
  );

  const handleAddLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const handleAddVideo = () => {
    if (videoUrl) {
      // YouTube URL 처리 (기존 iframe 경로 — 하위호환)
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        editor.chain().focus().setYoutubeVideo({ src: videoUrl }).run();
      }
      // Vimeo URL 처리 (iframe으로 삽입)
      else if (videoUrl.includes('vimeo.com')) {
        const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
        if (vimeoId) {
          editor.chain().focus().setYoutubeVideo({
            src: `https://player.vimeo.com/video/${vimeoId}`
          }).run();
        }
      }
      // WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1: 그 외 URL(mp4 등 external) → HTML5 <video>
      else {
        editor.chain().focus().setVideo({ src: videoUrl, sourceType: 'external' }).run();
      }
      setVideoUrl('');
      setShowVideoInput(false);
    }
  };

  const handleAddImage = async () => {
    if (imageUrl) {
      insertImg(imageUrl);
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      try {
        const url = await onImageUpload(file);
        insertImg(url);
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
    setShowImageInput(false);
  };

  return (
    <>
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '2px',
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb',
    }}>
      {/* Undo/Redo */}
      <ToolButton onClick={() => editor.chain().focus().undo().run()} title="실행 취소">
        <Undo size={18} />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} title="다시 실행">
        <Redo size={18} />
      </ToolButton>

      <Divider />

      {/* Text Formatting */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="굵게"
      >
        <Bold size={18} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="기울임"
      >
        <Italic size={18} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="밑줄"
      >
        <Underline size={18} />
      </ToolButton>

      {preset === 'full' && (
        <>
          <ToolButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="취소선"
          >
            <Strikethrough size={18} />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="형광펜"
          >
            <Highlighter size={18} />
          </ToolButton>
        </>
      )}

      <Divider />

      {/* Lists */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="글머리 기호"
      >
        <List size={18} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="번호 매기기"
      >
        <ListOrdered size={18} />
      </ToolButton>

      {preset === 'full' && (
        <>
          <Divider />

          {/* Headings */}
          <ToolButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="제목 1"
          >
            <Heading1 size={18} />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="제목 2"
          >
            <Heading2 size={18} />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="제목 3"
          >
            <Heading3 size={18} />
          </ToolButton>

          <Divider />

          {/* Alignment */}
          <ToolButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="왼쪽 정렬"
          >
            <AlignLeft size={18} />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="가운데 정렬"
          >
            <AlignCenter size={18} />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="오른쪽 정렬"
          >
            <AlignRight size={18} />
          </ToolButton>

          <Divider />

          {/* Block elements */}
          <ToolButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="인용구"
          >
            <Quote size={18} />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="코드 블록"
          >
            <Code size={18} />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="구분선"
          >
            <Minus size={18} />
          </ToolButton>
        </>
      )}

      <Divider />

      {/* Link */}
      <div style={{ position: 'relative' }}>
        <ToolButton
          onClick={() => {
            const next = !showLinkInput;
            if (next) {
              window.dispatchEvent(new CustomEvent('content-editor-popup-open', { detail: toolbarId.current }));
              setShowImageInput(false);
              setShowVideoInput(false);
            }
            setShowLinkInput(next);
          }}
          isActive={editor.isActive('link')}
          title="링크"
        >
          <Link size={18} />
        </ToolButton>
        {showLinkInput && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 10,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '4px',
          }}>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                width: '200px',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
            <button
              onClick={handleAddLink}
              style={{
                padding: '6px 12px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              추가
            </button>
          </div>
        )}
      </div>

      {/* Image (full only) */}
      {preset === 'full' && (
        <div style={{ position: 'relative' }}>
          <ToolButton
            onClick={() => {
              const next = !showImageInput;
              if (next) {
                window.dispatchEvent(new CustomEvent('content-editor-popup-open', { detail: toolbarId.current }));
                setShowLinkInput(false);
                setShowVideoInput(false);
              }
              setShowImageInput(next);
            }}
            title="이미지"
          >
            <Image size={18} />
          </ToolButton>
          {showImageInput && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 10,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              minWidth: '280px',
            }}>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                이미지 URL 입력
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
                />
                <button
                  onClick={handleAddImage}
                  style={{
                    padding: '6px 12px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  추가
                </button>
              </div>
              {onImageUpload && (
                <>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#9ca3af',
                    margin: '8px 0',
                  }}>
                    또는
                  </div>
                  <label style={{
                    display: 'block',
                    padding: '8px',
                    border: '1px dashed #d1d5db',
                    borderRadius: '4px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#6b7280',
                  }}>
                    파일 선택하여 업로드
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </>
              )}
              {onMediaLibraryPick && (
                <>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#9ca3af',
                    margin: '8px 0',
                  }}>
                    또는
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onMediaLibraryPick((media) => {
                        insertMediaIntoEditor(media);
                        setShowImageInput(false);
                      });
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #3b82f6',
                      borderRadius: '4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#3b82f6',
                      background: '#eff6ff',
                    }}
                  >
                    라이브러리에서 선택
                  </button>
                </>
              )}
              {existingImages && existingImages.length > 0 && (
                <>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#9ca3af',
                    margin: '8px 0',
                  }}>
                    등록된 이미지에서 선택
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '4px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}>
                    {existingImages.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => {
                          insertImg(img.url);
                          setShowImageInput(false);
                        }}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          padding: '2px',
                          cursor: 'pointer',
                          background: 'white',
                        }}
                        title={img.label || '이미지 삽입'}
                      >
                        <img
                          src={img.url}
                          alt={img.label || '상품 이미지'}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            objectFit: 'cover',
                            borderRadius: '2px',
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI 정리 버튼 (full only) — WO-AI-CONTENT-TRANSFORM-IMPLEMENTATION-V1
          WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1:
          "매장 활용" 버튼은 콘텐츠 제작 자동화 흐름과 분리하여 후속 WO에서 복원. StoreUseModal 컴포넌트와 백엔드 API는 유지. */}
      {preset === 'full' && (
        <>
          <Divider />
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            title="AI 콘텐츠 정리 (요약/POP/제목 추천)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              border: '1px solid #c7d2fe',
              borderRadius: '6px',
              background: '#eef2ff',
              color: '#4f46e5',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={14} />
            AI 정리
          </button>
        </>
      )}

      {/* Table — full only (WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1) */}
      {preset === 'full' && (
        <div style={{ position: 'relative' }}>
          <ToolButton
            onClick={() => {
              const next = !showTableMenu;
              if (next) {
                window.dispatchEvent(new CustomEvent('content-editor-popup-open', { detail: toolbarId.current }));
                setShowLinkInput(false);
                setShowImageInput(false);
                setShowVideoInput(false);
              }
              setShowTableMenu(next);
            }}
            isActive={editor.isActive('table')}
            title="표"
          >
            <Table2 size={18} />
          </ToolButton>
          {showTableMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 10,
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: 6, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: 190,
              display: 'flex', flexDirection: 'column', gap: 1,
            }}>
              {(() => {
                const inTable = editor.isActive('table');
                const item = (label: string, run: () => void, enabled: boolean) => (
                  <button
                    key={label}
                    type="button"
                    disabled={!enabled}
                    onClick={() => { run(); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 10px', fontSize: 12, border: 'none', borderRadius: 4,
                      background: 'transparent', color: enabled ? '#334155' : '#cbd5e1',
                      cursor: enabled ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                );
                const sep = (k: string) => <div key={k} style={{ height: 1, background: '#f1f5f9', margin: '3px 0' }} />;
                return [
                  item('표 삽입 (3×3)', () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), !inTable),
                  sep('s1'),
                  item('위에 행 추가', () => editor.chain().focus().addRowBefore().run(), inTable),
                  item('아래에 행 추가', () => editor.chain().focus().addRowAfter().run(), inTable),
                  item('행 삭제', () => editor.chain().focus().deleteRow().run(), inTable),
                  sep('s2'),
                  item('왼쪽에 열 추가', () => editor.chain().focus().addColumnBefore().run(), inTable),
                  item('오른쪽에 열 추가', () => editor.chain().focus().addColumnAfter().run(), inTable),
                  item('열 삭제', () => editor.chain().focus().deleteColumn().run(), inTable),
                  sep('s3'),
                  item('셀 병합', () => editor.chain().focus().mergeCells().run(), inTable),
                  item('셀 분할', () => editor.chain().focus().splitCell().run(), inTable),
                  item('머리글 행 전환', () => editor.chain().focus().toggleHeaderRow().run(), inTable),
                  item('머리글 열 전환', () => editor.chain().focus().toggleHeaderColumn().run(), inTable),
                  sep('s4'),
                  item('표 삭제', () => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }, inTable),
                ];
              })()}
            </div>
          )}
        </div>
      )}

      {/* Video — full only */}
      {preset === 'full' && (
        <div style={{ position: 'relative' }}>
          <ToolButton
            onClick={() => {
              const next = !showVideoInput;
              if (next) {
                window.dispatchEvent(new CustomEvent('content-editor-popup-open', { detail: toolbarId.current }));
                setShowLinkInput(false);
                setShowImageInput(false);
                setShowTableMenu(false);
              }
              setShowVideoInput(next);
            }}
            title="동영상 (YouTube/Vimeo)"
          >
            <Youtube size={18} />
          </ToolButton>
          {showVideoInput && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              zIndex: 10,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              minWidth: '300px',
            }}>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                동영상 URL 입력 (YouTube · Vimeo · mp4 등)
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                />
                <button
                  onClick={handleAddVideo}
                  style={{
                    padding: '6px 12px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  삽입
                </button>
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#9ca3af'
              }}>
                지원: YouTube · Vimeo · mp4/webm 등 동영상 URL
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* AI 콘텐츠 변환 모달 */}
    <AiContentModal
      open={showAiModal}
      onClose={() => setShowAiModal(false)}
      editor={editor}
      aiRequestHeaders={aiRequestHeaders}
      showCommunitySave={showCommunitySave}
      showStoreSave={showStoreSave}
    />
    {/* WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1:
        StoreUseModal 마운트 제거. 후속 WO에서 매장 활용 흐름을 복원할 때 다시 연결. */}
    </>
  );
}

export default Toolbar;
