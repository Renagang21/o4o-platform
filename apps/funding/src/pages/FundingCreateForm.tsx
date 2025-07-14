import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';

interface RewardOption {
  id: string;
  title: string;
  description: string;
  price: number;
  maxQuantity: number;
}

interface FundingProject {
  title: string;
  description: string;
  longDescription: string;
  image: string;
  targetAmount: number;
  endDate: string;
  rewardOptions: RewardOption[];
}

const FundingCreateForm: React.FC = () => {
  const navigate = useNavigate();
  const [project, setProject] = useState<FundingProject>({
    title: '',
    description: '',
    longDescription: '',
    image: '',
    targetAmount: 0,
    endDate: '',
    rewardOptions: []
  });

  const [newReward, setNewReward] = useState<Omit<RewardOption, 'id'>>({
    title: '',
    description: '',
    price: 0,
    maxQuantity: 0
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProject({ ...project, image: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddReward = () => {
    if (
      newReward.title &&
      newReward.description &&
      newReward.price > 0 &&
      newReward.maxQuantity > 0
    ) {
      setProject({
        ...project,
        rewardOptions: [
          ...project.rewardOptions,
          { ...newReward, id: Date.now().toString() }
        ]
      });
      setNewReward({
        title: '',
        description: '',
        price: 0,
        maxQuantity: 0
      });
    }
  };

  const handleRemoveReward = (id: string) => {
    setProject({
      ...project,
      rewardOptions: project.rewardOptions.filter((option) => option.id !== id)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 저장 로직 구현
    navigate('/funding');
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
          새 펀딩 프로젝트 등록
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-text-main mb-6">
            기본 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                프로젝트 제목
              </label>
              <input
                type="text"
                id="title"
                value={project.title}
                onChange={(e) =>
                  setProject({ ...project, title: e.target.value })
                }
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="프로젝트 제목을 입력하세요"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                간단한 설명
              </label>
              <input
                type="text"
                id="description"
                value={project.description}
                onChange={(e) =>
                  setProject({ ...project, description: e.target.value })
                }
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                required
              />
            </div>

            <div>
              <label
                htmlFor="longDescription"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                상세 설명
              </label>
              <textarea
                id="longDescription"
                value={project.longDescription}
                onChange={(e) =>
                  setProject({ ...project, longDescription: e.target.value })
                }
                className="w-full h-48 px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="프로젝트에 대한 상세한 설명을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                대표 이미지
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-secondary hover:bg-secondary-dark">
                  {project.image ? (
                    <img
                      src={project.image}
                      alt="프로젝트 이미지"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Plus className="w-12 h-12 text-text-secondary mb-3" />
                      <p className="mb-2 text-sm text-text-secondary">
                        <span className="font-semibold">클릭</span>하여 이미지
                        업로드
                      </p>
                      <p className="text-xs text-text-secondary">
                        PNG, JPG, GIF (최대 10MB)
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="targetAmount"
                  className="block text-sm font-medium text-text-secondary mb-1"
                >
                  목표 금액
                </label>
                <input
                  type="number"
                  id="targetAmount"
                  value={project.targetAmount}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      targetAmount: parseInt(e.target.value)
                    })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="목표 금액을 입력하세요"
                  min="0"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-text-secondary mb-1"
                >
                  마감일
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={project.endDate}
                  onChange={(e) =>
                    setProject({ ...project, endDate: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-text-main mb-6">
            리워드 옵션
          </h2>
          <div className="space-y-6">
            {project.rewardOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-start justify-between p-4 bg-secondary rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-text-main mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {option.description}
                  </p>
                  <div className="flex space-x-4">
                    <span className="text-sm text-text-secondary">
                      가격: {option.price.toLocaleString()}원
                    </span>
                    <span className="text-sm text-text-secondary">
                      수량: {option.maxQuantity}개
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveReward(option.id)}
                  className="p-2 text-text-secondary hover:text-text-main transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}

            <div className="p-4 bg-secondary rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="rewardTitle"
                    className="block text-sm font-medium text-text-secondary mb-1"
                  >
                    리워드 제목
                  </label>
                  <input
                    type="text"
                    id="rewardTitle"
                    value={newReward.title}
                    onChange={(e) =>
                      setNewReward({ ...newReward, title: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="리워드 제목을 입력하세요"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rewardPrice"
                    className="block text-sm font-medium text-text-secondary mb-1"
                  >
                    가격
                  </label>
                  <input
                    type="number"
                    id="rewardPrice"
                    value={newReward.price}
                    onChange={(e) =>
                      setNewReward({
                        ...newReward,
                        price: parseInt(e.target.value)
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="가격을 입력하세요"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="rewardDescription"
                    className="block text-sm font-medium text-text-secondary mb-1"
                  >
                    리워드 설명
                  </label>
                  <input
                    type="text"
                    id="rewardDescription"
                    value={newReward.description}
                    onChange={(e) =>
                      setNewReward({ ...newReward, description: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="리워드에 대한 설명을 입력하세요"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rewardQuantity"
                    className="block text-sm font-medium text-text-secondary mb-1"
                  >
                    수량
                  </label>
                  <input
                    type="number"
                    id="rewardQuantity"
                    value={newReward.maxQuantity}
                    onChange={(e) =>
                      setNewReward({
                        ...newReward,
                        maxQuantity: parseInt(e.target.value)
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="수량을 입력하세요"
                    min="0"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddReward}
                className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200"
              >
                리워드 추가
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/funding')}
            className="px-6 py-2 bg-secondary text-text-secondary rounded-lg hover:bg-secondary-dark transition-colors duration-200"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200"
          >
            등록하기
          </button>
        </div>
      </form>
    </div>
  );
};

export default FundingCreateForm; 