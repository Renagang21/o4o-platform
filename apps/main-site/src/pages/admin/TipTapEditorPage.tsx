// 🎯 TipTap 에디터 페이지 래퍼

import { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TipTapPageEditor from '@o4o/ui/editor/TipTapPageEditor';

const TipTapEditorPage: FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  const handleSave = (content: string) => {
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
