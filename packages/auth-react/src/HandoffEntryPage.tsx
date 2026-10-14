/** Shared localStorage handoff receiver; clear stale tokens before parent session restore. */
import { useHandoffExchange } from './useHandoffExchange';
import './HandoffEntryPage.css';

export interface HandoffFailure {
  message: string;
  link?: { href: string; label: string };
}




export interface HandoffEntryPageProps {
  apiBaseUrl: string;
  basename?: string;
  errorMessages: Record<string, string>;
  resolveFailure?: (data: unknown) => HandoffFailure | null;
  showSpinner?: boolean;
  missingTokenMessage?: string;
  networkErrorMessage?: string;
}

export function HandoffEntryPage({ apiBaseUrl, basename = '', errorMessages, resolveFailure, showSpinner = true, missingTokenMessage = '이동 정보가 없습니다. 다시 시도해 주세요.', networkErrorMessage = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }: Readonly<HandoffEntryPageProps>) {
  const exchange = useHandoffExchange({ apiBaseUrl, basename, missingTokenMessage, networkErrorMessage });
  const status = exchange.status;
  const failure = exchange.status === 'error' ? resolveFailure?.(exchange.data) : null;
  const error = exchange.status === 'error' ? failure?.message || errorMessages[exchange.code] || exchange.message : '';
  const failureLink = failure?.link;

  if (status === 'loading') {
    return (
      <div className="o4o-handoff-container">
        <div className="o4o-handoff-card">
          {showSpinner && <div className="o4o-handoff-spinner" />}
          <p className="o4o-handoff-text">서비스 이동 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="o4o-handoff-container">
        <div className="o4o-handoff-card">
          <p className="o4o-handoff-errorText">{error}</p>
          {failureLink && <p><a href={failureLink.href} className="o4o-handoff-link">{failureLink.label}</a></p>}
          <a href={`${basename}/login`} className="o4o-handoff-link">로그인 페이지로 이동</a>
          <p><a href="https://neture.co.kr/" className="o4o-handoff-link">O4O 메인으로</a></p>
        </div>
      </div>
    );
  }

  return null;
}
