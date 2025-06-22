// 🎯 TipTap 공식 예제 기반 페이지 에디터

import React, { useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import { 
  Save, 
  Eye, 
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Type,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

interface TipTapPageEditorProps {
  pageId: string;
  onSave?: (content: string) => void;
  onBack?: () => void;
}

export const TipTapPageEditor: React.FC<TipTapPageEditorProps> = ({ 
  pageId, 
  onSave, 
  onBack 
}) => {
  const [previewMode, setPreviewMode] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);

  // 초기 콘텐츠 로드
  const loadInitialContent = () => {
    try {
      const saved = localStorage.getItem(`tiptap_page_${pageId}`);
      if (saved) {
        const data = JSON.parse(saved);
        return data.content;
      }
    } catch (error) {
      console.error('콘텐츠 로드 실패:', error);
    }
    
    return `
      <h1>📝 페이지 제목을 입력하세요</h1>
      <p>여기에 내용을 작성하세요.</p>
      <p><strong>사용법:</strong></p>
      <ul>
        <li>"/" 키를 입력하면 블록 메뉴가 나타납니다</li>
        <li>텍스트를 선택하면 포맷팅 메뉴가 나타납니다</li>
        <li>자동 저장이 활성화되어 있습니다</li>
      </ul>
      <blockquote>
        <p>💡 <strong>팁:</strong> 이 에디터는 마크다운 단축키를 지원합니다. "# "을 입력하면 제목이 됩니다!</p>
      </blockquote>
    `;
  };

  // TipTap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md',
        },
      }),
      Link.configure({
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-700 underline cursor-pointer',
          target: '_blank',
        },
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: loadInitialContent(),
    onUpdate: ({ editor }) => {
      // 자동 저장 (debounce 적용)
      debounceAutoSave();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[600px] p-6',
      },
    },
  });

  // 자동 저장 debounce
  const debounceAutoSave = React.useCallback(
    debounce(() => {
      if (editor) {
        const content = editor.getHTML();
        const data = {
          content,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(`tiptap_page_${pageId}`, JSON.stringify(data));
        setLastSaved(new Date());
        
        if (onSave) {
          onSave(content);
        }
      }
    }, 2000),
    [editor, pageId, onSave]
  );

  // 수동 저장
  const handleSave = () => {
    if (editor) {
      const content = editor.getHTML();
      const data = {
        content,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(`tiptap_page_${pageId}`, JSON.stringify(data));
      setLastSaved(new Date());
      
      if (onSave) {
        onSave(content);
      }
      
      alert('✅ 페이지가 저장되었습니다!');
    }
  };

  // 이미지 추가
  const addImage = () => {
    const url = prompt('🖼️ 이미지 URL을 입력하세요:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // 링크 추가
  const addLink = () => {
    const url = prompt('🔗 링크 URL을 입력하세요:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // 테이블 추가
  const addTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  // 반응형 미리보기 클래스
  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return 'max-w-sm';
      case 'tablet': return 'max-w-3xl';
      default: return 'max-w-none';
    }
  };

  if (!editor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">에디터를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 도구 모음 */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로가기
            </button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <h1 className="text-xl font-semibold text-gray-900">TipTap 페이지 에디터</h1>
            
            {lastSaved && (
              <span className="text-sm text-green-600">
                ✅ {lastSaved.toLocaleTimeString()}에 저장됨
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 반응형 미리보기 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded transition-colors ${
                  previewMode === 'desktop' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('tablet')}
                className={`p-2 rounded transition-colors ${
                  previewMode === 'tablet' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded transition-colors ${
                  previewMode === 'mobile' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              저장
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Eye className="w-4 h-4" />
              미리보기
            </button>
          </div>
        </div>
      </div>

      {/* 에디터 영역 */}
      <div className="p-6">
        <div className={`mx-auto transition-all duration-300 ${getPreviewWidth()}`}>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden relative">
            
            {/* 버블 메뉴 - 텍스트 선택 시 나타남 */}
            {editor && (
              <BubbleMenu 
                editor={editor} 
                className="flex items-center gap-1 bg-gray-900 text-white rounded-lg p-1 shadow-lg"
              >
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  className={`p-2 rounded hover:bg-gray-700 ${editor.isActive('code') ? 'bg-gray-700' : ''}`}
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  onClick={addLink}
                  className="p-2 rounded hover:bg-gray-700"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </BubbleMenu>
            )}

            {/* 플로팅 메뉴 - 빈 줄에서 나타남 */}
            {editor && (
              <FloatingMenu 
                editor={editor} 
                className="flex items-center gap-1 bg-white border rounded-lg p-1 shadow-lg"
              >
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className="p-2 rounded hover:bg-gray-100 text-gray-700"
                  title="제목 1"
                >
                  <Type className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className="p-2 rounded hover:bg-gray-100 text-gray-700"
                  title="불릿 리스트"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className="p-2 rounded hover:bg-gray-100 text-gray-700"
                  title="번호 리스트"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  onClick={addImage}
                  className="p-2 rounded hover:bg-gray-100 text-gray-700"
                  title="이미지 추가"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={addTable}
                  className="p-2 rounded hover:bg-gray-100 text-gray-700"
                  title="테이블 추가"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="p-2 rounded hover:bg-gray-100 text-gray-700"
                  title="구분선 추가"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </FloatingMenu>
            )}

            {/* 메인 에디터 */}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* 도움말 */}
      <div className="fixed bottom-6 right-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
        <h3 className="font-semibold text-blue-900 mb-2">💡 TipTap 사용 팁</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 텍스트 선택 시 포맷팅 메뉴 표시</li>
          <li>• 빈 줄에서 블록 추가 메뉴 표시</li>
          <li>• "# " 입력 시 제목으로 변환</li>
          <li>• "- " 입력 시 리스트로 변환</li>
          <li>• 자동 저장 (2초마다)</li>
        </ul>
      </div>
    </div>
  );
};

// Debounce 유틸리티 함수
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default TipTapPageEditor;
