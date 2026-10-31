import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';
import { useStoreResource } from './hooks/useStoreResource';
import { createScreenSetSession } from './tablet/screenSetSession';
/**
 * TabletScreenSetManager — 매장(store) 태블릿 콘텐츠 라이브러리 페이지(리스트 + 제작 셸 진입)
 *
 * WO-O4O-TABLET-SCREEN-SET-EDITOR-SHARED-EXTRACTION-V2A
 *   단계형 authoring 편집기(TabletContentStepBuilder)와 그 내부(picker/미리보기/템플릿 메타)는
 *   `@o4o/tablet-screen-set-editor` 공유 패키지로 추출됨. 이 파일에는 **매장 전용 리스트 페이지**와
 *   **매장 API 인스턴스(defaultStoreBuilderApi)** 만 잔류한다. store 동작·저장 payload·5섹션 계약 불변.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Layers } from 'lucide-react';
import {
  fetchScreenSets, fetchScreenSet, updateScreenSet,
  archiveScreenSet, captureScreenSetWrites,
  // WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1
  searchTabletStoreContents, searchTabletO4oDescriptions,
  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 draft → sections resolve(read-only)
  previewScreenSet,
  // WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1: 상품 선택용 매장 상품 풀.
  fetchStoreProductPool,
  type ScreenSet, type ScreenSetDetail,
} from '../../api/tabletDisplays';
// WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1: 상품별 QR 선택 후보 = 매장 소유 활성 QR 목록.
import { getStoreQrCodes } from '../../api/storeQr';
import { mediaApi } from '../../api/media';
import MediaPickerModal from '../../components/common/MediaPickerModal';
import type { MediaInsert } from '@o4o/content-editor';
// WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: library 목록을 O4O 표준 테이블로 정비.
import TabletContentLibraryList from './TabletContentLibraryList';
import type { TabletKioskApi } from '@o4o/tablet-kiosk-core';
// WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §4:
//   'QR 모바일 화면' 미리보기 = 실제 /qr/:slug 랜딩과 **같은 컴포넌트**.
//   공유 편집기는 서비스 계층을 import 하지 않으므로(계층 역전 금지) 매장 소비처가 렌더러를 주입한다.
import { PublicScreenSetViewer } from '@o4o/tablet-kiosk-core';
import type { QrScreenSet } from '../../api/storeQr';
// 공유 편집기 + 라벨/상수/계약을 패키지에서 소비.
import {
  TabletContentStepBuilder, templateLabel, LEGACY_ONLY_TEMPLATE_KEYS,
  type Toast,
} from '@o4o/tablet-screen-set-editor';
import { getActiveServiceKey } from '../../lib/serviceContext';

// WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 제작 셸에 주입할 **매장(store) API 인스턴스**.
//   공유 편집기는 api 를 필수 주입받는다(앱 런타임 함수 의존 없음). 매장 제작기는 이 인스턴스를 주입.
const defaultStoreBuilderReads = {
  preview: previewScreenSet,
  searchO4oDescriptions: searchTabletO4oDescriptions,
  searchStoreContents: searchTabletStoreContents,
};

/**
 * WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1
 * 상품 카드에 붙일 수 있는 QR 후보 조회. 서버(GET /pharmacy/qr)가 이미
 * `organization_id = 내 매장 AND is_active = true` 로 제한한다(매장 소유 + 활성 경계).
 * 여기서 QR 을 새로 만들지 않는다 — 이미 있는 QR 만 고른다.
 */
const fetchStoreQrOptions = async () => {
  const res = await getStoreQrCodes({ page: 1, limit: 200 });
  return (res?.data?.items ?? []).map((q) => ({
    id: q.id,
    title: q.title,
    landingType: q.landingType,
    landingTargetId: q.landingTargetId,
    slug: q.slug,
  }));
};

/**
 * WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §4
 * 편집기 'QR 모바일 화면' 미리보기를 실제 코너 QR 랜딩과 동일 렌더러로 그린다.
 *
 * 실제 랜딩(`GET /qr/public/:slug`)과 draft 미리보기(`POST /screen-sets/preview`)는 **같은 sections 계약**을
 * 산출한다(공용 resolver / 공용 헬퍼). 따라서 sections 를 그대로 공개 뷰어에 넘기면 배치·섹션 처리가 일치한다.
 * slug 는 표시용이며(뷰어는 sections 만 렌더) 미저장 초안은 빈 문자열이다.
 */
function renderQrMobilePreview(screen: { templateKey?: string; screenSet?: { name?: string }; sections?: unknown[] }) {
  const viewerSet: QrScreenSet = {
    landingType: 'screen_set',
    slug: '',
    name: screen.screenSet?.name ?? '',
    templateKey: screen.templateKey ?? 'corner_information_basic_v1',
    sections: (screen.sections ?? []) as QrScreenSet['sections'],
  };
  return <PublicScreenSetViewer screenSet={viewerSet} />;
}

