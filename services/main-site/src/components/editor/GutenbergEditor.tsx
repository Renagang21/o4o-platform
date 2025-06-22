// 🎨 WordPress Gutenberg 스타일 블록 에디터

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import { SlashCommand, suggestion } from './SlashCommand';

import { 
  Save, 
  Eye, 
  ArrowLeft,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Settings,
  Plus,
  MoreVertical
} from 'lucide-react';

// 블록 라이브러리 컴포넌트
import { BlockLibrary } from './BlockLibrary';
import { BlockInspector } from './BlockInspector';

interface GutenbergEditorProps {
  pageSlug: string;
  initialContent?: string;
  onSave?: (content: string, json: any) => void;
  onBack?: () => void;
}

export const GutenbergEditor: React.FC<GutenbergEditorProps> = ({ 
  pageSlug, 
  initialContent, 
  onSave, 
  onBack 
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [showBlockLibrary, setShowBlockLibrary] = useState(true);
  const [showBlockInspector, setShowBlockInspector] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // 초기 콘텐츠 로드
  const loadContent = () => {
    try {
      const saved = localStorage.getItem(`gutenberg_editor_${pageSlug}`);
      if (saved) {
        const data = JSON.parse(saved);
        return data.content;
      }
    } catch (error) {
      console.error('콘텐츠 로드 실패:', error);
    }
    
    return initialContent || `
      <h1>🏗️ Gutenberg 스타일 에디터</h1>
      <p>WordPress Gutenberg처럼 블록 기반으로 콘텐츠를 편집하세요.</p>
      <h2>✨ 사용법</h2>
      <ul>
        <li><strong>왼쪽 패널</strong>: 블록 라이브러리에서 블록 선택</li>
        <li><strong>가운데</strong>: 메인 편집 영역</li>
        <li><strong>오른쪽 패널</strong>: 선택한 블록의 설정</li>
        <li><strong>"/" 입력</strong>: 빠른 블록 추가</li>
      </ul>
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
    ],
    content: loadContent(),
    onUpdate: ({ editor }) => {
      debounceAutoSave();
    },
    onSelectionUpdate: ({ editor }) => {
      // 선택된 블록 정보 업데이트
      const { from, to } = editor.state.selection;
      const $from = editor.state.doc.resolve(from);
      const node = $from.parent;
      
      console.log('🎯 선택된 블록:', {
        type: node.type.name,
        content: node.textContent,
        from,
        to
      });
      
      setSelectedBlock({
        type: { name: node.type.name },
        content: node.textContent,
        position: { from, to }
      });
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
        
        localStorage.setItem(`gutenberg_editor_${pageSlug}`, JSON.stringify(data));
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
      
      localStorage.setItem(`gutenberg_editor_${pageSlug}`, JSON.stringify(data));
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

  // 블록 삽입 함수
  const insertBlock = (blockType: string) => {
    if (!editor) return;

    console.log(`🔧 블록 추가: ${blockType}`);

    switch (blockType) {
      case 'heading':
        editor.chain().focus().insertContent('<h2>새 제목을 입력하세요</h2>').run();
        break;
      case 'paragraph':
        editor.chain().focus().insertContent('<p>새 단락을 입력하세요</p>').run();
        break;
      case 'image':
        const url = prompt('🖼️ 이미지 URL을 입력하세요:');
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
        break;
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'bullet-list':
        editor.chain().focus().insertContent('<ul><li>목록 항목 1</li><li>목록 항목 2</li></ul>').run();
        break;
      case 'ordered-list':
        editor.chain().focus().insertContent('<ol><li>번호 항목 1</li><li>번호 항목 2</li></ol>').run();
        break;
      case 'quote':
        editor.chain().focus().insertContent('<blockquote><p>인용문을 입력하세요</p></blockquote>').run();
        break;
      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
      case 'code':
        editor.chain().focus().insertContent('<pre><code>코드를 입력하세요</code></pre>').run();
        break;
      case 'container':
        editor.chain().focus().insertContent('<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;"><p>컨테이너 내용을 입력하세요</p></div>').run();
        break;
      case 'columns':
        editor.chain().focus().insertContent('<div style="display: flex; gap: 20px;"><div style="flex: 1; padding: 10px; border: 1px solid #e5e7eb;"><p>첫 번째 컬럼</p></div><div style="flex: 1; padding: 10px; border: 1px solid #e5e7eb;"><p>두 번째 컬럼</p></div></div>').run();
        break;

      // 새로운 블록들 (쉬운 것들)
      case 'button':
        const buttonText = prompt('🔘 버튼 텍스트를 입력하세요:', '클릭하세요');
        const buttonUrl = prompt('🔗 버튼 링크를 입력하세요 (선택사항):', '');
        if (buttonText) {
          const buttonHtml = `<div style="text-align: center; margin: 20px 0;"><a href="${buttonUrl || '#'}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; border: none; cursor: pointer;" ${buttonUrl ? 'target="_blank"' : ''}>${buttonText}</a></div>`;
          editor.chain().focus().insertContent(buttonHtml).run();
        }
        break;

      case 'spacer':
        const spaceHeight = prompt('📏 높이를 입력하세요 (px):', '40');
        const height = parseInt(spaceHeight || '40');
        editor.chain().focus().insertContent(`<div style="height: ${height}px; width: 100%;"></div>`).run();
        break;

      case 'video':
        const videoUrl = prompt('🎥 YouTube 또는 동영상 URL을 입력하세요:');
        if (videoUrl) {
          let embedHtml = '';
          if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
            // YouTube URL에서 비디오 ID 추출
            const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
            if (videoId) {
              embedHtml = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe></div>`;
            }
          } else {
            // 일반 비디오 URL
            embedHtml = `<video controls style="width: 100%; max-width: 100%;"><source src="${videoUrl}" type="video/mp4">브라우저가 비디오를 지원하지 않습니다.</video>`;
          }
          editor.chain().focus().insertContent(embedHtml).run();
        }
        break;

      case 'duplicate':
        // 현재 선택된 블록 복사
        const { from, to } = editor.state.selection;
        const selectedContent = editor.state.doc.textBetween(from, to);
        if (selectedContent) {
          editor.chain().focus().insertContentAt(to, `<p>${selectedContent}</p>`).run();
        } else {
          alert('💡 복사할 텍스트를 먼저 선택해주세요.');
        }
        break;

      // 나중에 구현할 블록들 (임시 메시지)
      case 'slide':
        alert('🚧 슬라이드 블록은 곧 구현될 예정입니다!');
        break;
      case 'share':
        alert('🚧 공유 블록은 곧 구현될 예정입니다!');
        break;
      case 'qrcode':
        alert('🚧 QR코드 블록은 곧 구현될 예정입니다!');
        break;
      case 'query-loop':
        alert('🚧 쿼리반복 블록은 곧 구현될 예정입니다!');
        break;

      // CPT 관련 블록들
      case 'cpt-list':
        const listCPTType = prompt('📋 표시할 CPT 타입을 입력하세요:', 'product');
        if (listCPTType) {
          const cptListHtml = `
            <div style="border: 2px dashed #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; background: #f9fafb;" 
                 data-cpt-type="${listCPTType}" 
                 data-block-type="cpt-list">
              <div style="font-size: 24px; margin-bottom: 10px;">📋</div>
              <div style="font-weight: 600; color: #374151; margin-bottom: 5px;">CPT 목록: ${listCPTType}</div>
              <div style="font-size: 12px; color: #6b7280;">이 블록은 저장 후 실제 데이터로 표시됩니다</div>
            </div>
          `;
          editor.chain().focus().insertContent(cptListHtml).run();
        }
        break;

      case 'cpt-single':
        const singleCPTType = prompt('📄 표시할 CPT 타입을 입력하세요:', 'product');
        const postId = prompt('🆔 표시할 포스트 ID를 입력하세요 (선택사항):');
        if (singleCPTType) {
          const cptSingleHtml = `
            <div style="border: 2px dashed #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; background: #f9fafb;" 
                 data-cpt-type="${singleCPTType}" 
                 data-post-id="${postId || ''}"
                 data-block-type="cpt-single">
              <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
              <div style="font-weight: 600; color: #374151; margin-bottom: 5px;">CPT 단일: ${singleCPTType}</div>
              <div style="font-size: 12px; color: #6b7280;">
                ${postId ? `포스트 ID: ${postId}` : '최신 포스트 표시'}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">이 블록은 저장 후 실제 데이터로 표시됩니다</div>
            </div>
          `;
          editor.chain().focus().insertContent(cptSingleHtml).run();
        }
        break;
      default:
        console.log(`⚠️ 지원하지 않는 블록 타입: ${blockType}`);
        editor.chain().focus().insertContent('<p>새 단락</p>').run();
    }
  };

  if (!editor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Gutenberg 에디터를 로드하는 중...</p>
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
            
            <h1 className="text-xl font-semibold text-gray-900">
              🏗️ Gutenberg 에디터 <span className="text-sm font-normal text-gray-500">({pageSlug})</span>
            </h1>
            
            {lastSaved && (
              <span className="text-sm text-green-600">
                ✅ {lastSaved.toLocaleTimeString()}에 저장됨
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBlockLibrary(!showBlockLibrary)}
              className={`p-2 rounded-lg transition-colors ${showBlockLibrary ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title="블록 라이브러리"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowBlockInspector(!showBlockInspector)}
              className={`p-2 rounded-lg transition-colors ${showBlockInspector ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title="블록 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
            
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? '편집으로 돌아가기' : '미리보기'}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 편집 영역 */}
      <div className="flex">
        {/* 미리보기 모드 */}
        {showPreview ? (
          <div className="flex-1">
            <div className="max-w-4xl mx-auto p-8">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 왼쪽: 블록 라이브러리 */}
            {showBlockLibrary && (
              <div className="w-64 bg-white border-r h-[calc(100vh-73px)] overflow-y-auto">
                <BlockLibrary onInsertBlock={insertBlock} />
              </div>
            )}

            {/* 가운데: 에디터 */}
            <div className="flex-1 relative">
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
                    </BubbleMenu>
                  )}

                  {/* 메인 에디터 */}
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

            {/* 오른쪽: 블록 설정 */}
            {showBlockInspector && (
              <div className="w-80 bg-white border-l h-[calc(100vh-73px)] overflow-y-auto">
                <BlockInspector 
                  selectedBlock={selectedBlock} 
                  editor={editor}
                />
              </div>
            )}
          </>
        )}
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

export default GutenbergEditor;
