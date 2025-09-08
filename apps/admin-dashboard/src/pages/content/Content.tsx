import { FC, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import Posts from '../posts/Posts' // Posts management component
import PostForm from './PostForm' // Using PostForm instead of PostFormWYSIWYG for WordPress-like UI
import PageList from './PageList'
// import PageFormWYSIWYG from './PageFormWYSIWYG' // Temporarily commented - using PostForm for pages
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
      <Route path="/" element={<Posts />} />
      <Route path="new" element={<PostForm />} />
      <Route path="posts/new" element={<PostForm />} />
      <Route path="posts/:id/edit" element={<PostForm />} />
      <Route path=":id/edit" element={<PostForm />} />
      <Route path="pages" element={<PageList />} />
      <Route path="pages/new" element={<PostForm />} />
      <Route path="pages/:id/edit" element={<PostForm />} />
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
      <Route path=":slug/new" element={<PostForm />} />
      <Route path=":slug/:id/edit" element={<PostForm />} />
    </Routes>
  )
}

export default Content