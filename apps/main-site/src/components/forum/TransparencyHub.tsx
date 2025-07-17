
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Award, 
  Users, 
  ExternalLink,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Microscope,
  Building,
  BookOpen,
  TrendingUp,
  BarChart3,
  Handshake
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  type: 'technical' | 'safety' | 'certification' | 'legal' | 'financial';
  url: string;
  uploadedAt: string;
  fileSize: string;
  verified: boolean;
  downloads: number;
}

interface ExpertVerification {
  id: string;
  expert: {
    name: string;
    title: string;
    institution: string;
    credentials: string[];
    avatar: string;
  };
  verificationDate: string;
  category: 'technical' | 'safety' | 'regulatory' | 'market';
  summary: string;
  score: number;
  details: string;
  publicReport?: string;
}

interface PartnerEndorsement {
  id: string;
  partner: {
    name: string;
    type: 'influencer' | 'professional' | 'organization';
    avatar: string;
    followerCount?: number;
    specialization: string;
  };
  endorsementDate: string;
  content: string;
  reachEstimate: number;
  engagementRate: number;
  legalDisclosure: string;
}

interface TransparencyData {
  projectId: string;
  overallScore: number;
  lastUpdated: string;
  categories: {
    information: number;
    verification: number;
    financial: number;
    legal: number;
    partnership: number;
  };
  documents: Document[];
  expertVerifications: ExpertVerification[];
  partnerEndorsements: PartnerEndorsement[];
  updateHistory: {
    date: string;
    type: string;
    description: string;
  }[];
  complianceStatus: {
    securities: boolean;
    advertising: boolean;
    partnership: boolean;
    dataPrivacy: boolean;
  };
}

