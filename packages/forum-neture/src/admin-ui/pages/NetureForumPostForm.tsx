import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { ArrowLeft, Sparkles, Save, X } from 'lucide-react';

interface PostFormData {
  title: string;
  content: string;
  categoryId: string;
  skinType: '' | 'dry' | 'oily' | 'combination' | 'sensitive';
  concerns: string[];
  routine: string[];
  productIds: string[];
  tags: string[];
}

export default function NetureForumPostForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    categoryId: '00000000-0000-0000-0000-000000000001', // Default category
    skinType: '',
    concerns: [],
    routine: [],
    productIds: [],
    tags: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Temporary input states
  const [routineInput, setRoutineInput] = useState('');
  const [productIdInput, setProductIdInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isEditMode && id) {
      loadPost();
    }
  }, [id, isEditMode]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get(`/neture/forum/posts/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load post');
      }

      const post = response.data.data;
      setFormData({
        title: post.title || '',
        content: post.content || '',
        categoryId: post.categoryId || '00000000-0000-0000-0000-000000000001',
        skinType: post.metadata?.neture?.skinType || '',
        concerns: post.metadata?.neture?.concerns || [],
        routine: post.metadata?.neture?.routine || [],
        productIds: post.metadata?.neture?.productIds || [],
        tags: post.tags || [],
      });
    } catch (err: any) {
      console.error('Error loading post:', err);
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      alert('제목과 내용을 입력해주세요');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: formData.title,
        content: formData.content,
        categoryId: formData.categoryId,
        type: 'discussion',
        tags: formData.tags,
        netureMeta: {
          skinType: formData.skinType || undefined,
          concerns: formData.concerns.length > 0 ? formData.concerns : undefined,
          routine: formData.routine.length > 0 ? formData.routine : undefined,
          productIds: formData.productIds.length > 0 ? formData.productIds : undefined,
        },
      };

      let response;
      if (isEditMode) {
        response = await authClient.api.put(`/neture/forum/posts/${id}`, payload);
      } else {
        response = await authClient.api.post('/neture/forum/posts', payload);
      }

      if (response.data.success) {
        alert(isEditMode ? '게시글이 수정되었습니다' : '게시글이 작성되었습니다');
        window.location.href = `/admin/neture/forum/posts/${response.data.data.id}`;
      } else {
        alert(response.data.error || '저장에 실패했습니다');
      }
    } catch (err: any) {
      console.error('Error saving post:', err);
      alert(err.response?.data?.error || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const addConcern = (concern: string) => {
    if (!formData.concerns.includes(concern)) {
      setFormData({ ...formData, concerns: [...formData.concerns, concern] });
    }
  };

  const removeConcern = (concern: string) => {
    setFormData({
      ...formData,
      concerns: formData.concerns.filter((c) => c !== concern),
    });
  };

  const addRoutineStep = () => {
    if (routineInput.trim()) {
      setFormData({ ...formData, routine: [...formData.routine, routineInput.trim()] });
      setRoutineInput('');
    }
  };

  const removeRoutineStep = (index: number) => {
    setFormData({
      ...formData,
      routine: formData.routine.filter((_, i) => i !== index),
    });
  };

  const addProductId = () => {
    if (productIdInput.trim() && !formData.productIds.includes(productIdInput.trim())) {
      setFormData({ ...formData, productIds: [...formData.productIds, productIdInput.trim()] });
      setProductIdInput('');
    }
  };

  const removeProductId = (productId: string) => {
    setFormData({
      ...formData,
      productIds: formData.productIds.filter((p) => p !== productId),
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const concernOptions = [
    { value: 'acne', label: '여드름' },
    { value: 'wrinkles', label: '주름' },
    { value: 'darkSpots', label: '다크스팟' },
    { value: 'dryness', label: '건조함' },
    { value: 'oilControl', label: '피지조절' },
    { value: 'sensitivity', label: '민감성' },
    { value: 'redness', label: '홍조' },
    { value: 'pores', label: '모공' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게시글 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-pink-500" />
          {isEditMode ? '게시글 수정' : '새 게시글 작성'}
        </h1>
        <p className="text-gray-600">화장품 후기, 루틴, 제품 정보를 공유해주세요</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="게시글 제목을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="내용을 입력하세요"
                required
              />
            </div>
          </div>
        </div>

        {/* Neture Metadata */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">화장품 정보</h3>

          <div className="space-y-4">
            {/* Skin Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                피부 타입
              </label>
              <select
                value={formData.skinType}
                onChange={(e) => setFormData({ ...formData, skinType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">선택 안 함</option>
                <option value="dry">건성</option>
                <option value="oily">지성</option>
                <option value="combination">복합성</option>
                <option value="sensitive">민감성</option>
              </select>
            </div>

            {/* Concerns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                피부 고민
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {concernOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (formData.concerns.includes(option.value)) {
                        removeConcern(option.value);
                      } else {
                        addConcern(option.value);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      formData.concerns.includes(option.value)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {formData.concerns.length > 0 && (
                <div className="text-sm text-gray-600">
                  선택됨: {formData.concerns.length}개
                </div>
              )}
            </div>

            {/* Routine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                루틴 단계
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={routineInput}
                  onChange={(e) => setRoutineInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRoutineStep();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="예: 클렌징"
                />
                <button
                  type="button"
                  onClick={addRoutineStep}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
              {formData.routine.length > 0 && (
                <div className="space-y-2">
                  {formData.routine.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                    >
                      <span className="text-sm">
                        {index + 1}. {step}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRoutineStep(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product IDs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품 ID
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={productIdInput}
                  onChange={(e) => setProductIdInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProductId();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="제품 ID 입력"
                />
                <button
                  type="button"
                  onClick={addProductId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  추가
                </button>
              </div>
              {formData.productIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.productIds.map((productId, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                    >
                      {productId}
                      <button
                        type="button"
                        onClick={() => removeProductId(productId)}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                태그
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="태그 입력 (예: 수분, 각질제거)"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  추가
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-800"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-gray-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : isEditMode ? '수정 완료' : '게시'}
          </button>
        </div>
      </form>
    </div>
  );
}
