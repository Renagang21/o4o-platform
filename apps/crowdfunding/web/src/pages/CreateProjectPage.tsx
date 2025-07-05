import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProjectForm from '../components/crowdfunding/ProjectForm'

const CreateProjectPage = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleProjectSubmit = async (formData: any) => {
    setIsSubmitting(true)
    
    try {
      // 실제로는 여기에서 API 호출
      console.log('제출된 데이터:', formData)
      
      // 임시 딱레이
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('프로젝트가 성공적으로 제출되었습니다! 검토 후 승인 여부를 알려드릴게요.')
      navigate('/dashboard/creator')
    } catch (error) {
      toast.error('제출 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">프로젝트 시작하기</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              전문가와 함께하는 투명한 크라우드펀딩으로 아이디어를 현실로 만들어보세요.
              <br />
              후원자들은 제품 수령 또는 금액 환급 중 선택할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">전문가 검증</h3>
            <p className="text-gray-600 text-sm">
              해당 분야 전문가들이 프로젝트를 검증하고 추천합니다.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">투명성 허브</h3>
            <p className="text-gray-600 text-sm">
              모든 정보를 투명하게 공개하여 신뢰도를 높입니다.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">보상 선택 시스템</h3>
            <p className="text-gray-600 text-sm">
              후원자는 제품 수령 또는 금액 환급을 선택할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Form */}
        {isSubmitting ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-crowdfunding-primary mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">프로젝트 제출 중...</h3>
            <p className="text-gray-600">전문가 검토를 위해 프로젝트를 제출하고 있습니다.</p>
          </div>
        ) : (
          <ProjectForm onSubmit={handleProjectSubmit} />
        )}
      </div>

      {/* Help Section */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">도움이 필요하신가요?</h2>
            <p className="text-gray-600">
              성공적인 크라우드펀딩을 위한 가이드와 도움말을 확인하세요.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">프로젝트 가이드</h3>
              <p className="text-gray-600 text-sm mb-4">
                성공적인 프로젝트 작성을 위한 단계별 가이드
              </p>
              <button className="text-crowdfunding-primary hover:underline text-sm">
                가이드 보기 →
              </button>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">FAQ</h3>
              <p className="text-gray-600 text-sm mb-4">
                자주 묻는 질문과 답변을 확인하세요
              </p>
              <button className="text-crowdfunding-primary hover:underline text-sm">
                FAQ 보기 →
              </button>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">문의하기</h3>
              <p className="text-gray-600 text-sm mb-4">
                직접 문의하고 도움을 받아보세요
              </p>
              <button className="text-crowdfunding-primary hover:underline text-sm">
                문의하기 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateProjectPage