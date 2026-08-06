/**
 * LibraryResourcesPage (약국 경영자) — 자료 등록·관리
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * 원장은 공통 `store_execution_assets` (자료함) — 신규 테이블 0.
 * 조직은 서버가 Pharmacy-Hub enrollment 로 결정한다(프론트가 organizationId 를 보내지 않는다).
 *
 * 자료 형태 3종은 공통 계약 그대로다:
 *   external-link : 외부 링크(url)
 *   content       : HTML 본문(htmlContent) — 표준 RichTextEditor
 *   file          : 이미 올라간 파일 URL 참조(fileUrl). 업로드 UI 는 V1 범위 밖 —
 *                   Pharmacy-Hub 전용 업로드 경로를 새로 만들지 않는다.
 *
 * 삭제는 **비활성화(soft delete)** 다. 공통 구조에 물리 삭제 경로가 없고 새로 만들지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import {
  fetchLibraryAssets,
  createLibraryAsset,
  updateLibraryAsset,
  deactivateLibraryAsset,
  type LibraryAsset,
  type LibraryAssetInput,
  type LibraryAssetType,
} from '../../lib/api/pharmacyHubStoreLibrary';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const TYPE_LABELS: Record<string, string> = {
  file: '파일',
  content: '콘텐츠',
  'external-link': '외부 링크',
};

const TYPE_OPTIONS: LibraryAssetType[] = ['content', 'external-link', 'file'];

export default function StoreOwnerLibraryResourcesPage() {
  const [items, setItems] = useState<LibraryAsset[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibraryAsset | 'new' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchLibraryAssets({ page: 1, limit: 100 })
      .then((p) => {
        setConnection(p.storeConnection);
        setItems(p.items);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '자료함을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeactivate = async (item: LibraryAsset) => {
    if (!window.confirm(`"${item.title}" 자료를 목록에서 내릴까요? (비활성화)`)) return;
    try {
      await deactivateLibraryAsset(item.id);
      load();
    } catch (e: any) {
      window.alert(e?.message || '처리하지 못했습니다.');
    }
  };

  if (editing) {
    return (
      <AssetForm
        asset={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs text-gray-400">
            <Link to="/store-owner/library" className="hover:underline">
              자료함
            </Link>{' '}
            / 자료 등록·관리
          </p>
          <h1 className="text-xl font-bold">자료 등록·관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            매장에서 활용할 자료를 등록합니다. 등록한 자료는 자료함 목록에 함께 표시됩니다.
          </p>
        </div>
        {connection?.status === 'connected' && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            자료 등록
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <>
          <StoreConnectionNotice connection={connection} subject="매장 자료" />
          <p className="mt-6 text-sm">
            <Link to="/store-owner" className="text-gray-500 underline">
              약국 경영자 홈
            </Link>
          </p>
        </>
      ) : loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">등록된 자료가 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400">"자료 등록" 으로 링크·콘텐츠·파일 자료를 추가하세요.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                    {TYPE_LABELS[item.assetType] ?? item.assetType}
                  </span>
                  {item.category && <span>{item.category}</span>}
                  <span>{new Date(item.updatedAt).toLocaleDateString('ko-KR')}</span>
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDeactivate(item)}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  내리기
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── 등록/수정 폼 ────────────────────────────────────────────────────────────

function AssetForm({
  asset,
  onClose,
  onSaved,
}: {
  asset: LibraryAsset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(asset?.title ?? '');
  const [description, setDescription] = useState(asset?.description ?? '');
  const [category, setCategory] = useState(asset?.category ?? '');
  const [assetType, setAssetType] = useState<LibraryAssetType>(
    (asset?.assetType as LibraryAssetType) ?? 'content',
  );
  const [url, setUrl] = useState(asset?.url ?? '');
  const [fileUrl, setFileUrl] = useState(asset?.fileUrl ?? '');
  const [fileName, setFileName] = useState(asset?.fileName ?? '');
  const [htmlContent, setHtmlContent] = useState(asset?.htmlContent ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (assetType === 'external-link' && !url.trim()) {
      setError('외부 링크 주소를 입력해 주세요.');
      return;
    }
    if (assetType === 'content' && (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p></p>')) {
      setError('내용을 입력해 주세요.');
      return;
    }
    if (assetType === 'file' && !fileUrl.trim()) {
      setError('파일 주소를 입력해 주세요.');
      return;
    }

    const input: LibraryAssetInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      assetType,
      url: assetType === 'external-link' ? url.trim() : undefined,
      htmlContent: assetType === 'content' ? htmlContent : undefined,
      fileUrl: assetType === 'file' ? fileUrl.trim() : undefined,
      fileName: assetType === 'file' ? fileName.trim() || undefined : undefined,
    };

    setSaving(true);
    setError(null);
    try {
      if (asset) await updateLibraryAsset(asset.id, input);
      else await createLibraryAsset(input);
      onSaved();
    } catch (e: any) {
      setError(e?.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{asset ? '자료 수정' : '자료 등록'}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-asset-title">
            제목
          </label>
          <input
            id="ph-asset-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-asset-type">
              자료 형태
            </label>
            <select
              id="ph-asset-type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as LibraryAssetType)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-asset-category">
              분류 (선택)
            </label>
            <input
              id="ph-asset-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 복약 안내, 매장 공지"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-asset-desc">
            설명 (선택)
          </label>
          <input
            id="ph-asset-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        {assetType === 'external-link' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-asset-url">
              링크 주소
            </label>
            <input
              id="ph-asset-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        )}

        {assetType === 'file' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-asset-fileurl">
                파일 주소
              </label>
              <input
                id="ph-asset-fileurl"
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-asset-filename">
                파일 이름 (선택)
              </label>
              <input
                id="ph-asset-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {assetType === 'content' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">내용</label>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <RichTextEditor
                value={htmlContent}
                onChange={(content) => setHtmlContent(content.html)}
                placeholder="자료 내용을 입력하세요."
                minHeight="360px"
                preset="full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