// '사용 중인 코너' 계산용 최소 태블릿 정보(페이지의 TabletType 하위집합).
export interface ScreenSetUsageTablet {
  id: string;
  name: string;
  location?: string | null;
  currentScreenSetId?: string | null;
}

interface Props {
  onToast: (t: Toast) => void;
  // 각 세트가 어느 코너에서 현재 사용 중인지 표시.
  tablets?: ScreenSetUsageTablet[];
  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 제작 셸 미리보기용(opt-in).
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
  // WO-O4O-KPA-TABLET-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 리스트 미리보기 코너 문맥(단독=코너 없음) 전달.
  onPreviewContext?: (tabletId: string | null) => void;
  // WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: 콘텐츠 카드 → 대상 태블릿에 바로 적용(기존 current-screen-set API).
  onApplyToTablet?: (screenSetId: string, tabletId: string) => Promise<void>;
  // 방금 가져온 사본 하이라이트(HUB 가져오기 완료 시 전달).
  highlightId?: string | null;
  /**
   * WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §E-1:
   *   진입 시 이 화면 세트의 편집기를 바로 연다(QR 목록의 '화면 세트 열기' 동선).
   *   미지정이면 기존처럼 목록부터 시작한다. 세트를 못 찾으면 목록에 머물고 안내만 띄운다.
   */
  autoEditId?: string | null;
  /** 같은 id 재요청을 구분하는 요청 식별자(누를 때마다 증가). 미지정이면 id 당 1회. */
  autoEditKey?: number;
  /** 자동 편집 요청을 소비(상세 조회 성공·실패 무관)했음을 알린다. 호출부는 요청을 비운다. */
  onAutoEditHandled?: (key: number) => void;
}

