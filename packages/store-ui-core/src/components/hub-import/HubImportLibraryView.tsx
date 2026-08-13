/**
 * HubImportLibraryView — Store HUB 자료 진열 + 매장 가져오기 공통 View
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
 *
 * KPA-Society · K-Cosmetics · GlycoPharm 의 블로그 / POP / QR 진열 화면 9개가
 * 문구·아이콘·경로·accent 를 빼면 동일한 마크업이었다. 그 화면 골격을 한 곳으로 모은다.
 *
 * 상태는 `useHubImportLibrary`(Core)가, 화면은 이 View 가, API adapter 와 문구는
 * 서비스 wrapper 가 소유한다. 서비스 이름 분기는 이 파일에 두지 않는다.
 *
 * 원본/사본 경계: HUB 목록은 운영자 **원본**의 읽기 전용 진열이고,
 * 가져오기가 만드는 것은 매장 소유 **사본**이다. View 는 둘을 동일 객체로 다루지 않는다.
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Download, X, ExternalLink } from 'lucide-react';
import { ActionBar, BaseDetailDrawer, BulkResultModal } from '@o4o/ui';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { storeAccentTokens } from '../../theme/storeAccent';
import type { StoreAccent } from '../../theme/storeAccent';
import type { UseHubImportLibraryResult } from './useHubImportLibrary';

/**
 * View 가 렌더에 실제로 요구하는 필드. Core 의 `HubImportLibraryItem`(id 만) 보다 넓다.
 * 서비스 응답 타입이 이 위를 확장한다.
 */
export interface HubImportLibraryRow {
  id: string;
  title: string;
  createdAt: string | Date;
  description?: string | null;
}

export interface HubImportLibraryLabels {
  /** '내 약국' / '내 매장' */
  ownerLabel: string;
  /** 출처 배지 문구 */
  producerBadge: string;
  /** 일괄 가져가기 버튼 tooltip */
  bulkTooltip: string;
  /** 목록 empty 문구 */
  emptyMessage: string;
}

export interface HubImportLibraryViewProps<T extends HubImportLibraryRow> {
  core: UseHubImportLibraryResult<T>;
  accent: StoreAccent;
  title: string;
  description: string;
  tableId: string;
  labels: HubImportLibraryLabels;
  /** 제목 컬럼 좌측 아이콘 */
  titleIcon: ReactNode;
  /**
   * 컬럼 정렬 UI 노출 여부. 서버 정렬이 아니라 현재 페이지만 정렬되므로 서비스 정책이 갈린다.
   * KPA 는 WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3) 으로 이미 제거했다 → false.
   */
  sortable?: boolean;
  /** 헤더 우측 CTA ('직접 만들기'). 없으면 헤더는 제목만 렌더한다. */
  headerAction?: ReactNode;
  /** 설명문 아래 보조 링크 (KCos/GP POP '사본 관리 →'). */
  headerBelow?: ReactNode;
  /** 하단 안내문. 사본 정책 문구가 자료 종류마다 달라 통째로 주입한다. */
  footerNote?: ReactNode;
}

