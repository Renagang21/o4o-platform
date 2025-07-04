import { useState } from 'react'
import { Project } from '../../types'

interface ProjectFormData {
  title: string
  subtitle: string
  description: string
  category: string
  targetAmount: number
  endDate: string
  mainImage: string
  images: string[]
  rewards: {
    title: string
    description: string
    price: number
    deliveryDate: string
    limit?: number
    items: string[]
  }[]
}

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void
}

const ProjectForm = ({ onSubmit }: ProjectFormProps) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    targetAmount: 0,
    endDate: '',
    mainImage: '',
    images: [],
    rewards: [
      {
        title: '',
        description: '',
        price: 0,
        deliveryDate: '',
        items: ['']
      }
    ]
  })

  const categories = ['전자기기', '생활', '뷰티', '피트니스', '헬스케어', '교육', '게임', '기타']

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleRewardChange = (index: number, field: string, value: any) => {
    const newRewards = [...formData.rewards]
    newRewards[index] = { ...newRewards[index], [field]: value }
    setFormData(prev => ({ ...prev, rewards: newRewards }))
  }

  const addReward = () => {
    setFormData(prev => ({
      ...prev,
      rewards: [...prev.rewards, {
        title: '',
        description: '',
        price: 0,
        deliveryDate: '',
        items: ['']
      }]
    }))
  }

  const removeReward = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rewards: prev.rewards.filter((_, i) => i !== index)
    }))
  }

  const addRewardItem = (rewardIndex: number) => {
    const newRewards = [...formData.rewards]
    newRewards[rewardIndex].items.push('')
    setFormData(prev => ({ ...prev, rewards: newRewards }))
  }

  const updateRewardItem = (rewardIndex: number, itemIndex: number, value: string) => {
    const newRewards = [...formData.rewards]
    newRewards[rewardIndex].items[itemIndex] = value
    setFormData(prev => ({ ...prev, rewards: newRewards }))
  }

  const removeRewardItem = (rewardIndex: number, itemIndex: number) => {
    const newRewards = [...formData.rewards]
    newRewards[rewardIndex].items = newRewards[rewardIndex].items.filter((_, i) => i !== itemIndex)
    setFormData(prev => ({ ...prev, rewards: newRewards }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.title && formData.subtitle && formData.description && formData.category
      case 2:
        return formData.targetAmount > 0 && formData.endDate
      case 3:
        return formData.mainImage
      case 4:
        return formData.rewards.every(reward => 
          reward.title && reward.description && reward.price > 0 && reward.deliveryDate
        )
      default:
        return true
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4, 5].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum 
                  ? 'bg-crowdfunding-primary text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {stepNum}
              </div>
              {stepNum < 5 && (
                <div className={`w-16 h-1 mx-2 ${
                  step > stepNum ? 'bg-crowdfunding-primary' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-600 text-center">
          {step === 1 && '기본 정보'}
          {step === 2 && '펀딩 설정'}
          {step === 3 && '이미지 업로드'}
          {step === 4 && '리워드 설정'}
          {step === 5 && '검토 및 제출'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">프로젝트 기본 정보</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                placeholder="혁신적인 제품 이름을 입력하세요"
                maxLength={100}
              />
              <p className="text-sm text-gray-500 mt-1">{formData.title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                한줄 설명 *
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                placeholder="프로젝트를 한줄로 요약해주세요"
                maxLength={150}
              />
              <p className="text-sm text-gray-500 mt-1">{formData.subtitle.length}/150</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
              >
                <option value="">카테고리를 선택하세요</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 상세 설명 *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                placeholder="프로젝트에 대해 자세히 설명해주세요. 기술적 특징, 장점, 사용법 등을 포함하세요."
              />
            </div>
          </div>
        )}

        {/* Step 2: 펀딩 설정 */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">펀딩 설정</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                목표 금액 *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₩</span>
                <input
                  type="number"
                  value={formData.targetAmount || ''}
                  onChange={(e) => handleInputChange('targetAmount', parseInt(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                  placeholder="10000000"
                  min="1000000"
                  step="100000"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                최소 100만원 이상으로 설정해주세요. 수수료를 고려하여 설정하세요.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                펀딩 마감일 *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
              <p className="text-sm text-gray-500 mt-1">
                최소 7일, 최대 90일까지 설정할 수 있습니다.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 o4o 특별 혜택: 보상 선택 시스템</h3>
              <p className="text-sm text-blue-800">
                후원자는 펀딩 성공 시 제품 수령 또는 금액 환급 중 선택할 수 있습니다. 
                이는 후원자의 위험을 줄이고 더 많은 참여를 유도할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: 이미지 업로드 */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">이미지 업로드</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메인 이미지 URL *
              </label>
              <input
                type="url"
                value={formData.mainImage}
                onChange={(e) => handleInputChange('mainImage', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-sm text-gray-500 mt-1">
                프로젝트를 대표하는 이미지 URL을 입력하세요. (임시로 URL 입력 방식 사용)
              </p>
              {formData.mainImage && (
                <div className="mt-4">
                  <img
                    src={formData.mainImage}
                    alt="메인 이미지 미리보기"
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: 리워드 설정 - 간단한 버전 */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">리워드 설정</h2>
            <p className="text-gray-600">
              후원자들에게 제공할 리워드를 설정하세요.
            </p>
            
            {formData.rewards.map((reward, rewardIndex) => (
              <div key={rewardIndex} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">리워드 {rewardIndex + 1}</h3>
                  {formData.rewards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReward(rewardIndex)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      삭제
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      리워드 이름 *
                    </label>
                    <input
                      type="text"
                      value={reward.title}
                      onChange={(e) => handleRewardChange(rewardIndex, 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                      placeholder="얼리버드 스페셜"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      가격 *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₩</span>
                      <input
                        type="number"
                        value={reward.price || ''}
                        onChange={(e) => handleRewardChange(rewardIndex, 'price', parseInt(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                        placeholder="50000"
                        min="1000"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    리워드 설명 *
                  </label>
                  <textarea
                    value={reward.description}
                    onChange={(e) => handleRewardChange(rewardIndex, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                    placeholder="이 리워드에 대한 자세한 설명을 입력하세요"
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    배송 예정일 *
                  </label>
                  <input
                    type="date"
                    value={reward.deliveryDate}
                    onChange={(e) => handleRewardChange(rewardIndex, 'deliveryDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                    min={formData.endDate}
                  />
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addReward}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-crowdfunding-primary hover:text-crowdfunding-primary transition-colors"
            >
              + 새 리워드 추가
            </button>
          </div>
        )}

        {/* Step 5: 검토 및 제출 */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">검토 및 제출</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">프로젝트 요약</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">제목:</span>
                  <span className="font-medium">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">카테고리:</span>
                  <span className="font-medium">{formData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">목표 금액:</span>
                  <span className="font-medium">₩{formData.targetAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">마감일:</span>
                  <span className="font-medium">{formData.endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">리워드 개수:</span>
                  <span className="font-medium">{formData.rewards.length}개</span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📋 다음 단계</h3>
              <p className="text-sm text-blue-700">
                프로젝트 제출 후 전문가 검토를 거쳐 7-14일 내에 승인 여부가 결정됩니다. 
                승인되면 투명성 허브와 파트너 추천 시스템이 활성화됩니다.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className={`px-6 py-3 rounded-lg font-medium ${
              step === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            이전
          </button>
          
          {step < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid()}
              className={`px-6 py-3 rounded-lg font-medium ${
                isStepValid()
                  ? 'bg-crowdfunding-primary text-white hover:bg-crowdfunding-primary/90'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              다음
            </button>
          ) : (
            <button
              type="submit"
              className="px-8 py-3 bg-crowdfunding-primary text-white rounded-lg font-semibold hover:bg-crowdfunding-primary/90 transition-colors"
            >
              프로젝트 제출
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default ProjectForm