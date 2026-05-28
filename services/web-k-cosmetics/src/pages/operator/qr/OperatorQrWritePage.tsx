/**
 * OperatorQrWritePage — 운영자 매장 HUB QR 템플릿 작성/수정 (K-Cosmetics)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 * Backend: POST/PUT /api/v1/cosmetics/operator/qr/templates
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Save, Send, ArrowLeft, Link as LinkIcon, FileText } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  createOperatorQrTemplate,
  getOperatorQrTemplate,
  updateOperatorQrTemplate,
  publishOperatorQrTemplate,
  type OperatorQrTemplate,
  type OperatorQrTemplateTargetType,
  type OperatorQrTemplateContentKind,
} from '../../../api/operatorQr';

const CONTENT_KINDS: { value: OperatorQrTemplateContentKind; label: string; hint: string }[] = [
  { value: 'blog', label: '블로그', hint: '운영자 게시 블로그 slug 또는 id' },
  { value: 'cms', label: 'CMS', hint: 'CMS 콘텐츠 id' },
  { value: 'pop', label: 'POP', hint: '운영자 게시 POP slug 또는 id' },
];

export default function OperatorQrWritePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<OperatorQrTemplateTargetType>('url');
  const [targetUrl, setTargetUrl] = useState('');
  const [targetContentKind, setTargetContentKind] = useState<OperatorQrTemplateContentKind>('blog');
  const [targetContentRef, setTargetContentRef] = useState('');
  const [template, setTemplate] = useState<OperatorQrTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    let canceled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOperatorQrTemplate(id!);
        if (canceled) return;
        setTemplate(data);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setTargetType(data.targetType);
        setTargetUrl(data.targetUrl ?? '');
        setTargetContentKind(data.targetContentKind ?? 'blog');
        setTargetContentRef(data.targetContentRef ?? '');
      } catch (e: any) {
        if (canceled) return;
        setError(e?.message || 'QR 템플릿을 불러올 수 없습니다');
      } finally {
        if (!canceled) setIsLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [id, isNew]);

  function validateInputs(): string | null {
    if (!title.trim()) return '제목을 입력하세요';
    if (targetType === 'url' && !targetUrl.trim()) return '대상 URL 을 입력하세요';
    if (targetType === 'content' && !targetContentRef.trim()) return '대상 콘텐츠 식별자를 입력하세요';
    return null;
  }

  function buildPayload() {
    const base = { title: title.trim(), description: description.trim() || undefined };
    if (targetType === 'url') return { ...base, targetType: 'url' as const, targetUrl: targetUrl.trim() };
    return { ...base, targetType: 'content' as const, targetContentKind, targetContentRef: targetContentRef.trim() };
  }

  const handleSave = async (): Promise<OperatorQrTemplate | null> => {
    const err = validateInputs();
    if (err) { toast.error(err); return null; }
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const saved = isNew ? await createOperatorQrTemplate(payload) : await updateOperatorQrTemplate(id!, payload);
      setTemplate(saved);
      toast.success(isNew ? 'QR 템플릿이 생성되었습니다 (초안)' : '저장되었습니다');
      if (isNew) navigate(`/operator/qr/${saved.id}/edit`, { replace: true });
      return saved;
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const saved = await handleSave();
    if (!saved) return;
    if (saved.status === 'published') { toast.info('이미 발행된 QR 템플릿입니다'); return; }
    if (!window.confirm('지금 발행하시겠습니까? 발행 즉시 K-Cosmetics 매장 HUB 에 노출됩니다.')) return;
    setIsPublishing(true);
    try {
      const published = await publishOperatorQrTemplate(saved.id);
      setTemplate(published);
      toast.success('QR 템플릿이 발행되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm">{error}</p>
      <button onClick={() => navigate('/operator/qr')} className="text-sm text-pink-600 hover:underline">목록으로 돌아가기</button>
    </div>
  );

  const statusLabel =
    template?.status === 'published' ? '발행됨'
    : template?.status === 'archived' ? '보관됨'
    : isNew ? '신규 (저장 시 초안 생성)'
    : '초안';

  const disabled = isSaving || isPublishing;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/operator/qr')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="목록">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isNew ? '새 QR 템플릿' : 'QR 템플릿 수정'}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              상태: <span className="font-medium text-slate-700">{statusLabel}</span>
              {' · 매장 HUB 노출 대상 (K-Cosmetics) · 운영자 단계에서는 실제 QR slug 미발급'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
          <button
            onClick={handlePublish}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            저장 후 발행
          </button>
        </div>
      </div>

      <div className="space-y-4 bg-white rounded-xl border border-slate-100 p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="QR 템플릿 제목 (매장 HUB 목록 표시)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            설명 <span className="text-xs text-slate-400 font-normal">(선택)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="이 QR 이 어떤 용도인지 짧게 설명하세요 (매장이 가져갈 때 참고)"
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">대상 종류</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTargetType('url')}
              disabled={disabled}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
                targetType === 'url' ? 'bg-pink-50 border-pink-300 text-pink-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <div className="text-left">
                <div>외부 URL</div>
                <div className={`text-xs font-normal ${targetType === 'url' ? 'text-pink-600' : 'text-slate-400'}`}>외부 페이지, 캠페인 landing 등</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('content')}
              disabled={disabled}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
                targetType === 'content' ? 'bg-pink-50 border-pink-300 text-pink-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <div className="text-left">
                <div>내부 콘텐츠</div>
                <div className={`text-xs font-normal ${targetType === 'content' ? 'text-pink-600' : 'text-slate-400'}`}>블로그 / CMS / POP 연결</div>
              </div>
            </button>
          </div>
        </div>

        {targetType === 'url' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">대상 URL</label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={disabled}
            />
            <p className="text-xs text-slate-400 mt-1">매장이 가져갈 때 이 URL 이 매장 사본 QR 의 landing target 으로 박힙니다.</p>
          </div>
        )}

        {targetType === 'content' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">콘텐츠 종류</label>
              <div className="flex gap-2">
                {CONTENT_KINDS.map((kind) => (
                  <button
                    key={kind.value}
                    type="button"
                    onClick={() => setTargetContentKind(kind.value)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      targetContentKind === kind.value ? 'bg-pink-50 border-pink-300 text-pink-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{CONTENT_KINDS.find((k) => k.value === targetContentKind)?.hint}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">콘텐츠 식별자</label>
              <input
                type="text"
                value={targetContentRef}
                onChange={(e) => setTargetContentRef(e.target.value)}
                placeholder="slug 또는 id"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                disabled={disabled}
              />
              <p className="text-xs text-slate-400 mt-1">매장이 가져갈 때 backend 가 매장 사본 store_qr_codes 의 landing_target_id 로 변환합니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