const TransparencyHub: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [transparencyData, setTransparencyData] = useState<TransparencyData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'experts' | 'partners' | 'compliance'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 샘플 데이터 - 실제로는 API에서 가져올 예정
    const sampleData: TransparencyData = {
      projectId,
      overallScore: 94,
      lastUpdated: '2024-06-14T15:30:00Z',
      categories: {
        information: 96,
        verification: 94,
        financial: 92,
        legal: 95,
        partnership: 93
      },
      documents: [
        {
          id: 'doc1',
          title: '제품 기술 명세서',
          type: 'technical',
          url: '/documents/tech-spec.pdf',
          uploadedAt: '2024-06-10T10:00:00Z',
          fileSize: '2.3MB',
          verified: true,
          downloads: 1247
        },
        {
          id: 'doc2',
          title: '안전성 테스트 보고서',
          type: 'safety',
          url: '/documents/safety-report.pdf',
          uploadedAt: '2024-06-08T14:30:00Z',
          fileSize: '5.1MB',
          verified: true,
          downloads: 892
        },
        {
          id: 'doc3',
          title: 'FDA 승인 인증서',
          type: 'certification',
          url: '/documents/fda-approval.pdf',
          uploadedAt: '2024-06-05T09:15:00Z',
          fileSize: '1.2MB',
          verified: true,
          downloads: 2156
        },
        {
          id: 'doc4',
          title: '재무 감사 보고서',
          type: 'financial',
          url: '/documents/financial-audit.pdf',
          uploadedAt: '2024-06-12T16:45:00Z',
          fileSize: '3.7MB',
          verified: true,
          downloads: 654
        }
      ],
      expertVerifications: [
        {
          id: 'exp1',
          expert: {
            name: '김○○ 교수',
            title: '생명공학과 교수',
            institution: '서울대학교',
            credentials: ['생명공학 박사', '바이오 기술 전문가'],
            avatar: '/avatars/expert1.jpg'
          },
          verificationDate: '2024-06-12T10:00:00Z',
          category: 'technical',
          summary: '기술적 타당성이 매우 높으며, 상용화 가능성 우수',
          score: 95,
          details: '제안된 기술은 기존 기술 대비 30% 이상의 성능 개선을 보여주며, 특허 포트폴리오도 탄탄합니다.',
          publicReport: '/reports/technical-verification.pdf'
        },
        {
          id: 'exp2',
          expert: {
            name: '이○○ 원장',
            title: '의료진',
            institution: '삼성서울병원',
            credentials: ['내과 전문의', '임상연구 전문가'],
            avatar: '/avatars/expert2.jpg'
          },
          verificationDate: '2024-06-10T14:20:00Z',
          category: 'safety',
          summary: '안전성 측면에서 우수한 평가, 임상 적용 가능',
          score: 92,
          details: '300명 대상 임상시험 결과 부작용 발생률 2% 미만으로 매우 안전한 수준입니다.'
        }
      ],
      partnerEndorsements: [
        {
          id: 'part1',
          partner: {
            name: '건강의료 전문가 박○○',
            type: 'professional',
            avatar: '/avatars/partner1.jpg',
            followerCount: 125000,
            specialization: '의료기기 리뷰'
          },
          endorsementDate: '2024-06-13T12:00:00Z',
          content: '10년간 의료기기를 검토해왔지만, 이 제품만큼 혁신적이고 실용적인 제품은 드물었습니다.',
          reachEstimate: 45000,
          engagementRate: 8.5,
          legalDisclosure: '본 추천은 제품 체험 후 작성되었으며, 소정의 협찬을 받았음을 고지합니다. (협찬비: 80만원, 추천 수수료율: 25%)'
        },
        {
          id: 'part2',
          partner: {
            name: '테크리뷰어 이○○',
            type: 'influencer',
            avatar: '/avatars/partner2.jpg',
            followerCount: 87000,
            specialization: 'IT/헬스케어 기술'
          },
          endorsementDate: '2024-06-11T16:30:00Z',
          content: '기술적 혁신성과 사용자 경험 측면에서 매우 높은 점수를 주고 싶습니다.',
          reachEstimate: 32000,
          engagementRate: 12.3,
          legalDisclosure: '본 콘텐츠는 유료 협찬을 받아 제작되었습니다. (협찬비: 150만원, 추천 수수료율: 30%)'
        }
      ],
      updateHistory: [
        {
          date: '2024-06-14T15:30:00Z',
          type: 'document',
          description: '추가 안전성 테스트 결과 업로드'
        },
        {
          date: '2024-06-12T10:00:00Z',
          type: 'verification',
          description: '김○○ 교수 기술 검증 완료'
        },
        {
          date: '2024-06-10T14:00:00Z',
          type: 'compliance',
          description: '파트너십 공시 정보 업데이트'
        }
      ],
      complianceStatus: {
        securities: true,
        advertising: true,
        partnership: true,
        dataPrivacy: true
      }
    };

    setTimeout(() => {
      setTransparencyData(sampleData);
      setLoading(false);
    }, 1000);
  }, [projectId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!transparencyData) return null;

  const ScoreCard: React.FC<{ title: string; score: number; icon: React.ReactNode }> = ({ title, score, icon }) => (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-2">{score}점</div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${
            score >= 90 ? 'bg-green-500' : 
            score >= 80 ? 'bg-yellow-500' : 
            score >= 70 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );

  const DocumentCard: React.FC<{ document: Document }> = ({ document }) => (
    <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{document.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{document.fileSize}</span>
            <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
            <div className="flex items-center space-x-1">
              <Download className="w-3 h-3" />
              <span>{document.downloads.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {document.verified && (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">검증됨</span>
            </div>
          )}
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            document.type === 'technical' ? 'bg-blue-100 text-blue-700' :
            document.type === 'safety' ? 'bg-green-100 text-green-700' :
            document.type === 'certification' ? 'bg-purple-100 text-purple-700' :
            document.type === 'financial' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {document.type === 'technical' ? '기술' :
             document.type === 'safety' ? '안전성' :
             document.type === 'certification' ? '인증' :
             document.type === 'financial' ? '재무' : '법무'}
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm">
          <Eye className="w-4 h-4" />
          <span>미리보기</span>
        </button>
        <button className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm">
          <Download className="w-4 h-4" />
          <span>다운로드</span>
        </button>
        <button className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-sm">
          <ExternalLink className="w-4 h-4" />
          <span>원본 보기</span>
        </button>
      </div>
    </div>
  );

  const ExpertCard: React.FC<{ verification: ExpertVerification }> = ({ verification }) => (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start space-x-4 mb-4">
        <img 
          src={verification.expert.avatar} 
          alt={verification.expert.name}
          className="w-16 h-16 rounded-full"
          onError={(e) => {
            e.currentTarget.src = '/api/placeholder/64/64';
          }}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{verification.expert.name}</h3>
          <p className="text-gray-600 text-sm">{verification.expert.title}</p>
          <p className="text-gray-500 text-sm">{verification.expert.institution}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {verification.expert.credentials.map(cred => (
              <span key={cred} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                {cred}
              </span>
            ))}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600 mb-1">{verification.score}점</div>
          <div className="text-sm text-gray-500">
            {new Date(verification.verificationDate).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">검증 요약</h4>
          <p className="text-gray-700 text-sm">{verification.summary}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-1">상세 의견</h4>
          <p className="text-gray-700 text-sm">{verification.details}</p>
        </div>
        
        {verification.publicReport && (
          <div className="pt-3 border-t">
            <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm">
              <FileText className="w-4 h-4" />
              <span>전체 검증 보고서 다운로드</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const PartnerCard: React.FC<{ endorsement: PartnerEndorsement }> = ({ endorsement }) => (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start space-x-4 mb-4">
        <img 
          src={endorsement.partner.avatar} 
          alt={endorsement.partner.name}
          className="w-12 h-12 rounded-full"
          onError={(e) => {
            e.currentTarget.src = '/api/placeholder/48/48';
          }}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{endorsement.partner.name}</h3>
          <p className="text-gray-600 text-sm">{endorsement.partner.specialization}</p>
          {endorsement.partner.followerCount && (
            <p className="text-gray-500 text-sm">
              팔로워 {endorsement.partner.followerCount.toLocaleString()}명
            </p>
          )}
        </div>
        
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          endorsement.partner.type === 'professional' ? 'bg-blue-100 text-blue-700' :
          endorsement.partner.type === 'influencer' ? 'bg-purple-100 text-purple-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {endorsement.partner.type === 'professional' ? '전문가' :
           endorsement.partner.type === 'influencer' ? '인플루언서' : '기관'}
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">추천 내용</h4>
          <p className="text-gray-700 text-sm italic">"{endorsement.content}"</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">예상 도달:</span>
            <span className="font-medium ml-1">{endorsement.reachEstimate.toLocaleString()}명</span>
          </div>
          <div>
            <span className="text-gray-500">참여율:</span>
            <span className="font-medium ml-1">{endorsement.engagementRate}%</span>
          </div>
        </div>
        
        <div className="pt-3 border-t">
          <h4 className="font-medium text-gray-900 mb-1">법적 공시</h4>
          <p className="text-gray-600 text-xs bg-gray-50 p-2 rounded">
            {endorsement.legalDisclosure}
          </p>
        </div>
        
        <div className="text-xs text-gray-500">
          추천일: {new Date(endorsement.endorsementDate).toLocaleDateString()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">투명성 허브</h1>
        <p className="text-gray-600">모든 정보의 투명한 공개로 신뢰를 구축합니다</p>
      </div>

      {/* 전체 투명성 점수 */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">전체 투명성 점수</h2>
            <p className="text-gray-600">마지막 업데이트: {new Date(transparencyData.lastUpdated).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-green-600 mb-2">{transparencyData.overallScore}</div>
            <div className="text-lg text-gray-600">/ 100점</div>
          </div>
        </div>
      </div>

      {/* 카테고리별 점수 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <ScoreCard 
          title="정보 완성도" 
          score={transparencyData.categories.information}
          icon={<BookOpen className="w-5 h-5 text-blue-600" />}
        />
        <ScoreCard 
          title="전문가 검증" 
          score={transparencyData.categories.verification}
          icon={<Award className="w-5 h-5 text-green-600" />}
        />
        <ScoreCard 
          title="재무 투명성" 
          score={transparencyData.categories.financial}
          icon={<BarChart3 className="w-5 h-5 text-yellow-600" />}
        />
        <ScoreCard 
          title="법적 준수" 
          score={transparencyData.categories.legal}
          icon={<Shield className="w-5 h-5 text-purple-600" />}
        />
        <ScoreCard 
          title="파트너십" 
          score={transparencyData.categories.partnership}
          icon={<Handshake className="w-5 h-5 text-orange-600" />}
        />
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'overview', label: '개요', icon: TrendingUp },
          { id: 'documents', label: '문서', icon: FileText },
          { id: 'experts', label: '전문가 검증', icon: Microscope },
          { id: 'partners', label: '파트너 추천', icon: Users },
          { id: 'compliance', label: '준수 현황', icon: Shield }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'documents' | 'experts' | 'partners' | 'compliance')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">최근 업데이트</h3>
              <div className="space-y-3">
                {transparencyData.updateHistory.map((update, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-gray-900">{update.description}</p>
                      <p className="text-gray-500 text-sm">{new Date(update.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">문서 현황</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>총 문서 수</span>
                    <span className="font-medium">{transparencyData.documents.length}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span>검증된 문서</span>
                    <span className="font-medium text-green-600">
                      {transparencyData.documents.filter(d => d.verified).length}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>총 다운로드</span>
                    <span className="font-medium">
                      {transparencyData.documents.reduce((sum, d) => sum + d.downloads, 0).toLocaleString()}회
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">검증 현황</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>전문가 검증</span>
                    <span className="font-medium">{transparencyData.expertVerifications.length}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span>파트너 추천</span>
                    <span className="font-medium">{transparencyData.partnerEndorsements.length}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span>평균 점수</span>
                    <span className="font-medium text-green-600">
                      {Math.round(transparencyData.expertVerifications.reduce((sum, v) => sum + v.score, 0) / transparencyData.expertVerifications.length)}점
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">공개 문서</h3>
              <span className="text-gray-500">{transparencyData.documents.length}개 문서</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transparencyData.documents.map(document => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'experts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">전문가 검증</h3>
              <span className="text-gray-500">{transparencyData.expertVerifications.length}건 검증</span>
            </div>
            <div className="space-y-6">
              {transparencyData.expertVerifications.map(verification => (
                <ExpertCard key={verification.id} verification={verification} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">파트너 추천</h3>
              <span className="text-gray-500">{transparencyData.partnerEndorsements.length}건 추천</span>
            </div>
            <div className="space-y-6">
              {transparencyData.partnerEndorsements.map(endorsement => (
                <PartnerCard key={endorsement.id} endorsement={endorsement} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">법적 준수 현황</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(transparencyData.complianceStatus).map(([key, status]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">
                      {key === 'securities' ? '증권 관련 법규' :
                       key === 'advertising' ? '광고 심의 기준' :
                       key === 'partnership' ? '파트너십 공시' :
                       '개인정보 보호'}
                    </span>
                    <div className={`flex items-center space-x-1 ${status ? 'text-green-600' : 'text-red-600'}`}>
                      {status ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      <span className="font-medium">{status ? '준수' : '미준수'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-2">투명성 약속</h4>
              <ul className="space-y-1 text-blue-800 text-sm">
                <li>• 모든 파트너십 및 협찬 관계를 명확히 공개합니다</li>
                <li>• 전문가 검증 과정과 결과를 투명하게 공유합니다</li>
                <li>• 재무 정보와 펀딩 사용 계획을 정기적으로 업데이트합니다</li>
                <li>• 관련 법규를 철저히 준수하며 정기적으로 점검합니다</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransparencyHub;