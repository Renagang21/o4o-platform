/**
 * ListWorkspace — 목록 업무 화면 계약
 *
 * WO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1
 * 정본: docs/architecture/O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md
 *
 * 배치(Core 가 고정한다):
 *   업무 탭 → 화면 제목 + 상단 오른쪽 신규 버튼 → 검색 · 필터 → 안내
 *   → 선택 항목 ActionBar → 테이블 → 페이지네이션
 *
 * 열 · 필터 · 등록/상세 화면 · 선택 후 명령 · 권한은 업무(Extension)가 slot 으로 넘긴다.
 * 표 구현은 고르지 않는다. BaseTable · DataTable · 업무 자체 표 모두 children 으로 받는다.
 */

import React, { type ReactNode } from 'react';
import { ActionBar, type ActionBarProps } from './ActionBar';

export type ListWorkspaceCreatePlacement = 'header' | 'empty';

export interface ListWorkspaceCreateAction {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  /** 링크 등으로 그릴 때 사용한다. 헤더와 빈 목록 중앙이 같은 동작을 공유한다. */
  render?: (props: { className: string; placement: ListWorkspaceCreatePlacement }) => ReactNode;
}

export interface ListWorkspaceError {
  message: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

export interface ListWorkspaceProps {
  title: ReactNode;
  description?: ReactNode;
  /** 업무 탭 등 제목 위 이동 영역 */
  navigation?: ReactNode;
  /** 신규 등록. 권한이 없으면 넘기지 않는다. */
  createAction?: ListWorkspaceCreateAction;
  /** 신규 버튼 옆 보조 동작(내려받기 등) */
  headerActions?: ReactNode;
  /** 검색 · 필터 영역 */
  filters?: ReactNode;
  /** 필터와 표 사이 안내(만료 경고, 작업 결과 등) */
  notice?: ReactNode;
  /** 선택 항목 작업. selectedCount 가 0 이면 표시되지 않는다. */
  selection?: ActionBarProps;
  /** 최초 또는 조건 변경 조회 중. 표를 대신해 표시한다. */
  loading?: boolean;
  loadingMessage?: ReactNode;
  /** 조회 실패. 표를 대신해 표시하며 빈 목록으로 위장하지 않는다. */
  error?: ListWorkspaceError | null;
  /** 표에 표시할 행이 없다. */
  isEmpty?: boolean;
  /** 검색 · 필터가 적용 중이다. 비어 있으면 '결과 없음'으로 구분한다. */
  filterActive?: boolean;
  emptyMessage?: ReactNode;
  noResultsMessage?: ReactNode;
  /** 처리 중 안내. 표를 유지한 채 알린다. */
  processing?: ReactNode;
  /** 테이블 */
  children?: ReactNode;
  pagination?: ReactNode;
  className?: string;
  headingLevel?: 1 | 2;
}

const CREATE_CLASS =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

function CreateButton({
  action,
  placement,
}: {
  action: ListWorkspaceCreateAction;
  placement: ListWorkspaceCreatePlacement;
}) {
  if (action.render) return <>{action.render({ className: CREATE_CLASS, placement })}</>;
  return (
    <button type="button" className={CREATE_CLASS} onClick={action.onClick} disabled={action.disabled}>
      {action.icon}
      {action.label}
    </button>
  );
}

export function ListWorkspace({
  title,
  description,
  navigation,
  createAction,
  headerActions,
  filters,
  notice,
  selection,
  loading = false,
  loadingMessage = '목록을 불러오고 있습니다.',
  error,
  isEmpty = false,
  filterActive = false,
  emptyMessage = '아직 등록된 항목이 없습니다.',
  noResultsMessage = '검색 조건에 맞는 항목이 없습니다.',
  processing,
  children,
  pagination,
  className = '',
  headingLevel = 1,
}: ListWorkspaceProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const firstEmpty = !loading && !error && isEmpty && !filterActive;
  const noResults = !loading && !error && isEmpty && filterActive;
  const showTable = !loading && !error && !isEmpty;

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {navigation}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading className="text-xl font-semibold text-slate-900">{title}</Heading>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {(createAction || headerActions) && (
          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            {createAction && <CreateButton action={createAction} placement="header" />}
          </div>
        )}
      </header>

      {/* 목록이 비어 있고 조건도 없으면 좁힐 대상이 없으므로 필터를 숨긴다. */}
      {!firstEmpty && filters}
      {notice}
      {processing && (
        <p role="status" className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {processing}
        </p>
      )}

      {loading && (
        <div role="status" className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-600">
          {loadingMessage}
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
          <p>{error.message}</p>
          {error.onRetry && (
            <button
              type="button"
              onClick={error.onRetry}
              className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-red-300 bg-white px-4 text-sm text-red-800 hover:bg-red-100"
            >
              {error.retryLabel ?? '다시 시도'}
            </button>
          )}
        </div>
      )}

      {firstEmpty && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
          <p className="text-sm text-slate-600">{emptyMessage}</p>
          {createAction && (
            <div className="mt-4">
              <CreateButton action={createAction} placement="empty" />
            </div>
          )}
        </div>
      )}

      {noResults && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-600">
          {noResultsMessage}
        </div>
      )}

      {showTable && (
        <>
          {selection && <ActionBar {...selection} />}
          {children}
          {pagination}
        </>
      )}
    </div>
  );
}
