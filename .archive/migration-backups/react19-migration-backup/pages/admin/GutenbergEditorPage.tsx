// 🎯 구텐베르크 에디터 페이지 래퍼

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GutenbergEditor from '../../components/gutenberg/GutenbergEditor';

const GutenbergEditorPage: React.FC = () => {
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
    <GutenbergEditor
      pageId={pageId || 'new'}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
};

export default GutenbergEditorPage;
