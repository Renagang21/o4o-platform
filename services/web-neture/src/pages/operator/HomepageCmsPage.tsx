/**
 * HomepageCmsPage — 운영자 홈페이지 CMS 관리
 * WO-O4O-NETURE-HOMEPAGE-CMS-V1
 *
 * 탭: Hero Slides | Homepage Ads | Partner Logos
 * 기능: 등록 / 수정 / 삭제 / 발행 / 순서 변경
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, X, Image } from 'lucide-react';
import { homepageCmsApi, type CmsContent } from '../../lib/api/content';

type Section = 'hero' | 'ads' | 'logos';

const TABS: { key: Section; label: string }[] = [
  { key: 'hero', label: 'Hero Slides' },
  { key: 'ads', label: 'Homepage Ads' },
  { key: 'logos', label: 'Partner Logos' },
];

interface FormData {
  title: string;
  summary: string;
  imageUrl: string;
  linkUrl: string;
  linkText: string;
  sortOrder: number;
  logoUrl: string; // logos only
}

const emptyForm: FormData = { title: '', summary: '', imageUrl: '', linkUrl: '', linkText: '', sortOrder: 0, logoUrl: '' };

export default function HomepageCmsPage() {
  const [tab, setTab] = useState<Section>('hero');
  const [items, setItems] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const data = await homepageCmsApi.getContents(tab);
    setItems(data);
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, sortOrder: items.length });
    setShowModal(true);
  };

  const openEdit = (item: CmsContent) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      summary: item.summary || '',
      imageUrl: item.imageUrl || '',
      linkUrl: item.linkUrl || '',
      linkText: item.linkText || '',
      sortOrder: item.sortOrder,
      logoUrl: (item.metadata as any)?.logoUrl || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const metadata: Record<string, any> = {};
      if (tab === 'logos' && form.logoUrl) metadata.logoUrl = form.logoUrl;

      if (editId) {
        await homepageCmsApi.updateContent(editId, {
          title: form.title,
          summary: form.summary || undefined,
          imageUrl: form.imageUrl || undefined,
          linkUrl: form.linkUrl || undefined,
          linkText: form.linkText || undefined,
          sortOrder: form.sortOrder,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
      } else {
        await homepageCmsApi.createContent(tab, {
          title: form.title,
          summary: form.summary || undefined,
          imageUrl: form.imageUrl || undefined,
          linkUrl: form.linkUrl || undefined,
          linkText: form.linkText || undefined,
          sortOrder: form.sortOrder,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
      }
      setShowModal(false);
      await loadItems();
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await homepageCmsApi.deleteContent(id);
      await loadItems();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleStatus = async (item: CmsContent) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      await homepageCmsApi.updateStatus(item.id, newStatus);
      await loadItems();
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleReorder = async (item: CmsContent, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? item.sortOrder - 1 : item.sortOrder + 1;
    try {
      await homepageCmsApi.updateContent(item.id, { sortOrder: newOrder });
      await loadItems();
    } catch {
      alert('순서 변경에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">홈페이지 콘텐츠 관리</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> 추가
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">등록된 콘텐츠가 없습니다</p>
          <button onClick={openCreate} className="text-primary-600 font-medium text-sm hover:underline">
            첫 콘텐츠 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 transition-colors">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                {(item.imageUrl || (item.metadata as any)?.logoUrl) ? (
                  <img src={item.imageUrl || (item.metadata as any)?.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Image className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.status === 'published' ? '발행됨' : '초안'}
                  </span>
                </div>
                {item.summary && <p className="text-sm text-gray-500 truncate">{item.summary}</p>}
                <p className="text-xs text-gray-400 mt-1">순서: {item.sortOrder}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleReorder(item, 'up')} disabled={idx === 0}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="위로">
                  <ArrowUp className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleReorder(item, 'down')} disabled={idx === items.length - 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="아래로">
                  <ArrowDown className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleToggleStatus(item)}
                  className="p-1.5 rounded hover:bg-gray-100" title={item.status === 'published' ? '비공개' : '발행'}>
                  {item.status === 'published' ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-green-600" />}
                </button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100" title="수정">
                  <Pencil className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50" title="삭제">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editId ? '콘텐츠 수정' : '콘텐츠 추가'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL</label>
                <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              {tab === 'logos' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">로고 URL (별도)</label>
                  <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    placeholder="https://..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL</label>
                  <input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="https://..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">버튼 텍스트</label>
                  <input value={form.linkText} onChange={(e) => setForm({ ...form, linkText: e.target.value })}
                    placeholder="자세히 보기" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">순서</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                취소
              </button>
              <button onClick={handleSave} disabled={saving || !form.title}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
                {saving ? '저장 중...' : editId ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
