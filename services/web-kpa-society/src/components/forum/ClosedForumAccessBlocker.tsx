/**
 * ClosedForumAccessBlocker
 *
 * WO-O4O-KPA-CLOSED-FORUM-FRONTEND-ACCESS-UX-V1
 *
 * 회원제(closed) 포럼 접근 차단 UI:
 * - 비가입자 → 안내 + 가입 신청 버튼
 * - 가입신청중 → 승인 대기 안내
 * - 승인완료 → 새로고침 안내
 * - 미로그인 → 로그인 안내
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { forumMembershipApi } from '../../api/forum';
import { colors, typography } from '../../styles/theme';
import type { User } from '../../contexts/AuthContext';

type JoinStatus = 'loading' | 'none' | 'pending' | 'member';

interface Props {
  categoryId: string | null;
  user: User | null;
  /** 'page' = ForumDetailPage 전체 화면, 'cell' = ForumListPage 테이블 셀 */
  variant?: 'page' | 'cell';
  onBack?: () => void;
}

export function ClosedForumAccessBlocker({ categoryId, user, variant = 'page', onBack }: Props) {
  const [joinStatus, setJoinStatus] = useState<JoinStatus>(user && categoryId ? 'loading' : 'none');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!user || !categoryId) {
      setJoinStatus('none');
      return;
    }
    setJoinStatus('loading');
    forumMembershipApi
      .getMembershipStatus(categoryId)
      .then((res) => {
        const d = res.data;
        if (d.isMember) setJoinStatus('member');
        else if (d.pendingRequest) setJoinStatus('pending');
        else setJoinStatus('none');
      })
      .catch(() => setJoinStatus('none'));
  }, [categoryId, user?.id]);

  const handleJoinRequest = async () => {
    if (!categoryId || isRequesting) return;
    setIsRequesting(true);
    try {
      await forumMembershipApi.requestJoin(categoryId);
      setJoinStatus('pending');
      toast.success('가입 신청이 완료되었습니다. 포럼 운영자의 승인을 기다려주세요.');
    } catch (err: any) {
      const code = err?.code;
      if (code === 'ALREADY_MEMBER') {
        setJoinStatus('member');
        toast.info('이미 회원입니다. 페이지를 새로고침해 주세요.');
      } else if (code === 'PENDING_REQUEST') {
        setJoinStatus('pending');
        toast.info('이미 가입 신청이 진행 중입니다.');
      } else {
        toast.error(err?.message || '가입 신청에 실패했습니다.');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (variant === 'cell') {
    return (
      <div style={cellStyles.wrapper}>
        <p style={cellStyles.icon}>🔒</p>
        <p style={cellStyles.title}>회원 전용 포럼</p>
        <p style={cellStyles.desc}>가입 승인 회원만 열람할 수 있습니다.</p>
        {renderActions('cell', { user, joinStatus, isRequesting, categoryId, handleJoinRequest })}
      </div>
    );
  }

  return (
    <div style={pageStyles.box}>
      <span style={pageStyles.icon}>🔒</span>
      <h2 style={pageStyles.title}>회원 전용 포럼</h2>
      <p style={pageStyles.desc}>이 포럼은 가입 승인 회원만 열람할 수 있습니다.</p>

      <div style={pageStyles.actionArea}>
        {renderActions('page', { user, joinStatus, isRequesting, categoryId, handleJoinRequest })}
      </div>

      {onBack && (
        <button style={pageStyles.backBtn} onClick={onBack}>
          목록으로 돌아가기
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared action renderer
// ---------------------------------------------------------------------------

interface ActionProps {
  user: User | null;
  joinStatus: JoinStatus;
  isRequesting: boolean;
  categoryId: string | null;
  handleJoinRequest: () => void;
}

function renderActions(variant: 'page' | 'cell', { user, joinStatus, isRequesting, handleJoinRequest }: ActionProps) {
  if (!user) {
    return (
      <p style={variant === 'page' ? pageStyles.hint : cellStyles.hint}>
        <Link to="/login" style={{ color: colors.primary }}>로그인</Link> 후 가입 신청할 수 있습니다.
      </p>
    );
  }

  if (joinStatus === 'loading') {
    return <p style={variant === 'page' ? pageStyles.hint : cellStyles.hint}>상태 확인 중...</p>;
  }

  if (joinStatus === 'pending') {
    return (
      <div style={variant === 'page' ? pageStyles.pendingBox : cellStyles.pendingBox}>
        <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
          가입 신청이 진행 중입니다. 포럼 운영자의 승인을 기다려주세요.
        </p>
      </div>
    );
  }

  if (joinStatus === 'member') {
    return (
      <div style={variant === 'page' ? pageStyles.approvedBox : cellStyles.approvedBox}>
        <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#065f46' }}>
          가입이 승인되었습니다.
        </p>
        <button style={joinBtn} onClick={() => window.location.reload()}>
          새로고침
        </button>
      </div>
    );
  }

  // none
  return (
    <button style={joinBtn} onClick={handleJoinRequest} disabled={isRequesting}>
      {isRequesting ? '신청 중...' : '가입 신청'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const joinBtn: React.CSSProperties = {
  padding: '10px 28px',
  backgroundColor: colors.primary,
  color: colors.white,
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const pageStyles: Record<string, React.CSSProperties> = {
  box: {
    maxWidth: '480px',
    margin: '60px auto',
    padding: '48px 24px',
    textAlign: 'center',
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  title: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: '0 0 8px',
  },
  desc: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: '0 0 24px',
  },
  actionArea: {
    marginBottom: '24px',
  },
  hint: {
    ...typography.bodyS,
    color: colors.neutral500,
    margin: 0,
  },
  pendingBox: {
    padding: '16px',
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fde68a',
  },
  approvedBox: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
  },
  backBtn: {
    padding: '10px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

const cellStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '32px',
    margin: '0 0 8px',
  },
  title: {
    fontSize: '15px',
    color: colors.neutral700,
    fontWeight: 600,
    margin: '0 0 4px',
  },
  desc: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '0 0 16px',
  },
  hint: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: 0,
  },
  pendingBox: {
    display: 'inline-block',
    padding: '10px 16px',
    backgroundColor: '#fffbeb',
    borderRadius: '6px',
    border: '1px solid #fde68a',
  },
  approvedBox: {
    display: 'inline-block',
    padding: '10px 16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px',
    border: '1px solid #bbf7d0',
  },
};
