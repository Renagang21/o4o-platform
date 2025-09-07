import { FC, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import StandaloneEditor from './StandaloneEditor';

interface EditorRouteWrapperProps {
  mode?: 'post' | 'page' | 'template' | 'pattern';
}

/**
 * EditorRouteWrapper - Forces StandaloneEditor remount on route changes
 * 
 * Ensures clean state initialization when switching between new/edit modes
 * by using a unique key that changes with route parameters
 */
const EditorRouteWrapper: FC<EditorRouteWrapperProps> = ({ mode = 'post' }) => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  
  // Generate unique key for component remounting
  const componentKey = useMemo(
    () => id ? `${mode}-${id}` : `${mode}-new-${location.key}`,
    [mode, id, location.key]
  );
  
  return (
    <StandaloneEditor 
      key={componentKey}
      mode={mode}
      postId={id}
    />
  );
};

export default EditorRouteWrapper;