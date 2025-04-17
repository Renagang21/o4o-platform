import Login from '../components/auth/Login';
import AuthCallback from '../components/auth/AuthCallback';

// 기존 라우트 배열에 추가
const routes = [
  // 기존 라우트들...
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/auth/:provider/callback',
    element: <AuthCallback />
  }
];