import { useParams } from 'react-router-dom';
import { useFundingProject } from '@/hooks/useProjects';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useFundingProject(id || '');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-96 bg-surface rounded-lg mb-8" />
          <div className="h-8 bg-surface rounded w-3/4 mb-4" />
          <div className="h-4 bg-surface rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-text-secondary">프로젝트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{project.title}</h1>
      {/* 상세 구현은 다음 단계에서 진행 */}
    </div>
  );
}