export function HubImportLibraryView<T extends HubImportLibraryRow>({
  core,
  accent,
  title,
  description,
  tableId,
  labels,
  titleIcon,
  sortable = true,
  headerAction,
  headerBelow,
  footerNote,
}: HubImportLibraryViewProps<T>) {
  const ac = storeAccentTokens(accent);
  const { ownerLabel } = labels;

  const columns: ListColumnDef<T>[] = useMemo(
    () => [
      {
        key: 'title',
        header: '제목',
        ...(sortable ? { sortable: true } : {}),
        render: (_v: unknown, item: T) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
              {titleIcon}
            </div>
            <span className="font-medium text-slate-800 text-sm truncate">{item.title}</span>
          </div>
        ),
      },
      {
        key: 'producer',
        header: '출처',
        width: '100px',
        render: () => (
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 text-xs rounded-full border',
              ac.badge,
            ].join(' ')}
          >
            {labels.producerBadge}
          </span>
        ),
      },
      {
        key: 'description',
        header: '요약',
        render: (_v: unknown, item: T) => (
          <span className="text-xs text-slate-500 line-clamp-1">{item.description || '-'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: '게시일',
        width: '110px',
        ...(sortable ? { sortable: true } : {}),
        render: (_v: unknown, item: T) => (
          <span className="text-xs text-slate-500">
            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
          </span>
        ),
      },
    ],
    [sortable, titleIcon, labels.producerBadge, ac.badge],
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
          {headerBelow}
        </div>
        {headerAction}
      </header>

      {/* 매장 미연결 안내 — slug 확인이 끝난 뒤에만 노출한다. */}
      {core.slugResolved && !core.slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
          매장 정보가 연결되지 않아 가져가기 기능을 사용할 수 없습니다. 매장 등록 후 다시 시도해
          주세요.
        </div>
      )}

      {core.error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{core.error}</p>
          <button
            onClick={() => core.reload()}
            className={['mt-3 px-4 py-1.5 text-xs border rounded-lg', ac.outlineBtn].join(' ')}
          >
            다시 시도
          </button>
        </div>
      )}

      {!core.error && (
        <>
          <div className="mb-3">
            <ActionBar
              selectedCount={core.selectedIds.size}
              onClearSelection={core.clearSelection}
              actions={[
                {
                  key: 'bulk-import',
                  label: `${ownerLabel}에 가져가기 (${core.selectedIds.size})`,
                  onClick: core.importSelected,
                  variant: 'primary' as const,
                  icon: <Download className="w-3.5 h-3.5" />,
                  loading: core.batch.loading,
                  group: 'actions',
                  tooltip: labels.bulkTooltip,
                  visible: core.selectedIds.size > 0,
                  disabled: !core.slug,
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
            emptyMessage={labels.emptyMessage}
            tableId={tableId}
            selectable
            selectedKeys={core.selectedIds}
            onSelectionChange={core.setSelectedIds}
            onRowClick={(row) => core.setSelectedItem(row)}
          />

          {core.totalPages > 1 && (
            <Pagination
              page={core.page}
              totalPages={core.totalPages}
              onPageChange={core.setPage}
              total={core.total}
            />
          )}
        </>
      )}

      {/* 사본 정책 안내 — 매장이 연결되고 진열이 있을 때만 */}
      {footerNote && core.slug && core.items.length > 0 && (
        <div
          className={[
            'flex items-start gap-3 mt-8 p-5 border rounded-xl text-sm text-slate-600 leading-relaxed',
            ac.noticeBox,
          ].join(' ')}
        >
          <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>{footerNote}</span>
        </div>
      )}

      <BaseDetailDrawer
        open={!!core.selectedItem}
        onClose={() => core.setSelectedItem(null)}
        title={core.selectedItem?.title ?? ''}
        width={480}
        actions={
          core.selectedItem
            ? [
                {
                  label: core.singleImporting
                    ? '가져오는 중...'
                    : `${ownerLabel}에 가져가기`,
                  onClick: () => core.importSingle(core.selectedItem as T),
                  variant: 'primary' as const,
                  disabled: !core.slug || core.singleImporting,
                },
              ]
            : []
        }
      >
        {core.selectedItem && (
          <div className="space-y-4 p-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={[
                  'inline-flex items-center px-2 py-0.5 text-xs rounded-full border',
                  ac.badge,
                ].join(' ')}
              >
                {labels.producerBadge}
              </span>
            </div>
            {core.selectedItem.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {core.selectedItem.description}
              </p>
            )}
            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-20 text-slate-400 shrink-0">게시일</dt>
                <dd className="text-slate-700">
                  {new Date(core.selectedItem.createdAt).toLocaleDateString('ko-KR')}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
