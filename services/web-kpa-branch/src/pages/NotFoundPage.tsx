import { Link } from 'react-router-dom';
import { O4OHomeButton } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';

export default function NotFoundPage() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold text-gray-900">페이지를 찾을 수 없습니다</p>
      <Link to="/" className="mt-3 inline-block text-sm text-primary-700 hover:underline">
        처음으로
      </Link>
      <div className="mt-4">
        <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} label="O4O 메인으로" className="o4o-home-link" />
      </div>
    </div>
  );
}
