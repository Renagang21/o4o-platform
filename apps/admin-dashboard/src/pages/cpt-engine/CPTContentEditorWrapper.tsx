/**
 * CPT Content Editor Wrapper
 * Handles route parameters and passes them to the editor
 */

import { useParams, useNavigate } from 'react-router-dom';
import CPTContentEditor from './components/CPTContentEditor';

const CPTContentEditorWrapper = () => {
  const { cptSlug, postId } = useParams<{ cptSlug: string; postId?: string }>();
  const navigate = useNavigate();

  if (!cptSlug) {
    navigate('/cpt-engine');
    return null;
  }

  return (
    <CPTContentEditor
      cptSlug={cptSlug}
      postId={postId}
      onSave={() => navigate(`/cpt-engine/content/${cptSlug}`)}
      onCancel={() => navigate(`/cpt-engine`)}
    />
  );
};

export default CPTContentEditorWrapper;