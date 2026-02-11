/**
 * PlaceholderImage - 이미지가 없거나 로드 실패 시 표시할 플레이스홀더
 *
 * 사용법:
 * - <PlaceholderImage /> 기본 (미디어 아이콘)
 * - <PlaceholderImage variant="video" /> 비디오 전용
 * - <PlaceholderImage variant="photo" /> 사진 전용
 * - <PlaceholderImage width="100%" height="100%" /> 크기 지정
 */

import { colors } from '../../styles/theme';

type Variant = 'media' | 'video' | 'photo' | 'document';

interface Props {
  variant?: Variant;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  label?: string;
}

function VariantIcon({ variant }: { variant: Variant }) {
  const iconColor = colors.neutral400;

  switch (variant) {
    case 'video':
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="10" width="28" height="28" rx="4" stroke={iconColor} strokeWidth="2.5" fill="none" />
          <polygon points="38,18 44,14 44,34 38,30" fill={iconColor} opacity="0.6" />
          <circle cx="18" cy="24" r="6" fill={iconColor} opacity="0.15" />
          <polygon points="16,21 16,27 22,24" fill={iconColor} opacity="0.5" />
        </svg>
      );
    case 'photo':
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="28" rx="4" stroke={iconColor} strokeWidth="2.5" fill="none" />
          <circle cx="16" cy="20" r="3" fill={iconColor} opacity="0.4" />
          <polyline points="6,34 16,24 24,32 30,26 42,34" stroke={iconColor} strokeWidth="2" fill="none" opacity="0.5" />
        </svg>
      );
    case 'document':
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect x="10" y="6" width="28" height="36" rx="3" stroke={iconColor} strokeWidth="2.5" fill="none" />
          <line x1="16" y1="16" x2="32" y2="16" stroke={iconColor} strokeWidth="2" opacity="0.4" />
          <line x1="16" y1="22" x2="32" y2="22" stroke={iconColor} strokeWidth="2" opacity="0.4" />
          <line x1="16" y1="28" x2="26" y2="28" stroke={iconColor} strokeWidth="2" opacity="0.4" />
        </svg>
      );
    default: // 'media'
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="28" rx="4" stroke={iconColor} strokeWidth="2.5" fill="none" />
          <circle cx="16" cy="20" r="3" fill={iconColor} opacity="0.4" />
          <polyline points="6,34 16,24 24,32 30,26 42,34" stroke={iconColor} strokeWidth="2" fill="none" opacity="0.4" />
          <polygon points="32,18 32,26 38,22" fill={iconColor} opacity="0.35" />
        </svg>
      );
  }
}

export function PlaceholderImage({ variant = 'media', width, height, style, label }: Props) {
  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        backgroundColor: colors.neutral100,
        borderRadius: '8px',
        ...style,
      }}
    >
      <VariantIcon variant={variant} />
      {label && (
        <span style={{ fontSize: '0.75rem', color: colors.neutral400 }}>{label}</span>
      )}
    </div>
  );
}
