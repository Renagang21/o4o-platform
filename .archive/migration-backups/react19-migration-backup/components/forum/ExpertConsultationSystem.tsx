
import React, { useState, useEffect } from 'react';
import { 
  Video, 
  MessageCircle, 
  Calendar, 
  Clock, 
  Star, 
  Award, 
  CheckCircle, 
  Filter,
  Search,
  BookOpen,
  Users,
  Phone,
  Zap
} from 'lucide-react';

interface Expert {
  id: string;
  name: string;
  avatar: string;
  title: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  consultationCount: number;
  satisfactionRate: number;
  isOnline: boolean;
  responseTime: string;
  availableHours: {
    [key: string]: string[];
  };
  consultationTypes: ('instant' | 'scheduled' | 'video' | 'text')[];
  pricePerHour: number;
  languages: string[];
  certifications: string[];
  recentTopics: string[];
}

interface ConsultationRequest {
  id: string;
  expertId: string;
  type: 'instant' | 'scheduled' | 'video' | 'text';
  topic: string;
  description: string;
  preferredTime?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
}

interface Consultation {
  id: string;
  expert: Expert;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  type: 'instant' | 'scheduled' | 'video' | 'text';
  topic: string;
  startTime: string;
  endTime?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  rating?: number;
  review?: string;
  summary?: string;
}

