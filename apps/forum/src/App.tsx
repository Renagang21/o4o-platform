import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ForumHome from './pages/ForumHome';
import ForumDashboard from './pages/ForumDashboard';
import PostDetail from './pages/posts/PostDetail';
import PostEditor from './pages/posts/PostEditor';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ForumHome />} />
        <Route path="/dashboard" element={<ForumDashboard />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/posts/new" element={<PostEditor />} />
        <Route path="/posts/:id/edit" element={<PostEditor />} />
      </Routes>
    </Router>
  );
};

export default App;