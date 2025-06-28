// 🎯 Block Inserter Component (WordPress Gutenberg 스타일)

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Plus, Type, List, Image as ImageIcon, Quote, Minus, Table as TableIcon } from 'lucide-react';

interface BlockInserterProps {
  editor: Editor;
  position: number;
  onInsert: () => void;
}

export const BlockInserter: React.FC<BlockInserterProps> = ({ editor, position, onInsert }) => {
  const [showMenu, setShowMenu] = useState(false);

  const insertBlock = (type: string) => {
    const pos = position;
    
    switch (type) {
      case 'paragraph':
        editor.chain().focus().insertContentAt(pos, '<p></p>').run();
        break;
      case 'heading':
        editor.chain().focus().insertContentAt(pos, '<h2></h2>').run();
        break;
      case 'bullet-list':
        editor.chain().focus().insertContentAt(pos, '<ul><li></li></ul>').run();
        break;
      case 'ordered-list':
        editor.chain().focus().insertContentAt(pos, '<ol><li></li></ol>').run();
        break;
      case 'quote':
        editor.chain().focus().insertContentAt(pos, '<blockquote><p></p></blockquote>').run();
        break;
      case 'separator':
        editor.chain().focus().insertContentAt(pos, '<hr>').run();
        break;
      case 'image':
        const url = prompt('이미지 URL을 입력하세요:');
        if (url) {
          editor.chain().focus().insertContentAt(pos, `<img src="${url}" alt="">`).run();
        }
        break;
      case 'table':
        editor.chain().focus().insertContentAt(pos, '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>').run();
        break;
    }
    
    setShowMenu(false);
    onInsert();
  };

  const blockTypes = [
    { type: 'paragraph', icon: Type, label: '단락', description: '일반 텍스트' },
    { type: 'heading', icon: Type, label: '제목', description: 'H2 제목' },
    { type: 'bullet-list', icon: List, label: '리스트', description: '불릿 리스트' },
    { type: 'quote', icon: Quote, label: '인용문', description: '인용 블록' },
    { type: 'image', icon: ImageIcon, label: '이미지', description: '이미지 삽입' },
    { type: 'separator', icon: Minus, label: '구분선', description: '가로 구분선' },
    { type: 'table', icon: TableIcon, label: '테이블', description: '표 삽입' },
  ];

  return (
    <div className="relative group">
      {/* 호버 영역 */}
      <div className="h-6 w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors z-10"
          title="블록 추가"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 블록 선택 메뉴 */}
      {showMenu && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 min-w-[280px] z-50">
          <div className="grid grid-cols-2 gap-1">
            {blockTypes.map((blockType) => (
              <button
                key={blockType.type}
                onClick={() => insertBlock(blockType.type)}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                  <blockType.icon className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {blockType.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {blockType.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-200 mt-2 pt-2">
            <button
              onClick={() => setShowMenu(false)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockInserter;
