/**
 * StoreDirectContentPage — direct 콘텐츠 상세 / 수정 / 삭제
 *
 * WO-O4O-STORE-CONTENT-DIRECT-DETAIL-EDIT-UX-V1
 *
 * 경로: /store/content/direct/:id
 *
 * - source_type='direct' 전용 (AI 생성 저장, 직접 작성 등)
 * - 상세 조회 (Block[] 렌더링)
 * - 인라인 편집 (Block editor)
 * - 삭제 (store owner 전용)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  FileText,
  Image,
  Link as LinkIcon,
  List,
} from 'lucide-react';
import { BlockRenderer } from '@o4o/block-renderer';
import { directContentApi, type DirectContentItem } from '../../api/assetSnapshot';
import { kpaBlocksToRendererBlocks } from '../../utils/kpa-block-adapter';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentBlock = {
  type: 'text' | 'image' | 'link' | 'list';
  value: string;
  label?: string;
  items?: string[];
};

function parseBlocks(contentJson: Record<string, unknown>): ContentBlock[] {
  if (Array.isArray(contentJson.blocks)) {
    return (contentJson.blocks as any[]).map((b) => {
      if ('content' in b && !('value' in b)) return { type: b.type === 'text' ? 'text' : b.type, value: b.content || '' } as ContentBlock;
      if ('url' in b && !('value' in b)) return { type: 'image', value: b.url || '' } as ContentBlock;
      if (b.type === 'list' && Array.isArray(b.items)) return { type: 'list' as const, value: '', items: b.items };
      return { type: b.type || 'text', value: b.value || '', label: b.label, items: b.items } as ContentBlock;
    });
  }
  if (typeof contentJson.html === 'string' && contentJson.html) {
    return [{ type: 'text', value: contentJson.html }];
  }
  return [{ type: 'text', value: JSON.stringify(contentJson, null, 2) }];
}

function blocksToContentJson(blocks: ContentBlock[], original: Record<string, unknown>): Record<string, unknown> {
  return { ...original, blocks };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StoreDirectContentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState<DirectContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBlocks, setEditBlocks] = useState<ContentBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchContent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await directContentApi.get(id);
      setContent(res.data);
    } catch (e: any) {
      setError(e.message || '콘텐츠를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const startEdit = () => {
    if (!content) return;
    setEditTitle(content.title);
    setEditBlocks(parseBlocks(content.contentJson));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditTitle('');
    setEditBlocks([]);
  };

  const handleSave = async () => {
    if (!id || !content) return;
    setSaving(true);
    try {
      const contentJson = blocksToContentJson(editBlocks, content.contentJson);
      const res = await directContentApi.update(id, { title: editTitle, contentJson });
      setContent(res.data);
      setEditing(false);
      showToast('저장되었습니다', true);
    } catch (e: any) {
      showToast(e.message || '저장 실패', false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await directContentApi.remove(id);
      navigate('/store/content', { replace: true });
    } catch (e: any) {
      showToast(e.message || '삭제 실패', false);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Block editor helpers
  const updateBlock = (idx: number, field: keyof ContentBlock, value: string) => {
    setEditBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const addBlock = (type: ContentBlock['type']) => {
    setEditBlocks(prev => [...prev, { type, value: '', label: type === 'link' ? '' : undefined, items: type === 'list' ? [''] : undefined }]);
  };

  const removeBlock = (idx: number) => {
    setEditBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 flex justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error || '콘텐츠를 찾을 수 없습니다'}</p>
          <button onClick={fetchContent} className="mt-3 text-sm text-blue-600 hover:underline">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const viewBlocks = parseBlocks(content.contentJson);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <CheckCircle className="w-4 h-4" />
          {toast.msg}
        </div>
      )}

      {/* Back nav */}
      <Link to="/store/content" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" />
        자료실로 돌아가기
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="text-xl font-bold text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
              placeholder="콘텐츠 제목"
            />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 m-0">{content.title}</h1>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700">
              내 매장 콘텐츠
            </span>
            <span className="text-xs text-slate-400">
              {content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Edit2 className="w-4 h-4" />
                수정
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      {editing ? (
        <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-3">본문 편집</label>

          <div className="space-y-3 mb-4">
            {editBlocks.map((block, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    {block.type === 'text' && <><FileText className="w-3.5 h-3.5" />텍스트</>}
                    {block.type === 'image' && <><Image className="w-3.5 h-3.5" />이미지</>}
                    {block.type === 'link' && <><LinkIcon className="w-3.5 h-3.5" />링크</>}
                    {block.type === 'list' && <><List className="w-3.5 h-3.5" />목록</>}
                  </span>
                  <button onClick={() => removeBlock(idx)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {block.type === 'text' && (
                  <textarea
                    value={block.value}
                    onChange={e => updateBlock(idx, 'value', e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm resize-y outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="본문 내용"
                  />
                )}
                {block.type === 'image' && (
                  <input type="url" value={block.value} onChange={e => updateBlock(idx, 'value', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg" />
                )}
                {block.type === 'link' && (
                  <div className="space-y-2">
                    <input type="url" value={block.value} onChange={e => updateBlock(idx, 'value', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com" />
                    <input type="text" value={block.label || ''} onChange={e => updateBlock(idx, 'label', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="링크 텍스트" />
                  </div>
                )}
                {block.type === 'list' && (
                  <div className="space-y-1.5">
                    {(block.items || []).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                        <input type="text" value={item}
                          onChange={e => {
                            const items = [...(block.items || [])];
                            items[i] = e.target.value;
                            setEditBlocks(prev => prev.map((b, bi) => bi === idx ? { ...b, items } : b));
                          }}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => {
                          const items = (block.items || []).filter((_, j) => j !== i);
                          setEditBlocks(prev => prev.map((b, bi) => bi === idx ? { ...b, items } : b));
                        }} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const items = [...(block.items || []), ''];
                      setEditBlocks(prev => prev.map((b, bi) => bi === idx ? { ...b, items } : b));
                    }} className="text-xs text-blue-500 hover:underline">+ 항목 추가</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {(['text', 'image', 'list', 'link'] as ContentBlock['type'][]).map(t => (
              <button key={t} onClick={() => addBlock(t)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
                <Plus className="w-3.5 h-3.5" />
                {t === 'text' ? '텍스트' : t === 'image' ? '이미지' : t === 'list' ? '목록' : '링크'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-4">
          {viewBlocks.length > 0 ? (
            <BlockRenderer
              blocks={kpaBlocksToRendererBlocks(viewBlocks.map(b => {
                if (b.type === 'text') return { type: 'text', content: b.value };
                if (b.type === 'image') return { type: 'image', url: b.value };
                if (b.type === 'list') return { type: 'list', items: b.items || [] };
                return { type: 'text', content: b.value };
              }))}
              className="space-y-4"
            />
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">내용이 없습니다.</p>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-slate-800 mb-2">콘텐츠를 삭제하시겠습니까?</h2>
            <p className="text-sm text-slate-500 mb-5">삭제하면 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
