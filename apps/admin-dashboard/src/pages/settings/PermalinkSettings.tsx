import { FC, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Link, Eye, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

interface PermalinkSettings {
  structure: string;
  categoryBase: string;
  tagBase: string;
  customStructures?: {
    post?: string;
    page?: string;
    category?: string;
    tag?: string;
  };
  removeStopWords: boolean;
  maxUrlLength: number;
  autoFlushRules: boolean;
  enableSeoWarnings: boolean;
}

interface UrlPreview {
  type: string;
  example: string;
  seoScore: number;
  warnings: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const PermalinkSettings: FC = () => {
  const [selectedStructure, setSelectedStructure] = useState('/%postname%/');
  const [customStructure, setCustomStructure] = useState('');
  const [categoryBase, setCategoryBase] = useState('category');
  const [tagBase, setTagBase] = useState('tag');
  const [removeStopWords, setRemoveStopWords] = useState(false);
  const [maxUrlLength, setMaxUrlLength] = useState(75);
  const [autoFlushRules, setAutoFlushRules] = useState(true);
  const [enableSeoWarnings, setEnableSeoWarnings] = useState(true);
  const [previews, setPreviews] = useState<UrlPreview[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const queryClient = useQueryClient();

  // 공통 구조 옵션 (보완된 버전)
  const commonStructures = [
    { 
      value: '/%postname%/', 
      label: '글 이름', 
      example: '/sample-post/',
      description: 'SEO에 가장 친화적 (권장)',
      seoRating: 'excellent'
    },
    { 
      value: '/%category%/%postname%/', 
      label: '카테고리와 이름', 
      example: '/technology/sample-post/',
      description: '구조화된 콘텐츠에 적합',
      seoRating: 'good'
    },
    { 
      value: '/%year%/%monthnum%/%postname%/', 
      label: '년/월/이름', 
      example: '/2025/09/sample-post/',
      description: '시간 순서가 중요한 콘텐츠',
      seoRating: 'warning'
    },
    { 
      value: '/%year%/%monthnum%/%day%/%postname%/', 
      label: '전체 날짜와 이름', 
      example: '/2025/09/18/sample-post/',
      description: '뉴스나 일일 콘텐츠용',
      seoRating: 'warning'
    },
    { 
      value: '/archives/%post_id%', 
      label: '숫자형', 
      example: '/archives/123',
      description: '간단하지만 SEO에 불리',
      seoRating: 'poor'
    }
  ];

  // 설정 조회 (백엔드에서 DB 또는 기본값 반환)
  const { data: settings, isLoading } = useQuery<PermalinkSettings>({
    queryKey: ['permalink-settings'],
    queryFn: async () => {
      const response = await authClient.api.get('/settings/permalink');
      return response.data?.data || response.data as PermalinkSettings;
    }
  });

  useEffect(() => {
    if (settings) {
      setSelectedStructure(settings.structure || '/%postname%/');
      setCategoryBase(settings.categoryBase || 'category');
      setTagBase(settings.tagBase || 'tag');
      setRemoveStopWords(!!settings.removeStopWords);
      setMaxUrlLength(settings.maxUrlLength || 75);
      setAutoFlushRules(settings.autoFlushRules !== undefined ? settings.autoFlushRules : true);
      setEnableSeoWarnings(settings.enableSeoWarnings !== undefined ? settings.enableSeoWarnings : true);
    }
  }, [settings]);

  // 설정 저장
  const saveMutation = useMutation({
    mutationFn: async (newSettings: PermalinkSettings) => {
      const response = await authClient.api.put('/settings/permalink', newSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permalink-settings'] });
    }
  });

  // 미리보기 생성
  const previewMutation = useMutation({
    mutationFn: async (structure: string) => {
      const response = await authClient.api.post('/settings/permalink/preview', { structure });
      return response.data.data as UrlPreview[];
    },
    onSuccess: (data) => {
      setPreviews(data);
    }
  });

  // 검증
  const validateMutation = useMutation({
    mutationFn: async (settings: PermalinkSettings) => {
      const response = await authClient.api.post('/settings/permalink/validate', settings);
      return response.data.data as ValidationResult;
    },
    onSuccess: (data) => {
      setValidation(data);
    }
  });

  // 구조 변경 시 미리보기 업데이트
  useEffect(() => {
    const currentStructure = selectedStructure === 'custom' ? customStructure : selectedStructure;
    if (currentStructure) {
      previewMutation.mutate(currentStructure);
    }
  }, [selectedStructure, customStructure]);

  // 설정 변경 시 검증
  useEffect(() => {
    if (selectedStructure && categoryBase && tagBase) {
      const currentSettings: PermalinkSettings = {
        structure: selectedStructure === 'custom' ? customStructure : selectedStructure,
        categoryBase,
        tagBase,
        removeStopWords,
        maxUrlLength,
        autoFlushRules,
        enableSeoWarnings
      };
      validateMutation.mutate(currentSettings);
    }
  }, [selectedStructure, customStructure, categoryBase, tagBase, removeStopWords, maxUrlLength, autoFlushRules, enableSeoWarnings]);

  const handleSave = () => {
    const currentSettings: PermalinkSettings = {
      structure: selectedStructure === 'custom' ? customStructure : selectedStructure,
      categoryBase,
      tagBase,
      removeStopWords,
      maxUrlLength,
      autoFlushRules,
      enableSeoWarnings
    };
    saveMutation.mutate(currentSettings);
  };

  const getSeoRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeoRatingIcon = (rating: string) => {
    switch (rating) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'good': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'poor': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="o4o-card">
        <div className="o4o-card-body">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">설정을 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="o4o-card">
        <div className="o4o-card-header">
          <div className="flex items-center space-x-2">
            <Link className="w-5 h-5 text-blue-600" />
            <h2>고유주소 설정</h2>
          </div>
          <p className="text-o4o-text-secondary mt-1">
            게시글과 페이지의 URL 구조를 설정합니다. SEO와 사용자 경험에 중요한 영향을 줍니다.
          </p>
        </div>
        
        <div className="o4o-card-body space-y-6">
          {/* 공통 구조 선택 */}
          <div>
            <h3 className="font-medium mb-4 flex items-center space-x-2">
              <span>URL 구조 선택</span>
              {enableSeoWarnings && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">SEO 평가 활성화됨</span>}
            </h3>
            <div className="space-y-3">
              {commonStructures.map((item) => (
                <label key={item.value} className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    id={`structure-${item.value.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    name="structure"
                    value={item.value}
                    checked={selectedStructure === item.value}
                    onChange={(e) => setSelectedStructure(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.label}</span>
                        {enableSeoWarnings && getSeoRatingIcon(item.seoRating)}
                      </div>
                      <span className="text-sm text-gray-500 font-mono">{item.example}</span>
                    </div>
                    <p className={`text-sm mt-1 ${enableSeoWarnings ? getSeoRatingColor(item.seoRating) : 'text-gray-600'}`}>
                      {item.description}
                    </p>
                  </div>
                </label>
              ))}
              
              {/* 사용자 정의 */}
              <label className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  id="structure-custom"
                  name="structure"
                  value="custom"
                  checked={selectedStructure === 'custom'}
                  onChange={() => setSelectedStructure('custom')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium">사용자 정의 구조</span>
                  <p className="text-sm text-gray-600 mt-1">원하는 URL 패턴을 직접 입력하세요</p>
                </div>
              </label>
            </div>
            
            {selectedStructure === 'custom' && (
              <div className="mt-4 pl-6">
                <input
                  type="text"
                  id="custom-structure"
                  name="custom-structure"
                  value={customStructure}
                  onChange={(e) => setCustomStructure(e.target.value)}
                  placeholder="예: /%year%/%monthnum%/%postname%/"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                />
                <div className="mt-2 text-sm text-gray-500">
                  <p>사용 가능한 태그:</p>
                  <p className="font-mono">%year%, %monthnum%, %day%, %postname%, %post_id%, %category%, %author%</p>
                </div>
              </div>
            )}
          </div>

          {/* 카테고리 및 태그 베이스 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category-base" className="block text-sm font-medium mb-2">카테고리 베이스</label>
              <input
                type="text"
                id="category-base"
                name="category-base"
                value={categoryBase}
                onChange={(e) => setCategoryBase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">예: /category/news/</p>
            </div>
            
            <div>
              <label htmlFor="tag-base" className="block text-sm font-medium mb-2">태그 베이스</label>
              <input
                type="text"
                id="tag-base"
                name="tag-base"
                value={tagBase}
                onChange={(e) => setTagBase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">예: /tag/technology/</p>
            </div>
          </div>

          {/* 고급 옵션 */}
          <div>
            <h4 className="font-medium mb-3">고급 설정</h4>
            <div className="space-y-4">
              <label htmlFor="remove-stop-words" className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="remove-stop-words"
                  name="remove-stop-words"
                  checked={removeStopWords}
                  onChange={(e) => setRemoveStopWords(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="text-sm font-medium">불용어 자동 제거</span>
                  <p className="text-xs text-gray-500">URL에서 "the", "and" 등 불필요한 단어를 제거합니다</p>
                </div>
              </label>

              <div>
                <label htmlFor="max-url-length" className="block text-sm font-medium mb-2">
                  최대 URL 길이 ({maxUrlLength}자)
                </label>
                <input
                  type="range"
                  id="max-url-length"
                  name="max-url-length"
                  min="30"
                  max="200"
                  value={maxUrlLength}
                  onChange={(e) => setMaxUrlLength(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>30자</span>
                  <span>권장: 75자 이하</span>
                  <span>200자</span>
                </div>
              </div>

              <label htmlFor="auto-flush-rules" className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="auto-flush-rules"
                  name="auto-flush-rules"
                  checked={autoFlushRules}
                  onChange={(e) => setAutoFlushRules(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="text-sm font-medium">자동 URL 규칙 갱신</span>
                  <p className="text-xs text-gray-500">설정 변경 시 자동으로 리다이렉트 규칙을 업데이트합니다</p>
                </div>
              </label>

              <label htmlFor="enable-seo-warnings" className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="enable-seo-warnings"
                  name="enable-seo-warnings"
                  checked={enableSeoWarnings}
                  onChange={(e) => setEnableSeoWarnings(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="text-sm font-medium">SEO 경고 표시</span>
                  <p className="text-xs text-gray-500">SEO에 영향을 줄 수 있는 설정에 대한 경고를 표시합니다</p>
                </div>
              </label>
            </div>
          </div>

          {/* URL 미리보기 */}
          {previews.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>URL 미리보기</span>
              </h4>
              <div className="bg-gray-50 p-4 rounded space-y-3">
                {previews.map((preview, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600">{preview.type}:</span> 
                      <span className="ml-2 font-mono text-sm">{preview.example}</span>
                    </div>
                    {enableSeoWarnings && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-200">
                          SEO: {preview.seoScore}점
                        </span>
                        {preview.warnings.length > 0 && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 검증 결과 */}
          {validation && !validation.valid && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-start">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="font-medium text-red-800">설정 오류</h4>
                  <ul className="text-sm text-red-700 mt-1 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 경고 메시지 */}
          {enableSeoWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="font-medium text-yellow-800">SEO 최적화 팁</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• <strong>날짜 포함 주의:</strong> 에버그린 콘텐츠는 날짜가 없는 구조를 사용하세요</li>
                    <li>• <strong>URL 길이:</strong> 75자 이하로 유지하면 검색 결과에서 완전히 표시됩니다</li>
                    <li>• <strong>구조 변경:</strong> 기존 URL이 변경되므로 외부 링크에 영향을 줄 수 있습니다</li>
                    <li>• <strong>자동 리다이렉트:</strong> 301 리다이렉트가 자동 설정되지만 확인이 필요합니다</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
            <button 
              onClick={handleSave}
              disabled={saveMutation.isPending || !!(validation && !validation.valid)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>

          {saveMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-green-800">고유주소 설정이 성공적으로 저장되었습니다.</span>
              </div>
            </div>
          )}

          {saveMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-3" />
                <span className="text-red-800">설정 저장에 실패했습니다. 다시 시도해 주세요.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermalinkSettings;
