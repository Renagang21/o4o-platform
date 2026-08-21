/**
 * ClosedForumJoinPanel — 회원제(closed) 포럼 접근 차단 + 가입 신청 공통 UI
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §6
 * (원본: KPA `ClosedForumAccessBlocker` — WO-O4O-KPA-CLOSED-FORUM-FRONTEND-ACCESS-UX-V1)
 *
 * backend 는 closed 포럼 접근 시 403 `CLOSED_FORUM_ACCESS_DENIED` 를 준다. 그 응답을 받은
 * 화면이 이 패널을 렌더하면 상태(미로그인 / 미가입 / 신청중 / 승인완료)에 맞는 동선을 준다.
 *
 * 서비스가 넘기는 것은 (1) membership API 두 개 (2) 로그인 여부 (3) palette/문구뿐이다.
 * 서비스별 membership 정책을 새로 만들지 않는다 — 공통 forum membership 계약을 그대로 쓴다.
 *
 * 스타일은 inline(팔레트 주입)이다. Tailwind 미사용 서비스(KPA)와 사용 서비스(PharmacyHub)가
 * 같은 컴포넌트를 쓰기 위해서다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export type ClosedForumJoinStatus = 'loading' | 'none' | 'pending' | 'member';

/** 서비스의 forum membership API. 응답 envelope 은 이 컴포넌트가 정규화한다. */
export interface ClosedForumJoinApi {
  getMembershipStatus: (forumId: string) => Promise<any>;
  requestJoin: (forumId: string) => Promise<any>;
}

export interface ClosedForumJoinPalette {
  primary: string;
  onPrimary: string;
  surface: string;
  border: string;
  textStrong: string;
  textMuted: string;
  neutralBg: string;
  neutralText: string;
}

export const DEFAULT_CLOSED_FORUM_PALETTE: ClosedForumJoinPalette = {
  primary: '#0d9488',
  onPrimary: '#ffffff',
  surface: '#ffffff',
  border: '#e2e8f0',
  textStrong: '#0f172a',
  textMuted: '#64748b',
  neutralBg: '#f1f5f9',
  neutralText: '#334155',
};

export interface ClosedForumJoinPanelProps {
  forumId: string | null;
  /** 로그인 여부. 미로그인은 상태 조회 없이 로그인 안내만 낸다. */
  isAuthenticated: boolean;
  /** 로그인 사용자 식별자 — 계정 전환 시 상태를 다시 조회하기 위한 effect key */
  userKey?: string | null;
  api: ClosedForumJoinApi;
  /** 'page' = 상세 화면 전체, 'cell' = 목록 안쪽 영역 */
  variant?: 'page' | 'cell';
  onBack?: () => void;
  loginHref?: string;
  palette?: Partial<ClosedForumJoinPalette>;
  /** toast 등 서비스 알림 채널(선택). 미지정 시 패널 내부 문구로만 알린다. */
  onNotify?: (level: 'success' | 'info' | 'error', message: string) => void;
  title?: string;
  description?: string;
}

function unwrapStatus(res: unknown): { isMember: boolean; pendingRequest: boolean } {
  const body: any = (res as any)?.data ?? res;
  const inner: any = body?.data ?? body;
  return {
    isMember: Boolean(inner?.isMember),
    pendingRequest: Boolean(inner?.pendingRequest),
  };
}

function errorCode(err: any): string | undefined {
  return err?.response?.data?.code ?? err?.code;
}

