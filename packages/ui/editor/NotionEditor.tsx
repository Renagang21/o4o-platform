// 🚀 Notion 스타일 블록 에디터 (Tiptap 공식 기능 활용)

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
// import Placeholder from '@tiptap/extension-placeholder'; // 임시 비활성화
import { SlashCommand, suggestion } from './SlashCommand';
import { BlockInserter } from './BlockInserter';

import { 
  Save, 
  Eye, 
  ArrowLeft,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Plus,
  Type,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  GripVertical
} from 'lucide-react';

interface NotionEditorProps {
  pageSlug: string;
  initialContent?: string;
  onSave?: (content: string, json: any) => void;
  onBack?: () => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({ 
  pageSlug, 
  initialContent, 
  onSave, 
  onBack 
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 초기 콘텐츠 로드
  const loadContent = () => {
    try {
      const saved = localStorage.getItem(`notion_editor_${pageSlug}`);
      if (saved) {
        const data = JSON.parse(saved);
        return data.content;
      }
    } catch (error) {
      console.error('콘텐츠 로드 실패:', error);
    }
    
    return initialContent || `
      <h1>📝 페이지 제목을 입력하세요</h1>
      <p>여기에 내용을 작성하세요.</p>
      <p><strong>🎯 사용법:</strong></p>
      <ul>
        <li><strong>"/" 입력</strong> → 블록 메뉴 표시</li>
        <li><strong>텍스트 선택</strong> → 포맷팅 메뉴 표시</li>
        <li><strong>빈 줄 클릭</strong> → + 버튼으로 블록 추가</li>
        <li><strong>마크다운 지원</strong> → "# ", "- ", "1. " 등</li>
      </ul>
      <blockquote>
        <p>💡 <strong>팁:</strong> WordPress Gutenberg처럼 블록 기반으로 콘텐츠를 구성할 수 있습니다!</p>
      </blockquote>
    `;
  };

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      SlashCommand.configure({
        suggestion,
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
      /* // Placeholder 임시 비활성화
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return '제목을 입력하세요...';
          }
          return '내용을 입력하거나 "/"를 입력해서 블록을 추가하세요...';
        },
        includeChildren: true,
      }),
      */
    ],
    content: loadContent(),
    onUpdate: ({ editor }) => {
      // 자동 저장 (debounce)
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
        const html = editor.getHTML();
        const json = editor.getJSON();
        
        const data = {
          content: html,
          json: json,
          savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`notion_editor_${pageSlug}`, JSON.stringify(data));
        setLastSaved(new Date());
        
        if (onSave) {
          onSave(html, json);
        }
      }
    }, 2000),
    [editor, pageSlug, onSave]
  );

  // 수동 저장
  const handleSave = async () => {
    if (!editor) return;
    
    setIsSaving(true);
    
    try {
      const html = editor.getHTML();
      const json = editor.getJSON();
      
      const data = {
        content: html,
        json: json,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`notion_editor_${pageSlug}`, JSON.stringify(data));
      setLastSaved(new Date());
      
      if (onSave) {
        await onSave(html, json);
      }
      
      alert('✅ 페이지가 저장되었습니다!');
    } catch (error) {
      alert('❌ 저장 중 오류가 발생했습니다.');
      console.error('저장 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 이미지 추가
  const addImage = () => {
    console.log('🖼️ addImage 함수 호출됨');
    const url = prompt('🖼️ 이미지 URL을 입력하세요:');
    console.log('입력된 URL:', url);
    if (url && editor) {
      console.log('이미지 삽입 시도:', url);
      editor.chain().focus().setImage({ src: url }).run();
      console.log('이미지 삽입 완료');
    } else {
      console.log('이미지 삽입 취소 또는 에디터 없음');
    }
  };

  // 링크 추가/편집
  const toggleLink = () => {
    console.log('🔗 toggleLink 함수 호출됨');
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = prompt('🔗 링크 URL을 입력하세요:', previousUrl);
    
    if (url === null) return;
    
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // 테이블 추가
  const addTable = () => {
    console.log('📊 addTable 함수 호출됨');
    if (editor) {
      console.log('테이블 삽입 시도');
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      console.log('테이블 삽입 완료');
    } else {
      console.log('에디터가 없어서 테이블 삽입 실패');
    }
  };

  if (!editor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Notion 에디터를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 도구 모음 */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
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
            
            <h1 className="text-xl font-semibold text-gray-900">
              📝 블록 에디터 <span className="text-sm font-normal text-gray-500">({pageSlug})</span>
            </h1>
            
            {lastSaved && (
              <span className="text-sm text-green-600">
                ✅ {lastSaved.toLocaleTimeString()}에 저장됨
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Eye className="w-4 h-4" />
              미리보기
            </button>
          </div>
        </div>
      </div>

      {/* 에디터 영역 */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden relative">
          
          {/* 버블 메뉴 - 텍스트 선택 시 */}
          {editor && (
            <BubbleMenu 
              editor={editor} 
              className="flex items-center gap-1 bg-gray-900 text-white rounded-lg p-1 shadow-lg z-50"
            >
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-700 transition-colors ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
                title="굵게"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-700 transition-colors ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
                title="기울임"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-2 rounded hover:bg-gray-700 transition-colors ${editor.isActive('code') ? 'bg-gray-700' : ''}`}
                title="인라인 코드"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                onClick={toggleLink}
                className={`p-2 rounded hover:bg-gray-700 transition-colors ${editor.isActive('link') ? 'bg-gray-700' : ''}`}
                title="링크"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </BubbleMenu>
          )}

          {/* 플로팅 메뉴 - 빈 줄에서 + 버튼 */}
          {editor && (
            <FloatingMenu 
              editor={editor} 
              className="flex items-center gap-1 bg-white border rounded-lg p-1 shadow-lg z-50"
            >
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
                title="제목 1"
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
                title="불릿 리스트"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
                title="번호 리스트"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={addImage}
                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
                title="이미지 추가"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={addTable}
                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
                title="테이블 추가"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
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

      {/* 도움말 */}
      <div className="fixed bottom-6 right-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm z-30">
        <h3 className="font-semibold text-blue-900 mb-2">🚀 Notion 스타일 에디터</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>"/" 입력</strong> → 블록 메뉴</li>
          <li>• <strong>텍스트 선택</strong> → 포맷팅 메뉴</li>
          <li>• <strong>빈 줄 클릭</strong> → + 메뉴</li>
          <li>• <strong>"# "</strong> → 제목으로 변환</li>
          <li>• <strong>"- "</strong> → 리스트로 변환</li>
          <li>• <strong>자동 저장</strong> (2초마다)</li>
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

export default NotionEditor;
