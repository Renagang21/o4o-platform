import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import { FundingProject } from '@o4o/crowdfunding-types';
import { formatPrice } from '@o4o/utils';

interface ProjectCardProps {
  project: FundingProject;
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, className = '' }) => {
  const progress = Math.min((project.currentAmount / project.targetAmount) * 100, 100);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  const getStatusBadge = () => {
    switch (project.status) {
      case 'ongoing':
        return daysLeft <= 3 ? (
          <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
            마감임박
          </span>
        ) : null;
      case 'successful':
        return (
          <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
            펀딩성공
          </span>
        );
      case 'failed':
        return (
          <span className="absolute top-2 right-2 px-2 py-1 bg-gray-500 text-white text-xs rounded">
            펀딩실패
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className={`block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="relative">
        <img
          src={typeof project.mainImage === 'string' ? project.mainImage : project.mainImage?.url || 'https://via.placeholder.com/400x300'}
          alt={project.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        {getStatusBadge()}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-text-main mb-1 line-clamp-2">
          {project.title}
        </h3>
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
          {project.shortDescription}
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-lg font-bold text-primary">
                {formatPrice(project.currentAmount)}
              </span>
              <span className="text-sm font-medium text-primary">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-text-secondary">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{project.backerCount}명</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {project.status === 'ongoing' && daysLeft > 0
                  ? `${daysLeft}일 남음`
                  : '종료'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};