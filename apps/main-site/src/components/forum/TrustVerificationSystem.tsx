
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Star, 
  Award, 
  BookOpen, 
  Users, 
  TrendingUp,
  ExternalLink,
  Flag,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';

interface VerificationSource {
  id: string;
  type: 'expert' | 'research' | 'official' | 'community';
  name: string;
  url?: string;
  credibility: number;
  verifiedAt: string;
  summary: string;
}

interface FactCheck {
  id: string;
  claim: string;
  status: 'verified' | 'partially-verified' | 'disputed' | 'false';
  evidence: string[];
  sources: VerificationSource[];
  confidence: number;
  lastChecked: string;
}

interface ContentVerification {
  id: string;
  contentId: string;
  contentType: 'post' | 'answer' | 'article';
  title: string;
  author: {
    id: string;
    name: string;
    isExpert: boolean;
    reputation: number;
    avatar: string;
  };
  trustScore: number;
  verificationStatus: 'verified' | 'pending' | 'disputed' | 'unverified';
  factChecks: FactCheck[];
  sources: VerificationSource[];
  communityVotes: {
    helpful: number;
    accurate: number;
    misleading: number;
    total: number;
  };
  expertEndorsements: number;
  createdAt: string;
  lastVerified: string;
}

const TrustVerificationSystem: React.FC = () => {
  const [verifications, setVerifications] = useState<ContentVerification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<ContentVerification | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending' | 'disputed'>('all');
  const [sortBy, setSortBy] = useState<'trust-score' | 'recent' | 'community-rating'>('trust-score');

  useEffect(() => {
    // 샘플 데이터
    const sampleVerifications: ContentVerification[] = [
      {
        id: 'v1',
        contentId: 'post1',
        contentType: 'answer',
        title: '비타민C 메가도스 요법의 효과',
        author: {
          id: 'user1',
          name: '건강연구자',
          isExpert: false,
          reputation: 256,
          avatar: '/avatars/user1.jpg'
        },
        trustScore: 85,
        verificationStatus: 'verified',
        factChecks: [
          {
            id: 'fc1',
            claim: '비타민C 고용량 복용이 감기 예방에 효과적이다',
            status: 'partially-verified',
            evidence: [
              '일부 연구에서 운동선수에게 효과 확인',
              '일반인에게는 제한적 효과',
              '과다 복용 시 부작용 가능'
            ],
            sources: [
              {
                id: 's1',
                type: 'research',
                name: 'Cochrane Review 2013',
                url: 'https://pubmed.ncbi.nlm.nih.gov/23440782/',
                credibility: 95,
                verifiedAt: '2024-06-14T10:00:00Z',
                summary: '비타민C 보충제의 감기 예방 효과에 대한 체계적 검토'
              }
            ],
            confidence: 75,
            lastChecked: '2024-06-14T10:00:00Z'
          },
          {
            id: 'fc2',
            claim: '하루 1000mg 이상 복용이 안전하다',
            status: 'disputed',
            evidence: [
              'FDA 권장량: 90mg (성인남성)',
              '상한선: 2000mg/일',
              '과다 복용 시 위장장애 가능'
            ],
            sources: [
              {
                id: 's2',
                type: 'official',
                name: '식품의약품안전처',
                url: 'https://www.mfds.go.kr',
                credibility: 98,
                verifiedAt: '2024-06-14T11:00:00Z',
                summary: '비타민C 일일 권장량 및 상한선 가이드라인'
              }
            ],
            confidence: 90,
            lastChecked: '2024-06-14T11:00:00Z'
          }
        ],
        sources: [
          {
            id: 's3',
            type: 'expert',
            name: '김○○ 영양학 교수 (서울대)',
            credibility: 92,
            verifiedAt: '2024-06-14T12:00:00Z',
            summary: '영양학적 관점에서 비타민C 메가도스 요법 검토'
          }
        ],
        communityVotes: {
          helpful: 124,
          accurate: 89,
          misleading: 12,
          total: 225
        },
        expertEndorsements: 2,
        createdAt: '2024-06-13T15:30:00Z',
        lastVerified: '2024-06-14T12:00:00Z'
      },
      {
        id: 'v2',
        contentId: 'post2',
        contentType: 'post',
        title: '프로바이오틱스 복용 시간의 중요성',
        author: {
          id: 'expert1',
          name: '박○○ 약사',
          isExpert: true,
          reputation: 4850,
          avatar: '/avatars/expert1.jpg'
        },
        trustScore: 96,
        verificationStatus: 'verified',
        factChecks: [
          {
            id: 'fc3',
            claim: '식후 30분에 복용하는 것이 가장 효과적이다',
            status: 'verified',
            evidence: [
              '위산 중화 효과로 생존율 증가',
              '장내 정착률 향상',
              '다수 임상연구에서 확인'
            ],
            sources: [
              {
                id: 's4',
                type: 'research',
                name: 'Journal of Clinical Medicine 2020',
                url: 'https://pubmed.ncbi.nlm.nih.gov/32650445/',
                credibility: 88,
                verifiedAt: '2024-06-14T09:30:00Z',
                summary: '프로바이오틱스 복용 시간과 생존율에 관한 연구'
              }
            ],
            confidence: 92,
            lastChecked: '2024-06-14T09:30:00Z'
          }
        ],
        sources: [
          {
            id: 's5',
            type: 'expert',
            name: '대한약사회 가이드라인',
            credibility: 94,
            verifiedAt: '2024-06-14T09:30:00Z',
            summary: '프로바이오틱스 복용 가이드라인'
          }
        ],
        communityVotes: {
          helpful: 298,
          accurate: 276,
          misleading: 3,
          total: 315
        },
        expertEndorsements: 5,
        createdAt: '2024-06-12T20:15:00Z',
        lastVerified: '2024-06-14T09:30:00Z'
      }
    ];

    setVerifications(sampleVerifications);
  }, []);

  const filteredVerifications = verifications.filter(verification => {
    if (filterStatus === 'all') return true;
    return verification.verificationStatus === filterStatus;
  });

  const sortedVerifications = [...filteredVerifications].sort((a, b) => {
    switch (sortBy) {
      case 'trust-score':
        return b.trustScore - a.trustScore;
      case 'recent':
        return new Date(b.lastVerified).getTime() - new Date(a.lastVerified).getTime();
      case 'community-rating':
        return b.communityVotes.helpful - a.communityVotes.helpful;
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100';
      case 'partially-verified': return 'text-yellow-600 bg-yellow-100';
      case 'disputed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'partially-verified': return <AlertTriangle className="w-4 h-4" />;
      case 'disputed': return <X className="w-4 h-4" />;
      case 'pending': return <RefreshCw className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return '검증됨';
      case 'partially-verified': return '부분 검증';
      case 'disputed': return '논란됨';
      case 'pending': return '검증 중';
      default: return '미검증';
    }
  };

  const TrustScoreBar: React.FC<{ score: number }> = ({ score }) => (
    <div className="flex items-center space-x-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${
            score >= 90 ? 'bg-green-500' : 
            score >= 70 ? 'bg-yellow-500' : 
            score >= 50 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium">{score}점</span>
    </div>
  );

  const FactCheckCard: React.FC<{ factCheck: FactCheck }> = ({ factCheck }) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex-1">{factCheck.claim}</h4>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(factCheck.status)}`}>
          {getStatusIcon(factCheck.status)}
          <span>{getStatusText(factCheck.status)}</span>
        </div>
      </div>

      <div className="mb-3">
        <h5 className="text-sm font-medium text-gray-700 mb-2">근거</h5>
        <ul className="space-y-1">
          {factCheck.evidence.map((evidence, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
              <span className="text-gray-400">•</span>
              <span>{evidence}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-3">
        <h5 className="text-sm font-medium text-gray-700 mb-2">출처</h5>
        <div className="space-y-1">
          {factCheck.sources.map(source => (
            <div key={source.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">{source.name}</span>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                <span>{source.credibility}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>신뢰도: {factCheck.confidence}%</span>
        <span>검증일: {new Date(factCheck.lastChecked).toLocaleDateString()}</span>
      </div>
    </div>
  );

  const VerificationDetail: React.FC<{ verification: ContentVerification }> = ({ verification }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{verification.title}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <img 
                    src={verification.author.avatar} 
                    alt={verification.author.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/api/placeholder/24/24';
                    }}
                  />
                  <span>{verification.author.name}</span>
                  {verification.author.isExpert && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Award className="w-3 h-3" />
                      <span className="text-xs">전문가</span>
                    </div>
                  )}
                </div>
                <span>작성일: {new Date(verification.createdAt).toLocaleDateString()}</span>
                <span>최종 검증: {new Date(verification.lastVerified).toLocaleDateString()}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedVerification(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* 전체 신뢰도 */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">전체 신뢰도 점수</h3>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${getStatusColor(verification.verificationStatus)}`}>
                {getStatusIcon(verification.verificationStatus)}
                <span className="text-sm font-medium">{getStatusText(verification.verificationStatus)}</span>
              </div>
            </div>
            <TrustScoreBar score={verification.trustScore} />
          </div>

          {/* 팩트 체크 */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">팩트 체크 결과</h3>
            <div className="space-y-4">
              {verification.factChecks.map(factCheck => (
                <FactCheckCard key={factCheck.id} factCheck={factCheck} />
              ))}
            </div>
          </div>

          {/* 전문가 검증 */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">전문가 검증</h3>
            <div className="space-y-3">
              {verification.sources.map(source => (
                <div key={source.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="font-medium text-blue-900">{source.name}</div>
                    <div className="text-sm text-blue-700">{source.summary}</div>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-blue-600">
                    <Shield className="w-4 h-4" />
                    <span>{source.credibility}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 커뮤니티 평가 */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">커뮤니티 평가</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <ThumbsUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-green-900">{verification.communityVotes.helpful}</div>
                <div className="text-sm text-green-700">도움됨</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="font-semibold text-blue-900">{verification.communityVotes.accurate}</div>
                <div className="text-sm text-blue-700">정확함</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <Flag className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <div className="font-semibold text-red-900">{verification.communityVotes.misleading}</div>
                <div className="text-sm text-red-700">오해 소지</div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              총 {verification.communityVotes.total}명이 평가했습니다
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <button className="flex items-center space-x-1 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Flag className="w-4 h-4" />
                <span>오류 신고</span>
              </button>
              <button className="flex items-center space-x-1 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                <RefreshCw className="w-4 h-4" />
                <span>재검증 요청</span>
              </button>
            </div>
            
            <button 
              onClick={() => setSelectedVerification(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">신뢰도 검증 센터</h1>
        <p className="text-gray-600">정보의 신뢰성을 검증하고 투명하게 공개합니다</p>
      </div>

      {/* 통계 대시보드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-900">검증 완료</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {verifications.filter(v => v.verificationStatus === 'verified').length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">검증 중</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {verifications.filter(v => v.verificationStatus === 'pending').length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-gray-900">논란</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">
            {verifications.filter(v => v.verificationStatus === 'disputed').length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">평균 신뢰도</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(verifications.reduce((sum, v) => sum + v.trustScore, 0) / verifications.length)}점
          </div>
        </div>
      </div>

      {/* 필터 및 정렬 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex space-x-2">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'verified' | 'pending' | 'disputed')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="verified">검증됨</option>
              <option value="pending">검증 중</option>
              <option value="disputed">논란됨</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'trust-score' | 'recent' | 'community-rating')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="trust-score">신뢰도 높은 순</option>
              <option value="recent">최근 검증 순</option>
              <option value="community-rating">커뮤니티 평가 순</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            총 {sortedVerifications.length}개의 검증 항목
          </div>
        </div>
      </div>

      {/* 검증 목록 */}
      <div className="space-y-4">
        {sortedVerifications.map(verification => (
          <div 
            key={verification.id} 
            className="bg-white rounded-lg border hover:shadow-md transition-shadow p-6 cursor-pointer"
            onClick={() => setSelectedVerification(verification)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{verification.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={verification.author.avatar} 
                      alt={verification.author.name}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = '/api/placeholder/24/24';
                      }}
                    />
                    <span>{verification.author.name}</span>
                    {verification.author.isExpert && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <Award className="w-3 h-3" />
                        <span className="text-xs">전문가</span>
                      </div>
                    )}
                  </div>
                  <span>{new Date(verification.lastVerified).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full mb-2 ${getStatusColor(verification.verificationStatus)}`}>
                  {getStatusIcon(verification.verificationStatus)}
                  <span className="text-sm font-medium">{getStatusText(verification.verificationStatus)}</span>
                </div>
                <div className="text-sm text-gray-600">신뢰도 {verification.trustScore}점</div>
              </div>
            </div>

            <div className="mb-4">
              <TrustScoreBar score={verification.trustScore} />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{verification.factChecks.length}개 팩트체크</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{verification.communityVotes.total}개 평가</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Award className="w-4 h-4" />
                  <span>{verification.expertEndorsements}명 전문가 추천</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 text-green-600">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{verification.communityVotes.helpful}</span>
                </div>
                <div className="flex items-center space-x-1 text-red-600">
                  <ThumbsDown className="w-4 h-4" />
                  <span>{verification.communityVotes.misleading}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 상세 모달 */}
      {selectedVerification && (
        <VerificationDetail verification={selectedVerification} />
      )}
    </div>
  );
};

export default TrustVerificationSystem;