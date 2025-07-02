import React, { useState } from 'react';
import { SimpleTiptapEditor } from './SimpleTiptapEditor';

interface EditorCanvasProps {
  content: string;
  onChange: (content: string) => void;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
}

export function EditorCanvas({
  content,
  onChange,
  selectedBlockId,
  onSelectBlock
}: EditorCanvasProps) {
  const [title, setTitle] = useState('');
  const [wordCount, setWordCount] = useState(0);

  // 단어 수 계산
  const updateWordCount = (text: string) => {
    const words = text.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const handleContentChange = (newContent: string) => {
    onChange(newContent);
    updateWordCount(newContent);
  };

  // 예상 읽기 시간 계산 (분당 200단어 기준)
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* 페이지 제목 (WordPress 스타일) */}
      <div className="mb-8">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full text-4xl font-bold border-none outline-none placeholder-gray-400 bg-transparent resize-none"
          style={{ lineHeight: '1.2' }}
        />
      </div>

      {/* Tiptap 에디터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-96 relative">
        <div className="p-6">
          <SimpleTiptapEditor
            content={content}
            onChange={handleContentChange}
            placeholder="이야기를 들려주세요..."
            className="prose prose-lg max-w-none"
            editable={true}
            showMenuBar={false}
          />
        </div>
      </div>

      {/* 에디터 하단 정보 */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        <span>마지막 저장: 방금 전</span>
        <span className="mx-2">•</span>
        <span>단어 수: {wordCount}</span>
        <span className="mx-2">•</span>
        <span>예상 읽기 시간: {readingTime}분</span>
      </div>

      {/* 블록 선택 인디케이터 */}
      {selectedBlockId && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm">
          블록 선택됨: {selectedBlockId}
        </div>
      )}
    </div>
  );
}