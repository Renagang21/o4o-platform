import React, { useState } from 'react';
import { NotionEditor } from '@shared/components/editor/NotionEditor';
import { GutenbergEditor } from '@shared/components/editor/GutenbergEditor';

const TestPage: React.FC = () => {
  const [showNotionEditor, setShowNotionEditor] = useState(false);
  const [showGutenbergEditor, setShowGutenbergEditor] = useState(false);

  const handleSave = (content: string, json: any) => {
    console.log('💾 저장된 콘텐츠:', content);
    console.log('💾 저장된 JSON:', json);
  };

  const handleBack = () => {
    setShowNotionEditor(false);
    setShowGutenbergEditor(false);
  };

  if (showNotionEditor) {
    return (
      <NotionEditor
        pageSlug="test-notion-page"
        onSave={handleSave}
        onBack={handleBack}
      />
    );
  }

  if (showGutenbergEditor) {
    return (
      <GutenbergEditor
        pageSlug="test-gutenberg-page"
        onSave={handleSave}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-4">✅ 서버 정상 작동!</h1>
        <p className="text-gray-700 mb-4">
          Tiptap 블록 에디터 시스템 테스트 페이지입니다.
        </p>
        <div className="space-y-3">
          <button 
            onClick={() => setShowGutenbergEditor(true)}
            className="block w-full text-center bg-purple-500 text-white p-3 rounded hover:bg-purple-600 font-medium"
          >
            🏗️ Gutenberg 스타일 에디터 (신규!)
          </button>
          <button 
            onClick={() => setShowNotionEditor(true)}
            className="block w-full text-center bg-blue-500 text-white p-3 rounded hover:bg-blue-600 font-medium"
          >
            📝 Notion 스타일 에디터
          </button>
          <a 
            href="/admin/cpt" 
            className="block w-full text-center bg-green-500 text-white p-3 rounded hover:bg-green-600 font-medium"
          >
            🛠️ CPT 관리 (신규!)
          </a>
          <a 
            href="/login" 
            className="block w-full text-center bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
          >
            로그인 페이지로 이동
          </a>
          <a 
            href="/admin" 
            className="block w-full text-center bg-orange-500 text-white p-2 rounded hover:bg-orange-600"
          >
            관리자 페이지로 이동
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
