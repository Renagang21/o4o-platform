import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Update } from '../../types'

interface ProjectUpdatesProps {
  updates: Update[]
}

const ProjectUpdates = ({ updates }: ProjectUpdatesProps) => {
  // Mock updates if empty
  const mockUpdates: Update[] = updates.length > 0 ? updates : [
    {
      id: '1',
      title: '프로토타입 테스트 완료 및 개선사항 반영',
      content: `안녕하세요! 스마트 워치 3.0 개발팀입니다.

지난 2주간 진행된 프로토타입 테스트가 성공적으로 완료되었습니다. 100명의 베타 테스터분들의 소중한 피드백을 바탕으로 다음과 같은 개선사항을 반영했습니다:

🔧 주요 개선사항:
• 배터리 지속시간 15% 향상 (기존 6일 → 7일)
• 심박수 측정 정확도 98%로 개선
• 앱 연동 속도 30% 빨라짐
• 방수 성능 IPX7 → IPX8로 강화

📊 테스트 결과:
• 사용 만족도: 4.8/5.0
• 디자인 만족도: 4.6/5.0
• 기능 만족도: 4.7/5.0

다음 주부터는 양산 준비에 돌입하며, 예정된 일정에 맞춰 배송할 수 있도록 최선을 다하겠습니다!`,
      createdAt: '2024-06-20T10:00:00Z',
      author: { id: '1', name: '박트러스트', email: '', role: 'creator' }
    },
    {
      id: '2',
      title: 'FDA 승인 완료! 의료기기 등급 인증 획득',
      content: `🎉 큰 소식을 전해드립니다!

미국 FDA(식품의약국)로부터 정식 의료기기 등급 승인을 받았습니다. 이는 우리 제품의 안전성과 효과가 국제적으로 인정받았다는 의미입니다.

📜 승인 내용:
• FDA Class II 의료기기 등록
• 혈압 측정 기능 의료용 승인
• 심박수 모니터링 임상 승인
• 수면 분석 기능 검증 완료

이번 승인으로 미국 시장 진출의 길이 열렸으며, 향후 글로벌 확장을 위한 중요한 발판이 마련되었습니다.

후원해주신 모든 분들께 진심으로 감사드립니다! 💝`,
      createdAt: '2024-06-18T14:30:00Z',
      author: { id: '1', name: '박트러스트', email: '', role: 'creator' }
    },
    {
      id: '3',
      title: '목표 달성률 150% 돌파! 스트레치 골 공개',
      content: `놀라운 소식입니다! 🚀

목표 금액 5천만원을 150% 넘어서며 7천 5백만원을 달성했습니다. 이 모든 것은 후원자 여러분의 믿음과 지지 덕분입니다.

🎯 스트레치 골 공개:
• 8천만원 달성 시: 무선 충전 패드 무료 증정
• 1억원 달성 시: 가죽 밴드 추가 제공
• 1억 2천만원 달성 시: 전용 스마트폰 앱 프리미엄 기능 무료

현재 진행 상황으로 보면 첫 번째 스트레치 골은 곧 달성될 것 같습니다!

추가로, 펀딩 마감 후 제품 수령과 금액 환급 중 선택할 수 있는 o4o만의 특별한 보상 시스템에 대해서도 곧 자세히 안내드리겠습니다.`,
      createdAt: '2024-06-15T09:15:00Z',
      author: { id: '1', name: '박트러스트', email: '', role: 'creator' }
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">프로젝트 업데이트</h2>
      
      <div className="space-y-6">
        {mockUpdates.map((update) => (
          <article key={update.id} className="border-b border-gray-200 pb-6 last:border-b-0">
            <div className="flex items-start space-x-4">
              {/* Author Avatar */}
              <div className="w-12 h-12 bg-crowdfunding-primary rounded-full flex items-center justify-center text-white font-bold">
                {update.author.name.charAt(0)}
              </div>
              
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{update.title}</h3>
                    <p className="text-sm text-gray-500">
                      {update.author.name} · {formatDistanceToNow(new Date(update.createdAt), { 
                        addSuffix: true, 
                        locale: ko 
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  {update.content.split('\n').map((paragraph, index) => {
                    if (paragraph.trim() === '') return <br key={index} />
                    
                    return (
                      <p key={index} className="mb-3 text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    )
                  })}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {mockUpdates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          아직 업데이트가 없습니다.
        </div>
      )}
    </div>
  )
}

export default ProjectUpdates