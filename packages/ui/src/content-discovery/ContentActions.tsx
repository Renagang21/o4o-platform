/**
 * ContentActions - Data Hub 행동 버튼
 *
 * WO-APP-DATA-HUB-ACTION-PHASE1-V1
 *
 * 버튼:
 * - 📥 복사 (내 대시보드로 가져오기)
 * - ✏️ 수정 (내 자료인 경우)
 * - ➕ 등록 (커뮤니티/포럼)
 *
 * 원칙:
 * - 허브에서는 편집하지 않는다
 * - 허브에서는 가져가기(Copy)만 한다
 * - 수정은 항상 내 대시보드에서만
 */

import React from 'react';

export interface ContentActionsProps {
  // 복사
  showCopy?: boolean;
  onCopy?: () => void;
  copyTooltip?: string;
  copyLabel?: string;

  // 수정 (내 자료인 경우)
  showEdit?: boolean;
  onEdit?: () => void;
  editLabel?: string;

  // 등록 (커뮤니티)
  showCreate?: boolean;
  onCreateClick?: () => void;
  createLabel?: string;

  // 미리보기
  showPreview?: boolean;
  onPreview?: () => void;

  // 소유권
  isOwner?: boolean;

  // 레이아웃
  layout?: 'row' | 'column';
  size?: 'sm' | 'md';
}

export function ContentActions({
  showCopy = true,
  onCopy,
  copyTooltip = '내 대시보드로 가져오기',
  copyLabel = '복사',
  showEdit = false,
  onEdit,
  editLabel = '수정',
  showCreate = false,
  onCreateClick,
  createLabel = '등록하기',
  showPreview = false,
  onPreview,
  isOwner = false,
  layout = 'row',
  size = 'sm',
}: ContentActionsProps) {
  // 수정은 소유자만
  const canEdit = showEdit && isOwner;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: layout === 'column' ? 'column' : 'row',
    gap: '6px',
    alignItems: layout === 'row' ? 'center' : 'stretch',
  };

  const buttonBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: size === 'sm' ? '4px 10px' : '6px 14px',
    fontSize: size === 'sm' ? '12px' : '13px',
    fontWeight: 500,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };

  const copyButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    border: '1px solid #BFDBFE',
  };

  const editButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
    border: '1px solid #BBF7D0',
  };

  const createButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
  };

  const previewButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    border: '1px solid #E5E7EB',
  };

  const handleClick = (e: React.MouseEvent, handler?: () => void) => {
    e.stopPropagation();
    if (handler) {
      handler();
    } else {
      // Phase 1: 실제 로직 없이 안내만
      alert('대시보드에서 편집할 수 있습니다.');
    }
  };

  const hasActions = showCopy || canEdit || showCreate || showPreview;
  if (!hasActions) return null;

  return (
    <div style={containerStyle}>
      {showCopy && (
        <button
          style={copyButtonStyle}
          onClick={(e) => handleClick(e, onCopy)}
          title={copyTooltip}
        >
          <span>📥</span>
          <span>{copyLabel}</span>
        </button>
      )}

      {canEdit && (
        <button
          style={editButtonStyle}
          onClick={(e) => handleClick(e, onEdit)}
          title="내 대시보드에서 수정"
        >
          <span>✏️</span>
          <span>{editLabel}</span>
        </button>
      )}

      {showPreview && (
        <button
          style={previewButtonStyle}
          onClick={(e) => handleClick(e, onPreview)}
          title="미리보기"
        >
          <span>👁</span>
          <span>미리보기</span>
        </button>
      )}

      {showCreate && (
        <button
          style={createButtonStyle}
          onClick={(e) => handleClick(e, onCreateClick)}
        >
          <span>➕</span>
          <span>{createLabel}</span>
        </button>
      )}
    </div>
  );
}

/**
 * 카드용 컴팩트 액션 (우측 상단)
 */
export function ContentCardActions({
  showCopy = true,
  onCopy,
  isOwner = false,
  onEdit,
}: {
  showCopy?: boolean;
  onCopy?: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
}) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
  };

  const iconButtonStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
  };

  const handleClick = (e: React.MouseEvent, handler?: () => void) => {
    e.stopPropagation();
    if (handler) {
      handler();
    } else {
      alert('대시보드에서 편집할 수 있습니다.');
    }
  };

  return (
    <div style={containerStyle}>
      {showCopy && (
        <button
          style={iconButtonStyle}
          onClick={(e) => handleClick(e, onCopy)}
          title="내 대시보드로 가져오기"
        >
          📥
        </button>
      )}
      {isOwner && (
        <button
          style={iconButtonStyle}
          onClick={(e) => handleClick(e, onEdit)}
          title="수정"
        >
          ✏️
        </button>
      )}
    </div>
  );
}
