// 🎯 TipTap 에디터 페이지 래퍼

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TipTapPageEditor from '../../components/editor/TipTapPageEditor';

const TipTapEditorPage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  const handleSave = (content: string) => {
    console.log('페이지 저장:', pageId, content);
  };

  const handleBack = () => {
    navigate('/admin/pages');
  };

  return (
    <TipTapPageEditor
      pageId={pageId || 'new'}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
};

export default TipTapEditorPage;