export default function TabletScreenSetManager(props: Readonly<Props>) {
  const scope = useStoreOperationScope();
  return <ScreenSetManagerSession key={scope.key} {...props} isCurrent={scope.isCurrent} />;
}
async function loadScreenSets() {
  const sets = await fetchScreenSets({ includeArchived: true });
  if (!Array.isArray(sets)) throw new Error('Invalid screen sets');
  return sets;
}
function ScreenSetManagerSession({ onToast: notify, tablets, previewApi, storeSlug, onPreviewContext, onApplyToTablet, highlightId, autoEditId, autoEditKey, onAutoEditHandled, isCurrent }: Props & { isCurrent: () => boolean }) {
  const onToast = useCallback((notice: Toast) => { if (isCurrent()) notify(notice); }, [notify, isCurrent]);
  const { data: sets, loading, error: listError, reload } = useStoreResource(loadScreenSets, []);
  const refresh = useCallback(() => { if (isCurrent()) void reload(); }, [isCurrent, reload]);
  const edits = useLatestStoreRequest();
  const sessions = useLatestStoreRequest();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const mutation = useRef(false);
  const savedHeader = useRef<ScreenSet | null>(null);
  const [savedSet, setSavedSet] = useState<ScreenSet | null>(null);
  const [busy, setBusy] = useState(false);

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 인라인 생성/편집 UI → 단계형 제작 셸.
  const [builder, setBuilder] = useState<{ detail: ScreenSetDetail | null; current: () => boolean } | null>(null);

  // WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1:
  //   코너 내용 편집기(RichTextEditor)에 이미지 업로드 / 공용 미디어 라이브러리를 연결한다.
  //   업로드 경로·sanitize 기준은 기존 상품 설명 편집기와 동일(신규 저장소 없음).
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(null);
  const [videoPickerTarget, setVideoPickerTarget] = useState<((asset: { id: string; url: string; title: string }) => void) | null>(null);

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!builder?.current()) throw new Error('편집 대상이 변경되었습니다.');
    const res = await mediaApi.upload(file, true, getActiveServiceKey(), 'tablet-screen-set');
    if (!builder.current()) throw new Error('편집 대상이 변경되었습니다.');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드에 실패했습니다.');
  }, [builder]);

  const builderOptions = useMemo(() => ({
    pool: async () => { if (!builder?.current()) throw new Error('편집 대상이 변경되었습니다.'); const data = await fetchStoreProductPool(); if (!builder.current()) throw new Error('편집 대상이 변경되었습니다.'); return data; },
    qr: async () => { if (!builder?.current()) throw new Error('편집 대상이 변경되었습니다.'); const data = await fetchStoreQrOptions(); if (!builder.current()) throw new Error('편집 대상이 변경되었습니다.'); return data; },
  }), [builder]);
  const builderApi = useMemo(() => {
    const session = createScreenSetSession({ ...defaultStoreBuilderReads, ...captureScreenSetWrites() }, builder?.current ?? (() => false));
    const remember = async (operation: Promise<ScreenSet>) => {
      const header = await operation;
      if (builder?.current()) savedHeader.current = header;
      return header;
    };
    return { ...session, create: (input: Parameters<typeof session.create>[0]) => remember(session.create(input)), update: (id: string, input: Parameters<typeof session.update>[1]) => remember(session.update(id, input)) };
  }, [builder]);
  const closeBuilder = () => { sessions.cancel(); setBuilder(null); setMediaPickerTarget(null); setVideoPickerTarget(null); };

  // WO-...-CONTENT-LIBRARY-TAB-SPLIT-V1: library 모드 — 세트 id → 적용 중인 코너 이름 목록.
  const usageBySet = (() => {
    const m: Record<string, string[]> = {};
    (tablets ?? []).forEach((t) => {
      if (t.currentScreenSetId) (m[t.currentScreenSetId] ??= []).push(t.location?.trim() || t.name);
    });
    return m;
  })();


  const openEdit = useCallback(async (id: string) => {
    if (mutation.current || !isCurrent()) return;
    const current = edits.begin(); setOpeningId(id);
    try {
      const detail = await fetchScreenSet(id);
      if (!current() || !isCurrent()) return;
      if (detail.id !== id) throw new Error('Invalid screen set');
      const session = sessions.begin();
      savedHeader.current = null; setSavedSet(null);
      setBuilder({ detail, current: () => session() && isCurrent() });
    } catch { if (current() && isCurrent()) onToast({ type: 'error', message: '화면 상세를 불러오지 못했습니다. 다시 수정 버튼을 눌러 주세요.' }); }
    finally { if (current() && isCurrent()) setOpeningId(null); }
  }, [edits, sessions, isCurrent, onToast]);

  const openCreate = useCallback(() => {
    if (mutation.current || !isCurrent()) return;
    edits.cancel(); setOpeningId(null);
    const session = sessions.begin();
    savedHeader.current = null; setSavedSet(null);
    setBuilder({ detail: null, current: () => session() && isCurrent() });
  }, [edits, sessions, isCurrent]);

  // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §E-1:
  //   QR 목록에서 넘어온 화면 세트 편집기를 1회만 자동 오픈한다(호출부가 history state 를 즉시 비우므로
  //   재마운트로 반복 열리지 않는다). 보관·삭제된 세트는 상세 조회가 404 → openEdit 이 안내 토스트만 띄운다.
  //   요청마다(autoEditKey) 한 번씩 처리한다 — 편집기를 닫은 뒤 같은 안내를 다시 요청해도 열린다.
  const handledAutoEdit = useRef<string | null>(null);
  useEffect(() => {
    if (!autoEditId) return;
    const key = autoEditKey ?? 0;
    const request = `${key}:${autoEditId}`;
    if (handledAutoEdit.current === request) return;
    let disposed = false;
    void Promise.resolve().then(async () => {
      if (disposed) return;
      await openEdit(autoEditId);
      if (disposed) return;
      handledAutoEdit.current = request;
      onAutoEditHandled?.(key);
    });
    return () => { disposed = true; edits.cancel(); };
  }, [autoEditId, autoEditKey, openEdit, edits, onAutoEditHandled]);

  // WO-O4O-KPA-TABLET-CONTENT-LIST-REMOVE-LABEL-V1: 사용자 문구 '보관' → '리스트에서 제거'(내부는 archived/soft-delete 그대로).
  const handleArchive = async (set: ScreenSet) => {
    if (mutation.current || !isCurrent()) return;
    if (!window.confirm(`“${set.name}” 을(를) 리스트에서 제거하시겠습니까?\n콘텐츠는 삭제되지 않으며, ‘리스트에서 제거됨’ 필터에서 다시 확인할 수 있습니다.`)) return;
    mutation.current = true; setBusy(true);
    try {
      await archiveScreenSet(set.id);
      if (!isCurrent()) return;
      onToast({ type: 'success', message: '리스트에서 제거했습니다.' });
      await reload();
    } catch (e: any) {
      const msg = (e?.code === 'SCREEN_SET_IN_USE' || e?.code === 'ARCHIVE_BLOCKED_CONNECTED')
        ? '이 콘텐츠는 현재 코너에 연결되어 있어 제거할 수 없습니다. 먼저 코너 연결을 해제해 주세요.'
        : (e?.message || '리스트에서 제거하지 못했습니다.');
      onToast({ type: 'error', message: msg });
    } finally { mutation.current = false; if (isCurrent()) setBusy(false); }
  };

  // WO-O4O-SCREEN-SET-CORNER-CONTENT-E2E-SMOKE-V1: 보관 해제(복원).
  //   보관해도 slug 는 그대로 남으므로 복원하면 기존 코너 QR 이 같은 주소로 다시 살아난다.
  const handleRestore = async (set: ScreenSet) => {
    if (mutation.current || !isCurrent()) return;
    if (!window.confirm(`“${set.name}” 의 보관을 해제하시겠습니까?\n목록에 다시 나타나고, 이 콘텐츠의 코너 QR 주소도 다시 열립니다.`)) return;
    mutation.current = true; setBusy(true);
    try {
      await updateScreenSet(set.id, { status: 'active' });
      if (!isCurrent()) return;
      onToast({ type: 'success', message: '보관을 해제했습니다.' });
      await reload();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '보관을 해제하지 못했습니다.' });
    } finally { mutation.current = false; if (isCurrent()) setBusy(false); }
  };

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 제작/수정은 단계형 제작 셸이 화면을 전환(takeover).
  //   공유 편집기에 **매장 API(defaultStoreBuilderApi)** 를 명시 주입(회귀 0).
  if (builder) {
    return (
      <>
        {builder.detail && <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          현재 사용 위치: {(usageBySet[builder.detail.id] ?? []).join(', ') || '없음'}. 저장하면 이 안내를 사용하는 화면과 공개 중인 기존 QR에도 변경 내용이 반영됩니다. 실제 기기 표시는 기기에서 확인하세요.
        </p>}
        <TabletContentStepBuilder
          initialDetail={builder.detail}
          onCancel={closeBuilder}
          onSaved={() => {
            if (!builder.current()) return;
            setSavedSet(savedHeader.current ?? builder.detail);
            closeBuilder(); void reload();
          }}
          onToast={(notice) => { if (builder.current()) onToast(notice); }}
          previewApi={previewApi}
          storeSlug={storeSlug ?? null}
          api={builderApi}
          // WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1
          fetchProductPool={builderOptions.pool}
          // WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1
          fetchStoreQrCodes={builderOptions.qr}
          onVideoLibraryPick={select => { if (builder.current()) setVideoPickerTarget(() => select); }}
          onImageUpload={handleImageUpload}
          onMediaLibraryPick={(insertMedia) => { if (builder.current()) setMediaPickerTarget(() => insertMedia); }}
          // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §4: 실제 /qr/:slug 뷰어 주입.
          renderMobilePreview={renderQrMobilePreview}
          // WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1: 내 매장 = 내부 AI OFF
          showInternalAi={false}
        />
        <MediaPickerModal open={!!videoPickerTarget} onClose={() => setVideoPickerTarget(null)} assetType="video" contextKey={`${storeSlug ?? ''}:${builder.detail?.id ?? 'new'}`} title="태블릿 보관 영상" defaultFolder="general"
          onSelect={asset => { if (builder.current()) { videoPickerTarget?.({ id: asset.id, url: asset.url, title: asset.originalName }); }
            setVideoPickerTarget(null); }} />
        <MediaPickerModal
          open={!!mediaPickerTarget}
          onClose={() => setMediaPickerTarget(null)}
          onSelect={(asset) => {
            if (builder.current()) mediaPickerTarget?.({ type: 'image', url: asset.url, title: asset.originalName });
            setMediaPickerTarget(null);
          }}
          title="코너 내용 이미지"
          defaultFolder="tablet-screen-set"
        />
      </>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-100">
      <div className="px-4 py-3 border-b bg-indigo-50/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> 태블릿 콘텐츠 (화면 세트)
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-slate-600">안내를 만들거나 수정한 뒤 사용할 위치에 적용하세요. 같은 안내를 여러 위치에서 사용할 수 있습니다.</p>

        {openingId && <p role="status">화면 상세 불러오는 중… <button type="button" onClick={() => { edits.cancel(); setOpeningId(null); }}>불러오기 취소</button></p>}
        {listError ? <div role="alert">{savedSet && <p>“{savedSet.name}” 내용은 저장되었습니다. 목록을 다시 불러온 뒤 적용할 위치를 선택하세요.</p>}{listError}<button type="button" onClick={() => void reload()} className="min-h-11 underline ml-2">다시 시도</button></div> : <TabletContentLibraryList
          isCurrent={isCurrent}
          sets={sets}
          loading={loading}
          busy={busy}
          usageBySet={usageBySet}
          templateLabel={templateLabel}
          hiddenTemplateFilterKeys={LEGACY_ONLY_TEMPLATE_KEYS}
          onCreate={openCreate}
          onEdit={openEdit}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onRefresh={refresh}
          previewApi={previewApi}
          storeSlug={storeSlug ?? null}
          onPreviewContext={onPreviewContext}
          tablets={tablets}
          onApplyToTablet={onApplyToTablet}
          highlightId={savedSet?.id ?? highlightId}
          savedSet={savedSet}
        />}
      </div>
    </div>
  );
}
