import { useState } from 'react'
import { Reward } from '../../types'

interface RewardSelectorProps {
  rewards: Reward[]
  onRewardSelect: (reward: Reward, rewardChoice: 'product' | 'refund') => void
}

const RewardSelector = ({ rewards, onRewardSelect }: RewardSelectorProps) => {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [rewardChoice, setRewardChoice] = useState<'product' | 'refund'>('product')

  const handleSelectReward = (reward: Reward) => {
    setSelectedReward(reward)
  }

  const handleConfirmSelection = () => {
    if (selectedReward) {
      onRewardSelect(selectedReward, rewardChoice)
    }
  }

  // Mock rewards if empty
  const mockRewards: Reward[] = rewards.length > 0 ? rewards : [
    {
      id: '1',
      title: '얼리버드 스페셜',
      description: '최초 100명 한정 특가',
      price: 79000,
      deliveryDate: '2024-10',
      limit: 100,
      claimed: 77,
      items: ['스마트 워치 1개', '전용 충전기', '실리콘 밴드 2개'],
      shippingInfo: '무료배송'
    },
    {
      id: '2',
      title: '일반 후원',
      description: '정가 할인 혜택',
      price: 99000,
      deliveryDate: '2024-11',
      claimed: 523,
      items: ['스마트 워치 1개', '전용 충전기', '실리콘 밴드 1개'],
      shippingInfo: '무료배송'
    },
    {
      id: '3',
      title: '프리미엄 패키지',
      description: '추가 액세서리 포함',
      price: 149000,
      deliveryDate: '2024-11',
      claimed: 89,
      items: ['스마트 워치 1개', '전용 충전기', '실리콘 밴드 3개', '가죽 밴드 1개', '무선 충전 패드'],
      shippingInfo: '무료배송'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">리워드 선택</h2>
      
      {/* Reward Options */}
      <div className="space-y-4 mb-6">
        {mockRewards.map((reward) => {
          const isSelected = selectedReward?.id === reward.id
          const isAvailable = !reward.limit || reward.claimed < reward.limit
          const progressPercentage = reward.limit ? (reward.claimed / reward.limit) * 100 : 0

          return (
            <div
              key={reward.id}
              onClick={() => isAvailable && handleSelectReward(reward)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-crowdfunding-primary bg-crowdfunding-primary/5' 
                  : isAvailable
                    ? 'border-gray-200 hover:border-crowdfunding-primary/50 hover:bg-gray-50'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{reward.title}</h3>
                  <p className="text-sm text-gray-600">{reward.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-crowdfunding-primary">
                    ₩{reward.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {reward.deliveryDate} 배송 예정
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {reward.items.map((item, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                    {item}
                  </div>
                ))}
              </div>

              {reward.limit && (
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {reward.claimed}명 선택 / {reward.limit}명 한정
                    </span>
                    <span className="text-gray-600">
                      {Math.max(0, reward.limit - reward.claimed)}개 남음
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-crowdfunding-primary h-2 rounded-full"
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">{reward.shippingInfo}</span>
                {!isAvailable && (
                  <span className="text-red-600 font-medium">품절</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Reward Choice Selection */}
      {selectedReward && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 o4o 크라우드펀딩 특별 혜택: 보상 선택권
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            펀딩 성공 시 제품 수령 또는 금액 환급 중 선택할 수 있습니다.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div
              onClick={() => setRewardChoice('product')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                rewardChoice === 'product'
                  ? 'border-crowdfunding-primary bg-crowdfunding-primary/5'
                  : 'border-gray-200 hover:border-crowdfunding-primary/50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  rewardChoice === 'product' ? 'border-crowdfunding-primary' : 'border-gray-300'
                }`}>
                  {rewardChoice === 'product' && (
                    <div className="w-3 h-3 bg-crowdfunding-primary rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">📦 제품 수령</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    완성된 제품을 도매가격에 받아보세요
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="text-green-600 font-medium">
                      약 {Math.round(selectedReward.price * 0.7).toLocaleString()}원 상당의 제품
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              onClick={() => setRewardChoice('refund')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                rewardChoice === 'refund'
                  ? 'border-crowdfunding-primary bg-crowdfunding-primary/5'
                  : 'border-gray-200 hover:border-crowdfunding-primary/50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  rewardChoice === 'refund' ? 'border-crowdfunding-primary' : 'border-gray-300'
                }`}>
                  {rewardChoice === 'refund' && (
                    <div className="w-3 h-3 bg-crowdfunding-primary rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">💰 금액 환급</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    펀딩 금액 + 약정 수수료를 받아보세요
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="text-blue-600 font-medium">
                      {selectedReward.price.toLocaleString()}원 + 수수료 {Math.round(selectedReward.price * 0.1).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">선택 요약</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>선택한 리워드:</span>
                <span className="font-medium">{selectedReward.title}</span>
              </div>
              <div className="flex justify-between">
                <span>후원 금액:</span>
                <span className="font-medium">₩{selectedReward.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>보상 선택:</span>
                <span className="font-medium">
                  {rewardChoice === 'product' ? '제품 수령' : '금액 환급'}
                </span>
              </div>
              {rewardChoice === 'refund' && (
                <div className="flex justify-between text-blue-600">
                  <span>예상 환급액:</span>
                  <span className="font-medium">
                    ₩{(selectedReward.price * 1.1).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleConfirmSelection}
            className="w-full bg-crowdfunding-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-crowdfunding-primary/90 transition-colors"
          >
            이 리워드로 후원하기
          </button>
        </div>
      )}
    </div>
  )
}

export default RewardSelector