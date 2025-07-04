// ⚙️ 블록 설정 패널 (오른쪽 패널)

import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Settings, 
  Type, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface BlockInspectorProps {
  selectedBlock: any;
  editor: Editor | null;
}

export const BlockInspector: React.FC<BlockInspectorProps> = ({ 
  selectedBlock, 
  editor 
}) => {
  const [blockType, setBlockType] = useState<string>('');
  const [textAlign, setTextAlign] = useState<string>('left');
  const [fontSize, setFontSize] = useState<string>('16');
  const [textColor, setTextColor] = useState<string>('#000000');

  useEffect(() => {
    if (selectedBlock && selectedBlock.type) {
      const newBlockType = selectedBlock.type.name || 'paragraph';
      console.log('🔍 블록 타입 감지:', newBlockType);
      setBlockType(newBlockType);
    } else if (editor) {
      // 현재 커서 위치의 블록 타입 감지
      const { from } = editor.state.selection;
      const $from = editor.state.doc.resolve(from);
      const currentBlockType = $from.parent.type.name;
      console.log('🔍 현재 블록 타입:', currentBlockType);
      setBlockType(currentBlockType);
    }
  }, [selectedBlock, editor]);

  // 텍스트 정렬 변경
  const handleTextAlign = (align: string) => {
    if (!editor) return;
    setTextAlign(align);
    editor.chain().focus().setTextAlign(align).run();
  };

  // 제목 레벨 변경
  const handleHeadingLevel = (level: number) => {
    if (!editor) return;
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().setHeading({ level }).run();
    }
  };

  // 블록 타입에 따른 설정 옵션
  const renderBlockSettings = () => {
    if (!selectedBlock || !editor) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Settings className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">
            블록을 선택하면 설정이 표시됩니다
          </p>
        </div>
      );
    }

    switch (blockType) {
      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 레벨
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(level => (
                  <button
                    key={level}
                    onClick={() => handleHeadingLevel(level)}
                    className={`p-2 text-sm border rounded ${
                      editor.isActive('heading', { level })
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    H{level}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                텍스트 정렬
              </label>
              <div className="flex gap-1">
                {[
                  { value: 'left', icon: AlignLeft },
                  { value: 'center', icon: AlignCenter },
                  { value: 'right', icon: AlignRight }
                ].map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleTextAlign(value)}
                    className={`p-2 border rounded ${
                      editor.isActive({ textAlign: value })
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'paragraph':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                텍스트 정렬
              </label>
              <div className="flex gap-1">
                {[
                  { value: 'left', icon: AlignLeft },
                  { value: 'center', icon: AlignCenter },
                  { value: 'right', icon: AlignRight }
                ].map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleTextAlign(value)}
                    className={`p-2 border rounded ${
                      editor.isActive({ textAlign: value })
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                텍스트 스타일
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 border rounded ${
                    editor.isActive('bold')
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 border rounded ${
                    editor.isActive('italic')
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Italic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이미지 URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  if (e.target.value) {
                    editor.chain().focus().setImage({ src: e.target.value }).run();
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정렬
              </label>
              <div className="flex gap-1">
                {[
                  { value: 'left', icon: AlignLeft },
                  { value: 'center', icon: AlignCenter },
                  { value: 'right', icon: AlignRight }
                ].map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleTextAlign(value)}
                    className="p-2 border rounded bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                버튼 텍스트
              </label>
              <input
                type="text"
                placeholder="버튼 텍스트"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                링크 URL
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                스타일
              </label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                높이 (px)
              </label>
              <input
                type="number"
                min="10"
                max="200"
                defaultValue="40"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                블록 타입
              </label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {blockType || '알 수 없는 블록'}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">⚙️ 블록 설정</h2>
        {selectedBlock && (
          <p className="text-sm text-gray-500">
            {blockType === 'heading' ? '제목 블록' :
             blockType === 'paragraph' ? '단락 블록' :
             blockType === 'image' ? '이미지 블록' :
             blockType === 'table' ? '테이블 블록' :
             blockType === 'bulletList' ? '목록 블록' :
             blockType === 'button' ? '버튼 블록' :
             blockType === 'spacer' ? '스페이스 블록' :
             blockType === 'video' ? '동영상 블록' :
             blockType || '블록'} 설정
          </p>
        )}
      </div>

      {/* 설정 내용 */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderBlockSettings()}

        {/* 공통 블록 액션 */}
        {selectedBlock && editor && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">블록 액션</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  // 블록 복제 로직 (추후 구현)
                  console.log('블록 복제');
                }}
                className="flex items-center gap-2 p-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
                복제
              </button>
              <button
                onClick={() => {
                  // 블록 삭제 로직
                  const { from, to } = editor.state.selection;
                  editor.chain().focus().deleteRange({ from, to }).run();
                }}
                className="flex items-center gap-2 p-2 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          💡 블록을 클릭하면 더 많은 설정을 볼 수 있어요
        </p>
      </div>
    </div>
  );
};

export default BlockInspector;
