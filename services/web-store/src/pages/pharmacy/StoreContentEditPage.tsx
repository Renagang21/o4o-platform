import { useStoreLibraryRoute } from './library/useStoreLibraryRoute';
/**
 * StoreContentEditPage — 매장 콘텐츠 독립 편집
 *
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 * WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1: 활용 설정 (displayMode, CTA, QR, print)
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1: KPA 블록 지원 + BlockRenderer 미리보기
 *
 * 경로: /store/content/:snapshotId/edit
 *
 * 기능:
 * - 제목 수정
 * - 본문(contentJson) 구조적 편집
 * - 이미지 URL 변경
 * - 링크 삽입/수정
 * - 목록 편집 (KPA 블록 호환)
 * - BlockRenderer 미리보기
 * - 활용 설정 (displayMode, CTA, QR, 출력 모드)
 * - 저장 (upsert → kpa_store_contents)
 * - 저장 성공 toast
 */

import { StoreContentNextSteps } from '../../components/store/StoreContentNextSteps';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  Save,
  ArrowLeft,
  CheckCircle,
  Settings2,
  QrCode,
  Printer,
  MousePointerClick,
  Eye,
} from 'lucide-react';
// WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-EDITOR-UNIFY-V1:
//   snapshot 콘텐츠 편집을 o4o 표준 RichTextEditor 로 통일(direct/제작자료와 동일 모듈). 레거시 블록 편집기 대체.
//   snapshot 은 body(html) 권위 + usage 설정 별도 보존. body 없으면 blocks→html 정규화.
import { RichTextEditor, LlmAssistPanel, type EditorContent } from '@o4o/content-editor';
import { buildStoreContentAuthoringPrompt, resolveStoreContentLlmTask, STORE_LLM_ASSIST_LABEL } from '@o4o/store-ui-core';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';
import { getActiveServiceKey } from '../../lib/serviceContext';
import { useContentAuthoringSession } from './hooks/useContentAuthoringSession';
import { emptySnapshotDraft, loadSnapshot, saveSnapshot, snapshotDraftFromRecord } from './authoring/contentAuthoringAdapters';
import type { UsageSettings, DisplayMode } from './authoring/contentAuthoringModels';

const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string; desc: string }[] = [
  { value: 'default', label: '기본', desc: '일반 콘텐츠 표시' },
  { value: 'banner', label: '배너형', desc: '상단 이미지 강조 + CTA 버튼' },
  { value: 'landing', label: '랜딩형', desc: '전체 화면 랜딩 레이아웃' },
];

