import { FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'
import PostListQuickEdit from './PostListQuickEdit'
import PostForm from './PostForm'
import PageList from './PageList'
import PageForm from './PageForm'
import CPTList from './CPTList'
import CPTForm from './CPTForm'
import CustomFieldBuilder from './CustomFieldBuilder'
import DynamicContentList from './DynamicContentList'
import ACFManager from './ACFManager'
import ACFFieldGroupForm from './ACFFieldGroupForm'
import MediaLibrary from './MediaLibrary'
import TemplateManager from './TemplateManager'
import WidgetManager from './WidgetManager'

const Content: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="posts" replace />} />
      <Route path="posts" element={<PostListQuickEdit />} />
      <Route path="posts/new" element={<PostForm />} />
      <Route path="posts/:id/edit" element={<PostForm />} />
      <Route path="pages" element={<PageList />} />
      <Route path="pages/new" element={<PageForm />} />
      <Route path="pages/:id/edit" element={<PageForm />} />
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