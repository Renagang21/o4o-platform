import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold text-gray-900">페이지를 찾을 수 없습니다</p>
      <Link to="/" className="mt-3 inline-block text-sm text-primary-700 hover:underline">
        처음으로
      </Link>
    </div>
  );
}