export default function StoreContentEditPage() {
  const { snapshotId } = useParams<{ snapshotId: string }>();
  const { libraryPath } = useStoreLibraryRoute();

  const { organizationId } = useStoreOrganizationId();
  const session = useContentAuthoringSession({
    organizationId, serviceKey: getActiveServiceKey(), target: `snapshot:${snapshotId ?? ''}`,
    initialDraft: emptySnapshotDraft,
    load: () => snapshotId ? loadSnapshot(snapshotId, organizationId) : Promise.reject(new Error('Missing snapshot')),
    toDraft: snapshotDraftFromRecord,
    persist: (draft, record) => saveSnapshot(snapshotId!, draft, record),
  });
  const { loading, saving, error, reload: fetchContent, save: handleSave } = session;
  const { title, usage } = session.draft;
  const editorContent = { html: session.draft.html };
  const editorInitialHtml = session.seed.html;
  const source = session.record?.source ?? 'snapshot', orgId = session.record?.organizationId ?? null;
  const toast = session.notice ? (session.notice.ok ? session.notice.message : `저장 실패: ${session.notice.message}`) : null;
  const setTitle = (value: string) => session.changeDraft({ title: value });
  const setEditorContent = (value: EditorContent) => session.changeDraft({ html: value.html });
  const setEditorInitialHtml = (html: string) => session.changeDraft({ html }, true);
  const updateUsage = (patch: Partial<UsageSettings>) => session.changeDraft({ usage: { ...usage, ...patch } });

  const publicUrl = snapshotId && orgId ? `${window.location.origin}/view/${snapshotId}?org=${orgId}` : '';

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          콘텐츠를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p role="alert" className="text-sm">{error}</p>
          <button onClick={fetchContent} className="mt-3 text-sm text-blue-600 hover:underline">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <StoreContentNextSteps />
      {/* Toast */}
      {toast && (
        <div role={session.notice?.ok ? 'status' : 'alert'} className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.startsWith('저장 실패') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        {/* WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1: 진입점(내 자료함 콘텐츠)으로 복귀 — canonical 정렬 */}
        <Link
          to={libraryPath}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          내 자료함 콘텐츠로
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">콘텐츠 편집</h1>
            <p className="text-xs text-slate-400 mt-1">
              {source === 'store' ? '매장 편집본 (독립 저장)' : '원본 스냅샷 (첫 저장 시 매장 복사본 생성)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {source === 'store' && orgId && (
              <Link
                to={`/view/${snapshotId}?org=${orgId}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                공개 보기
              </Link>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
        <input
          type="text"
          value={title}
          aria-label="콘텐츠 제목"
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="콘텐츠 제목"
        />
      </div>

      {/* 본문 — WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-EDITOR-UNIFY-V1: o4o 표준 RichTextEditor(편집/HTML/미리보기) */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-2">본문</label>
        <div className="bg-white border border-slate-200 rounded-lg p-2">
          {/* WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1: 외부 LLM 작업 — 매장 편집본(kpa_store_contents)만 갱신, 원본 snapshot 불변 */}
          <div className="mb-2">
            <LlmAssistPanel
              label={STORE_LLM_ASSIST_LABEL}
              contextLabel="매장 편집본 — 가져온 콘텐츠를 우리 매장에 맞게 다듬습니다 (원본은 바뀌지 않습니다)"
              guideText={({ additionalInstruction }) => buildStoreContentAuthoringPrompt({
                task: resolveStoreContentLlmTask(editorContent.html),
                title,
                currentHtml: editorContent.html,
                sourceOrigin: source,
                additionalInstruction,
              })}
              currentHtml={editorContent.html}
              onApplyHtml={setEditorInitialHtml}
              onNotify={(message, kind) => session.notify(message, kind === 'success')}
            />
          </div>
          <RichTextEditor showInternalAi={false}
            value={editorInitialHtml}
            onChange={(c) => setEditorContent(c)}
            placeholder="본문 내용을 입력하세요"
            minHeight="420px"
            preset="full"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────── */}
      {/* Usage Settings — WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1 */}
      {/* ─────────────────────────────────────────── */}
      <div className="border-t border-slate-200 pt-6 mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
          <Settings2 className="w-4 h-4" />
          활용 설정
        </h2>

        {/* Display Mode */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-2">디스플레이 모드</label>
          <div className="flex gap-2">
            {DISPLAY_MODE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateUsage({ displayMode: opt.value })}
                className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  usage.displayMode === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mb-5 bg-slate-50 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={usage.cta.enabled}
              onChange={e => updateUsage({ cta: { ...usage.cta, enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <MousePointerClick className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">CTA 버튼 사용</span>
          </label>
          {usage.cta.enabled && (
            <div className="space-y-2 pl-6">
              <input
                type="text"
                value={usage.cta.label}
                onChange={e => updateUsage({ cta: { ...usage.cta, label: e.target.value } })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="버튼 라벨 (예: 자세히 보기)"
              />
              <input
                type="url"
                value={usage.cta.url}
                onChange={e => updateUsage({ cta: { ...usage.cta, url: e.target.value } })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="링크 URL (https://...)"
              />
              <label className="flex items-center gap-2 text-[10px] text-slate-500">
                <input
                  type="checkbox"
                  checked={usage.cta.target === '_blank'}
                  onChange={e => updateUsage({ cta: { ...usage.cta, target: e.target.checked ? '_blank' : '_self' } })}
                  className="w-3 h-3 rounded border-slate-300"
                />
                새 탭에서 열기
              </label>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="mb-5 bg-slate-50 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usage.qr.enabled}
              onChange={e => updateUsage({ qr: { enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <QrCode className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">QR 코드 표시</span>
          </label>
          {usage.qr.enabled && (
            <p className="text-[10px] text-slate-400 mt-2 pl-6">
              공개 URL: {publicUrl}
            </p>
          )}
        </div>

        {/* Print Mode */}
        <div className="mb-5 bg-slate-50 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usage.print.enabled}
              onChange={e => updateUsage({ print: { enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">인쇄 모드 사용</span>
          </label>
          {usage.print.enabled && (
            <p className="text-[10px] text-slate-400 mt-2 pl-6">
              인쇄 버튼이 공개 페이지에 표시됩니다
            </p>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
        <p>저장하면 매장 전용 편집본이 생성됩니다. 원본 스냅샷은 변경되지 않습니다.</p>
        <p className="mt-1">게시 화면(B2C/사이니지/프로모션)에는 매장 편집본이 우선 노출됩니다.</p>
      </div>
    </div>
  );
}
