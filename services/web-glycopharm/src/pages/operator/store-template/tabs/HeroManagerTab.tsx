/**
 * Hero Manager Tab
 *
 * 운영자 Hero 콘텐츠 관리
 * - Hero 목록 조회 (API 연동)
 * - 신규 Hero 등록
 * - 활성/비활성 토글
 * - 순서 조정 (up/down)
 *
 * WO-O4O-STOREFRONT-ACTIVATION-V1 Phase 2
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Image,
  X,
  Loader2,
} from 'lucide-react';
import type { HeroContent } from '@/types/store';
import { storeApi } from '@/api/store';

interface HeroFormData {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
}

const INITIAL_FORM: HeroFormData = {
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaText: '자세히 보기',
  ctaLink: '',
};

interface HeroManagerTabProps {
  pharmacySlug?: string;
}

export function HeroManagerTab({ pharmacySlug }: HeroManagerTabProps) {
  const [heroContents, setHeroContents] = useState<HeroContent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HeroFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load hero contents from API
  useEffect(() => {
    if (!pharmacySlug) return;
    setLoading(true);
    storeApi.getStoreHero(pharmacySlug)
      .then((res) => {
        if (res.success && res.data) {
          setHeroContents(res.data);
        }
      })
      .catch((err) => console.error('Failed to load hero contents:', err))
      .finally(() => setLoading(false));
  }, [pharmacySlug]);

  // Save hero contents to API
  const saveToApi = useCallback(async (contents: HeroContent[]) => {
    if (!pharmacySlug) return;
    setSaving(true);
    try {
      await storeApi.updateStoreHero(pharmacySlug, contents);
    } catch (err) {
      console.error('Failed to save hero contents:', err);
    } finally {
      setSaving(false);
    }
  }, [pharmacySlug]);

  // 순서 변경
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newContents = [...heroContents];
    [newContents[index - 1], newContents[index]] = [newContents[index], newContents[index - 1]];
    newContents.forEach((item, i) => (item.priority = i + 1));
    setHeroContents(newContents);
    saveToApi(newContents);
  };

  const moveDown = (index: number) => {
    if (index === heroContents.length - 1) return;
    const newContents = [...heroContents];
    [newContents[index], newContents[index + 1]] = [newContents[index + 1], newContents[index]];
    newContents.forEach((item, i) => (item.priority = i + 1));
    setHeroContents(newContents);
    saveToApi(newContents);
  };

  // 활성화 토글
  const toggleActive = (id: string) => {
    const newContents = heroContents.map((item) =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    setHeroContents(newContents);
    saveToApi(newContents);
  };

  // 삭제
  const deleteHero = (id: string) => {
    if (confirm('이 Hero를 삭제하시겠습니까?')) {
      const newContents = heroContents.filter((item) => item.id !== id);
      setHeroContents(newContents);
      saveToApi(newContents);
    }
  };

  // 편집 모달 열기
  const openEditModal = (hero: HeroContent) => {
    setEditingId(hero.id);
    setForm({
      title: hero.title,
      subtitle: hero.subtitle || '',
      imageUrl: hero.imageUrl || '',
      ctaText: hero.ctaText || '',
      ctaLink: hero.ctaLink || '',
    });
    setIsModalOpen(true);
  };

  // 신규 등록 모달 열기
  const openCreateModal = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  };

  // 저장
  const handleSave = () => {
    if (!form.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    let newContents: HeroContent[];

    if (editingId) {
      newContents = heroContents.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: form.title,
              subtitle: form.subtitle || undefined,
              imageUrl: form.imageUrl || undefined,
              ctaText: form.ctaText || undefined,
              ctaLink: form.ctaLink || undefined,
            }
          : item
      );
    } else {
      const newHero: HeroContent = {
        id: `hero-${Date.now()}`,
        source: 'operator',
        title: form.title,
        subtitle: form.subtitle || undefined,
        imageUrl: form.imageUrl || undefined,
        ctaText: form.ctaText || undefined,
        ctaLink: form.ctaLink || undefined,
        isActive: true,
        priority: heroContents.length + 1,
      };
      newContents = [...heroContents, newHero];
    }

    setHeroContents(newContents);
    saveToApi(newContents);
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 액션 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          총 <strong>{heroContents.length}</strong>개의 Hero 콘텐츠
          {saving && <span className="ml-2 text-xs text-slate-400">저장 중...</span>}
        </p>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 Hero 등록
        </button>
      </div>

      {/* Hero 목록 */}
      <div className="space-y-3">
        {heroContents.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">등록된 Hero가 없습니다.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-primary-600 hover:underline text-sm"
            >
              첫 번째 Hero 등록하기
            </button>
          </div>
        ) : (
          heroContents.map((hero, index) => (
            <div
              key={hero.id}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-colors
                ${hero.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}
              `}
            >
              {/* 순서 */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === heroContents.length - 1}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* 썸네일 */}
              <div className="w-24 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                {hero.imageUrl ? (
                  <img
                    src={hero.imageUrl}
                    alt={hero.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-slate-300" />
                  </div>
                )}
              </div>

              {/* 콘텐츠 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                    #{hero.priority}
                  </span>
                  <h3 className="font-medium text-slate-800 truncate">{hero.title}</h3>
                </div>
                {hero.subtitle && (
                  <p className="text-sm text-slate-500 truncate mt-1">{hero.subtitle}</p>
                )}
                {hero.ctaLink && (
                  <a
                    href={hero.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 flex items-center gap-1 mt-1 hover:underline"
                  >
                    {hero.ctaText || '링크'} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* 액션 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(hero.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    hero.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  title={hero.isActive ? '비활성화' : '활성화'}
                >
                  {hero.isActive ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => openEditModal(hero)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="편집"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteHero(hero.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 등록/편집 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? 'Hero 편집' : '새 Hero 등록'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Hero 제목을 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  설명 (선택)
                </label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="부가 설명을 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이미지 URL (선택)
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    버튼 텍스트 (선택)
                  </label>
                  <input
                    type="text"
                    value={form.ctaText}
                    onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                    placeholder="자세히 보기"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    버튼 링크 (선택)
                  </label>
                  <input
                    type="text"
                    value={form.ctaLink}
                    onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                    placeholder="/store/demo/products"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingId ? '저장' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
