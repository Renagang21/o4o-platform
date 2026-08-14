/**
 * buildQrLeadColumns — QR 템플릿 목록의 신원 컬럼 (제목 + 대상 종류 + 대상 요약)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * QR 은 `OperatorHubContentListPage` 셸을 블로그/POP 과 공유하지만
 * 신원 컬럼만 다르다 (QR 도메인 차이):
 *   - slug 컬럼 부재 — 운영자 단계 미발급. 매장 가져가기 시 store_qr_codes 가 발급한다.
 *   - target_type ('url' | 'content') + 대상 요약 컬럼 추가
 *
 * KPA·K-Cosmetics 가 이 컬럼 정의를 각각 복제하지 않도록 여기서 한 번만 만든다.
 */

import { Link as LinkIcon, FileText } from 'lucide-react';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { HubContentItemBase } from './types';

/** QR 템플릿이 목록 셸에 추가로 요구하는 필드. */
export interface QrTemplateListItem extends HubContentItemBase {
  targetType: string;
  targetUrl?: string;
  targetContentKind?: string;
  targetContentRef?: string;
}

const CONTENT_KIND_LABEL: Record<string, string> = {
  blog: '블로그',
  cms: 'CMS',
  pop: 'POP',
};

function formatTarget(item: QrTemplateListItem): string {
  if (item.targetType === 'url') {
    return item.targetUrl ? `URL · ${item.targetUrl}` : 'URL';
  }
  const kind = item.targetContentKind
    ? CONTENT_KIND_LABEL[item.targetContentKind] || item.targetContentKind
    : '';
  const ref = item.targetContentRef ? ` · ${item.targetContentRef}` : '';
  return `콘텐츠${kind ? ` · ${kind}` : ''}${ref}`;
}

export function buildQrLeadColumns<T extends QrTemplateListItem>(): ListColumnDef<T>[] {
  return [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (q) => q.title,
      render: (_v, q) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
            {q.targetType === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{q.title}</span>
        </div>
      ),
    },
    {
      key: 'targetType',
      header: '대상 종류',
      width: '90px',
      render: (_v, q) => (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-slate-50 border-slate-200 text-slate-600">
          {q.targetType === 'url' ? 'URL' : '콘텐츠'}
        </span>
      ),
    },
    {
      key: 'target',
      header: '대상',
      render: (_v, q) => <span className="text-xs text-slate-500 truncate">{formatTarget(q)}</span>,
    },
  ];
}
