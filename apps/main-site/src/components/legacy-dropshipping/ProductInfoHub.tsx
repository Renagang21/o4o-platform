import { useState, useEffect, FC } from 'react';
import TrustIndicator from '../common/TrustIndicator';
import InformationCard from '../common/InformationCard';
import ExternalResourceWidget, { ExternalResourceList } from '../common/ExternalResourceWidget';

interface ProductBasicInfo {
  id: string;
  name: string;
  category: string;
  price: number;
  supplierPrice: number;
  inventory: number;
  sku: string;
  description: string;
  specifications: Record<string, string>;
}

interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'document' | '3d_model';
  url: string;
  title: string;
  description?: string;
  size?: number;
  format?: string;
}

interface ExternalResource {
  id: string;
  type: 'youtube' | 'blog' | 'article' | 'social' | 'document' | 'external';
  url: string;
  title: string;
  description?: string;
  verified: boolean;
  relevanceScore: number;
  language: string;
  lastChecked: string;
}

interface VerificationData {
  certifications: string[];
  testResults: Array<{
    name: string;
    result: string;
    date: string;
  }>;
  expertReviews: Array<{
    expertName: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

interface CommissionSettings {
  baseCommission: number;
  partnerCommissions: Record<string, number>;
  tierDiscounts: Array<{
    minQuantity: number;
    discount: number;
  }>;
}

interface ProductInfoHubProps {
  productId: string;
  userRole: 'supplier' | 'reseller' | 'partner' | 'customer';
  onSave?: (data: ProductBasicInfo) => void;
  readonly?: boolean;
}

const ProductInfoHub: React.FC<ProductInfoHubProps> = ({
  productId,
  userRole,
  onSave,
  readonly = false
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [basicInfo, setBasicInfo] = useState<ProductBasicInfo | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState({
    basic: 0,
    media: 0,
    external: 0,
    verification: 0,
    partner: 0
  });

  // 정보 완성도 계산
  const calculateCompletion = () => {
    const basic = basicInfo ? (
      Object.keys(basicInfo).filter(key => basicInfo[key as keyof ProductBasicInfo]).length / 8
    ) * 100 : 0;

    const media = mediaAssets.length >= 3 ? 100 : (mediaAssets.length / 3) * 100;
    
    const external = externalResources.length >= 5 ? 100 : (externalResources.length / 5) * 100;
    
    const verification = verificationData ? (
      (verificationData.certifications.length > 0 ? 25 : 0) +
      (verificationData.testResults.length > 0 ? 25 : 0) +
      (verificationData.expertReviews.length > 0 ? 50 : 0)
    ) : 0;

    const partner = commissionSettings ? (
      (commissionSettings.baseCommission > 0 ? 50 : 0) +
      (Object.keys(commissionSettings.partnerCommissions).length > 0 ? 50 : 0)
    ) : 0;

    setCompletionData({ basic, media, external, verification, partner });
  };

  useEffect(() => {
    calculateCompletion();
  }, [basicInfo, mediaAssets, externalResources, verificationData, commissionSettings]);

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-trust-verified';
    if (progress >= 70) return 'bg-trust-pending';
    if (progress >= 50) return 'bg-trust-unverified';
    return 'bg-trust-warning';
  };

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: '📋', progress: completionData.basic },
    { id: 'media', label: '멀티미디어', icon: '🎬', progress: completionData.media },
    { id: 'external', label: '외부 리소스', icon: '🌐', progress: completionData.external },
    { id: 'verification', label: '인증/검증', icon: '✅', progress: completionData.verification },
    ...(userRole === 'supplier' ? [{ id: 'partner', label: '파트너 설정', icon: '🤝', progress: completionData.partner }] : [])
  ];

  const overallCompletion = Math.round(
    Object.values(completionData).reduce((sum, val) => sum + val, 0) / Object.keys(completionData).length
  );

  const renderProgressMeter = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">제품 정보 완성도 체크</h3>
        <div className={`text-2xl font-bold ${overallCompletion >= 90 ? 'text-trust-verified' : overallCompletion >= 70 ? 'text-trust-pending' : 'text-trust-warning'}`}>
          {overallCompletion}%
        </div>
      </div>

