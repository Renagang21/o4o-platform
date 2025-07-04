import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import FundingProgressBar from '../../components/funding/FundingProgressBar';

interface FundingProject {
  id: string;
  title: string;
  description: string;
  image: string;
  targetAmount: number;
  currentAmount: number;
  backerCount: number;
  daysLeft: number;
  status: 'ongoing' | 'ended' | 'upcoming';
}

const FundingList: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'ended' | 'upcoming'>(
    'all'
  );

  // Mock 데이터
  const projects: FundingProject[] = [
    {
      id: '1',
      title: '스마트 워치 프로젝트',
      description: '최신 기술이 적용된 스마트 워치',
      image: 'https://via.placeholder.com/400x300',
      targetAmount: 10000000,
      currentAmount: 7500000,
      backerCount: 150,
      daysLeft: 15,
      status: 'ongoing'
    },
    {
      id: '2',
      title: '에코백 프로젝트',
      description: '친환경 소재로 만든 에코백',
      image: 'https://via.placeholder.com/400x300',
      targetAmount: 5000000,
      currentAmount: 5000000,
      backerCount: 200,
      daysLeft: 0,
      status: 'ended'
    },
    {
      id: '3',
      title: '스마트 홈 시스템',
      description: 'AI 기반 스마트 홈 시스템',
      image: 'https://via.placeholder.com/400x300',
      targetAmount: 20000000,
      currentAmount: 0,
      backerCount: 0,
      daysLeft: 7,
      status: 'upcoming'
    }
  ];

  const filteredProjects = projects.filter(
    (project) => filter === 'all' || project.status === filter
  );

  const getStatusLabel = (status: FundingProject['status']) => {
    switch (status) {
      case 'ongoing':
        return '진행중';
      case 'ended':
        return '마감';
      case 'upcoming':
        return '예정';
      default:
        return '';
    }
  };

  const getStatusColor = (status: FundingProject['status']) => {
    switch (status) {
      case 'ongoing':
        return 'bg-success';
      case 'ended':
        return 'bg-secondary';
      case 'upcoming':
        return 'bg-primary';
      default:
        return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-text-main">
          크라우드 펀딩
        </h1>
        <Link
          to="/funding/create"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200"
        >
          새 프로젝트 등록
        </Link>
      </div>

      <div className="flex space-x-2 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter('ongoing')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'ongoing'
              ? 'bg-primary text-white'
              : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
          }`}
        >
          진행중
        </button>
        <button
          onClick={() => setFilter('ended')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'ended'
              ? 'bg-primary text-white'
              : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
          }`}
        >
          마감
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'upcoming'
              ? 'bg-primary text-white'
              : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
          }`}
        >
          예정
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Link
            key={project.id}
            to={`/funding/${project.id}`}
            className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="relative">
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              <div className="absolute top-2 right-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full text-white ${getStatusColor(
                    project.status
                  )}`}
                >
                  {getStatusLabel(project.status)}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-medium text-text-main mb-2">
                {project.title}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {project.description}
              </p>
              <FundingProgressBar
                currentAmount={project.currentAmount}
                targetAmount={project.targetAmount}
                backerCount={project.backerCount}
                daysLeft={project.daysLeft}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FundingList; 