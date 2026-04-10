/**
 * WorkingContentEditPage — 콘텐츠 편집 + 발행
 *
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1 Phase 2+3
 *
 * 블록 단위 편집 + BlockRenderer 미리보기 + 발행
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Upload, Loader2, AlertCircle,
  Plus, Trash2, FileText,
} from 'lucide-react';
import { BlockRenderer } from '@o4o/block-renderer';
import {
  fetchWorkingContent,
  updateWorkingContent,
  publishWorkingContent,
  type WorkingContentDetail,
} from '../../api/workingContent';
import { kpaBlocksToRendererBlocks, type KpaBlock } from '../../utils/kpa-block-adapter';
import { toast } from '@o4o/error-handling';

type EditBlock = KpaBlock & { _key: string };

let keyCounter = 0;
function nextKey() { return `blk-${++keyCounter}`; }

function toEditBlocks(blocks: KpaBlock[]): EditBlock[] {
  return blocks.map(b => ({ ...b, _key: nextKey() }));
}

function fromEditBlocks(blocks: EditBlock[]): KpaBlock[] {
  return blocks.map(({ _key, ...rest }) => rest);
}

export default function WorkingContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState<WorkingContentDetail | null>(null);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<EditBlock[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchWorkingContent(id)
      .then(data => {
        setContent(data);
        setTitle(data.title);
        setBlocks(toEditBlocks(data.edited_blocks as KpaBlock[]));
        setTags(data.tags || []);
        setCategory(data.category || '');
      })
      .catch(e => setError(e?.message || '콘텐츠를 불러올 수 없습니다'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateWorkingContent(id, {
        title,
        edited_blocks: fromEditBlocks(blocks),
        tags,
        category: category || null,
      });
      toast.success('저장되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    if (!window.confirm('이 콘텐츠를 매장에 발행하시겠습니까?')) return;
    setIsPublishing(true);
    try {
      // Save first
      await updateWorkingContent(id, {
        title,
        edited_blocks: fromEditBlocks(blocks),
        tags,
        category: category || null,
      });
      const result = await publishWorkingContent(id);
      toast.success(`발행 완료! (Snapshot: ${result.snapshotId.slice(0, 8)}...)`);
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setIsPublishing(false);
    }
  };

  // Block editing helpers
  const updateBlock = (key: string, patch: Partial<KpaBlock>) => {
    setBlocks(prev => prev.map(b => b._key === key ? { ...b, ...patch } : b));
  };

  const removeBlock = (key: string) => {
    setBlocks(prev => prev.filter(b => b._key !== key));
  };

  const addBlock = (type: 'text' | 'image' | 'list') => {
    const newBlock: EditBlock = {
      type,
      _key: nextKey(),
      ...(type === 'text' ? { content: '' } : {}),
      ...(type === 'image' ? { url: '' } : {}),
      ...(type === 'list' ? { items: [''] } : {}),
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">{error || '콘텐츠를 찾을 수 없습니다'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-500 underline">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/operator/working-content')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 flex-1">콘텐츠 편집</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {showPreview ? '편집' : '미리보기'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            발행
          </button>
        </div>
      </div>

      {showPreview ? (
        /* ── Preview Mode ── */
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{title}</h2>
          {blocks.length > 0 ? (
            <BlockRenderer
              blocks={kpaBlocksToRendererBlocks(fromEditBlocks(blocks))}
              className="space-y-4"
            />
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">블록이 없습니다</p>
          )}
        </div>
      ) : (
        /* ── Edit Mode ── */
        <div className="space-y-5">
          {/* Title */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">제목</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Blocks */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-medium text-slate-600">블록</h2>
            </div>

            <div className="space-y-3">
              {blocks.map((block) => (
                <div key={block._key} className="relative border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400 uppercase">{block.type}</span>
                    <button
                      onClick={() => removeBlock(block._key)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {block.type === 'text' && (
                    <textarea
                      value={block.content || ''}
                      onChange={e => updateBlock(block._key, { content: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="텍스트 입력..."
                    />
                  )}

                  {block.type === 'image' && (
                    <input
                      type="url"
                      value={block.url || ''}
                      onChange={e => updateBlock(block._key, { url: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="이미지 URL..."
                    />
                  )}

                  {block.type === 'list' && (
                    <div className="space-y-1.5">
                      {(block.items || []).map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                          <input
                            type="text"
                            value={item}
                            onChange={e => {
                              const newItems = [...(block.items || [])];
                              newItems[i] = e.target.value;
                              updateBlock(block._key, { items: newItems });
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => {
                              const newItems = (block.items || []).filter((_, j) => j !== i);
                              updateBlock(block._key, { items: newItems });
                            }}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => updateBlock(block._key, { items: [...(block.items || []), ''] })}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        + 항목 추가
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Block */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => addBlock('text')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50"
              >
                <Plus className="w-3 h-3" /> 텍스트
              </button>
              <button
                onClick={() => addBlock('image')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50"
              >
                <Plus className="w-3 h-3" /> 이미지
              </button>
              <button
                onClick={() => addBlock('list')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50"
              >
                <Plus className="w-3 h-3" /> 목록
              </button>
            </div>
          </div>

          {/* Category + Tags */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">카테고리</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="카테고리..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">태그</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600"
                  >
                    {t}
                    <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="태그 입력 후 Enter..."
                />
                <button
                  onClick={addTag}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
