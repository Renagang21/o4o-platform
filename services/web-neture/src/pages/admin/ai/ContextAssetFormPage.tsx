/**
 * ContextAssetFormPage - Context Asset 등록/수정 페이지
 *
 * Work Order: WO-AI-CONTEXT-ASSET-MANAGER-V1
 *
 * AI 응답에 노출되는 광고/정보/컨텐츠(Context Asset) 등록 및 수정
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Info,
  Image,
  Link as LinkIcon,
  FileText,
  Tag,
  Settings,
  CheckCircle,
} from 'lucide-react';
import {
  type ContextAssetFormData,
  type AssetType,
  type AssetStatus,
  type ServiceScope,
  type PageType,
  type PurposeTag,
  type ExperimentTag,
  ASSET_TYPE_OPTIONS,
  ASSET_STATUS_OPTIONS,
  SERVICE_SCOPE_OPTIONS,
  PAGE_TYPE_OPTIONS,
  PURPOSE_TAG_OPTIONS,
  EXPERIMENT_TAG_OPTIONS,
  DEFAULT_FORM_DATA,
} from './contextAssetTypes';

// ===== 컴포넌트 =====

// 섹션 헤더
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
    </div>
  );
}

// 멀티 체크박스
function MultiCheckbox<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string; color?: string }>;
  value: T[];
  onChange: (value: T[]) => void;
}) {
  const handleToggle = (optValue: T) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleToggle(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                isSelected
                  ? opt.color || 'bg-primary-100 text-primary-700 border-primary-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function ContextAssetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<ContextAssetFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      // TODO: API 호출로 데이터 로드
      // Mock 데이터 사용
      setTimeout(() => {
        setFormData({
          type: 'product',
          title: '멀티비타민 골드 (30일분)',
          summary: '하루 한 알로 필수 영양소 17종 섭취',
          content: '<p>현대인에게 부족하기 쉬운 비타민과 미네랄을 한 번에...</p>',
          imageUrl: '/images/product-multivitamin.jpg',
          linkUrl: '/products/multivitamin-gold',
          serviceScope: ['all'],
          pageTypes: ['product', 'search'],
          purposeTags: ['conversion', 'information'],
          experimentTags: ['engine-a'],
          status: 'active',
        });
        setLoading(false);
      }, 500);
    }
  }, [isEdit, id]);

  const handleChange = <K extends keyof ContextAssetFormData>(
    field: K,
    value: ContextAssetFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!formData.summary.trim()) {
      alert('요약을 입력해주세요.');
      return;
    }
    if (formData.serviceScope.length === 0) {
      alert('적용 서비스를 선택해주세요.');
      return;
    }
    if (formData.pageTypes.length === 0) {
      alert('적용 페이지를 선택해주세요.');
      return;
    }
    if (formData.purposeTags.length === 0) {
      alert('목적 태그를 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      // TODO: API 호출
      console.log('저장:', formData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate('/admin/ai/context-assets');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/admin/ai/context-assets"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>목록으로</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Eye className="w-4 h-4" />
                미리보기
              </button>
              <button
                type="submit"
                form="asset-form"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? '저장 중...' : isEdit ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Context Asset 수정' : 'Context Asset 등록'}
          </h1>
          <p className="text-gray-500 mt-1">
            AI 응답에 노출될 광고/정보/컨텐츠를 {isEdit ? '수정' : '등록'}합니다.
          </p>
        </div>

        <form id="asset-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 기본 정보 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <SectionHeader
                  icon={FileText}
                  title="기본 정보"
                  description="Asset의 제목, 요약, 본문을 입력합니다."
                />

                <div className="space-y-4">
                  {/* Asset 유형 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asset 유형 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {ASSET_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('type', opt.value)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            formData.type === opt.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{opt.label}</div>
                          <div className="text-xs text-gray-500">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 제목 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제목 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Asset 제목을 입력하세요"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* 요약 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      요약 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => handleChange('summary', e.target.value)}
                      placeholder="AI가 응답에 사용할 짧은 요약을 입력하세요"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* 본문 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      본문 (상세 설명)
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => handleChange('content', e.target.value)}
                      placeholder="상세 설명을 입력하세요 (HTML 사용 가능)"
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 미디어 & 링크 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <SectionHeader
                  icon={Image}
                  title="미디어 & 링크"
                  description="대표 이미지와 연결 URL을 설정합니다."
                />

                <div className="space-y-4">
                  {/* 이미지 URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      대표 이미지 URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.imageUrl}
                        onChange={(e) => handleChange('imageUrl', e.target.value)}
                        placeholder="/images/example.jpg"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* 링크 URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연결 URL
                    </label>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.linkUrl}
                        onChange={(e) => handleChange('linkUrl', e.target.value)}
                        placeholder="/products/example"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 목적 태그 & 실험 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <SectionHeader
                  icon={Tag}
                  title="목적 태그 & 실험"
                  description="Asset의 목적과 실험 그룹을 설정합니다."
                />

                <div className="space-y-6">
                  {/* 목적 태그 */}
                  <MultiCheckbox
                    label="목적 태그 (복수 선택 가능)"
                    options={PURPOSE_TAG_OPTIONS}
                    value={formData.purposeTags}
                    onChange={(value) => handleChange('purposeTags', value)}
                  />

                  {/* 실험 태그 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      실험 태그
                    </label>
                    <select
                      value={formData.experimentTags[0] || 'none'}
                      onChange={(e) =>
                        handleChange('experimentTags', [e.target.value as ExperimentTag])
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {EXPERIMENT_TAG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      동일 Asset을 다른 엔진으로 테스트할 때 사용합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - 1/3 */}
            <div className="space-y-6">
              {/* 상태 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <SectionHeader icon={Settings} title="상태" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset 상태
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as AssetStatus)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {ASSET_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 적용 범위 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <SectionHeader
                  icon={CheckCircle}
                  title="적용 범위"
                  description="어디에 노출할지 설정"
                />

                <div className="space-y-6">
                  {/* 적용 서비스 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      적용 서비스 <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {SERVICE_SCOPE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.serviceScope.includes(opt.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (opt.value === 'all') {
                                  handleChange('serviceScope', ['all']);
                                } else {
                                  handleChange('serviceScope', [
                                    ...formData.serviceScope.filter((s) => s !== 'all'),
                                    opt.value,
                                  ]);
                                }
                              } else {
                                handleChange(
                                  'serviceScope',
                                  formData.serviceScope.filter((s) => s !== opt.value)
                                );
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 적용 페이지 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      적용 페이지 <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {PAGE_TYPE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.pageTypes.includes(opt.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (opt.value === 'all') {
                                  handleChange('pageTypes', ['all']);
                                } else {
                                  handleChange('pageTypes', [
                                    ...formData.pageTypes.filter((p) => p !== 'all'),
                                    opt.value,
                                  ]);
                                }
                              } else {
                                handleChange(
                                  'pageTypes',
                                  formData.pageTypes.filter((p) => p !== opt.value)
                                );
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 도움말 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>등록 후 주의사항</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-blue-700">
                      <li>상태가 '활성'이어야 AI 응답에 노출됩니다</li>
                      <li>적용 범위에 따라 노출되는 서비스/페이지가 결정됩니다</li>
                      <li>실험 태그를 사용하면 엔진별 성능 비교가 가능합니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">미리보기</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* AI 카드 스타일 미리보기 */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {formData.imageUrl && (
                    <div className="h-40 bg-gray-100 flex items-center justify-center">
                      <Image className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="text-xs text-primary-600 font-medium mb-1">
                      {ASSET_TYPE_OPTIONS.find((o) => o.value === formData.type)?.label}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {formData.title || '제목 없음'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {formData.summary || '요약 없음'}
                    </p>
                    {formData.linkUrl && (
                      <a
                        href="#"
                        className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                      >
                        자세히 보기
                        <LinkIcon className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                  <div>
                    <strong>적용 서비스:</strong>{' '}
                    {formData.serviceScope
                      .map((s) => SERVICE_SCOPE_OPTIONS.find((o) => o.value === s)?.label)
                      .join(', ')}
                  </div>
                  <div>
                    <strong>적용 페이지:</strong>{' '}
                    {formData.pageTypes
                      .map((p) => PAGE_TYPE_OPTIONS.find((o) => o.value === p)?.label)
                      .join(', ')}
                  </div>
                  <div>
                    <strong>목적:</strong>{' '}
                    {formData.purposeTags
                      .map((t) => PURPOSE_TAG_OPTIONS.find((o) => o.value === t)?.label)
                      .join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
