import { useNavigate, useParams } from 'react-router-dom';
import { ImprovementForum } from '@o4o/operator-core-ui';
import { useAuth } from '../../contexts';
import { api } from '../../lib/apiClient';
export default function CommunityImprovementsPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  return <main className="mx-auto max-w-5xl px-4 py-6"><ImprovementForum client={api} actorKey={String(user?.id ?? '')} detailId={id} onSelect={value => navigate(value ? `/improvements/${value}` : '/improvements')} /></main>;
}
