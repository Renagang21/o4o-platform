/**
 * StoreTabletDisplaysView — 매장 태블릿 진열 관리 화면 본체
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 *
 * 기존 KCos/GP 페이지의 마크업·동선을 그대로 옮긴다.
 * 검색·필터·정렬·pagination 은 원본에 없었고 추가하지 않는다(신규 기능 금지).
 */

import { ArrowLeft, Loader2, Save, Tablet } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TabletDisplayListPanel } from './TabletDisplayListPanel';
import { TabletIdlePlaylistSection } from './TabletIdlePlaylistSection';
import { TabletProductPoolPanel } from './TabletProductPoolPanel';
import { TabletSelectorBar } from './TabletSelectorBar';
import {
  TabletEmptyBlock,
  TabletErrorBlock,
  TabletLoadingBlock,
  TabletToastBlock,
} from './TabletStateBlocks';
import { useStoreTabletDisplays } from './useStoreTabletDisplays';
import {
  DEFAULT_TABLET_LABELS,
  TABLET_TEAL_ACCENT,
  type StoreTabletAccentClasses,
  type StoreTabletDisplaysApi,
  type StoreTabletDisplaysLabels,
} from './types';

export interface StoreTabletDisplaysViewProps<TIdleItem> {
  /** 서비스 API adapter — endpoint·payload 는 서비스 소유 */
  api: StoreTabletDisplaysApi<TIdleItem>;
  /** 뒤로가기 목적지 */
  backTo: string;
  labels?: Partial<StoreTabletDisplaysLabels>;
  accent?: Partial<StoreTabletAccentClasses>;
  /**
   * Idle 편집기 slot — 서비스가 @o4o/tablet-kiosk-core 의 IdlePlaylistEditor 를 주입한다.
   * (Core 는 kiosk-core 를 의존하지 않는다 — 계약 무변경)
   */
  renderIdleEditor: (ctx: {
    items: TIdleItem[];
    onChange: (items: TIdleItem[]) => void;
    disabled: boolean;
  }) => ReactNode;
  /** 헤더 저장 버튼 좌측에 붙일 서비스 전용 액션 */
  headerActions?: ReactNode;
}

export function StoreTabletDisplaysView<TIdleItem>({
  api,
  backTo,
  labels,
  accent,
  renderIdleEditor,
  headerActions,
}: StoreTabletDisplaysViewProps<TIdleItem>) {
  const navigate = useNavigate();
  const L = { ...DEFAULT_TABLET_LABELS, ...labels };
  const A = { ...TABLET_TEAL_ACCENT, ...accent };
  const s = useStoreTabletDisplays<TIdleItem>(api);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(backTo)} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Tablet className={`w-7 h-7 ${A.icon}`} />
              {L.pageTitle}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{L.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <button
            onClick={s.saveDisplays}
            disabled={!s.hasChanges || s.saving}
            className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${A.saveButton}`}
          >
            {s.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      {s.loadingTablets && (
        <TabletLoadingBlock spinnerClass={A.spinner} message="태블릿 로딩 중..." />
      )}

      {!s.loadingTablets && s.tablets.length === 0 && (
        <TabletEmptyBlock title={L.emptyTabletsTitle} hint={L.emptyTabletsHint} />
      )}

      {s.error && <TabletErrorBlock message={s.error} />}

      {!s.loadingTablets && s.tablets.length > 0 && (
        <>
          <TabletSelectorBar
            tablets={s.tablets}
            selectedTabletId={s.selectedTabletId}
            onSelect={s.setSelectedTabletId}
            hasChanges={s.hasChanges}
            selectClass={A.select}
          />

          {s.loadingPool && (
            <TabletLoadingBlock spinnerClass={A.spinner} message="데이터 로딩 중..." size="sm" />
          )}

          {!s.loadingPool && (
            <TabletIdlePlaylistSection
              description={L.idleDescription}
              hasChanges={s.idleChanged}
              saving={s.savingIdle}
              onSave={s.saveIdle}
              saveButtonClass={A.idleSaveButton}
            >
              {renderIdleEditor({
                items: s.idleItems,
                onChange: s.setIdleItems,
                disabled: s.savingIdle,
              })}
            </TabletIdlePlaylistSection>
          )}

          {!s.loadingPool && s.pool && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TabletProductPoolPanel
                pool={s.pool}
                displays={s.displays}
                poolTab={s.poolTab}
                onChangeTab={s.changePoolTab}
                poolItems={s.poolItems}
                selectedPoolIds={s.selectedPoolIds}
                onToggleItem={s.togglePoolItem}
                onAddSelected={s.addSelectedToDisplay}
                tabActiveClass={A.tabActive}
                addButtonClass={A.addButton}
                checkboxClass={A.checkbox}
              />
              <TabletDisplayListPanel
                displays={s.displays}
                onMove={s.moveDisplayItem}
                onRemove={s.removeDisplayItem}
              />
            </div>
          )}
        </>
      )}

      {s.toast && <TabletToastBlock toast={s.toast} />}
    </div>
  );
}
