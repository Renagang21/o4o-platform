import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CategoryListPage from './pages/CategoryListPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import PostListPage from './pages/PostListPage';
import PostDetailPage from './pages/PostDetailPage';
import PostCreatePage from './pages/PostCreatePage';
import PostEditPage from './pages/PostEditPage';
import SearchPage from './pages/SearchPage';
import TagsPage from './pages/TagsPage';
import MyPostsPage from './pages/MyPostsPage';
import MyBookmarksPage from './pages/MyBookmarksPage';
import NotFoundPage from './pages/NotFoundPage';

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
        path: 'categories',
        element: <CategoryListPage />,
      },
      {
        path: 'categories/:categorySlug',
        element: <CategoryDetailPage />,
      },
      {
        path: 'posts',
        element: <PostListPage />,
      },
      {
        path: 'posts/new',
        element: <PostCreatePage />,
      },
      {
        path: 'posts/:postSlug',
        element: <PostDetailPage />,
      },
      {
        path: 'posts/:postSlug/edit',
        element: <PostEditPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
      {
        path: 'my-posts',
        element: <MyPostsPage />,
      },
      {
        path: 'my-bookmarks',
        element: <MyBookmarksPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);