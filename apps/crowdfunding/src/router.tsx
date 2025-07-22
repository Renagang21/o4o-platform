import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { BackerDashboard } from './pages/BackerDashboard';
import { CreatorDashboard } from './pages/CreatorDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'projects',
        element: <ProjectListPage />,
      },
      {
        path: 'projects/:id',
        element: <ProjectDetailPage />,
      },
      {
        path: 'create',
        element: <CreateProjectPage />,
      },
      {
        path: 'dashboard',
        children: [
          {
            path: 'backer',
            element: <BackerDashboard />,
          },
          {
            path: 'creator',
            element: <CreatorDashboard />,
          },
        ],
      },
    ],
  },
]);