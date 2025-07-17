import React, { useState } from 'react';

interface InfoSource {
  type: 'supplier' | 'expert' | 'user' | 'external';
  name: string;
  credibility: number;
  lastVerified: string;
}

interface InfoSection {
  type: 'technical' | 'safety' | 'usage' | 'reviews';
  title: string;
  icon: string;
  content: React.ReactNode;
  isExpanded?: boolean;
}

interface InformationCardProps {
  title: string;
  level: 'basic' | 'detailed' | 'expert';
  sources: InfoSource[];
  lastUpdated: string;
  trustScore: number;
  sections: InfoSection[];
  children?: React.ReactNode;
}

const InformationCard: React.FC<InformationCardProps> = ({
  title,
  level,
  sources,
  lastUpdated,
  trustScore,
  sections,
  children
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const getLevelColor = () => {
    switch (level) {
      case 'basic':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'detailed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'expert':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'supplier':
        return '🏭';
      case 'expert':
        return '👨‍⚕️';
      case 'user':
        return '👤';
      case 'external':
        return '🌐';
      default:
        return '📋';
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-trust-verified bg-trust-verified bg-opacity-10';
    if (score >= 70) return 'text-trust-pending bg-trust-pending bg-opacity-10';
    return 'text-trust-unverified bg-trust-unverified bg-opacity-10';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelColor()}`}>
              {level.toUpperCase()}
            </span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTrustScoreColor(trustScore)}`}>
            📊 신뢰도: {trustScore}
          </div>
        </div>
      </div>

      {/* 기본 콘텐츠 */}
      {children && (
        <div className="p-4 border-b border-gray-100">
          {children}
        </div>
      )}

      {/* Progressive Disclosure 섹션들 */}
      <div className="divide-y divide-gray-100">
        {sections.map((section, index) => (
          <div key={index}>
            <button
              onClick={() => toggleSection(index)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{section.icon}</span>
                  <span className="font-medium text-gray-900">{section.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {expandedSections.has(index) ? (
                    <span className="text-gray-400">▼</span>
                  ) : (
                    <span className="text-gray-400">▶</span>
                  )}
                </div>
              </div>
            </button>

            {/* 확장된 섹션 콘텐츠 */}
            {expandedSections.has(index) && (
              <div className="px-4 pb-4 animate-fade-in-up">
                <div className="bg-gray-50 rounded-lg p-4">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 푸터 - 메타 정보 */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex flex-col space-y-3">
          {/* 정보 출처 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">📖 정보 출처</h4>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <div 
                  key={index}
                  className="inline-flex items-center space-x-2 px-2 py-1 bg-white rounded-md border border-gray-200 text-xs"
                >
                  <span>{getSourceTypeIcon(source.type)}</span>
                  <span className="font-medium">{source.name}</span>
                  <span className="text-gray-500">
                    신뢰도 {source.credibility}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 최종 업데이트 */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>📅 최종 업데이트: {lastUpdated}</span>
            <span>✅ 정보 검증 완료</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 개별 정보 섹션 컴포넌트들
interface TechnicalData {
  specifications?: string[];
  features?: string[];
}

export const TechnicalInfoSection: React.FC<{ data: TechnicalData }> = ({ data }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h5 className="font-medium text-info-technical mb-2">핵심 사양</h5>
        <ul className="space-y-1 text-sm text-gray-700">
          {data.specifications?.map((spec: string, index: number) => (
            <li key={index} className="flex items-start">
              <span className="w-1.5 h-1.5 bg-info-technical rounded-full mt-2 mr-2 flex-shrink-0" />
              {spec}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h5 className="font-medium text-info-technical mb-2">기술적 특징</h5>
        <ul className="space-y-1 text-sm text-gray-700">
          {data.features?.map((feature: string, index: number) => (
            <li key={index} className="flex items-start">
              <span className="w-1.5 h-1.5 bg-info-technical rounded-full mt-2 mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

interface SafetyTest {
  name: string;
  result: string;
}

interface SafetyData {
  safetyTests?: SafetyTest[];
  warnings?: string[];
}

export const SafetyInfoSection: React.FC<{ data: SafetyData }> = ({ data }) => (
  <div className="space-y-3">
    <div className="bg-info-safety bg-opacity-10 border border-info-safety border-opacity-20 rounded-lg p-3">
      <h5 className="font-medium text-info-safety mb-2">🛡️ 안전성 데이터</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {data.safetyTests?.map((test, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-gray-700">{test.name}:</span>
            <span className="font-medium text-info-safety">{test.result}</span>
          </div>
        ))}
      </div>
    </div>
    
    {data.warnings && data.warnings.length > 0 && (
      <div className="bg-trust-warning bg-opacity-10 border border-trust-warning border-opacity-20 rounded-lg p-3">
        <h5 className="font-medium text-trust-warning mb-2">⚠️ 주의사항</h5>
        <ul className="space-y-1 text-sm text-gray-700">
          {data.warnings.map((warning: string, index: number) => (
            <li key={index} className="flex items-start">
              <span className="w-1.5 h-1.5 bg-trust-warning rounded-full mt-2 mr-2 flex-shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

interface UsageInstruction {
  title: string;
  description: string;
}

interface UsageData {
  instructions?: UsageInstruction[];
  tips?: string[];
}

export const UsageInfoSection: React.FC<{ data: UsageData }> = ({ data }) => (
  <div className="space-y-3">
    <div>
      <h5 className="font-medium text-info-usage mb-2">📋 사용법 안내</h5>
      <div className="space-y-2">
        {data.instructions?.map((instruction, index) => (
          <div key={index} className="flex items-start space-x-3">
            <span className="flex items-center justify-center w-6 h-6 bg-info-usage text-white text-xs font-bold rounded-full flex-shrink-0">
              {index + 1}
            </span>
            <div>
              <h6 className="font-medium text-gray-900">{instruction.title}</h6>
              <p className="text-sm text-gray-600">{instruction.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {data.tips && (
      <div className="bg-info-usage bg-opacity-10 border border-info-usage border-opacity-20 rounded-lg p-3">
        <h5 className="font-medium text-info-usage mb-2">💡 사용 팁</h5>
        <ul className="space-y-1 text-sm text-gray-700">
          {data.tips.map((tip: string, index: number) => (
            <li key={index} className="flex items-start">
              <span className="w-1.5 h-1.5 bg-info-usage rounded-full mt-2 mr-2 flex-shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default InformationCard;