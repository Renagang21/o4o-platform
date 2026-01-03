/**
 * Card - 기본 카드 컴포넌트
 */

import { ReactNode } from 'react';
import { colors, shadows, borderRadius } from '../../styles/theme';

interface CardProps {
  children: ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({
  children,
  padding = 'medium',
  hover = false,
  onClick,
  style,
}: CardProps) {
  const paddingMap = {
    none: 0,
    small: '12px',
    medium: '20px',
    large: '28px',
  };

  return (
    <div
      style={{
        ...styles.card,
        padding: paddingMap[padding],
        cursor: onClick ? 'pointer' : 'default',
        ...(hover ? styles.cardHover : {}),
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
  },
  cardHover: {
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
};
