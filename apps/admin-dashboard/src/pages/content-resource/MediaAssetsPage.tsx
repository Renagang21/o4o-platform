/**
 * Content Resource — Media Assets 관리 페이지
 *
 * WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1
 *
 * media_assets(/platform/media-library) 전용 관리 화면. 레거시 /content/media(MediaLibraryAdmin)와 별개.
 * Content Resource 관리 영역의 첫 섹션 — 이후 Templates / Search / Usage 로 확장.
 *
 * 이번 WO 범위: media_assets metadata 조회·수정(검색 화면·통합검색은 후속).
 * 파일 속성(url/gcs_path/file_name/original_name)은 편집 불가(읽기 전용 표시).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { formatDate, formatFileSize } from '@/lib/utils';
import {
  listMediaAssets,
  updateMediaAssetMetadata,
  getMediaAssetUsage,
  type MediaAssetAdmin,
  type MediaAssetMetadataPatch,
  type MediaAssetSearchParams,
  type MediaAssetUsageItem,
} from '@/api/media-library.api';

const SOURCE_OPTIONS = ['', 'operator', 'supplier', 'store', 'ai', 'external', 'import'];
const LANGUAGE_OPTIONS = ['', 'ko', 'en', 'ja', 'zh', 'vi', 'th', 'id'];
const TYPE_OPTIONS = ['', 'image', 'video', 'audio', 'document'];

function toCsv(arr: string[] | null | undefined): string {
  return (arr ?? []).join(', ');
}
function fromCsv(s: string): string[] {
  return s.split(',').map((t) => t.trim()).filter(Boolean);
}

const MediaAssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<MediaAssetAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<MediaAssetAdmin | null>(null);
  const [saving, setSaving] = useState(false);

  // WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1: Metadata 검색/필터 (AND). Pagination(limit 100)은 기존 유지.
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [language, setLanguage] = useState('');
  const [source, setSource] = useState('');
  const [usageType, setUsageType] = useState('');
  const [status, setStatus] = useState('');

  const doFetch = useCallback(async (override?: Partial<MediaAssetSearchParams>) => {
    setLoading(true);
    const params: MediaAssetSearchParams = { page: 1, limit: 100, q, type, language, source, usageType, status, ...override };
    try {
      const res = await listMediaAssets(params);
      setAssets(res.data);
      setTotal(res.total);
    } catch {
      toast.error('미디어 자산을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [q, type, language, source, usageType, status]);

  useEffect(() => {
    doFetch();
    // 최초 1회 로드 (필터는 명시적 검색/선택 시 재조회)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setQ(''); setType(''); setLanguage(''); setSource(''); setUsageType(''); setStatus('');
    doFetch({ q: '', type: '', language: '', source: '', usageType: '', status: '' });
  };

  if (loading && assets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-8 py-6">
        <div className="mb-1 text-xs text-gray-400">Content Resource</div>
        <h1 className="text-2xl font-normal mb-1">Media Assets</h1>
        <p className="text-sm text-gray-500 mb-5">
          공용 미디어 라이브러리(media_assets) 자산의 메타데이터를 관리합니다. 파일 URL은 변경되지 않으며,
          제목·설명·태그 등 서술 메타데이터만 수정됩니다. (총 {total}건)
        </p>

        {/* WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1: Metadata 검색/필터 바 (AND) */}
        <div className="bg-white border rounded p-3 mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doFetch(); }}
              placeholder="제목·설명·메모·태그·키워드 검색…"
              className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button onClick={() => doFetch()} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">검색</button>
          </div>

          <select value={type} onChange={(e) => { setType(e.target.value); doFetch({ type: e.target.value }); }} className="px-2 py-1.5 text-sm border border-gray-300 rounded">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t ? `종류: ${t}` : '종류: 전체'}</option>)}
          </select>
          <select value={language} onChange={(e) => { setLanguage(e.target.value); doFetch({ language: e.target.value }); }} className="px-2 py-1.5 text-sm border border-gray-300 rounded">
            {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l ? `언어: ${l}` : '언어: 전체'}</option>)}
          </select>
          <select value={source} onChange={(e) => { setSource(e.target.value); doFetch({ source: e.target.value }); }} className="px-2 py-1.5 text-sm border border-gray-300 rounded">
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s ? `출처: ${s}` : '출처: 전체'}</option>)}
          </select>
          <input
            value={usageType}
            onChange={(e) => setUsageType(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doFetch(); }}
            placeholder="용도(UsageType)"
            className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doFetch(); }}
            placeholder="상태(Status)"
            className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
          <button onClick={handleReset} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600">초기화</button>
        </div>

        <div className="bg-white border rounded">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium">자산</th>
                <th className="px-3 py-3 text-left text-sm font-medium">제목 / 메타</th>
                <th className="px-3 py-3 text-left text-sm font-medium">태그</th>
                <th className="px-3 py-3 text-left text-sm font-medium">폴더 / 종류</th>
                <th className="px-3 py-3 text-left text-sm font-medium">등록일</th>
                <th className="px-3 py-3 text-right text-sm font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {a.assetType === 'image' ? (
                        <img src={a.url} alt={a.title || a.originalName} className="w-14 h-14 object-cover rounded border" loading="lazy" />
                      ) : (
                        <div className="w-14 h-14 rounded border bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                          {a.assetType}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500 truncate max-w-[180px]">{a.originalName}</div>
                        <div className="text-[10px] text-gray-400">{formatFileSize(a.fileSize)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-800">{a.title || <span className="text-gray-300">— 제목 없음 —</span>}</div>
                    {a.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 max-w-[260px]">{a.description}</div>}
                    <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
                      {a.source && <span>source: {a.source}</span>}
                      {a.language && <span>lang: {a.language}</span>}
                      {a.status && <span>status: {a.status}</span>}
                      {!a.isLibraryPublic && <span className="text-amber-600">비공개</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(a.tags ?? []).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">{t}</span>
                      ))}
                      {(!a.tags || a.tags.length === 0) && <span className="text-[10px] text-gray-300">태그 없음</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    <div>{a.folder}</div>
                    <div className="text-gray-400">{a.assetType}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{formatDate(a.createdAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => setEditing(a)}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-blue-600"
                    >
                      메타 편집
                    </button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-400">등록된 미디어 자산이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <MetadataEditModal
          asset={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            setSaving(true);
            try {
              const updated = await updateMediaAssetMetadata(editing.id, patch);
              setAssets((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              toast.success('메타데이터가 저장되었습니다.');
              setEditing(null);
            } catch (e: any) {
              toast.error(e?.message || '저장에 실패했습니다.');
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
};

// ─── 메타데이터 편집 모달 ───
const MetadataEditModal: React.FC<{
  asset: MediaAssetAdmin;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: MediaAssetMetadataPatch) => void;
}> = ({ asset, saving, onClose, onSave }) => {
  const [title, setTitle] = useState(asset.title ?? '');
  const [description, setDescription] = useState(asset.description ?? '');
  const [tags, setTags] = useState(toCsv(asset.tags));
  const [keywords, setKeywords] = useState(toCsv(asset.keywords));
  const [language, setLanguage] = useState(asset.language ?? '');
  const [source, setSource] = useState(asset.source ?? '');
  const [usageType, setUsageType] = useState(asset.usageType ?? '');
  const [status, setStatus] = useState(asset.status ?? '');
  const [memo, setMemo] = useState(asset.memo ?? '');
  const [isPublic, setIsPublic] = useState(asset.isLibraryPublic);

  // WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1: 사용처 탭 (상세 진입 시 1회 조회, read-only)
  const [tab, setTab] = useState<'meta' | 'usage'>('meta');
  const [usages, setUsages] = useState<MediaAssetUsageItem[] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  // WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1: 사용처 조회 실패 ≠ 사용처 0건
  const [usageError, setUsageError] = useState<string | null>(null);

  /**
   * 사용처 조회.
   *
   * WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1
   *   종전에는 실패 시 `setUsages([])` 로 비워 "사용하는 매장 실행 자산이 없습니다." 를 보여줬다.
   *   이 문구는 **삭제해도 안전하다**는 판단 근거로 읽히므로, 조회 실패를 0건으로 위장하면
   *   사용 중인 Resource 를 지우려 할 수 있다(백엔드 usage guard 가 409 로 막더라도 오도는 남는다).
   */
  const loadUsage = useCallback(() => {
    setUsageLoading(true);
    setUsageError(null);
    getMediaAssetUsage(asset.id)
      .then((r) => {
        if (!Array.isArray(r?.usages)) {
          throw new Error('사용처 응답 형식이 올바르지 않습니다.');
        }
        setUsages(r.usages);
      })
      .catch((err: any) => {
        setUsageError(
          err?.response?.data?.error || err?.response?.data?.message || err?.message || '사용처를 불러오지 못했습니다.',
        );
      })
      .finally(() => setUsageLoading(false));
  }, [asset.id]);

  useEffect(() => {
    if (tab === 'usage' && usages === null && !usageLoading && !usageError) {
      loadUsage();
    }
  }, [tab, usages, usageLoading, usageError, loadUsage]);

  const field = 'w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200';
  const label = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Resource 상세</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* 탭: 메타데이터 / 사용처 (WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1) */}
        <div className="px-5 pt-3 flex gap-1 border-b">
          <button
            onClick={() => setTab('meta')}
            className={`px-3 py-1.5 text-sm rounded-t ${tab === 'meta' ? 'font-semibold text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >메타데이터</button>
          <button
            onClick={() => setTab('usage')}
            className={`px-3 py-1.5 text-sm rounded-t ${tab === 'usage' ? 'font-semibold text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >사용처{usages ? ` (${usages.length})` : ''}</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'usage' ? (
            <div className="space-y-2">
              {usageLoading && <div className="text-sm text-gray-500 py-6 text-center">사용처 조회 중…</div>}
              {/* WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1:
                  조회 실패를 "사용처 없음" 으로 표시하지 않는다 — 삭제 판단을 오도한다. */}
              {!usageLoading && usageError && (
                <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-semibold">사용처를 확인하지 못했습니다.</p>
                  <p className="mt-1 break-all">{usageError}</p>
                  <p className="mt-1 text-xs text-red-700">
                    사용처가 없다는 뜻이 아닙니다. 확인 전에는 삭제 판단을 하지 마세요.
                  </p>
                  <button
                    type="button"
                    onClick={loadUsage}
                    className="mt-2 rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
                  >
                    다시 확인
                  </button>
                </div>
              )}
              {!usageLoading && !usageError && usages && usages.length === 0 && (
                <div className="text-sm text-gray-400 py-6 text-center">
                  이 Resource를 실제로 사용(img/video/source 삽입)하는 매장 실행 자산이 없습니다.
                  <div className="text-xs text-gray-300 mt-1">(store_execution_assets 기준 · 본문 텍스트 언급·YouTube iframe 제외)</div>
                </div>
              )}
              {!usageLoading && usages && usages.map((u) => (
                <div key={u.assetId} className="border border-gray-200 rounded px-3 py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] uppercase bg-slate-100 text-slate-600 rounded">{u.surface || u.usageType || 'asset'}</span>
                      <span className="text-sm text-gray-800 truncate">{u.title || '(제목 없음)'}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      org: {u.organizationId || '—'}{u.updatedAt ? ` · ${new Date(u.updatedAt).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <>
          {/* 파일(읽기 전용) */}
          <div className="flex gap-3 items-start">
            {asset.assetType === 'image' && <img src={asset.url} alt="" className="w-20 h-20 object-cover rounded border" />}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500">파일(변경 불가): {asset.originalName}</div>
              <input readOnly value={asset.url} className="w-full mt-1 text-[11px] px-2 py-1 bg-gray-50 border border-gray-200 rounded font-mono text-gray-500" onClick={(e) => e.currentTarget.select()} />
            </div>
          </div>

          <div>
            <label className={label}>제목 (Title)</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 비타민C_상품대표이미지_2026" />
          </div>
          <div>
            <label className={label}>설명 (Description · Plain Text)</label>
            <textarea className={field} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>태그 (쉼표 구분)</label>
              <input className={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="비타민, 약국POP, 대표이미지" />
            </div>
            <div>
              <label className={label}>키워드 (쉼표 구분)</label>
              <input className={field} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>언어</label>
              <select className={field} value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>출처 (Source)</label>
              <select className={field} value={source} onChange={(e) => setSource(e.target.value)}>
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>용도 (UsageType)</label>
              <input className={field} value={usageType} onChange={(e) => setUsageType(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>상태 (Status)</label>
              <input className={field} value={status} onChange={(e) => setStatus(e.target.value)} placeholder="draft / active / archived …" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 pb-1.5">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                라이브러리 공개(is_library_public)
              </label>
            </div>
          </div>
          <div>
            <label className={label}>내부 메모</label>
            <textarea className={field} rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          </>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">닫기</button>
          {tab === 'meta' && (
          <button
            disabled={saving}
            onClick={() =>
              onSave({
                title: title.trim() || null,
                description: description.trim() || null,
                tags: fromCsv(tags),
                keywords: fromCsv(keywords),
                language: language || null,
                source: source || null,
                usageType: usageType.trim() || null,
                status: status.trim() || null,
                memo: memo.trim() || null,
                isLibraryPublic: isPublic,
              })
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaAssetsPage;
