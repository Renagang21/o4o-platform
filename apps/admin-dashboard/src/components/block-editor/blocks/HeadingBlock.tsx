import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { BlockProps, HeadingBlockAttributes } from '@/types/block-editor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * 제목 블록 컴포넌트 - WordPress Gutenberg 스타일
 */
export const HeadingBlock: React.FC<BlockProps> = ({
  block,
  isSelected,
  isEditing,
  onChange,
  onSelect,
}) => {
  const attributes = block.attributes as HeadingBlockAttributes;

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: cn(
              'block-heading',
              {
                'text-left': attributes.align === 'left',
                'text-center': attributes.align === 'center',
                'text-right': attributes.align === 'right',
              }
            ),
          },
        },
        paragraph: false, // 제목 블록이므로 단락 비활성화
      }),
    ],
    content: attributes.content ? `<h${attributes.level}>${attributes.content}</h${attributes.level}>` : `<h${attributes.level}></h${attributes.level}>`,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const textContent = editor.getText();
      onChange({
        content: textContent,
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
        setTimeout(() => {
          editor.commands.focus();
        }, 100);
      }
    }
  }, [isEditing, editor]);

  // 레벨 또는 콘텐츠 변경 시 에디터 업데이트
  useEffect(() => {
    if (editor) {
      const newContent = attributes.content ? 
        `<h${attributes.level}>${attributes.content}</h${attributes.level}>` : 
        `<h${attributes.level}></h${attributes.level}>`;
      
      if (editor.getHTML() !== newContent) {
        editor.commands.setContent(newContent);
      }
    }
  }, [attributes.content, attributes.level, editor]);

  // 레벨 변경
  const handleLevelChange = (level: string) => {
    const newLevel = parseInt(level) as HeadingBlockAttributes['level'];
    onChange({ level: newLevel });
  };

  // 정렬 변경
  const handleAlignChange = (align: HeadingBlockAttributes['align']) => {
    onChange({ align });
  };

  // 포맷팅 툴바
  const FormatToolbar = () => {
    if (!isEditing || !editor) return null;

    return (
      <div className="flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-md shadow-sm mb-2">
        {/* 제목 레벨 선택 */}
        <Select value={attributes.level.toString()} onValueChange={handleLevelChange}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">H1</SelectItem>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
            <SelectItem value="4">H4</SelectItem>
            <SelectItem value="5">H5</SelectItem>
            <SelectItem value="6">H6</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-gray-300 mx-1" />

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

  // 제목 레벨에 따른 스타일
  const getHeadingStyles = (level: number) => {
    const baseStyles = 'font-bold leading-tight';
    switch (level) {
      case 1: return `${baseStyles} text-4xl mb-4`;
      case 2: return `${baseStyles} text-3xl mb-3`;
      case 3: return `${baseStyles} text-2xl mb-3`;
      case 4: return `${baseStyles} text-xl mb-2`;
      case 5: return `${baseStyles} text-lg mb-2`;
      case 6: return `${baseStyles} text-base mb-2`;
      default: return `${baseStyles} text-2xl mb-3`;
    }
  };

  return (
    <div
      className={cn(
        'block-heading-container relative p-4 rounded-md transition-all duration-200',
        {
          'ring-2 ring-blue-500 ring-offset-2': isSelected,
          'hover:bg-gray-50': !isSelected && !isEditing,
          'bg-white': isEditing,
        }
      )}
      onClick={handleClick}
      style={{
        color: attributes.textColor || 'inherit',
      }}
    >
      {/* 포맷팅 툴바 */}
      <FormatToolbar />

      {/* 에디터 콘텐츠 */}
      <div
        className={cn(
          'block-heading-content',
          getHeadingStyles(attributes.level),
          {
            'text-left': attributes.align === 'left',
            'text-center': attributes.align === 'center',
            'text-right': attributes.align === 'right',
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
            style={{ 
              fontSize: `${3.5 - (attributes.level * 0.3)}rem`,
              fontWeight: 'bold'
            }}
          >
            {attributes.content || `제목 ${attributes.level}을 입력하세요...`}
          </div>
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
          제목을 입력하세요...
        </div>
      )}

      {/* 앵커 표시 */}
      {attributes.anchor && (
        <div className="absolute top-2 left-2 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
          #{attributes.anchor}
        </div>
      )}
    </div>
  );
};

// 기본 속성
export const headingBlockDefaultAttributes: HeadingBlockAttributes = {
  content: '',
  level: 2,
  align: 'left',
  textColor: '',
  anchor: '',
};