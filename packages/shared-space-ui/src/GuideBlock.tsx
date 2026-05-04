/**
 * GuideBlock — O4O 공통 상황 안내 카드
 * WO-O4O-GUIDE-UI-COMPONENT-V1
 *
 * 화면 안에서 사용자가
 *   1) 지금 무엇을 하는지
 *   2) 무엇을 입력해야 하는지
 *   3) 저장 후 어떤 단계가 이어지는지
 * 를 짧게 인지할 수 있도록 표시하는 카드형 컴포넌트.
 *
 * 새창 매뉴얼 방식이 아니라 현재 화면 안에 표시한다.
 * 서비스별 문구는 사용 측에서 주입한다 — 이 컴포넌트 안에 service-specific 문구를 두지 않는다.
 */

import type { CSSProperties, ReactNode } from 'react';

export type GuideBlockVariant = 'info' | 'warning' | 'success' | 'neutral';

export interface GuideBlockProps {
  /** 메인 제목 — 굵게 표시 (선택) */
  title?: string;
  /** 본문 설명 — 1~2줄 권장 (선택) */
  description?: string;
  /** 단계/체크리스트 형태 bullets (선택) */
  steps?: string[];
  /** 좌측 아이콘 — lucide-react 등 (선택) */
  icon?: ReactNode;
  /** 색상 톤. 기본 'info' */
  variant?: GuideBlockVariant;
  /** 패딩 축소 */
  compact?: boolean;
  /** 우측 액션 슬롯 — 버튼/링크 (선택) */
  action?: ReactNode;
  /** className override */
  className?: string;
  /** 추가 스타일 override */
  style?: CSSProperties;
}

const TONE: Record<
  GuideBlockVariant,
  { bg: string; border: string; text: string; titleColor: string }
> = {
  info:    { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca', titleColor: '#3730a3' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', titleColor: '#78350f' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', titleColor: '#166534' },
  neutral: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', titleColor: '#334155' },
};

export function GuideBlock({
  title,
  description,
  steps,
  icon,
  variant = 'info',
  compact = false,
  action,
  className,
  style,
}: GuideBlockProps) {
  const tone = TONE[variant];
  const hasSteps = !!steps && steps.length > 0;
  const padding = compact ? '8px 12px' : '12px 14px';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 8,
        fontSize: 13,
        color: tone.text,
        ...style,
      }}
    >
      {icon && <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: tone.titleColor,
              marginBottom: description || hasSteps ? 4 : 0,
            }}
          >
            {title}
          </div>
        )}
        {description && (
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>{description}</div>
        )}
        {hasSteps && (
          <ul
            style={{
              margin: description ? '6px 0 0 0' : 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {steps!.map((step, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: 6,
                  fontSize: 12,
                  lineHeight: 1.5,
                  marginTop: i === 0 ? 0 : 2,
                }}
              >
                <span style={{ flexShrink: 0 }}>·</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, alignSelf: 'center' }}>{action}</div>}
    </div>
  );
}
