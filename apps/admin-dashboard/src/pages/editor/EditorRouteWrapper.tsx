import { FC } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import StandaloneEditor from './StandaloneEditor';

interface EditorRouteWrapperProps {
  mode?: 'post' | 'page' | 'template' | 'pattern';
}

/**
 * EditorRouteWrapper - 라우트 전환 시 StandaloneEditor를 강제로 재마운트
 * 
 * 문제: React Router는 같은 컴포넌트를 재사용하므로 /new → /:id 전환 시
 * 에디터가 초기화되지 않고 데이터가 로드되지 않음
 * 
 * 해결: location.key와 postId를 조합한 unique key로 컴포넌트 재마운트 강제
 */
const EditorRouteWrapper: FC<EditorRouteWrapperProps> = ({ mode = 'post' }) => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  
  // 라우트 전환마다 컴포넌트를 완전히 새로 만들도록 unique key 생성
  // id가 있으면 해당 id 사용, 없으면(새 글) location.key 사용
  const componentKey = id ? `${mode}-${id}` : `${mode}-new-${location.key}`;
  
  return (
    <StandaloneEditor 
      key={componentKey}
      mode={mode}
      postId={id}
    />
  );
};

export default EditorRouteWrapper;