/**
 * Editor Toolbar Component
 * 편집 도구 모음
 */

import { useState } from 'react';
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
} from 'lucide-react';

interface ToolbarProps {
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string>;
}

export function Toolbar({ editor, onImageUpload }: ToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

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
      // YouTube URL 처리
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
      setVideoUrl('');
      setShowVideoInput(false);
    }
  };

  const handleAddImage = async () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
    setShowImageInput(false);
  };

  return (
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

      <Divider />

      {/* Link */}
      <div style={{ position: 'relative' }}>
        <ToolButton
          onClick={() => setShowLinkInput(!showLinkInput)}
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

      {/* Image */}
      <div style={{ position: 'relative' }}>
        <ToolButton
          onClick={() => setShowImageInput(!showImageInput)}
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
          </div>
        )}
      </div>

      {/* Video (YouTube/Vimeo) */}
      <div style={{ position: 'relative' }}>
        <ToolButton
          onClick={() => setShowVideoInput(!showVideoInput)}
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
              YouTube 또는 Vimeo URL 입력
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
              지원: YouTube, Vimeo
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Toolbar;
