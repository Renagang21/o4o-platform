/**
 * App Component
 * =============================================================================
 * Main application with routing.
 * =============================================================================
 */

import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ForumListPage } from './pages/ForumListPage';
import { ForumDetailPage } from './pages/ForumDetailPage';
import { ForumCreatePage } from './pages/ForumCreatePage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forum" element={<ForumListPage />} />
        <Route path="/forum/new" element={<ForumCreatePage />} />
        <Route path="/forum/:id" element={<ForumDetailPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
