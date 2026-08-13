/**
 * OperatorQrTemplateWritePage — 운영자 매장 HUB QR 템플릿 작성·수정 (공통 콘솔)
 *
 * WO-O4O-KPA-OPERATOR-QR-WRITE-PAGE-V1 (원본)
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1 (K-Cosmetics 측)
 * WO-O4O-KPA-QR-CONTENT-PICKER-V1: 콘텐츠 허브 선택기 (KPA 전용 — 슬롯으로 주입)
 * WO-O4O-KPA-OPERATOR-P2-P3-USABILITY-AND-ERROR-CLEANUP-CONSOLIDATED-V1:
 *   발행 확인 window.confirm → ConfirmActionDialog
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA/K-Cosmetics 중복을 단일 콘솔로 수렴.
 *
 * 화면 범위:
 *   - 제목 / 설명
 *   - targetType 선택 ('url' | 'content')
 *   - url  → targetUrl 입력
 *   - content → 콘텐츠 종류 선택 + (선택기 또는 자유 입력) 식별자
 * 범위 밖: RichTextEditor(QR 은 본문 콘텐츠가 아님), 실제 QR PNG 미리보기(운영자 단계 slug 미발급),
 *          매장 통계/scan analytics(매장 사본 layer).
 */

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Save, Send, ArrowLeft, Link as LinkIcon, FileText, Search, CheckCircle2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ConfirmActionDialog } from '@o4o/ui';
import type { QrTemplateRecord, OperatorQrTemplateWritePageProps } from './types';

