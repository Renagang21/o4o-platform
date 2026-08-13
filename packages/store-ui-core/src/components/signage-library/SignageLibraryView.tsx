/**
 * SignageLibraryView — Store HUB 사이니지 라이브러리 공통 View
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
 *
 * KPA / K-Cosmetics / GlycoPharm 의 대형 사본 3벌(1,811L)을 대체한다.
 * 서비스가 넘기는 것은 useSignageLibrary 결과 + config 뿐이고, 이 View 안에는
 * 서비스 이름으로 갈라지는 분기가 없다.
 *
 * config 로 흡수한 실제 차이:
 *   accent          blue(KPA·GP) / pink(KCos)
 *   ownerLabel      '내 약국'(KPA·GP) / '내 매장'(KCos)
 *   sortable        KPA false — WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3)
 *                   에서 "현재 페이지만 정렬되는 UI" 를 의도적으로 제거했다. 되돌리지 않는다.
 *   headerAction    KPA 만 '플레이리스트 만들기' CTA
 *   importedTargets KPA 만 가져오기 직후 사본 확인 배너 (A-6)
 *   producerTabs    서비스별 출처 필터 옵션
 *   guide           안내문 링크 대상 (KPA canonical playlist / KCos·GP signage)
 *   labels          유형·출처 라벨 맵 (@o4o/types 의존을 Core 로 끌어오지 않기 위해 주입)
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Plus, X, ExternalLink, Monitor, ListVideo } from 'lucide-react';
import { ActionBar, BaseDetailDrawer, BulkResultModal } from '@o4o/ui';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { storeAccentTokens } from '../../theme/storeAccent';
import type { StoreAccent } from '../../theme/storeAccent';
import type { SignageLibraryItem, UseSignageLibraryResult, SignageViewTab } from './useSignageLibrary';

export interface SignageProducerTab {
  key: string;
  label: string;
}

export interface SignageLibraryGuide {
  /** 안내문 링크 href */
  href: string;
  /** 안내문 링크 문구 */
  linkLabel: string;
}

export interface SignageImportedTargets {
  /** 미디어 탭에서 가져온 사본을 확인할 경로 */
  media: string;
  /** 플레이리스트 탭에서 가져온 사본을 확인할 경로 */
  playlist: string;
  /** 미디어 탭 배너 CTA 문구 */
  mediaLabel: string;
  /** 플레이리스트 탭 배너 CTA 문구 */
  playlistLabel: string;
}

export interface SignageLibraryViewProps<T extends SignageLibraryItem> {
  core: UseSignageLibraryResult<T>;
  accent: StoreAccent;
  /** '내 약국' / '내 매장' */
  ownerLabel: string;
  title: string;
  description: string;
  tableId: string;
  producerTabs: readonly SignageProducerTab[];
  guide: SignageLibraryGuide;
  /** 유형 배지 라벨 맵 (@o4o/types/signage SIGNAGE_MEDIA_TYPE_LABELS) */
  mediaTypeLabels: Record<string, string>;
  /** 출처 배지 라벨 맵 (@o4o/types/hub-content HUB_PRODUCER_LABELS) */
  producerLabels: Record<string, string>;
  /**
   * 컬럼 정렬 UI 노출 여부. 서버 정렬이 아니라 현재 페이지만 정렬되므로
   * 서비스 정책이 갈린다. 기본은 현행 KCos/GP 동작(true).
   */
  sortable?: boolean;
  /** 헤더 우측 CTA (KPA '플레이리스트 만들기'). 없으면 헤더는 제목만 렌더한다. */
  headerAction?: ReactNode;
  /** 가져오기 직후 사본 확인 배너. 미지정이면 배너를 렌더하지 않는다. */
  importedTargets?: SignageImportedTargets;
  /** 안내문 본문 커스터마이즈. 미지정 시 공통 문구. */
  guideText?: ReactNode;
  /** Link 컴포넌트 주입 (react-router 의존을 소비처에 둔다) */
  renderLink: (props: { to: string; className: string; children: ReactNode }) => ReactNode;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('ko-KR');
}

const VIEW_TABS: { key: SignageViewTab; label: string }[] = [
  { key: 'media', label: '미디어' },
  { key: 'playlist', label: '플레이리스트' },
];