      <div className="space-y-3">
        {tabs.map((tab) => (
          <div key={tab.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>{tab.icon}</span>
              <span className="text-sm font-medium text-gray-700">{tab.label}:</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(tab.progress)}`}
                  style={{ width: `${tab.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium w-10 text-right">{Math.round(tab.progress)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button 
          className="text-sm text-o4o-primary-600 hover:text-o4o-primary-700"
          onClick={() => {/* AI 제안 로직 */}}
        >
          AI 제안 받기
        </button>
        <button 
          className="text-sm text-o4o-primary-600 hover:text-o4o-primary-700"
          onClick={() => {/* 부족한 정보 보완 가이드 */}}
        >
          부족한 정보 보완하기
        </button>
      </div>
    </div>
  );

  const renderBasicInfoTab = () => (
    <div className="space-y-6">
      <InformationCard
        title="제품 기본 정보"
        level="basic"
        sources={[
          { type: 'supplier', name: '공급업체', credibility: 95, lastVerified: '2024-06-10' }
        ]}
        lastUpdated="2024-06-14"
        trustScore={92}
        sections={[]}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제품명</label>
            <input
              type="text"
              value={basicInfo?.name || ''}
              onChange={(e) => setBasicInfo(prev => prev ? {...prev, name: e.target.value} : null)}
              disabled={readonly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
            <select
              value={basicInfo?.category || ''}
              onChange={(e) => setBasicInfo(prev => prev ? {...prev, category: e.target.value} : null)}
              disabled={readonly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500 focus:border-transparent"
            >
              <option value="">선택하세요</option>
              <option value="health">건강기능식품</option>
              <option value="beauty">화장품/뷰티</option>
              <option value="medical">의료기기</option>
              <option value="supplement">영양제</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">공급가격</label>
            <input
              type="number"
              value={basicInfo?.supplierPrice || ''}
              onChange={(e) => setBasicInfo(prev => prev ? {...prev, supplierPrice: Number(e.target.value)} : null)}
              disabled={readonly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">권장판매가</label>
            <input
              type="number"
              value={basicInfo?.price || ''}
              onChange={(e) => setBasicInfo(prev => prev ? {...prev, price: Number(e.target.value)} : null)}
              disabled={readonly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">제품 설명</label>
          <textarea
            value={basicInfo?.description || ''}
            onChange={(e) => setBasicInfo(prev => prev ? {...prev, description: e.target.value} : null)}
            disabled={readonly}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500 focus:border-transparent"
          />
        </div>
      </InformationCard>
    </div>
  );

  const renderMediaTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">멀티미디어 자료</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mediaAssets.map((asset) => (
            <div key={asset.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{asset.title}</span>
                <span className="text-xs text-gray-500">{asset.type}</span>
              </div>
              
              {asset.type === 'image' ? (
                <img src={asset.url} alt={asset.title} className="w-full h-32 object-cover rounded" />
              ) : asset.type === 'video' ? (
                <video controls className="w-full h-32 rounded">
                  <source src={asset.url} />
                </video>
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-500">📄 {asset.format}</span>
                </div>
              )}
              
              {asset.description && (
                <p className="text-xs text-gray-600 mt-2">{asset.description}</p>
              )}
            </div>
          ))}
          
          {!readonly && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:border-gray-400">
              <div className="text-center">
                <span className="text-2xl text-gray-400">+</span>
                <p className="text-sm text-gray-500 mt-1">미디어 추가</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderExternalTab = () => (
    <div className="space-y-6">
      <ExternalResourceList
        resources={externalResources}
        title="연결된 외부 리소스"
        maxItems={6}
        groupByType={true}
      />
      
      {!readonly && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">새 리소스 추가</h4>
          <div className="flex items-center space-x-2">
            <input
              type="url"
              placeholder="리소스 URL을 입력하세요"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
            />
            <button className="px-4 py-2 bg-o4o-primary-500 text-white rounded-md hover:bg-o4o-primary-600">
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderVerificationTab = () => (
    <div className="space-y-6">
      <TrustIndicator
        score={92}
        type="product"
        details={{
          verified: true,
          expertReviewed: true,
          userRating: 4.5,
          certifications: verificationData?.certifications || [],
          quality: 90,
          safety: 88,
          satisfaction: 92,
          expert: 94
        }}
        size="large"
      />
      
      {verificationData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">🏆 인증 및 승인</h4>
            <div className="space-y-2">
              {verificationData.certifications.map((cert, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-trust-verified rounded-full"></span>
                  <span className="text-sm text-gray-700">{cert}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">🧪 테스트 결과</h4>
            <div className="space-y-2">
              {verificationData.testResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{test.name}</span>
                  <span className="text-sm font-medium text-trust-verified">{test.result}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPartnerTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">파트너 수수료 설정</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">기본 수수료율 (%)</label>
            <input
              type="number"
              max="35"
              value={commissionSettings?.baseCommission || ''}
              onChange={(e) => setCommissionSettings(prev => prev ? {...prev, baseCommission: Number(e.target.value)} : null)}
              disabled={readonly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">최대 35% (법적 한도)</p>
          </div>
        </div>
        
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600">⚖️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">법적 준수 안내</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• 수수료율은 35% 미만으로 설정해주세요</li>
                <li>• 다단계 구조는 금지되어 있습니다</li>
                <li>• 모든 수수료 정보는 투명하게 공개됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfoTab();
      case 'media':
        return renderMediaTab();
      case 'external':
        return renderExternalTab();
      case 'verification':
        return renderVerificationTab();
      case 'partner':
        return renderPartnerTab();
      default:
        return renderBasicInfoTab();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 정보 완성도 미터 */}
      {renderProgressMeter()}

      {/* 탭 네비게이션 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 px-1 font-medium text-sm focus:outline-none ${
                  activeTab === tab.id
                    ? 'text-o4o-primary-600 border-b-2 border-o4o-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <div className={`w-2 h-2 rounded-full ${getProgressColor(tab.progress)}`} />
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* 저장 버튼 */}
      {!readonly && (
        <div className="flex items-center justify-end space-x-4">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            취소
          </button>
          <button 
            onClick={() => onSave?.({
              basicInfo,
              mediaAssets,
              externalResources,
              verificationData,
              commissionSettings
            })}
            className="px-4 py-2 text-sm font-medium text-white bg-o4o-primary-500 rounded-md hover:bg-o4o-primary-600"
          >
            저장하기
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductInfoHub;