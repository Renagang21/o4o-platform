/**
 * MediaPickerModal — KPA Society 이식판
 *
 * WO-KPA-A-HOME-EXPOSURE-MENU-RELOCATION-AND-MEDIA-PICKER-V1
 *
 * 원본: services/web-neture/src/components/common/MediaPickerModal.tsx
 * (WO-O4O-COMMON-MEDIA-FOLDER-AND-LIBRARY-MANAGEMENT-V1)
 *
 * KPA 서비스 전용 import 경로로 교체:
 * - mediaApi: ../../api/media
 * - useAuth: ../../contexts/AuthContext
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Upload, ImageIcon, Loader2, Check,
  LayoutGrid, List, MoreHorizontal, FolderInput, Trash2,
} from 'lucide-react';
import { mediaApi, type MediaAssetItem } from '../../api/media';
import { useAuth } from '../../contexts/AuthContext';

// ── 폴더 정의 ──
const FOLDERS = [
  { key: 'product-thumbnail', label: '상품 대표이미지' },
  { key: 'description', label: '설명 이미지' },
  { key: 'banner', label: '배너/홍보' },
  { key: 'brand', label: '브랜드/로고' },
  { key: 'general', label: '기타' },
] as const;

type FolderKey = typeof FOLDERS[number]['key'];

const FOLDER_LABEL_MAP: Record<string, string> = Object.fromEntries(
  FOLDERS.map((f) => [f.key, f.label]),
);

// ── 동의 문구 ──
const CONSENT_TEXT = '등록한 파일이 O4O 플랫폼의 공용 미디어 라이브러리에 저장되고, O4O 이용자들이 플랫폼 내 운영 및 콘텐츠 제작에 활용할 수 있음에 동의합니다.';

// ── 날짜/사이즈 포맷 ──
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Props ──
export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAssetItem) => void;
  title?: string;
  defaultFolder?: string;
}

type Tab = 'upload' | 'library';
type ViewMode = 'grid' | 'list';

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  title = '이미지 선택',
  defaultFolder,
}: MediaPickerModalProps) {
  const { user } = useAuth();
  const isOperator = user?.roles?.some((r: string) =>
    r.includes('admin') || r.includes('operator') || r.includes('super_admin')
  ) ?? false;

  const [tab, setTab] = useState<Tab>('upload');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAsset, setUploadedAsset] = useState<MediaAssetItem | null>(null);
  const [uploadFolder, setUploadFolder] = useState<FolderKey>(
    (defaultFolder as FolderKey) || 'general',
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library state
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [folderFilter, setFolderFilter] = useState<string | null>(
    defaultFolder || null,
  );

  // Operator action state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAssets = useCallback(async (pageNum: number, append = false, folder?: string | null) => {
    setLoadingAssets(true);
    const opts: { page: number; limit: number; assetType: string; folder?: string } = {
      page: pageNum,
      limit: 20,
      assetType: 'image',
    };
    if (folder) opts.folder = folder;
    const res = await mediaApi.list(opts);
    if (res.success && res.data) {
      setAssets((prev) => append ? [...prev, ...res.data!] : res.data!);
      setTotal(res.total || 0);
      setHasMore((res.data.length || 0) >= 20);
    }
    setLoadingAssets(false);
  }, []);

  useEffect(() => {
    if (open && tab === 'library') {
      setPage(1);
      setSelectedId(null);
      loadAssets(1, false, folderFilter);
    }
  }, [open, tab, folderFilter, loadAssets]);

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setConsent(false);
    setUploadError(null);
    setUploadedAsset(null);
    setSelectedId(null);
    setAssets([]);
    setMenuOpenId(null);
    setMovingId(null);
    setDeletingId(null);
    onClose();
  };

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploadError(null);
    setUploadedAsset(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file || !consent) return;
    setUploading(true);
    setUploadError(null);

    const res = await mediaApi.upload(file, true, undefined, uploadFolder);
    if (res.success && res.data) {
      setUploadedAsset(res.data);
    } else {
      setUploadError(res.error || '업로드에 실패했습니다.');
    }
    setUploading(false);
  };

  const handleSelectUploaded = () => {
    if (uploadedAsset) {
      onSelect(uploadedAsset);
      handleClose();
    }
  };

  const handleSelectFromLibrary = () => {
    const asset = assets.find((a) => a.id === selectedId);
    if (asset) {
      onSelect(asset);
      handleClose();
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadAssets(nextPage, true, folderFilter);
  };

  const handleFolderFilter = (folder: string | null) => {
    setFolderFilter(folder);
    setSelectedId(null);
    setPage(1);
  };

  const handleMoveToFolder = async (assetId: string, folder: string) => {
    setMovingId(assetId);
    const res = await mediaApi.moveToFolder(assetId, folder);
    if (res.success) {
      setPage(1);
      await loadAssets(1, false, folderFilter);
    }
    setMovingId(null);
    setMenuOpenId(null);
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('이 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setDeletingId(assetId);
    const res = await mediaApi.deleteAsset(assetId);
    if (res.success) {
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setTotal((prev) => prev - 1);
      if (selectedId === assetId) setSelectedId(null);
    }
    setDeletingId(null);
    setMenuOpenId(null);
  };

  const renderActionMenu = (asset: MediaAssetItem) => {
    if (!isOperator) return null;
    const isOpen = menuOpenId === asset.id;
    const isMoving = movingId === asset.id;
    const isDeleting = deletingId === asset.id;

    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpenId(isOpen ? null : asset.id); }}
          className="p-1 rounded hover:bg-slate-200 transition-colors"
          disabled={isMoving || isDeleting}
        >
          {(isMoving || isDeleting) ? (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          ) : (
            <MoreHorizontal size={14} className="text-slate-500" />
          )}
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              폴더 이동
            </div>
            {FOLDERS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleMoveToFolder(asset.id, f.key)}
                disabled={asset.folder === f.key}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${
                  asset.folder === f.key
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FolderInput size={12} />
                {f.label}
                {asset.folder === f.key && <span className="text-[10px] text-blue-400 ml-auto">현재</span>}
              </button>
            ))}
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => handleDelete(asset.id)}
              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={12} />
              삭제
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMenuOpenId(null)}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Upload size={12} /> 새 이미지 업로드
            </button>
            <button
              onClick={() => setTab('library')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'library' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ImageIcon size={12} /> 라이브러리
              {total > 0 && <span className="text-[10px] text-slate-400">({total})</span>}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'upload' ? (
            <>
              {!uploadedAsset ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">저장할 폴더</label>
                    <select
                      value={uploadFolder}
                      onChange={(e) => setUploadFolder(e.target.value as FolderKey)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {FOLDERS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                  >
                    {preview ? (
                      <img src={preview} alt="미리보기" className="max-h-40 mx-auto rounded-lg object-contain" />
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">클릭하여 이미지를 선택하세요</p>
                        <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP, GIF</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {file && (
                    <p className="text-xs text-slate-500">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
                  )}

                  <label className="flex items-start gap-2 p-3 bg-amber-50/60 border border-amber-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">{CONSENT_TEXT}</span>
                  </label>

                  <button
                    onClick={handleUpload}
                    disabled={!file || !consent || uploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <><Loader2 size={14} className="animate-spin" /> 업로드 중...</>
                    ) : (
                      <><Upload size={14} /> 업로드</>
                    )}
                  </button>

                  {uploadError && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
                  )}
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <Check size={24} className="mx-auto text-emerald-600 mb-2" />
                    <p className="text-sm font-medium text-emerald-700">업로드 완료</p>
                    <img src={uploadedAsset.url} alt="업로드됨" className="max-h-32 mx-auto mt-3 rounded-lg object-contain" />
                    <p className="text-xs text-slate-500 mt-2">{uploadedAsset.originalName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      폴더: {FOLDER_LABEL_MAP[uploadedAsset.folder] || uploadedAsset.folder}
                    </p>
                  </div>
                  <button
                    onClick={handleSelectUploaded}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    이 이미지 선택
                  </button>
                  <button
                    onClick={() => { setUploadedAsset(null); setFile(null); setPreview(null); setConsent(false); }}
                    className="w-full px-4 py-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    다른 이미지 업로드
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 flex gap-1 flex-wrap">
                  <button
                    onClick={() => handleFolderFilter(null)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                      folderFilter === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    전체
                  </button>
                  {FOLDERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => handleFolderFilter(f.key)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                        folderFilter === f.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                    title="그리드 보기"
                  >
                    <LayoutGrid size={13} className={viewMode === 'grid' ? 'text-slate-700' : 'text-slate-400'} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                    title="리스트 보기"
                  >
                    <List size={13} className={viewMode === 'list' ? 'text-slate-700' : 'text-slate-400'} />
                  </button>
                </div>
              </div>

              {loadingAssets && assets.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon size={32} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">등록된 이미지가 없습니다</p>
                  <p className="text-xs text-slate-300 mt-1">새 이미지를 업로드하면 여기에 표시됩니다</p>
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {assets.map((asset) => (
                      <div key={asset.id} className="relative group">
                        <button
                          onClick={() => setSelectedId(asset.id)}
                          className={`w-full rounded-lg overflow-hidden border-2 transition-colors ${
                            selectedId === asset.id
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="aspect-square">
                            <img
                              src={asset.url}
                              alt={asset.originalName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          {selectedId === asset.id && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                          <div className="px-1.5 py-1 bg-white border-t border-slate-100">
                            <p className="text-[10px] text-slate-600 truncate">{asset.originalName}</p>
                          </div>
                        </button>
                        {isOperator && (
                          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {renderActionMenu(asset)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingAssets}
                      className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {loadingAssets ? '로딩 중...' : '더보기'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedId(asset.id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedId === asset.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-slate-100">
                          <img
                            src={asset.url}
                            alt={asset.originalName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 truncate">{asset.originalName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">{fmtSize(asset.fileSize)}</span>
                            <span className="text-[10px] text-slate-300">|</span>
                            <span className="text-[10px] text-slate-400">{fmtDate(asset.createdAt)}</span>
                            {asset.folder && asset.folder !== 'general' && (
                              <>
                                <span className="text-[10px] text-slate-300">|</span>
                                <span className="text-[10px] text-blue-400">
                                  {FOLDER_LABEL_MAP[asset.folder] || asset.folder}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {selectedId === asset.id && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                        {isOperator && renderActionMenu(asset)}
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingAssets}
                      className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {loadingAssets ? '로딩 중...' : '더보기'}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          {tab === 'library' && selectedId ? (
            <button
              onClick={handleSelectFromLibrary}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              선택
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleClose}
            className={`px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ${
              tab === 'library' && selectedId ? 'ml-2' : 'w-full'
            }`}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
