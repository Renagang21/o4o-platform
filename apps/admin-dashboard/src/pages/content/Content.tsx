import { FC, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import PostListQuickEdit from './PostListQuickEdit'
import PostFormWYSIWYG from './PostFormWYSIWYG'
import PageList from './PageList'
import PageFormWYSIWYG from './PageFormWYSIWYG'
import CPTList from './CPTList'
import CPTForm from './CPTForm'
import CustomFieldBuilder from './CustomFieldBuilder'
import DynamicContentList from './DynamicContentList'
import ACFManager from './ACFManager'
import ACFFieldGroupForm from './ACFFieldGroupForm'
import MediaLibrary from './MediaLibrary'
import TemplateManager from './TemplateManager'
import WidgetManager from './WidgetManager'
// import NewPost from '../posts/NewPost' // No longer needed, redirecting to editor

const Content: FC = () => {
  // 편집기로 리다이렉트하는 함수를 활성화
  const navigate = useNavigate();
  
  // content/new로 접근 시 전체 화면 편집기로 리다이렉트
  useEffect(() => {
    if (window.location.pathname === '/content/new') {
      navigate('/editor/posts/new');
    }
  }, [navigate]);
  
  return (
    <Routes>
      <Route path="/" element={<PostListQuickEdit />} />
      <Route path="new" element={<Navigate to="/editor/posts/new" replace />} />
      <Route path=":id/edit" element={<PostFormWYSIWYG />} />
      <Route path="pages" element={<PageList />} />
      <Route path="pages/new" element={<PageFormWYSIWYG />} />
      <Route path="pages/:id/edit" element={<PageFormWYSIWYG />} />
      <Route path="cpt" element={<CPTList />} />
      <Route path="cpt/new" element={<CPTForm />} />
      <Route path="cpt/:id/edit" element={<CPTForm />} />
      <Route path="cpt/:cptId/fields" element={<CustomFieldBuilder />} />
      <Route path="acf" element={<ACFManager />} />
      <Route path="acf/new" element={<ACFFieldGroupForm />} />
      <Route path="acf/:id/edit" element={<ACFFieldGroupForm />} />
      <Route path="media" element={<MediaLibrary />} />
      <Route path="templates" element={<TemplateManager />} />
      <Route path="widgets" element={<WidgetManager />} />
      {/* Dynamic routes for custom post types */}
      <Route path=":slug" element={<DynamicContentList />} />
      <Route path=":slug/new" element={<PostFormWYSIWYG />} />
      <Route path=":slug/:id/edit" element={<PostFormWYSIWYG />} />
    </Routes>
  )
}

export default Content