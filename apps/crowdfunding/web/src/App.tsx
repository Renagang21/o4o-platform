import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ProjectListPage from './pages/ProjectListPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import CreateProjectPage from './pages/CreateProjectPage'
import BackerDashboard from './pages/BackerDashboard'
import CreatorDashboard from './pages/CreatorDashboard'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="create" element={<CreateProjectPage />} />
          <Route path="dashboard/backer" element={<BackerDashboard />} />
          <Route path="dashboard/creator" element={<CreatorDashboard />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App