/**
 * RequestTypeBadge
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-COMPONENT-V1
 *
 * 신청 entityType을 RoleBadge 기반으로 표시한다.
 * label/tone 재정의 가능 (props override).
 */

import { RoleBadge } from './RoleBadge.js';
import type { RoleBadgeTone, RoleBadgeSize } from './RoleBadge.js';

export interface RequestTypeConfig {
  label: string;
  tone: RoleBadgeTone;
}

const DEFAULT_TYPE_CONFIG: Record<string, RequestTypeConfig> = {
  forum_category:          { label: '포럼',   tone: 'blue'    },
  forum_delete:            { label: '삭제',   tone: 'rose'    },
  course:                  { label: '강좌',   tone: 'purple'  },
  course_enrollment:       { label: '수강',   tone: 'primary' },
  instructor_qualification:{ label: '강사',   tone: 'emerald' },
  membership:              { label: '가입',   tone: 'amber'   },
  service_application:     { label: '서비스', tone: 'blue'    },
  store_application:       { label: '매장',   tone: 'pink'    },
  partner_application:     { label: '파트너', tone: 'emerald' },
  other:                   { label: '기타',   tone: 'slate'   },
};

export interface RequestTypeBadgeProps {
  entityType: string;
  overrides?: Partial<Record<string, RequestTypeConfig>>;
  size?: RoleBadgeSize;
  className?: string;
}

export function RequestTypeBadge({ entityType, overrides, size = 'sm', className }: RequestTypeBadgeProps) {
  const config = (overrides?.[entityType] ?? DEFAULT_TYPE_CONFIG[entityType]) || { label: entityType, tone: 'slate' as RoleBadgeTone };
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

export { DEFAULT_TYPE_CONFIG };