export function SignageLibraryView<T extends SignageLibraryItem>({
  core,
  accent,
  ownerLabel,
  title,
  description,
  tableId,
  producerTabs,
  guide,
  mediaTypeLabels,
  producerLabels,
  sortable = true,
  headerAction,
  importedTargets,
  guideText,
  renderLink,
}: SignageLibraryViewProps<T>) {
  const ac = storeAccentTokens(accent);
  const isPlaylist = core.viewTab === 'playlist';
  const unitLabel = isPlaylist ? '플레이리스트' : '미디어';

  const columns: ListColumnDef<T>[] = useMemo(
    () => [
      {
        key: 'title',
        header: '제목',
        ...(sortable ? { sortable: true, sortAccessor: (item: T) => item.title } : {}),
        render: (_v: unknown, item: T) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
              {isPlaylist ? <ListVideo className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            </div>
            <span className="font-medium text-slate-800 text-sm truncate">{item.title}</span>
          </div>
        ),
      },
      {
        key: 'mediaType',
        header: '유형',
        width: '110px',
        render: (_v: unknown, item: T) => {
          if (isPlaylist) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                플레이리스트
              </span>
            );
          }
          const label = item.mediaType ? mediaTypeLabels[item.mediaType] || item.mediaType : '-';
          return (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-violet-50 border-violet-200 text-violet-700">
              {label}
            </span>
          );
        },
      },
      {
        key: 'producer',
        header: '출처',
        width: '90px',
        render: (_v: unknown, item: T) => {
          const label = item.producer ? producerLabels[item.producer] || item.producer : '-';
          return (
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-slate-50 border-slate-200 text-slate-600">
              {label}
            </span>
          );
        },
      },
      {
        key: 'duration',
        header: '재생시간',
        width: '90px',
        render: (_v: unknown, item: T) => {
          const d = isPlaylist ? item.totalDuration : item.duration;
          if (!d || d === 0) return <span className="text-xs text-slate-400">-</span>;
          return <span className="text-xs text-slate-600">{formatDuration(d)}</span>;
        },
      },
      {
        key: 'items',
        header: '항목수',
        width: '70px',
        render: (_v: unknown, item: T) => {
          if (!isPlaylist) return <span className="text-xs text-slate-400">-</span>;
          return <span className="text-xs text-slate-600">{item.itemCount ?? 0}개</span>;
        },
      },
      {
        key: 'creatorName',
        header: '등록자',
        width: '110px',
        render: (_v: unknown, item: T) => (
          <span className="text-xs text-slate-500">{item.creatorName || '-'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: '등록일',
        width: '95px',
        ...(sortable
          ? { sortable: true, sortAccessor: (item: T) => new Date(item.createdAt).getTime() }
          : {}),
        render: (_v: unknown, item: T) => (
          <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
        ),
      },
    ],
    [isPlaylist, sortable, mediaTypeLabels, producerLabels],
  );

  const activeFilterLabel = producerTabs.find((f) => f.key === core.sourceFilter)?.label;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero */}
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        </div>
        {headerAction}
      </header>

      {/* View Tabs (미디어 / 플레이리스트) */}
      <div className="flex gap-1 mb-4 border-b-2 border-slate-200">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => core.setViewTab(tab.key)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[2px] transition-colors',
              core.viewTab === tab.key
                ? ac.tabActive
                : 'text-slate-500 border-transparent hover:text-slate-700',
            ].join(' ')}
          >
            {tab.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {tab.key === 'media' ? core.mediaCount : core.playlistCount}
            </span>
          </button>
        ))}
      </div>

      {/* Source Filter Pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {producerTabs.map((f) => (
          <button
            key={f.key}
            onClick={() => core.setSourceFilter(f.key)}
            className={[
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              core.sourceFilter === f.key
                ? ac.pillActive
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {core.error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{core.error}</p>
          <button
            onClick={core.reload}
            className={['mt-3 px-4 py-1.5 text-xs border rounded-lg', ac.outlineBtn].join(' ')}
          >
            다시 시도
          </button>
        </div>
      )}

      {!core.error && (
        <>
          {/* ActionBar — 선택 항목이 있을 때만 표시 */}
          <div className="mb-3">
            <ActionBar
              selectedCount={core.selectedIds.size}
              onClearSelection={core.clearSelection}
              actions={[
                {
                  key: 'bulk-add',
                  label: `${ownerLabel}에 추가 (${core.selectedIds.size})`,
                  onClick: core.copySelected,
                  variant: 'primary' as const,
                  icon: <Plus className="w-3.5 h-3.5" />,
                  loading: core.batch.loading,
                  group: 'actions',
                  tooltip: `선택한 항목을 ${ownerLabel} 사이니지에 일괄 추가합니다`,
                  visible: core.selectedIds.size > 0,
                },
                {
                  key: 'clear',
                  label: '선택 해제',
                  onClick: core.clearSelection,
                  variant: 'default' as const,
                  icon: <X className="w-3.5 h-3.5" />,
                  group: 'meta',
                  visible: core.selectedIds.size > 0,
                },
              ]}
            />
          </div>

          <BulkResultModal
            open={core.batch.showResult}
            onClose={() => core.batch.clearResult()}
            result={core.batch.result}
            onRetry={() => core.batch.retryFailed()}
          />

          <DataTable<T>
            columns={columns}
            data={core.items}
            rowKey="id"
            loading={core.isLoading}
            emptyMessage={
              core.sourceFilter === 'all'
                ? `현재 제공되는 ${isPlaylist ? '플레이리스트' : '사이니지 미디어'}가 없습니다.`
                : `"${activeFilterLabel}" 출처의 ${unitLabel}가 없습니다.`
            }
            tableId={`${tableId}-${core.viewTab}`}
            selectable
            selectedKeys={core.selectedIds}
            onSelectionChange={core.setSelectedIds}
            onRowClick={(row: T) => core.setSelectedItem(row)}
          />

          {/* 가져오기 직후 사본 확인 경로 */}
          {importedTargets && core.imported && (
            <div className="mt-4 flex flex-wrap items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900">
              <span className="text-base shrink-0">✅</span>
              <span className="flex-1 min-w-0">
                {core.imported.count === 1 && core.imported.title
                  ? `“${core.imported.title}” 을(를) ${ownerLabel} 사본으로 가져왔습니다.`
                  : `${core.imported.count}개 항목을 ${ownerLabel} 사본으로 가져왔습니다.`}
              </span>
              {renderLink({
                to: isPlaylist ? importedTargets.playlist : importedTargets.media,
                className:
                  'shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 no-underline',
                children: isPlaylist ? importedTargets.playlistLabel : importedTargets.mediaLabel,
              })}
              <button
                type="button"
                onClick={core.dismissImported}
                className="shrink-0 p-1 rounded text-emerald-700 hover:bg-emerald-100"
                aria-label="안내 닫기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {core.paginationVisible && (
            <Pagination
              page={core.page}
              totalPages={core.totalPages}
              onPageChange={core.setPage}
              total={core.total}
            />
          )}
        </>
      )}

      {/* 안내 — 값 복사형 사본 정책 */}
      <div
        className={[
          'flex items-start gap-3 mt-8 p-5 border rounded-xl text-sm text-slate-600 leading-relaxed',
          ac.noticeBox,
        ].join(' ')}
      >
        <span className="text-lg shrink-0">💡</span>
        <span>
          {guideText ?? (
            <>
              가져온 자료는 {ownerLabel}의 독립 사본으로 저장됩니다. 같은 자료를 다시 가져오면 새로운 사본이
              생성됩니다. 추가한 콘텐츠는{' '}
              {renderLink({ to: guide.href, className: ac.link, children: guide.linkLabel })}
              에서 플레이리스트 구성과 스케줄 적용을 할 수 있습니다.
            </>
          )}
        </span>
      </div>

      {/* Row Click Detail Drawer */}
      <BaseDetailDrawer
        open={!!core.selectedItem}
        onClose={() => core.setSelectedItem(null)}
        title={core.selectedItem?.title ?? ''}
        width={480}
        actions={
          core.selectedItem
            ? [
                {
                  label: `${ownerLabel}에 추가`,
                  onClick: () => core.copySingle(core.selectedItem as T),
                  variant: 'primary' as const,
                },
              ]
            : []
        }
      >
        {core.selectedItem && (
          <div className="space-y-4 p-1">
            <div className="flex items-center gap-2 flex-wrap">
              {!isPlaylist && core.selectedItem.mediaType && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-violet-50 border-violet-200 text-violet-700">
                  {mediaTypeLabels[core.selectedItem.mediaType] || core.selectedItem.mediaType}
                </span>
              )}
              {isPlaylist && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                  플레이리스트
                </span>
              )}
              {core.selectedItem.producer && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                  {producerLabels[core.selectedItem.producer] || core.selectedItem.producer}
                </span>
              )}
            </div>

            {core.selectedItem.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{core.selectedItem.description}</p>
            )}

            <dl className="space-y-2 text-sm">
              {!isPlaylist && core.selectedItem.duration != null && core.selectedItem.duration > 0 && (
                <div className="flex gap-3">
                  <dt className="w-20 text-slate-400 shrink-0">재생시간</dt>
                  <dd className="text-slate-700">{formatDuration(core.selectedItem.duration)}</dd>
                </div>
              )}
              {isPlaylist && (
                <>
                  {(core.selectedItem.itemCount ?? 0) > 0 && (
                    <div className="flex gap-3">
                      <dt className="w-20 text-slate-400 shrink-0">항목수</dt>
                      <dd className="text-slate-700">{core.selectedItem.itemCount}개</dd>
                    </div>
                  )}
                  {(core.selectedItem.totalDuration ?? 0) > 0 && (
                    <div className="flex gap-3">
                      <dt className="w-20 text-slate-400 shrink-0">총 재생시간</dt>
                      <dd className="text-slate-700">
                        {formatDuration(core.selectedItem.totalDuration as number)}
                      </dd>
                    </div>
                  )}
                </>
              )}
              {core.selectedItem.creatorName && (
                <div className="flex gap-3">
                  <dt className="w-20 text-slate-400 shrink-0">등록자</dt>
                  <dd className="text-slate-700">{core.selectedItem.creatorName}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <dt className="w-20 text-slate-400 shrink-0">등록일</dt>
                <dd className="text-slate-700">{formatDate(core.selectedItem.createdAt)}</dd>
              </div>
            </dl>

            {core.selectedItem.sourceUrl && (
              <a
                href={core.selectedItem.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={['inline-flex items-center gap-1.5 text-xs hover:underline mt-1', ac.text].join(' ')}
              >
                <ExternalLink className="w-3 h-3" />
                원본 보기
              </a>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

export default SignageLibraryView;
