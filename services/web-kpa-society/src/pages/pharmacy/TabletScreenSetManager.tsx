/**
 * TabletScreenSetManager — 매장(store) 태블렛 콘텐츠 라이브러리 페이지(리스트 + 제작 셸 진입)
 *
 * WO-O4O-TABLET-SCREEN-SET-EDITOR-SHARED-EXTRACTION-V2A
 *   단계형 authoring 편집기(TabletContentStepBuilder)와 그 내부(picker/미리보기/템플릿 메타)는
 *   `@o4o/tablet-screen-set-editor` 공유 패키지로 추출됨. 이 파일에는 **매장 전용 리스트 페이지**와
 *   **매장 API 인스턴스(defaultStoreBuilderApi)** 만 잔류한다. store 동작·저장 payload·5섹션 계약 불변.
 */
import { useState, useEffect, useCallback } from 'react';
import { Layers } from 'lucide-react';
import {
  fetchScreenSets, fetchScreenSet, createScreenSet, updateScreenSet,
  archiveScreenSet, saveScreenSetBlocks,
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
// 공유 편집기 + 라벨/상수/계약을 패키지에서 소비.
import {
  TabletContentStepBuilder, templateLabel, LEGACY_ONLY_TEMPLATE_KEYS,
  type ScreenSetBuilderApi, type Toast,
} from '@o4o/tablet-screen-set-editor';

// WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 제작 셸에 주입할 **매장(store) API 인스턴스**.
//   공유 편집기는 api 를 필수 주입받는다(앱 런타임 함수 의존 없음). 매장 제작기는 이 인스턴스를 주입.
const defaultStoreBuilderApi: ScreenSetBuilderApi = {
  create: (input) => createScreenSet({ ...input, tabletId: null }),
  update: (id, input) => updateScreenSet(id, input),
  saveBlocks: saveScreenSetBlocks,
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
    type: q.type,
    landingType: q.landingType,
    landingTargetId: q.landingTargetId,
    slug: q.slug,
  }));
};

// '사용 중인 코너' 계산용 최소 태블렛 정보(페이지의 TabletType 하위집합).
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
  // WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: 콘텐츠 카드 → 대상 태블렛에 바로 적용(기존 current-screen-set API).
  onApplyToTablet?: (screenSetId: string, tabletId: string) => Promise<void>;
  // 방금 가져온 사본 하이라이트(HUB 가져오기 완료 시 전달).
  highlightId?: string | null;
}

