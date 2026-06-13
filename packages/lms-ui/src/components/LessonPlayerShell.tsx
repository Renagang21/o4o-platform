import type { CSSProperties, ReactNode } from 'react';

export interface LessonPlayerShellProps {
  /** 레슨 제목. */
  title: string;
  /** "1 / 10" 등 순서 표시. */
  orderLabel?: string;
  /** 완료/상태 배지 슬롯. */
  statusSlot?: ReactNode;
  /**
   * 본문 콘텐츠 슬롯. video/article/quiz/assignment 렌더는 서비스 wrapper 가 주입한다.
   * (본 shell 은 video renderer 를 포함하지 않는다 — YouTube/LIVE 임베드 금지.)
   */
  children: ReactNode;
  /** 이전/다음 네비게이션 슬롯. */
  navSlot?: ReactNode;
  /** 완료 액션(완료 버튼 등) 슬롯. */
  actionSlot?: ReactNode;
  style?: CSSProperties;
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '16px',
};

/**
 * 레슨 플레이어 레이아웃 shell(1차 추출 — shell only).
 * header / content slot / nav slot / action slot 구조만 제공한다.
 * 콘텐츠 렌더링(특히 동영상)은 서비스 wrapper 책임 — YouTube iframe / LIVE 임베드 금지(KPA 기준선).
 */
export function LessonPlayerShell({
  title,
  orderLabel,
  statusSlot,
  children,
  navSlot,
  actionSlot,
  style,
}: LessonPlayerShellProps) {
  return (
    <div style={style}>
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          {orderLabel && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{orderLabel}</span>}
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '2px 0 0', color: '#0f172a' }}>{title}</h1>
        </div>
        {statusSlot}
      </div>

      <div>{children}</div>

      {actionSlot && <div style={{ marginTop: '20px' }}>{actionSlot}</div>}
      {navSlot && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px' }}>
          {navSlot}
        </div>
      )}
    </div>
  );
}
