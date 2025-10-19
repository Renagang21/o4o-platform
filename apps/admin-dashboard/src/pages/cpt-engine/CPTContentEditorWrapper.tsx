/**
 * CPT Content Editor Wrapper
 * Uses Gutenberg Block Editor for CPT content (same as Posts/Pages)
 */

import { FC, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import StandaloneEditor from '@/pages/editor/StandaloneEditor';

const CPTContentEditorWrapper: FC = () => {
  const { cptSlug, postId } = useParams<{ cptSlug: string; postId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect if no cptSlug
  if (!cptSlug) {
    navigate('/cpt-engine');
    return null;
  }

  // Generate unique key for component remounting (same pattern as EditorRouteWrapper)
  const componentKey = useMemo(
    () => postId ? `cpt-${cptSlug}-${postId}` : `cpt-${cptSlug}-new-${location.key}`,
    [cptSlug, postId, location.key]
  );

  // Use StandaloneEditor with 'post' mode for CPT content
  // This gives CPT the same Gutenberg editing experience as Posts
  return (
    <StandaloneEditor
      key={componentKey}
      mode="post"
      postId={postId}
    />
  );
};

export default CPTContentEditorWrapper;