export default function TabletScreenSetManager({ onToast, tablets, previewApi, storeSlug, onPreviewContext, onApplyToTablet, highlightId }: Props) {
  const [sets, setSets] = useState<ScreenSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 인라인 생성/편집 UI → 단계형 제작 셸.
  const [builder, setBuilder] = useState<{ detail: ScreenSetDetail | null } | null>(null);

  // WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1:
  //   코너 내용 편집기(RichTextEditor)에 이미지 업로드 / 공용 미디어 라이브러리를 연결한다.
  //   업로드 경로·sanitize 기준은 기존 상품 설명 편집기와 동일(신규 저장소 없음).
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(null);

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, 'kpa-society', 'tablet-screen-set');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드에 실패했습니다.');
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSets(await fetchScreenSets({ includeArchived: true }));
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '화면 세트를 불러오지 못했습니다.' });
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  // WO-...-CONTENT-LIBRARY-TAB-SPLIT-V1: library 모드 — 세트 id → 적용 중인 코너 이름 목록.
  const usageBySet = (() => {
    const m: Record<string, string[]> = {};
    (tablets ?? []).forEach((t) => {
      if (t.currentScreenSetId) (m[t.currentScreenSetId] ??= []).push(t.location?.trim() || t.name);
    });
    return m;
  })();

  useEffect(() => { reload(); }, [reload]);

  const openEdit = useCallback(async (id: string) => {
    try {
      const detail = await fetchScreenSet(id);
      setBuilder({ detail });
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '세트 상세를 불러오지 못했습니다.' });
    }
  }, [onToast]);

  const openCreate = useCallback(() => setBuilder({ detail: null }), []);

  // WO-O4O-KPA-TABLET-CONTENT-LIST-REMOVE-LABEL-V1: 사용자 문구 '보관' → '리스트에서 제거'(내부는 archived/soft-delete 그대로).
  const handleArchive = async (set: ScreenSet) => {
    if (busy) return;
    if (!window.confirm(`“${set.name}” 을(를) 리스트에서 제거하시겠습니까?\n콘텐츠는 삭제되지 않으며, ‘리스트에서 제거됨’ 필터에서 다시 확인할 수 있습니다.`)) return;
    setBusy(true);
    try {
      await archiveScreenSet(set.id);
      onToast({ type: 'success', message: '리스트에서 제거했습니다.' });
      await reload();
    } catch (e: any) {
      const msg = (e?.code === 'SCREEN_SET_IN_USE' || e?.code === 'ARCHIVE_BLOCKED_CONNECTED')
        ? '이 콘텐츠는 현재 코너에 연결되어 있어 제거할 수 없습니다. 먼저 코너 연결을 해제해 주세요.'
        : (e?.message || '리스트에서 제거하지 못했습니다.');
      onToast({ type: 'error', message: msg });
    } finally { setBusy(false); }
  };

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 제작/수정은 단계형 제작 셸이 화면을 전환(takeover).
  //   공유 편집기에 **매장 API(defaultStoreBuilderApi)** 를 명시 주입(회귀 0).
  if (builder) {
    return (
      <>
        <TabletContentStepBuilder
          initialDetail={builder.detail}
          onCancel={() => setBuilder(null)}
          onSaved={() => { setBuilder(null); reload(); }}
          onToast={onToast}
          previewApi={previewApi}
          storeSlug={storeSlug ?? null}
          api={defaultStoreBuilderApi}
          // WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1
          fetchProductPool={fetchStoreProductPool}
          // WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1
          fetchStoreQrCodes={fetchStoreQrOptions}
          onImageUpload={handleImageUpload}
          onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
        />
        <MediaPickerModal
          open={!!mediaPickerTarget}
          onClose={() => setMediaPickerTarget(null)}
          onSelect={(asset) => {
            mediaPickerTarget?.({ type: 'image', url: asset.url, title: asset.originalName });
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
          <Layers className="w-4 h-4 text-indigo-600" /> 태블렛 콘텐츠 (화면 세트)
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed space-y-1">
          <p><b className="text-slate-700">화면 세트</b>는 태블렛 코너에 표시할 화면 구성 묶음(콘텐츠 원본)입니다. 여기서 만들고 수정하며, 실제 코너 연결·교체는 <b className="text-slate-700">코너별 운영</b> 탭에서 합니다.</p>
          <p><b className="text-slate-700">템플릿</b>은 같은 내용을 어떤 <b>배치</b>로 보여줄지 정하고, <b className="text-slate-700">블록</b>은 화면에 들어가는 <b>내용</b>(코너 설명·제품 목록·QR 안내·대기화면)입니다.</p>
          <p><b className="text-slate-700">저장</b>은 세트 내용만 저장합니다(코너에 자동 적용되지 않음). <b className="text-slate-700">보관</b>은 목록에서 숨깁니다(코너에서 사용/연결 중이면 먼저 해제해야 합니다).</p>
        </div>

        <TabletContentLibraryList
          sets={sets}
          loading={loading}
          busy={busy}
          usageBySet={usageBySet}
          templateLabel={templateLabel}
          hiddenTemplateFilterKeys={LEGACY_ONLY_TEMPLATE_KEYS}
          onCreate={openCreate}
          onEdit={openEdit}
          onArchive={handleArchive}
          onRefresh={reload}
          previewApi={previewApi}
          storeSlug={storeSlug ?? null}
          onPreviewContext={onPreviewContext}
          tablets={tablets}
          onApplyToTablet={onApplyToTablet}
          highlightId={highlightId}
        />
      </div>
    </div>
  );
}
