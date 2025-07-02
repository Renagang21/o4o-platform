import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Globe,
  Tag,
  Eye,
  Camera,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  customMeta?: Array<{
    name: string;
    content: string;
    type: 'name' | 'property' | 'httpEquiv';
  }>;
}

interface SEOMetadataManagerProps {
  metadata?: SEOMetadata;
  onChange: (metadata: SEOMetadata) => void;
  contentType?: 'page' | 'post' | 'product' | 'notice';
  slug?: string;
}

const SEOMetadataManager: React.FC<SEOMetadataManagerProps> = ({
  metadata = {
    title: '',
    description: '',
    keywords: [],
    ogType: 'article',
    noIndex: false,
    noFollow: false,
    customMeta: []
  },
  onChange,
  contentType = 'page',
  slug = ''
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'social' | 'advanced'>('basic');
  const [keywordInput, setKeywordInput] = useState('');
  const [customMetaInput, setCustomMetaInput] = useState({ name: '', content: '', type: 'name' as const });
  const [seoScore, setSeoScore] = useState(0);
  const [seoIssues, setSeoIssues] = useState<string[]>([]);

  // SEO 점수 계산
  useEffect(() => {
    calculateSEOScore();
  }, [metadata]);

  const calculateSEOScore = () => {
    let score = 0;
    const issues: string[] = [];

    // 제목 검사 (25점)
    if (metadata.title) {
      if (metadata.title.length >= 30 && metadata.title.length <= 60) {
        score += 25;
      } else if (metadata.title.length > 0) {
        score += 15;
        if (metadata.title.length < 30) {
          issues.push('제목이 너무 짧습니다 (30자 이상 권장)');
        } else {
          issues.push('제목이 너무 깁니다 (60자 이하 권장)');
        }
      }
    } else {
      issues.push('제목이 설정되지 않았습니다');
    }

    // 설명 검사 (25점)
    if (metadata.description) {
      if (metadata.description.length >= 120 && metadata.description.length <= 160) {
        score += 25;
      } else if (metadata.description.length > 0) {
        score += 15;
        if (metadata.description.length < 120) {
          issues.push('설명이 너무 짧습니다 (120자 이상 권장)');
        } else {
          issues.push('설명이 너무 깁니다 (160자 이하 권장)');
        }
      }
    } else {
      issues.push('설명이 설정되지 않았습니다');
    }

    // 키워드 검사 (15점)
    if (metadata.keywords.length > 0) {
      if (metadata.keywords.length <= 10) {
        score += 15;
      } else {
        score += 10;
        issues.push('키워드가 너무 많습니다 (10개 이하 권장)');
      }
    } else {
      issues.push('키워드가 설정되지 않았습니다');
    }

    // OG 이미지 검사 (15점)
    if (metadata.ogImage) {
      score += 15;
    } else {
      issues.push('소셜 미디어 이미지가 설정되지 않았습니다');
    }

    // 정규 URL 검사 (10점)
    if (metadata.canonicalUrl) {
      score += 10;
    } else {
      issues.push('정규 URL이 설정되지 않았습니다');
    }

    // OG 제목/설명 검사 (10점)
    if (metadata.ogTitle && metadata.ogDescription) {
      score += 10;
    } else {
      if (!metadata.ogTitle) issues.push('소셜 미디어 제목이 설정되지 않았습니다');
      if (!metadata.ogDescription) issues.push('소셜 미디어 설명이 설정되지 않았습니다');
    }

    setSeoScore(score);
    setSeoIssues(issues);
  };

  // 키워드 추가
  const addKeyword = () => {
    if (keywordInput.trim() && !metadata.keywords.includes(keywordInput.trim())) {
      onChange({
        ...metadata,
        keywords: [...metadata.keywords, keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  // 키워드 제거
  const removeKeyword = (index: number) => {
    onChange({
      ...metadata,
      keywords: metadata.keywords.filter((_, i) => i !== index)
    });
  };

  // 커스텀 메타 추가
  const addCustomMeta = () => {
    if (customMetaInput.name && customMetaInput.content) {
      onChange({
        ...metadata,
        customMeta: [...(metadata.customMeta || []), { ...customMetaInput }]
      });
      setCustomMetaInput({ name: '', content: '', type: 'name' });
    }
  };

  // 커스텀 메타 제거
  const removeCustomMeta = (index: number) => {
    onChange({
      ...metadata,
      customMeta: (metadata.customMeta || []).filter((_, i) => i !== index)
    });
  };

  // SEO 점수 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // SEO 점수 배경색
  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* SEO 점수 대시보드 */}
      <motion.div 
        className="bg-white rounded-lg border p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            SEO 점수
          </h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getScoreBgColor(seoScore)}`}>
            <TrendingUp className={`w-4 h-4 ${getScoreColor(seoScore)}`} />
            <span className={`font-bold ${getScoreColor(seoScore)}`}>
              {seoScore}/100
            </span>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              seoScore >= 80 ? 'bg-green-500' : 
              seoScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${seoScore}%` }}
          />
        </div>

        {/* 이슈 목록 */}
        {seoIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              개선 사항
            </h4>
            <div className="space-y-1">
              {seoIssues.map((issue, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  {issue}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'basic', name: '기본 SEO', icon: Search },
            { id: 'social', name: '소셜 미디어', icon: Globe },
            { id: 'advanced', name: '고급 설정', icon: Info }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 기본 SEO 탭 */}
      {activeTab === 'basic' && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SEO 제목
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => onChange({ ...metadata, title: e.target.value })}
              placeholder="검색 결과에 표시될 제목을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={60}
            />
            <div className="mt-1 text-xs text-gray-500 flex justify-between">
              <span>검색 결과에서 클릭률을 높이는 매력적인 제목을 작성하세요</span>
              <span>{metadata.title.length}/60</span>
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메타 설명
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => onChange({ ...metadata, description: e.target.value })}
              placeholder="검색 결과에 표시될 설명을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={160}
            />
            <div className="mt-1 text-xs text-gray-500 flex justify-between">
              <span>사용자가 클릭하고 싶게 만드는 명확하고 매력적인 설명을 작성하세요</span>
              <span>{metadata.description.length}/160</span>
            </div>
          </div>

          {/* 키워드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              키워드
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="키워드를 입력하고 Enter를 누르세요"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addKeyword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {keyword}
                  <button
                    onClick={() => removeKeyword(index)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              콘텐츠와 관련된 주요 키워드를 추가하세요 (10개 이하 권장)
            </p>
          </div>
        </motion.div>
      )}

      {/* 소셜 미디어 탭 */}
      {activeTab === 'social' && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Open Graph 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소셜 미디어 제목 (Open Graph)
            </label>
            <input
              type="text"
              value={metadata.ogTitle || ''}
              onChange={(e) => onChange({ ...metadata, ogTitle: e.target.value })}
              placeholder="소셜 미디어에서 표시될 제목 (비워두면 SEO 제목 사용)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Open Graph 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소셜 미디어 설명 (Open Graph)
            </label>
            <textarea
              value={metadata.ogDescription || ''}
              onChange={(e) => onChange({ ...metadata, ogDescription: e.target.value })}
              placeholder="소셜 미디어에서 표시될 설명 (비워두면 메타 설명 사용)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Open Graph 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소셜 미디어 이미지 (Open Graph)
            </label>
            <input
              type="url"
              value={metadata.ogImage || ''}
              onChange={(e) => onChange({ ...metadata, ogImage: e.target.value })}
              placeholder="이미지 URL (1200x630px 권장)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {metadata.ogImage && (
              <div className="mt-2">
                <img
                  src={metadata.ogImage}
                  alt="소셜 미디어 미리보기"
                  className="w-full max-w-md h-32 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Facebook, Twitter, LinkedIn 등에서 공유될 때 표시되는 이미지입니다
            </p>
          </div>

          {/* Open Graph 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              콘텐츠 타입
            </label>
            <select
              value={metadata.ogType || 'article'}
              onChange={(e) => onChange({ ...metadata, ogType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="website">웹사이트</option>
              <option value="article">아티클</option>
              <option value="product">제품</option>
              <option value="profile">프로필</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* 고급 설정 탭 */}
      {activeTab === 'advanced' && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* 정규 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정규 URL (Canonical URL)
            </label>
            <input
              type="url"
              value={metadata.canonicalUrl || ''}
              onChange={(e) => onChange({ ...metadata, canonicalUrl: e.target.value })}
              placeholder={`https://example.com/${slug || 'page-url'}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              중복 콘텐츠 문제를 방지하기 위한 표준 URL을 설정합니다
            </p>
          </div>

          {/* 로봇 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색 엔진 설정
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={metadata.noIndex || false}
                  onChange={(e) => onChange({ ...metadata, noIndex: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">이 페이지를 검색 결과에서 제외 (noindex)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={metadata.noFollow || false}
                  onChange={(e) => onChange({ ...metadata, noFollow: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">이 페이지의 링크를 추적하지 않음 (nofollow)</span>
              </label>
            </div>
          </div>

          {/* 커스텀 메타 태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              커스텀 메타 태그
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={customMetaInput.type}
                  onChange={(e) => setCustomMetaInput(prev => ({ ...prev, type: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">name</option>
                  <option value="property">property</option>
                  <option value="httpEquiv">http-equiv</option>
                </select>
                <input
                  type="text"
                  value={customMetaInput.name}
                  onChange={(e) => setCustomMetaInput(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="메타 이름"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={customMetaInput.content}
                  onChange={(e) => setCustomMetaInput(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="메타 값"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addCustomMeta}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  추가
                </button>
              </div>

              {/* 커스텀 메타 목록 */}
              {(metadata.customMeta || []).length > 0 && (
                <div className="space-y-2">
                  {(metadata.customMeta || []).map((meta, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                      <code className="text-sm font-mono flex-1">
                        &lt;meta {meta.type}="{meta.name}" content="{meta.content}" /&gt;
                      </code>
                      <button
                        onClick={() => removeCustomMeta(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SEOMetadataManager;