export function ClosedForumJoinPanel({
  forumId,
  isAuthenticated,
  userKey,
  api,
  variant = 'page',
  onBack,
  loginHref = '/login',
  palette,
  onNotify,
  title = '회원 전용 포럼',
  description = '이 포럼은 가입 승인 회원만 열람할 수 있습니다.',
}: ClosedForumJoinPanelProps) {
  const p = { ...DEFAULT_CLOSED_FORUM_PALETTE, ...(palette ?? {}) };
  const [joinStatus, setJoinStatus] = useState<ClosedForumJoinStatus>(
    isAuthenticated && forumId ? 'loading' : 'none',
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !forumId) {
      setJoinStatus('none');
      return;
    }
    let cancelled = false;
    setJoinStatus('loading');
    api
      .getMembershipStatus(forumId)
      .then((res) => {
        if (cancelled) return;
        const d = unwrapStatus(res);
        setJoinStatus(d.isMember ? 'member' : d.pendingRequest ? 'pending' : 'none');
      })
      .catch(() => {
        if (!cancelled) setJoinStatus('none');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forumId, isAuthenticated, userKey]);

  const notify = (level: 'success' | 'info' | 'error', message: string) => {
    if (onNotify) onNotify(level, message);
    else setNotice(message);
  };

  const handleJoinRequest = async () => {
    if (!forumId || isRequesting) return;
    setIsRequesting(true);
    setNotice(null);
    try {
      await api.requestJoin(forumId);
      setJoinStatus('pending');
      notify('success', '가입 신청이 완료되었습니다. 포럼 운영자의 승인을 기다려주세요.');
    } catch (err: any) {
      const code = errorCode(err);
      if (code === 'ALREADY_MEMBER') {
        setJoinStatus('member');
        notify('info', '이미 회원입니다. 페이지를 새로고침해 주세요.');
      } else if (code === 'PENDING_REQUEST') {
        setJoinStatus('pending');
        notify('info', '이미 가입 신청이 진행 중입니다.');
      } else {
        notify(
          'error',
          err?.response?.data?.message || err?.message || '가입 신청에 실패했습니다.',
        );
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const joinBtnStyle: React.CSSProperties = {
    padding: '10px 28px',
    backgroundColor: p.primary,
    color: p.onPrimary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: isRequesting ? 'default' : 'pointer',
    opacity: isRequesting ? 0.7 : 1,
  };

  const hintStyle: React.CSSProperties = {
    fontSize: '13px',
    color: p.textMuted,
    margin: 0,
  };

  const actions = (() => {
    if (!isAuthenticated) {
      return (
        <p style={hintStyle}>
          <Link to={loginHref} style={{ color: p.primary }}>
            로그인
          </Link>
          {' 후 가입 신청할 수 있습니다.'}
        </p>
      );
    }
    if (joinStatus === 'loading') return <p style={hintStyle}>상태 확인 중...</p>;
    if (joinStatus === 'pending') {
      return (
        <div style={variant === 'page' ? pendingBoxPage : pendingBoxCell}>
          <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
            가입 신청이 진행 중입니다. 포럼 운영자의 승인을 기다려주세요.
          </p>
        </div>
      );
    }
    if (joinStatus === 'member') {
      return (
        <div style={variant === 'page' ? approvedBoxPage : approvedBoxCell}>
          <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#065f46' }}>
            가입이 승인되었습니다.
          </p>
          <button type="button" style={joinBtnStyle} onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      );
    }
    return (
      <button type="button" style={joinBtnStyle} onClick={handleJoinRequest} disabled={isRequesting}>
        {isRequesting ? '신청 중...' : '가입 신청'}
      </button>
    );
  })();

  const noticeNode = notice ? (
    <p style={{ ...hintStyle, marginTop: '12px', color: p.textMuted }}>{notice}</p>
  ) : null;

  if (variant === 'cell') {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '32px', margin: '0 0 8px' }}>🔒</p>
        <p style={{ fontSize: '15px', color: p.neutralText, fontWeight: 600, margin: '0 0 4px' }}>
          {title}
        </p>
        <p style={{ fontSize: '13px', color: p.textMuted, margin: '0 0 16px' }}>
          가입 승인 회원만 열람할 수 있습니다.
        </p>
        {actions}
        {noticeNode}
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '60px auto',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: p.surface,
        borderRadius: '12px',
        border: `1px solid ${p.border}`,
      }}
    >
      <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: p.textStrong, margin: '0 0 8px' }}>
        {title}
      </h2>
      <p style={{ fontSize: '14px', color: p.textMuted, margin: '0 0 24px' }}>{description}</p>

      <div style={{ marginBottom: '24px' }}>
        {actions}
        {noticeNode}
      </div>

      {onBack && (
        <button
          type="button"
          style={{
            padding: '10px 24px',
            backgroundColor: p.neutralBg,
            color: p.neutralText,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
          onClick={onBack}
        >
          목록으로 돌아가기
        </button>
      )}
    </div>
  );
}

const pendingBoxPage: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  border: '1px solid #fde68a',
};

const pendingBoxCell: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  backgroundColor: '#fffbeb',
  borderRadius: '6px',
  border: '1px solid #fde68a',
};

const approvedBoxPage: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  border: '1px solid #bbf7d0',
};

const approvedBoxCell: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  backgroundColor: '#f0fdf4',
  borderRadius: '6px',
  border: '1px solid #bbf7d0',
};
