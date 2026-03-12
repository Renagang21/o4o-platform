/**
 * Store Content Editor Page
 *
 * WO-O4O-STORE-CONTENT-UI
 *
 * 매장 콘텐츠 편집
 * - 기본 정보 수정 (제목, 설명, 상태, 공개 설정)
 * - 블록 편집 (텍스트, 이미지 등)
 * - 콘텐츠 활용 (SNS 공유, POP 출력, QR 코드)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Save, Share2, Printer, QrCode, Eye, EyeOff,
  AlertCircle, RefreshCw, CheckCircle, ExternalLink, Copy,
  FileText, Image as ImageIcon, Video, HelpCircle, ListChecks,
  X, Download, BarChart3, MousePointerClick, ScanLine, ClipboardList,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  storeContentApi,
  StoreContent,
  StoreContentBlock,
  StoreContentBlockType,
  StoreContentStatus,
  SNSPayload,
  POPPayload,
  QRPayload,
  ContentAnalyticsStats,
} from '@/api/store-content.api';

// Block type icons & labels
const BLOCK_ICONS: Record<StoreContentBlockType, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  image: <ImageIcon className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  choice: <ListChecks className="w-4 h-4" />,
};

const BLOCK_LABELS: Record<StoreContentBlockType, string> = {
  text: '텍스트',
  image: '이미지',
  video: '비디오',
  question: '질문',
  choice: '선택',
};

const STATUS_OPTIONS: { value: StoreContentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export default function StoreContentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // Data
  const [content, setContent] = useState<StoreContent | null>(null);
  const [blocks, setBlocks] = useState<StoreContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<StoreContentStatus>('draft');
  const [isPublic, setIsPublic] = useState(false);
  const [shareImage, setShareImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Block editing
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockContent, setBlockContent] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  // Modal
  const [activeModal, setActiveModal] = useState<'sns' | 'pop' | 'qr' | null>(null);
  const [snsData, setSnsData] = useState<SNSPayload | null>(null);
  const [popData, setPopData] = useState<POPPayload | null>(null);
  const [qrData, setQrData] = useState<QRPayload | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Analytics (WO-O4O-CONTENT-ANALYTICS)
  const [analyticsStats, setAnalyticsStats] = useState<ContentAnalyticsStats | null>(null);

  // Check query param for initial modal
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'sns' || tab === 'pop' || tab === 'qr') {
      setActiveModal(tab);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [contentResult, blocksResult, analyticsResult] = await Promise.all([
        storeContentApi.getById(id),
        storeContentApi.getBlocks(id),
        storeContentApi.getContentAnalytics(id),
      ]);

      if (contentResult) {
        setContent(contentResult);
        setTitle(contentResult.title);
        setDescription(contentResult.description || '');
        setStatus(contentResult.status);
        setIsPublic(contentResult.isPublic);
        setShareImage(contentResult.shareImage || '');
      } else {
        setError('콘텐츠를 찾을 수 없습니다.');
      }

      setBlocks(blocksResult);
      setAnalyticsStats(analyticsResult);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save content
  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setSaved(false);
    try {
      const result = await storeContentApi.update(id, {
        title,
        description: description || undefined,
        status,
        isPublic,
        shareImage: shareImage || undefined,
      });
      if (result) {
        setContent(result);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Block editing
  const startEditBlock = (block: StoreContentBlock) => {
    setEditingBlockId(block.id);
    setBlockContent(JSON.stringify(block.content, null, 2));
  };

  const cancelEditBlock = () => {
    setEditingBlockId(null);
    setBlockContent('');
  };

  const saveBlock = async () => {
    if (!editingBlockId) return;
    setSavingBlock(true);
    try {
      const parsed = JSON.parse(blockContent);
      await storeContentApi.updateBlock(editingBlockId, { content: parsed });
      // Refresh blocks
      if (id) {
        const updated = await storeContentApi.getBlocks(id);
        setBlocks(updated);
      }
      setEditingBlockId(null);
      setBlockContent('');
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('올바른 JSON 형식이 아닙니다.');
      } else {
        setError(err.message || '블록 저장에 실패했습니다.');
      }
    } finally {
      setSavingBlock(false);
    }
  };

  // Modal loaders
  const openModal = async (type: 'sns' | 'pop' | 'qr') => {
    if (!id) return;
    setActiveModal(type);
    setModalLoading(true);
    try {
      if (type === 'sns') {
        const data = await storeContentApi.getSNSPayload(id);
        setSnsData(data);
      } else if (type === 'pop') {
        const data = await storeContentApi.getPOPPayload(id);
        setPopData(data);
      } else if (type === 'qr') {
        const data = await storeContentApi.getQRPayload(id);
        setQrData(data);
      }
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
      setActiveModal(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSnsData(null);
    setPopData(null);
    setQrData(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-8" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="text-center py-16 text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg">콘텐츠를 찾을 수 없습니다</p>
          <Link to="/store-content" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/store-content"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          매장 콘텐츠
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header + Actions */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">콘텐츠 편집</h1>
        <div className="flex items-center gap-2">
          {content.slug && (
            <>
              <button
                onClick={() => openModal('sns')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg"
              >
                <Share2 className="w-4 h-4" /> SNS
              </button>
              <button
                onClick={() => openModal('pop')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg"
              >
                <Printer className="w-4 h-4" /> POP
              </button>
              <button
                onClick={() => openModal('qr')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg"
              >
                <QrCode className="w-4 h-4" /> QR
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {saved ? (
              <><CheckCircle className="w-4 h-4" /> 저장 완료</>
            ) : saving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> 저장 중...</>
            ) : (
              <><Save className="w-4 h-4" /> 저장</>
            )}
          </button>
        </div>
      </div>

      {/* Content Info Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">기본 정보</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Status + Public */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StoreContentStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">공개 설정</label>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border ${
                  isPublic
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {isPublic ? '공개' : '비공개'}
              </button>
            </div>
          </div>

          {/* Share Image URL */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">공유 이미지 URL</label>
            <input
              type="text"
              value={shareImage}
              onChange={(e) => setShareImage(e.target.value)}
              placeholder="SNS/POP 공유 시 사용할 이미지 URL"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Slug (read-only) */}
          {content.slug && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Slug (자동 생성)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={content.slug}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
                <button
                  onClick={() => copyToClipboard(content.slug || '')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="복사"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">
          블록 ({blocks.length}개)
        </h2>

        {blocks.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">블록이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, index) => {
              const isEditing = editingBlockId === block.id;
              return (
                <div
                  key={block.id}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  {/* Block Header */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-50">
                    <span className="text-xs text-gray-400 w-6">{index + 1}</span>
                    <span className="text-gray-500">
                      {BLOCK_ICONS[block.blockType]}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {BLOCK_LABELS[block.blockType]}
                    </span>
                    <button
                      onClick={() => isEditing ? cancelEditBlock() : startEditBlock(block)}
                      className="ml-auto text-xs text-blue-600 hover:text-blue-700"
                    >
                      {isEditing ? '취소' : '편집'}
                    </button>
                  </div>

                  {/* Block Content Preview / Editor */}
                  <div className="px-4 py-3">
                    {isEditing ? (
                      <div>
                        <textarea
                          value={blockContent}
                          onChange={(e) => setBlockContent(e.target.value)}
                          rows={8}
                          className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={cancelEditBlock}
                            className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            취소
                          </button>
                          <button
                            onClick={saveBlock}
                            disabled={savingBlock}
                            className="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingBlock ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <BlockPreview block={block} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Analytics Section (WO-O4O-CONTENT-ANALYTICS) */}
      {analyticsStats && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mt-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            콘텐츠 분석
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">조회 수</p>
              <p className="text-lg font-bold text-blue-700">{analyticsStats.views}</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg text-center">
              <ScanLine className="w-5 h-5 text-teal-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">QR 스캔</p>
              <p className="text-lg font-bold text-teal-700">{analyticsStats.qrScans}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <MousePointerClick className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">퀴즈 참여</p>
              <p className="text-lg font-bold text-purple-700">{analyticsStats.quizSubmits}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center">
              <ClipboardList className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">설문 참여</p>
              <p className="text-lg font-bold text-orange-700">{analyticsStats.surveySubmits}</p>
            </div>
          </div>
          {analyticsStats.total > 0 && (
            <p className="text-xs text-gray-400 mt-3 text-right">
              총 이벤트: {analyticsStats.total}건 (공유 {analyticsStats.shares}건 포함)
            </p>
          )}
        </div>
      )}

      {/* SNS Modal */}
      {activeModal === 'sns' && (
        <Modal title="SNS 공유" onClose={closeModal}>
          {modalLoading ? (
            <LoadingSpinner />
          ) : snsData ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">제목</label>
                <p className="text-sm font-medium text-gray-900">{snsData.title}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">설명</label>
                <p className="text-sm text-gray-700">{snsData.description || '-'}</p>
              </div>
              {snsData.image && (
                <div>
                  <label className="text-xs text-gray-500">이미지</label>
                  <img src={snsData.image} alt="Share" className="mt-1 max-h-48 rounded border" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">공유 URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={snsData.shareUrl}
                    readOnly
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(snsData.shareUrl)}
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={snsData.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">SNS 데이터를 불러올 수 없습니다. slug가 필요합니다.</p>
          )}
        </Modal>
      )}

      {/* POP Modal */}
      {activeModal === 'pop' && (
        <Modal title="POP 출력" onClose={closeModal}>
          {modalLoading ? (
            <LoadingSpinner />
          ) : popData ? (
            <div className="space-y-4">
              <div className="text-center border border-gray-200 rounded-lg p-6 bg-white">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{popData.title}</h3>
                {popData.description && (
                  <p className="text-sm text-gray-600 mb-4">{popData.description}</p>
                )}
                {popData.image && (
                  <img src={popData.image} alt="POP" className="mx-auto max-h-40 rounded mb-4" />
                )}
                {popData.qrDataUrl && (
                  <div>
                    <img
                      src={popData.qrDataUrl}
                      alt="QR Code"
                      className="mx-auto w-32 h-32"
                    />
                    <p className="text-xs text-gray-400 mt-2">QR 코드를 스캔하세요</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <Printer className="w-4 h-4" /> 인쇄
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">POP 데이터를 불러올 수 없습니다.</p>
          )}
        </Modal>
      )}

      {/* QR Modal */}
      {activeModal === 'qr' && (
        <Modal title="QR 코드" onClose={closeModal}>
          {modalLoading ? (
            <LoadingSpinner />
          ) : qrData ? (
            <div className="space-y-4 text-center">
              <img
                src={qrData.qrImage}
                alt="QR Code"
                className="mx-auto w-48 h-48"
              />
              <div>
                <label className="text-xs text-gray-500">콘텐츠 URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={qrData.contentUrl}
                    readOnly
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(qrData.contentUrl)}
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <a
                href={qrData.qrImage}
                download="qr-code.png"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                <Download className="w-4 h-4" /> QR 이미지 다운로드
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-400">QR 데이터를 불러올 수 없습니다.</p>
          )}
        </Modal>
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function BlockPreview({ block }: { block: StoreContentBlock }) {
  const { content, blockType } = block;

  if (blockType === 'text') {
    return (
      <p className="text-sm text-gray-700 whitespace-pre-wrap">
        {content?.text || content?.body || JSON.stringify(content)}
      </p>
    );
  }

  if (blockType === 'image') {
    return (
      <div className="flex items-center gap-3">
        {content?.url && (
          <img src={content.url} alt={content.alt || ''} className="w-20 h-20 object-cover rounded border" />
        )}
        <div className="text-sm text-gray-600">
          {content?.alt && <p>{content.alt}</p>}
          {content?.url && <p className="text-xs text-gray-400 truncate max-w-xs">{content.url}</p>}
        </div>
      </div>
    );
  }

  if (blockType === 'video') {
    return (
      <div className="text-sm text-gray-600">
        <p>{content?.title || 'Video'}</p>
        {content?.url && <p className="text-xs text-gray-400 truncate">{content.url}</p>}
      </div>
    );
  }

  // Generic fallback
  return (
    <pre className="text-xs text-gray-500 overflow-auto max-h-32">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  );
}
