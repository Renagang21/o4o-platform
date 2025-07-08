import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { BlockProps, ParagraphBlockAttributes } from '@/types/block-editor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 단락 블록 컴포넌트 - WordPress Gutenberg 스타일
 */
export const ParagraphBlock: React.FC<BlockProps> = ({
  block,
  isSelected,
  isEditing,
  onChange,
  onSelect,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const attributes = block.attributes as ParagraphBlockAttributes;

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // 단락 블록이므로 제목 비활성화
        paragraph: {
          HTMLAttributes: {
            class: cn(
              'block-paragraph',
              {
                'text-left': attributes.align === 'left',
                'text-center': attributes.align === 'center', 
                'text-right': attributes.align === 'right',
                'text-justify': attributes.align === 'justify',
              }
            ),
          },
        },
      }),
    ],
    content: attributes.content || '',
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      onChange({
        content: newContent,
      });
    },
    onFocus: () => {
      onSelect();
    },
  });

  // 편집 모드 변경 시 에디터 활성화/비활성화
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      if (isEditing) {
        // 편집 모드로 전환 시 포커스
        setTimeout(() => {
          editor.commands.focus();
        }, 100);
      }
    }
  }, [isEditing, editor]);

  // 콘텐츠 변경 시 에디터 업데이트
  useEffect(() => {
    if (editor && attributes.content !== editor.getHTML()) {
      editor.commands.setContent(attributes.content || '');
    }
  }, [attributes.content, editor]);

  // 정렬 변경
  const handleAlignChange = (align: ParagraphBlockAttributes['align']) => {
    onChange({ align });
  };

  // 포맷팅 툴바
  const FormatToolbar = () => {
    if (!isEditing || !editor) return null;

    return (
      <div className="flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-md shadow-sm mb-2">
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 px-2"
        >
          <Bold className="w-4 h-4" />
        </Button>
        
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 px-2"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant={attributes.align === 'left' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleAlignChange('left')}
          className="h-8 px-2"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant={attributes.align === 'center' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleAlignChange('center')}
          className="h-8 px-2"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        
        <Button
          variant={attributes.align === 'right' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleAlignChange('right')}
          className="h-8 px-2"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  // 클릭하여 편집 모드 진입
  const handleClick = () => {
    if (!isEditing) {
      onSelect();
    }
  };

  return (
    <div
      ref={editorRef}
      className={cn(
        'block-paragraph-container relative p-4 rounded-md transition-all duration-200',
        {
          'ring-2 ring-blue-500 ring-offset-2': isSelected,
          'hover:bg-gray-50': !isSelected && !isEditing,
          'bg-white': isEditing,
        }
      )}
      onClick={handleClick}
      style={{
        fontSize: attributes.fontSize === 'small' ? '14px' : 
                 attributes.fontSize === 'large' ? '18px' : '16px',
        color: attributes.textColor || 'inherit',
        backgroundColor: attributes.backgroundColor || 'transparent',
      }}
    >
      {/* 포맷팅 툴바 */}
      <FormatToolbar />

      {/* 에디터 콘텐츠 */}
      <div
        className={cn(
          'block-paragraph-content prose prose-sm max-w-none',
          {
            'text-left': attributes.align === 'left',
            'text-center': attributes.align === 'center',
            'text-right': attributes.align === 'right',
            'text-justify': attributes.align === 'justify',
          }
        )}
      >
        {editor ? (
          <EditorContent 
            editor={editor}
            className={cn(
              'outline-none',
              isEditing ? 'cursor-text' : 'cursor-pointer'
            )}
          />
        ) : (
          <div 
            className="min-h-[1.5rem] text-gray-400"
            dangerouslySetInnerHTML={{ 
              __html: attributes.content || '단락을 입력하세요...' 
            }}
          />
        )}
      </div>

      {/* 편집 힌트 */}
      {isSelected && !isEditing && (
        <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
          클릭하여 편집
        </div>
      )}

      {/* 빈 상태 플레이스홀더 */}
      {isEditing && (!attributes.content || attributes.content.trim() === '') && (
        <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
          단락을 입력하세요...
        </div>
      )}
    </div>
  );
};

// 기본 속성
export const paragraphBlockDefaultAttributes: ParagraphBlockAttributes = {
  content: '',
  align: 'left',
  fontSize: 'normal',
  textColor: '',
  backgroundColor: '',
};