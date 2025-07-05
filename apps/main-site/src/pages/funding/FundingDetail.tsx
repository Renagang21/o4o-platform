import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart } from 'lucide-react';
import FundingProgressBar from '../../components/funding/FundingProgressBar';
import FundingRewardOptions from '../../components/funding/FundingRewardOptions';

interface RewardOption {
  id: string;
  title: string;
  description: string;
  price: number;
  maxQuantity: number;
  remainingQuantity: number;
}

interface FundingProject {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  image: string;
  targetAmount: number;
  currentAmount: number;
  backerCount: number;
  daysLeft: number;
  status: 'ongoing' | 'ended' | 'upcoming';
  rewardOptions: RewardOption[];
}

const FundingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedOptions, setSelectedOptions] = useState<{
    [key: string]: number;
  }>({});

  // Mock 데이터
  const project: FundingProject = {
    id: '1',
    title: '스마트 워치 프로젝트',
    description: '최신 기술이 적용된 스마트 워치',
    longDescription: `이 스마트 워치는 다음과 같은 특징을 가지고 있습니다:

1. 심박수 모니터링
2. 수면 분석
3. GPS 추적
4. 스마트폰 알림 연동
5. 7일 배터리 지속

최신 기술이 적용된 이 스마트 워치로 더 건강하고 편리한 라이프스타일을 경험해보세요.`,
    image: 'https://via.placeholder.com/1200x800',
    targetAmount: 10000000,
    currentAmount: 7500000,
    backerCount: 150,
    daysLeft: 15,
    status: 'ongoing',
    rewardOptions: [
      {
        id: '1',
        title: '얼리버드 특별 패키지',
        description: '스마트 워치 1개 + 무선 충전기',
        price: 199000,
        maxQuantity: 100,
        remainingQuantity: 50
      },
      {
        id: '2',
        title: '프리미엄 패키지',
        description: '스마트 워치 1개 + 무선 충전기 + 보호 케이스',
        price: 249000,
        maxQuantity: 50,
        remainingQuantity: 30
      }
    ]
  };

  const handleOptionSelect = (optionId: string, quantity: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: quantity
    }));
  };

  const calculateTotalAmount = () => {
    return Object.entries(selectedOptions).reduce((total, [optionId, quantity]) => {
      const option = project.rewardOptions.find((opt) => opt.id === optionId);
      return total + (option?.price || 0) * quantity;
    }, 0);
  };

  const handleParticipate = () => {
    // 펀딩 참여 로직 구현
    alert('펀딩에 참여하시겠습니까?');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate('/funding')}
          className="mr-4 p-2 text-text-secondary hover:text-text-main transition-colors duration-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-semibold text-text-main">
          {project.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-auto"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-text-main mb-4">
              프로젝트 소개
            </h2>
            <p className="text-text-main whitespace-pre-wrap">
              {project.longDescription}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <FundingProgressBar
              currentAmount={project.currentAmount}
              targetAmount={project.targetAmount}
              backerCount={project.backerCount}
              daysLeft={project.daysLeft}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-text-main mb-4">
              리워드 선택
            </h2>
            <FundingRewardOptions
              options={project.rewardOptions}
              onSelect={handleOptionSelect}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-text-main">
                총 펀딩 금액
              </span>
              <span className="text-2xl font-bold text-primary">
                {calculateTotalAmount().toLocaleString()}원
              </span>
            </div>
            <button
              onClick={handleParticipate}
              disabled={Object.values(selectedOptions).every((qty) => qty === 0)}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-secondary disabled:text-text-disabled transition-colors duration-200"
            >
              펀딩하기
            </button>
          </div>

          <div className="flex space-x-4">
            <button className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-secondary text-text-secondary rounded-lg hover:bg-secondary-dark transition-colors duration-200">
              <Share2 className="w-5 h-5 mr-2" />
              공유하기
            </button>
            <button className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-secondary text-text-secondary rounded-lg hover:bg-secondary-dark transition-colors duration-200">
              <Heart className="w-5 h-5 mr-2" />
              관심 프로젝트
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundingDetail; 