// 🎯 구텐베르크 에디터 페이지 래퍼

import { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import GutenbergEditor from '../../components/gutenberg/GutenbergEditor'; // 일시적 비활성화

const GutenbergEditorPage: FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  const handleSave = (content: any) => {
    console.log('페이지 저장:', content);
    // 여기에 실제 저장 로직 추가
  };

  const handleBack = () => {
    navigate('/admin/pages');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Gutenberg Editor (개발 중)</h1>
      <p className="text-gray-600 mb-4">페이지 ID: {pageId || 'new'}</p>
      <button 
        onClick={handleBack}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        뒤로 가기
      </button>
    </div>
    // <GutenbergEditor
    //   pageId={pageId || 'new'}
    //   onSave={handleSave}
    //   onBack={handleBack}
    // />
  );
};

export default GutenbergEditorPage;