export function OperatorQrTemplateWritePage({
  id,
  client,
  onBackToList,
  onCreated,
  contentKinds,
  defaultContentKind,
  pickerContentKind,
  renderContentPicker,
  resolvePickedTitle,
  audienceNote,
  publishConfirmMessage,
  accent,
}: OperatorQrTemplateWritePageProps) {
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<'url' | 'content'>('url');
  const [targetUrl, setTargetUrl] = useState('');
  const [targetContentKind, setTargetContentKind] = useState<string>(defaultContentKind);
  const [targetContentRef, setTargetContentRef] = useState('');
  const [pickedTitle, setPickedTitle] = useState('');

  const [template, setTemplate] = useState<QrTemplateRecord | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    let canceled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.get(id!);
        if (canceled) return;
        setTemplate(data);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setTargetType(data.targetType === 'content' ? 'content' : 'url');
        setTargetUrl(data.targetUrl ?? '');
        setTargetContentKind(data.targetContentKind ?? defaultContentKind);
        setTargetContentRef(data.targetContentRef ?? '');
        // 선택기 보유 서비스에서 선택된 항목이면 표시용 제목을 단건 조회한다.
        if (
          resolvePickedTitle &&
          pickerContentKind &&
          data.targetType === 'content' &&
          data.targetContentKind === pickerContentKind &&
          data.targetContentRef
        ) {
          resolvePickedTitle(data.targetContentRef)
            .then((t) => { if (!canceled) setPickedTitle(t); })
            .catch(() => { /* 제목 표시 실패해도 ref(id)는 유지 — 선택 자체엔 영향 없음 */ });
        }
      } catch (e: any) {
        if (canceled) return;
        setError(e?.message || 'QR 템플릿을 불러올 수 없습니다');
      } finally {
        if (!canceled) setIsLoading(false);
      }
    })();
    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  function validateInputs(): string | null {
    if (!title.trim()) return '제목을 입력하세요';
    if (targetType === 'url') {
      if (!targetUrl.trim()) return '대상 URL 을 입력하세요';
    } else {
      if (!targetContentRef.trim()) return '대상 콘텐츠 식별자를 입력하세요';
    }
    return null;
  }

  function buildPayload() {
    const base = {
      title: title.trim(),
      description: description.trim() || undefined,
    };
    if (targetType === 'url') {
      return { ...base, targetType: 'url' as const, targetUrl: targetUrl.trim() };
    }
    return {
      ...base,
      targetType: 'content' as const,
      targetContentKind,
      targetContentRef: targetContentRef.trim(),
    };
  }

  const handleSave = async (): Promise<QrTemplateRecord | null> => {
    const err = validateInputs();
    if (err) {
      toast.error(err);
      return null;
    }
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const saved = isNew ? await client.create(payload) : await client.update(id!, payload);
      setTemplate(saved);
      toast.success(isNew ? 'QR 템플릿이 생성되었습니다 (초안)' : '저장되었습니다');
      if (isNew) onCreated(saved.id);
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
    if (saved.status === 'published') {
      toast.info('이미 발행된 QR 템플릿입니다');
      return;
    }
    setPendingPublishId(saved.id);
  };

  const confirmPublish = async () => {
    const targetId = pendingPublishId;
    setPendingPublishId(null);
    if (!targetId) return;
    setIsPublishing(true);
    try {
      const published = await client.publish(targetId);
      setTemplate(published);
      toast.success('QR 템플릿이 발행되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">{error}</p>
        <button onClick={onBackToList} className={`text-sm ${accent.linkText} hover:underline`}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const statusLabel =
    template?.status === 'published' ? '발행됨'
    : template?.status === 'archived' ? '보관됨'
    : isNew ? '신규 (저장 시 초안 생성)'
    : '초안';

  const disabled = isSaving || isPublishing;
  const inputCls = `w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`;
  const toggleCls = (on: boolean) =>
    `flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
      on ? `${accent.selectedToggle} font-medium` : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
    }`;

  const usesPicker = Boolean(pickerContentKind && renderContentPicker) && targetContentKind === pickerContentKind;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBackToList} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="목록">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isNew ? '새 QR 템플릿' : 'QR 템플릿 수정'}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              상태: <span className="font-medium text-slate-700">{statusLabel}</span>
              {` · ${audienceNote} · 운영자 단계에서는 실제 QR slug 미발급`}
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
            className={`flex items-center gap-2 px-4 py-2 ${accent.publishButton} text-white rounded-lg text-sm font-medium disabled:opacity-50`}
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            저장 후 발행
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 bg-white rounded-xl border border-slate-100 p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">제목</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="QR 템플릿 제목 (매장 HUB 목록 표시)"
            className={inputCls} disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            설명 <span className="text-xs text-slate-400 font-normal">(선택)</span>
          </label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="이 QR 이 어떤 용도인지 짧게 설명하세요 (매장이 가져갈 때 참고)"
            rows={2} className={`${inputCls} resize-none`} disabled={disabled}
          />
        </div>

        {/* targetType — url vs content */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">대상 종류</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTargetType('url')} disabled={disabled} className={toggleCls(targetType === 'url')}>
              <LinkIcon className="w-4 h-4" />
              <div className="text-left">
                <div>외부 URL</div>
                <div className={`text-xs font-normal ${targetType === 'url' ? accent.selectedToggleSub : 'text-slate-400'}`}>
                  캠페인 landing 등 외부 페이지
                </div>
              </div>
            </button>
            <button type="button" onClick={() => setTargetType('content')} disabled={disabled} className={toggleCls(targetType === 'content')}>
              <FileText className="w-4 h-4" />
              <div className="text-left">
                <div>내부 콘텐츠</div>
                <div className={`text-xs font-normal ${targetType === 'content' ? accent.selectedToggleSub : 'text-slate-400'}`}>
                  {contentKinds.map((k) => k.label).join(' / ')} 연결
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* targetType='url' */}
        {targetType === 'url' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">대상 URL</label>
            <input
              type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://..." className={`${inputCls} font-mono`} disabled={disabled}
            />
            <p className="text-xs text-slate-400 mt-1">
              매장이 가져갈 때 이 URL 이 매장 사본 QR 의 landing target 으로 박힙니다.
            </p>
          </div>
        )}

        {/* targetType='content' */}
        {targetType === 'content' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">콘텐츠 종류</label>
              <div className="flex gap-2 flex-wrap">
                {contentKinds.map((kind) => (
                  <button
                    key={kind.value}
                    type="button"
                    onClick={() => {
                      // kind 전환 시 이전 식별자/제목 초기화 (slug 가 다른 종류로 새는 것 방지)
                      setTargetContentKind(kind.value);
                      setTargetContentRef('');
                      setPickedTitle('');
                    }}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      targetContentKind === kind.value
                        ? `${accent.selectedToggle} font-medium`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {contentKinds.find((k) => k.value === targetContentKind)?.hint}
              </p>
            </div>

            {usesPicker ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">연결할 콘텐츠</label>
                {targetContentRef ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 border border-green-200 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{pickedTitle || '선택된 콘텐츠'}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{targetContentRef}</p>
                    </div>
                    <QrPickerTrigger
                      label="변경"
                      className={`text-sm ${accent.linkText} hover:underline flex-shrink-0 disabled:opacity-50`}
                      disabled={disabled}
                      render={renderContentPicker!}
                      value={targetContentRef}
                      pickedTitle={pickedTitle}
                      onPicked={({ id: refId, title: t }) => { setTargetContentRef(refId); setPickedTitle(t); }}
                    />
                  </div>
                ) : (
                  <QrPickerTrigger
                    label="콘텐츠 선택"
                    withIcon
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    disabled={disabled}
                    render={renderContentPicker!}
                    value={targetContentRef}
                    pickedTitle={pickedTitle}
                    onPicked={({ id: refId, title: t }) => { setTargetContentRef(refId); setPickedTitle(t); }}
                  />
                )}
                <p className="text-xs text-slate-400 mt-1">
                  콘텐츠 허브에서 항목을 선택하면 매장 가져가기 시 landing 콘텐츠로 연결됩니다.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">콘텐츠 식별자</label>
                <input
                  type="text" value={targetContentRef} onChange={(e) => setTargetContentRef(e.target.value)}
                  placeholder="slug 또는 id" className={`${inputCls} font-mono`} disabled={disabled}
                />
                <p className="text-xs text-slate-400 mt-1">
                  매장이 가져갈 때 backend 가 매장 사본 store_qr_codes 의 landing_target_id 로 변환합니다 (Phase 3-B).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmActionDialog
        open={!!pendingPublishId}
        title="QR 템플릿 발행"
        message={publishConfirmMessage}
        confirmText="발행"
        loading={isPublishing}
        onConfirm={confirmPublish}
        onClose={() => setPendingPublishId(null)}
      />
    </div>
  );
}

/**
 * 선택기 트리거 — 열림 상태를 여기서 소유하고, 실제 모달은 서비스가 주입한 slot 이 렌더한다.
 * (Content Hub 는 KPA 전용 서브시스템이므로 공통 패키지가 그 모달을 알 필요가 없다.)
 */
function QrPickerTrigger({
  label,
  withIcon,
  className,
  disabled,
  render,
  value,
  pickedTitle,
  onPicked,
}: {
  label: string;
  withIcon?: boolean;
  className: string;
  disabled: boolean;
  render: NonNullable<OperatorQrTemplateWritePageProps['renderContentPicker']>;
  value: string;
  pickedTitle: string;
  onPicked: (next: { id: string; title: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={disabled} className={className}>
        {withIcon && <Search className="w-4 h-4" />}
        {label}
      </button>
      {open && render({
        value,
        pickedTitle,
        disabled,
        onPicked: (next) => { onPicked(next); setOpen(false); },
        onClose: () => setOpen(false),
      })}
    </>
  );
}
