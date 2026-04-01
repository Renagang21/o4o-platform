/**
 * MediaPickerModal — WO-O4O-COMMON-MEDIA-PICKER-UPLOADER-V1
 *
 * 공용 미디어 선택기/업로더.
 * - 새 이미지 업로드 (동의 필수)
 * - 라이브러리에서 기존 이미지 선택
 * - 단일 선택, 이미지 중심
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, ImageIcon, Loader2, Check } from 'lucide-react';
import { mediaApi, type MediaAssetItem } from '../../lib/api/media';

// ── 동의 문구 ──
const CONSENT_TEXT = '등록한 파일이 O4O 플랫폼의 공용 미디어 라이브러리에 저장되고, O4O 이용자들이 플랫폼 내 운영 및 콘텐츠 제작에 활용할 수 있음에 동의합니다.';

// ── Props ──
export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAssetItem) => void;
  title?: string;
}

type Tab = 'upload' | 'library';

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  title = '이미지 선택',
}: MediaPickerModalProps) {
  const [tab, setTab] = useState<Tab>('upload');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAsset, setUploadedAsset] = useState<MediaAssetItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library state
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Load library when tab switches or modal opens
  const loadAssets = useCallback(async (pageNum: number, append = false) => {
    setLoadingAssets(true);
    const res = await mediaApi.list({ page: pageNum, limit: 20, assetType: 'image' });
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
      loadAssets(1);
    }
  }, [open, tab, loadAssets]);

  // Cleanup on close
  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setConsent(false);
    setUploadError(null);
    setUploadedAsset(null);
    setSelectedId(null);
    setAssets([]);
    onClose();
  };

  if (!open) return null;

  // File selection
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

  // Upload
  const handleUpload = async () => {
    if (!file || !consent) return;
    setUploading(true);
    setUploadError(null);

    const res = await mediaApi.upload(file, true);
    if (res.success && res.data) {
      setUploadedAsset(res.data);
    } else {
      setUploadError(res.error || '업로드에 실패했습니다.');
    }
    setUploading(false);
  };

  // Select uploaded asset
  const handleSelectUploaded = () => {
    if (uploadedAsset) {
      onSelect(uploadedAsset);
      handleClose();
    }
  };

  // Select from library
  const handleSelectFromLibrary = () => {
    const asset = assets.find((a) => a.id === selectedId);
    if (asset) {
      onSelect(asset);
      handleClose();
    }
  };

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadAssets(nextPage, true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col">
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
            /* ── Upload Tab ── */
            <>
              {/* File picker */}
              {!uploadedAsset ? (
                <>
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

                  {/* Consent checkbox */}
                  <label className="flex items-start gap-2 p-3 bg-amber-50/60 border border-amber-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">{CONSENT_TEXT}</span>
                  </label>

                  {/* Upload button */}
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
                /* Upload success — select uploaded */
                <div className="text-center space-y-4">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <Check size={24} className="mx-auto text-emerald-600 mb-2" />
                    <p className="text-sm font-medium text-emerald-700">업로드 완료</p>
                    <img src={uploadedAsset.url} alt="업로드됨" className="max-h-32 mx-auto mt-3 rounded-lg object-contain" />
                    <p className="text-xs text-slate-500 mt-2">{uploadedAsset.originalName}</p>
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
            /* ── Library Tab ── */
            <>
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
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {assets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedId(asset.id)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-colors aspect-square ${
                          selectedId === asset.id
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={asset.url}
                          alt={asset.originalName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {selectedId === asset.id && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                          <p className="text-[10px] text-white truncate">{asset.originalName}</p>
                        </div>
                      </button>
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
