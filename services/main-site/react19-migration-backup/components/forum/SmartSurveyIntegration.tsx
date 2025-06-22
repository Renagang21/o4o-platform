import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  TrendingUp, 
  Users, 
  Target, 
  BarChart3,
  Play,
  Pause,
  Settings,
  Gift,
  Clock,
  CheckCircle
} from 'lucide-react';

interface SurveyQuestion {
  id: string;
  type: 'multiple-choice' | 'rating' | 'text' | 'slider' | 'image-select';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  images?: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAudience: string[];
  triggerConditions: string[];
  questions: SurveyQuestion[];
  estimatedTime: number;
  incentive: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  responses: number;
  completionRate: number;
  createdAt: string;
  expiresAt?: string;
}

interface SurveyResult {
  surveyId: string;
  userId: string;
  responses: { [questionId: string]: any };
  completedAt: string;
  timeSpent: number;
}

interface UserProfile {
  interests: string[];
  demographics: {
    ageRange: string;
    gender: string;
    location: string;
  };
  healthConcerns: string[];
  purchaseHistory: string[];
  forumActivity: {
    topicsViewed: string[];
    questionsAsked: string[];
    expertConsultations: number;
  };
}

const SmartSurveyIntegration: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [questionId: string]: any }>({});
  const [showResults, setShowResults] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [surveyTrigger, setSurveyTrigger] = useState<string | null>(null);

  useEffect(() => {
    // 샘플 설문 데이터
    const sampleSurveys: Survey[] = [
      {
        id: 'survey1',
        title: '당신에게 맞는 건강기능식품 찾기',
        description: '개인 맞춤형 건강기능식품 추천을 위한 5분 설문',
        category: 'health-assessment',
        targetAudience: ['건강 관심자', '영양제 구매 고려자'],
        triggerConditions: ['영양제 관련 포스트 조회', '건강 카테고리 방문'],
        estimatedTime: 5,
        incentive: '15% 할인 쿠폰',
        status: 'active',
        responses: 12547,
        completionRate: 78,
        createdAt: '2024-06-10T00:00:00Z',
        expiresAt: '2024-07-10T00:00:00Z',
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            title: '현재 가장 관심 있는 건강 분야는 무엇인가요?',
            description: '해당하는 모든 항목을 선택해주세요',
            required: true,
            options: ['면역력 강화', '소화 건강', '관절 건강', '피부 미용', '피로 회복', '수면 개선', '스트레스 관리', '체중 관리']
          },
          {
            id: 'q2',
            type: 'rating',
            title: '현재 건강 상태에 대해 어떻게 생각하시나요?',
            required: true,
            min: 1,
            max: 5
          },
          {
            id: 'q3',
            type: 'multiple-choice',
            title: '현재 복용 중인 건강기능식품이 있나요?',
            required: true,
            options: ['없음', '종합비타민', '오메가3', '프로바이오틱스', '비타민D', '마그네슘', '기타']
          },
          {
            id: 'q4',
            type: 'slider',
            title: '월 건강기능식품 예산은 얼마인가요?',
            required: true,
            min: 0,
            max: 200000
          },
          {
            id: 'q5',
            type: 'multiple-choice',
            title: '건강기능식품 구매 시 가장 중요하게 생각하는 것은?',
            required: true,
            options: ['효과', '안전성', '가격', '브랜드 신뢰도', '전문가 추천', '사용자 후기']
          }
        ]
      },
      {
        id: 'survey2',
        title: '스킨케어 루틴 및 관심사 조사',
        description: '개인화된 뷰티 제품 추천을 위한 설문',
        category: 'beauty-assessment',
        targetAudience: ['뷰티 관심자', '스킨케어 제품 구매자'],
        triggerConditions: ['뷰티 포스트 조회', '화장품 관련 Q&A 참여'],
        estimatedTime: 4,
        incentive: '신제품 샘플 키트',
        status: 'active',
        responses: 8932,
        completionRate: 82,
        createdAt: '2024-06-12T00:00:00Z',
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            title: '귀하의 피부 타입은?',
            required: true,
            options: ['건성', '지성', '복합성', '민감성', '잘 모르겠음']
          },
          {
            id: 'q2',
            type: 'multiple-choice',
            title: '현재 가장 고민인 피부 문제는?',
            required: true,
            options: ['여드름', '건조함', '주름', '색소침착', '모공', '민감함', '특별한 고민 없음']
          }
        ]
      }
    ];

    setSurveys(sampleSurveys);

    // 사용자 프로필 샘플 데이터
    setUserProfile({
      interests: ['건강', '운동', '영양'],
      demographics: {
        ageRange: '30-39',
        gender: 'female',
        location: '서울'
      },
      healthConcerns: ['피로', '면역력'],
      purchaseHistory: ['비타민D', '오메가3'],
      forumActivity: {
        topicsViewed: ['영양제 복용법', '건강한 식단'],
        questionsAsked: ['프로바이오틱스 추천'],
        expertConsultations: 2
      }
    });
  }, []);

  // 설문 트리거 조건 확인
  useEffect(() => {
    // 실제로는 사용자 행동 데이터를 기반으로 트리거 조건 확인
    if (userProfile) {
      const triggeredSurvey = surveys.find(survey => 
        survey.status === 'active' && 
        survey.triggerConditions.some(condition => 
          userProfile.interests.some(interest => 
            condition.toLowerCase().includes(interest.toLowerCase())
          )
        )
      );

      if (triggeredSurvey && !surveyTrigger) {
        setSurveyTrigger(triggeredSurvey.id);
      }
    }
  }, [userProfile, surveys, surveyTrigger]);

  const startSurvey = (survey: Survey) => {
    setActiveSurvey(survey);
    setCurrentQuestionIndex(0);
    setResponses({});
    setSurveyTrigger(null);
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (activeSurvey && currentQuestionIndex < activeSurvey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeSurvey();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const completeSurvey = () => {
    if (activeSurvey) {
      // 실제로는 API에 결과 전송
      const result: SurveyResult = {
        surveyId: activeSurvey.id,
        userId: 'current-user',
        responses,
        completedAt: new Date().toISOString(),
        timeSpent: 0 // 실제로는 측정된 시간
      };

      console.log('설문 완료:', result);
      
      // 결과 페이지 표시
      setShowResults(true);
      setActiveSurvey(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  const SurveyCard: React.FC<{ survey: Survey }> = ({ survey }) => (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{survey.title}</h3>
          <p className="text-gray-600 text-sm mb-3">{survey.description}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>약 {survey.estimatedTime}분</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{survey.responses.toLocaleString()}명 참여</span>
            </div>
            <div className="flex items-center space-x-1">
              <BarChart3 className="w-4 h-4" />
              <span>완료율 {survey.completionRate}%</span>
            </div>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          survey.status === 'active' ? 'bg-green-100 text-green-700' :
          survey.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {survey.status === 'active' ? '진행중' : 
           survey.status === 'paused' ? '일시정지' : '완료'}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Gift className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-purple-900">완료 혜택</span>
        </div>
        <p className="text-purple-700">{survey.incentive}</p>
      </div>

      <button 
        onClick={() => startSurvey(survey)}
        disabled={survey.status !== 'active'}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {survey.status === 'active' ? '설문 시작하기' : '설문 종료됨'}
      </button>
    </div>
  );

  const QuestionRenderer: React.FC<{ question: SurveyQuestion }> = ({ question }) => {
    const currentAnswer = responses[question.id];

    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {question.options?.map(option => (
              <label key={option} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(currentAnswer) ? currentAnswer.includes(option) : currentAnswer === option}
                  onChange={(e) => {
                    if (question.title.includes('모든 항목')) {
                      // 다중 선택
                      const current = Array.isArray(currentAnswer) ? currentAnswer : [];
                      if (e.target.checked) {
                        handleAnswer(question.id, [...current, option]);
                      } else {
                        handleAnswer(question.id, current.filter(item => item !== option));
                      }
                    } else {
                      // 단일 선택
                      handleAnswer(question.id, option);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="flex justify-center space-x-2">
            {[...Array(question.max)].map((_, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(question.id, i + 1)}
                className={`w-12 h-12 rounded-full border-2 font-medium transition-colors ${
                  currentAnswer === i + 1
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-4">
            <input
              type="range"
              min={question.min}
              max={question.max}
              value={currentAnswer || question.min}
              onChange={(e) => handleAnswer(question.id, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatCurrency(question.min || 0)}</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(currentAnswer || question.min || 0)}
              </span>
              <span>{formatCurrency(question.max || 0)}</span>
            </div>
          </div>
        );

      case 'text':
        return (
          <textarea
            value={currentAnswer || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            placeholder="의견을 자유롭게 작성해주세요..."
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24"
          />
        );

      default:
        return <div>지원되지 않는 질문 유형입니다.</div>;
    }
  };

  // 설문 트리거 알림
  const SurveyTriggerBanner = () => {
    if (!surveyTrigger) return null;
    
    const triggeredSurvey = surveys.find(s => s.id === surveyTrigger);
    if (!triggeredSurvey) return null;

    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">{triggeredSurvey.title}</h3>
              <p className="text-blue-100 text-sm">관심사에 맞는 맞춤 설문이 있어요!</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => startSurvey(triggeredSurvey)}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50"
            >
              참여하기
            </button>
            <button 
              onClick={() => setSurveyTrigger(null)}
              className="text-blue-100 hover:text-white px-2"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">설문 완료!</h2>
          <p className="text-gray-600 mb-6">소중한 의견을 주셔서 감사합니다.</p>
          
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-green-900 mb-2">혜택 안내</h3>
            <p className="text-green-700">15% 할인 쿠폰이 계정에 적립되었습니다!</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setShowResults(false)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
            >
              맞춤 추천 상품 보기
            </button>
            <button 
              onClick={() => setShowResults(false)}
              className="w-full text-gray-600 hover:text-gray-800"
            >
              다른 설문 참여하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeSurvey) {
    const currentQuestion = activeSurvey.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeSurvey.questions.length) * 100;
    const canProceed = responses[currentQuestion.id] !== undefined || !currentQuestion.required;

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* 진행률 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>질문 {currentQuestionIndex + 1} / {activeSurvey.questions.length}</span>
              <span>{Math.round(progress)}% 완료</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 질문 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentQuestion.title}
            </h2>
            {currentQuestion.description && (
              <p className="text-gray-600 mb-4">{currentQuestion.description}</p>
            )}
            
            <QuestionRenderer question={currentQuestion} />
          </div>

          {/* 네비게이션 */}
          <div className="flex justify-between">
            <button 
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            
            <button 
              onClick={nextQuestion}
              disabled={!canProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentQuestionIndex === activeSurvey.questions.length - 1 ? '완료' : '다음'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <SurveyTriggerBanner />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">스마트 설문</h1>
        <p className="text-gray-600">맞춤형 추천을 위한 개인화 설문에 참여해보세요</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <span className="font-medium">활성 설문</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {surveys.filter(s => s.status === 'active').length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="font-medium">총 참여자</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {surveys.reduce((sum, s) => sum + s.responses, 0).toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="font-medium">평균 완료율</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(surveys.reduce((sum, s) => sum + s.completionRate, 0) / surveys.length)}%
          </div>
        </div>
      </div>

      {/* 설문 목록 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">참여 가능한 설문</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {surveys.map(survey => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartSurveyIntegration;
