import type { ReactNode } from 'react';

export interface MyPageAuthRequiredProps {
  /** Heading. Default: '로그인이 필요합니다' */
  title?: string;
  /** Optional description under the heading. */
  description?: string;
  /** Optional icon rendered in the circular avatar slot. Omit to hide the slot. */
  icon?: ReactNode;
  /** Action button label. Default: '로그인' */
  actionLabel?: string;
  /** Click handler (modal-based login — Neture). Takes precedence over `href`. */
  onAction?: () => void;
  /** Link target (route-based login — K-Cosmetics). Rendered via `renderLink`. */
  href?: string;
  /**
   * Renders the link when `href` is given. Injected so this package does not
   * take a hard dependency on the host router (react-router-dom is a peer).
   */
  renderLink?: (href: string, className: string, label: string) => ReactNode;
}

/**
 * MyPageAuthRequired — 마이페이지 비로그인 안내 블록 (공통)
 *
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics / Neture 의 MyProfilePage · MySettingsPage 에
 * 6벌 복제되어 있던 "로그인이 필요합니다" 블록의 단일 구현.
 * 로그인 진입 방식만 서비스마다 다르므로 (`onAction` 모달 / `href` 라우트)
 * 그 부분만 주입받는다.
 */
export function MyPageAuthRequired({
  title = '로그인이 필요합니다',
  description,
  icon,
  actionLabel = '로그인',
  onAction,
  href,
  renderLink,
}: MyPageAuthRequiredProps) {
  const actionCls =
    'block w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-center';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
        {icon && (
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            {icon}
          </div>
        )}
        <h1 className={`text-lg font-semibold text-gray-900 ${description ? 'mb-2' : 'mb-4'}`}>
          {title}
        </h1>
        {description && <p className="text-sm text-gray-500 mb-6">{description}</p>}
        {onAction ? (
          <button type="button" onClick={onAction} className={actionCls}>
            {actionLabel}
          </button>
        ) : href && renderLink ? (
          renderLink(href, actionCls, actionLabel)
        ) : null}
      </div>
    </div>
  );
}
