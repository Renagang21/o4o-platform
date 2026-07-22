/**
 * ForumDeletePage — 포럼 삭제 관리 (Neture Operator)
 *
 * WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1
 *
 * 기존 '삭제 요청' 단일 화면을 '포럼 삭제 관리' 2-탭 화면으로 확장.
 *   - 삭제 요청     : 소유자 삭제 요청 승인/반려 (기존 기능 보존)
 *   - 포럼 직접 삭제: 운영자 직접 soft delete(비활성화) — 완전 삭제(hard delete)는 노출하지 않음.
 *
 * 완전 삭제(영구 삭제)는 Admin 전용(/admin/forum-deleted)으로 분리되었다.
 */

import { useState } from 'react';
import { Trash2, ListChecks } from 'lucide-react';
import { OperatorForumCategoriesPage } from '@o4o/operator-core-ui/modules/forum-categories';
import type { ForumCategoriesClient } from '@o4o/operator-core-ui/modules/forum-categories';
import { forumOperatorApi } from '../../services/forumApi';
import ForumDeleteRequestsPage from './ForumDeleteRequestsPage';

const categoriesClient: ForumCategoriesClient = forumOperatorApi;

type TabKey = 'requests' | 'direct';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'requests', label: '삭제 요청', icon: <ListChecks className="w-4 h-4" /> },
  { key: 'direct', label: '포럼 직접 삭제', icon: <Trash2 className="w-4 h-4" /> },
];

export default function ForumDeletePage() {
  const [tab, setTab] = useState<TabKey>('requests');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trash2 className="w-7 h-7 text-emerald-600" />
          포럼 삭제 관리
        </h1>
        <p className="text-slate-500 mt-1">
          포럼 소유자의 삭제 요청을 처리하거나 운영자가 직접 포럼을 삭제할 수 있습니다.
          운영자 삭제는 복구 가능한 비활성화(soft delete)이며, 완전 삭제는 관리자 전용입니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-full sm:w-auto sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'requests' ? (
        <ForumDeleteRequestsPage />
      ) : (
        <OperatorForumCategoriesPage
          client={categoriesClient}
          tableId="neture-forum-direct-delete"
          disableHardDelete
          requireNameConfirmForNonEmpty
        />
      )}
    </div>
  );
}
