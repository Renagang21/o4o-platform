/**
 * RequestStatusBadge
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-COMPONENT-V1
 *
 * 신청 상태를 RoleBadge 기반으로 표시한다.
 * label/tone 재정의 가능 (props override).
 */

import { RoleBadge } from './RoleBadge.js';
import type { RoleBadgeTone, RoleBadgeSize } from './RoleBadge.js';

export interface RequestStatusConfig {
  label: string;
  tone: RoleBadgeTone;
}

const DEFAULT_STATUS_CONFIG: Record<string, RequestStatusConfig> = {
  draft:              { label: '임시저장',   tone: 'slate'   },
  pending:            { label: '검토 중',    tone: 'amber'   },
  submitted:          { label: '제출됨',     tone: 'blue'    },
  approved:           { label: '승인됨',     tone: 'emerald' },
  rejected:           { label: '거절됨',     tone: 'rose'    },
  revision_requested: { label: '보완 요청',  tone: 'amber'   },
  cancelled:          { label: '취소됨',     tone: 'slate'   },
  revoked:            { label: '철회됨',     tone: 'slate'   },
  in_progress:        { label: '진행 중',    tone: 'blue'    },
  completed:          { label: '완료됨',     tone: 'emerald' },
};

export interface RequestStatusBadgeProps {
  status: string;
  overrides?: Partial<Record<string, RequestStatusConfig>>;
  size?: RoleBadgeSize;
  className?: string;
}

export function RequestStatusBadge({ status, overrides, size = 'sm', className }: RequestStatusBadgeProps) {
  const config = (overrides?.[status] ?? DEFAULT_STATUS_CONFIG[status]) || { label: status, tone: 'slate' as RoleBadgeTone };
  return (
    <RoleBadge
      label={config.label}
      tone={config.tone}
      size={size}
      variant="soft"
      className={className}
    />
  );
}

export { DEFAULT_STATUS_CONFIG };