const ExpertConsultationSystem: React.FC = () => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-consultations'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');
  const [consultationType, setConsultationType] = useState<'instant' | 'scheduled'>('instant');
  const [consultationTopic, setConsultationTopic] = useState('');
  const [consultationDescription, setConsultationDescription] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    // 샘플 전문가 데이터
    const sampleExperts: Expert[] = [
      {
        id: 'expert1',
        name: '김○○ 의사',
        avatar: '/avatars/doctor1.jpg',
        title: '가정의학과 전문의',
        specialization: ['가정의학과', '영양학', '만성질환 관리'],
        experience: 15,
        rating: 4.9,
        reviewCount: 1247,
        consultationCount: 2156,
        satisfactionRate: 98,
        isOnline: true,
        responseTime: '평균 5분',
        availableHours: {
          '월': ['19:00', '20:00', '21:00'],
          '화': ['19:00', '20:00', '21:00'],
          '수': ['19:00', '20:00', '21:00'],
          '목': ['19:00', '20:00', '21:00'],
          '금': ['19:00', '20:00', '21:00'],
          '토': ['14:00', '15:00', '16:00', '17:00']
        },
        consultationTypes: ['instant', 'scheduled', 'video', 'text'],
        pricePerHour: 80000,
        languages: ['한국어', '영어'],
        certifications: ['가정의학과 전문의', '임상영양사 자격증'],
        recentTopics: ['비타민D 보충제 복용법', '당뇨 환자 영양제 선택', '혈압계 정확한 사용법']
      },
      {
        id: 'expert2',
        name: '이○○ 약사',
        avatar: '/avatars/pharmacist1.jpg',
        title: '임상약사',
        specialization: ['임상약학', '건강기능식품', '의약품 상호작용'],
        experience: 12,
        rating: 4.8,
        reviewCount: 892,
        consultationCount: 1543,
        satisfactionRate: 96,
        isOnline: false,
        responseTime: '평균 15분',
        availableHours: {
          '월': ['18:00', '19:00', '20:00'],
          '수': ['18:00', '19:00', '20:00'],
          '금': ['18:00', '19:00', '20:00'],
          '토': ['10:00', '11:00', '14:00', '15:00']
        },
        consultationTypes: ['scheduled', 'text'],
        pricePerHour: 60000,
        languages: ['한국어'],
        certifications: ['임상약사', '건강기능식품 전문가'],
        recentTopics: ['영양제 복용 순서', '약물 상호작용 체크', '프로바이오틱스 선택법']
      },
      {
        id: 'expert3',
        name: '박○○ 영양사',
        avatar: '/avatars/nutritionist1.jpg',
        title: '임상영양사',
        specialization: ['임상영양', '스포츠영양', '체중관리'],
        experience: 8,
        rating: 4.7,
        reviewCount: 456,
        consultationCount: 789,
        satisfactionRate: 94,
        isOnline: true,
        responseTime: '평균 3분',
        availableHours: {
          '월': ['20:00', '21:00'],
          '화': ['20:00', '21:00'],
          '목': ['20:00', '21:00'],
          '토': ['15:00', '16:00', '17:00'],
          '일': ['15:00', '16:00', '17:00']
        },
        consultationTypes: ['instant', 'video'],
        pricePerHour: 50000,
        languages: ['한국어'],
        certifications: ['임상영양사', '스포츠영양사'],
        recentTopics: ['개인별 영양 상담', '체중관리 식단', '운동 전후 영양 섭취']
      }
    ];

    setExperts(sampleExperts);

    // 샘플 상담 내역
    const sampleConsultations: Consultation[] = [
      {
        id: 'c1',
        expert: sampleExperts[0],
        user: {
          id: 'user1',
          name: '나',
          avatar: '/avatars/current-user.jpg'
        },
        type: 'video',
        topic: '건강기능식품 복용 상담',
        startTime: '2024-06-14T20:00:00Z',
        endTime: '2024-06-14T20:30:00Z',
        status: 'completed',
        rating: 5,
        review: '정말 친절하고 상세하게 설명해주셨어요. 많은 도움이 되었습니다.',
        summary: '비타민D와 오메가3 동시 복용 가능, 식후 30분 복용 권장'
      }
    ];

    setConsultations(sampleConsultations);
  }, []);

  const filteredExperts = experts.filter(expert => {
    const matchesSearch = expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expert.specialization.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         expert.recentTopics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSpecialization = filterSpecialization === 'all' || 
                                 expert.specialization.includes(filterSpecialization);
    
    return matchesSearch && matchesSpecialization;
  });

  const requestConsultation = () => {
    if (!selectedExpert || !consultationTopic.trim()) return;

    const newRequest: ConsultationRequest = {
      id: `req${Date.now()}`,
      expertId: selectedExpert.id,
      type: consultationType,
      topic: consultationTopic,
      description: consultationDescription,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // 실제로는 API 호출
    console.log('상담 요청:', newRequest);
    
    // UI 피드백
    alert(`${selectedExpert.name}님께 상담 요청이 전송되었습니다.`);
    
    setShowRequestForm(false);
    setConsultationTopic('');
    setConsultationDescription('');
  };

  const ExpertCard: React.FC<{ expert: Expert }> = ({ expert }) => (
    <div className="bg-white rounded-lg border hover:shadow-lg transition-shadow p-6 cursor-pointer"
         onClick={() => setSelectedExpert(expert)}>
      <div className="flex items-start space-x-4">
        <div className="relative">
          <img 
            src={expert.avatar} 
            alt={expert.name}
            className="w-16 h-16 rounded-full"
            onError={(e) => {
              e.currentTarget.src = '/api/placeholder/64/64';
            }}
          />
          {expert.isOnline && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-lg">{expert.name}</h3>
            <div className="flex items-center space-x-1 text-blue-600">
              <Award className="w-4 h-4" />
              <span className="text-sm">전문가</span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-2">{expert.title}</p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {expert.specialization.slice(0, 3).map(spec => (
              <span key={spec} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                {spec}
              </span>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-current text-yellow-400" />
              <span className="font-medium">{expert.rating}</span>
              <span className="text-gray-500">({expert.reviewCount})</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{expert.consultationCount}회 상담</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{expert.responseTime}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{expert.satisfactionRate}% 만족</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 mb-1">
            ₩{expert.pricePerHour.toLocaleString()}/시간
          </div>
          {expert.isOnline ? (
            <div className="flex items-center space-x-1 text-green-600 text-sm">
              <Zap className="w-4 h-4" />
              <span>즉시 상담 가능</span>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">예약 상담</div>
          )}
        </div>
      </div>
    </div>
  );

  const ConsultationModal: React.FC = () => {
    if (!selectedExpert) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start space-x-4">
                <img 
                  src={selectedExpert.avatar} 
                  alt={selectedExpert.name}
                  className="w-20 h-20 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/api/placeholder/80/80';
                  }}
                />
                <div>
                  <h2 className="text-2xl font-bold">{selectedExpert.name}</h2>
                  <p className="text-gray-600 mb-2">{selectedExpert.title}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-current text-yellow-400" />
                      <span>{selectedExpert.rating}</span>
                    </div>
                    <span>경력 {selectedExpert.experience}년</span>
                    <span>{selectedExpert.consultationCount}회 상담</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedExpert(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* 전문 분야 */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">전문 분야</h3>
              <div className="flex flex-wrap gap-2">
                {selectedExpert.specialization.map(spec => (
                  <span key={spec} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* 최근 상담 주제 */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">최근 상담 주제</h3>
              <ul className="space-y-1">
                {selectedExpert.recentTopics.map(topic => (
                  <li key={topic} className="text-sm text-gray-600 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 상담 가능 시간 */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">상담 가능 시간</h3>
              <div className="grid grid-cols-7 gap-2 text-sm">
                {Object.entries(selectedExpert.availableHours).map(([day, hours]) => (
                  <div key={day} className="text-center">
                    <div className="font-medium text-gray-700 mb-1">{day}</div>
                    <div className="space-y-1">
                      {hours.map(hour => (
                        <div key={hour} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 상담 요청 섹션 */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">상담 요청하기</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">상담 방식</label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedExpert.consultationTypes.includes('instant') && (
                      <button 
                        onClick={() => setConsultationType('instant')}
                        className={`p-3 border rounded-lg text-center ${
                          consultationType === 'instant' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Zap className="w-5 h-5 mx-auto mb-1" />
                        <div className="font-medium">즉시 상담</div>
                        <div className="text-xs text-gray-500">5-10분 내 시작</div>
                      </button>
                    )}
                    
                    {selectedExpert.consultationTypes.includes('scheduled') && (
                      <button 
                        onClick={() => setConsultationType('scheduled')}
                        className={`p-3 border rounded-lg text-center ${
                          consultationType === 'scheduled' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Calendar className="w-5 h-5 mx-auto mb-1" />
                        <div className="font-medium">예약 상담</div>
                        <div className="text-xs text-gray-500">시간 예약 후 진행</div>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">상담 주제</label>
                  <input
                    type="text"
                    value={consultationTopic}
                    onChange={(e) => setConsultationTopic(e.target.value)}
                    placeholder="예: 비타민D 보충제 복용법 문의"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">상세 내용 (선택)</label>
                  <textarea
                    value={consultationDescription}
                    onChange={(e) => setConsultationDescription(e.target.value)}
                    placeholder="궁금한 내용을 자세히 적어주시면 더 정확한 상담을 받을 수 있습니다."
                    className="w-full p-3 border border-gray-200 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">예상 비용</span>
                    <span className="text-lg font-bold text-blue-600">
                      ₩{selectedExpert.pricePerHour.toLocaleString()}/시간
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    최소 30분 상담 • 실제 시간에 따라 정산
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button 
                    onClick={() => setSelectedExpert(null)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button 
                    onClick={requestConsultation}
                    disabled={!consultationTopic.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {consultationType === 'instant' ? '즉시 상담 요청' : '예약 상담 요청'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">전문가 상담</h1>
        <p className="text-gray-600">신뢰할 수 있는 전문가와 1:1 상담을 받아보세요</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'browse' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          전문가 찾기
        </button>
        <button 
          onClick={() => setActiveTab('my-consultations')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'my-consultations' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          내 상담 내역
        </button>
      </div>

      {activeTab === 'browse' ? (
        <>
          {/* 검색 및 필터 */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="전문가, 전문분야, 상담주제로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-2">
                <select 
                  value={filterSpecialization} 
                  onChange={(e) => setFilterSpecialization(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">모든 분야</option>
                  <option value="가정의학과">가정의학과</option>
                  <option value="임상약학">임상약학</option>
                  <option value="임상영양">임상영양</option>
                  <option value="스포츠영양">스포츠영양</option>
                </select>
                
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  <span>필터</span>
                </button>
              </div>
            </div>
          </div>

          {/* 전문가 목록 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">전문가 목록</h2>
              <span className="text-gray-500">{filteredExperts.length}명의 전문가</span>
            </div>

            {filteredExperts.map(expert => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        </>
      ) : (
        // 내 상담 내역
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">내 상담 내역</h2>
          
          {consultations.length > 0 ? (
            <div className="space-y-4">
              {consultations.map(consultation => (
                <div key={consultation.id} className="bg-white rounded-lg border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <img 
                        src={consultation.expert.avatar} 
                        alt={consultation.expert.name}
                        className="w-12 h-12 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/48/48';
                        }}
                      />
                      <div>
                        <h3 className="font-semibold">{consultation.expert.name}</h3>
                        <p className="text-gray-600 text-sm">{consultation.expert.title}</p>
                        <p className="text-sm text-gray-700 mt-1">{consultation.topic}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        consultation.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : consultation.status === 'ongoing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {consultation.status === 'completed' ? '완료' : 
                         consultation.status === 'ongoing' ? '진행중' : '예정'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(consultation.startTime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {consultation.status === 'completed' && consultation.summary && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <h4 className="font-medium text-sm mb-1">상담 요약</h4>
                      <p className="text-sm text-gray-700">{consultation.summary}</p>
                    </div>
                  )}

                  {consultation.rating && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium">내 평가:</span>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${
                              i < consultation.rating! 
                                ? 'fill-current text-yellow-400' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {consultation.review && (
                    <p className="text-sm text-gray-700 italic">"{consultation.review}"</p>
                  )}

                  <div className="flex justify-end space-x-2 mt-4">
                    {consultation.status === 'completed' && (
                      <button className="text-sm text-blue-600 hover:text-blue-700">
                        다시 상담하기
                      </button>
                    )}
                    {consultation.status === 'scheduled' && (
                      <button className="text-sm text-green-600 hover:text-green-700 flex items-center space-x-1">
                        <Video className="w-4 h-4" />
                        <span>상담 참여</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 상담 내역이 없습니다</h3>
              <p className="text-gray-600 mb-4">전문가와 상담을 시작해보세요</p>
              <button 
                onClick={() => setActiveTab('browse')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                전문가 찾기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 상담 요청 모달 */}
      {selectedExpert && <ConsultationModal />}
    </div>
  );
};

export default ExpertConsultationSystem;