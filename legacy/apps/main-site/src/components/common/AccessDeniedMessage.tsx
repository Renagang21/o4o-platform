import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedMessageProps {
  message?: string;
  redirectUrl?: string;
  requiresAuth?: boolean;
  customContent?: string; // HTML content from admin settings
}

/**
 * AccessDeniedMessage Component
 *
 * Displays when user doesn't have permission to view content.
 * Shows customizable message and provides next action buttons.
 */
export const AccessDeniedMessage: React.FC<AccessDeniedMessageProps> = ({
  message = '이 콘텐츠에 접근할 권한이 없습니다.',
  redirectUrl,
  requiresAuth = false,
  customContent
}) => {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    // Store current location to redirect back after login
    const currentPath = window.location.pathname;
    navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  const handleCustomRedirect = () => {
    if (redirectUrl) {
      if (redirectUrl.startsWith('http')) {
        window.location.href = redirectUrl;
      } else {
        navigate(redirectUrl);
      }
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="access-denied-container">
      <div className="access-denied-content">
        {/* Icon */}
        <div className="access-denied-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-16 h-16 text-red-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="access-denied-title">
          접근 제한
        </h1>

        {/* Custom HTML Content or Default Message */}
        {customContent ? (
          <div
            className="access-denied-message"
            dangerouslySetInnerHTML={{ __html: customContent }}
          />
        ) : (
          <p className="access-denied-message">
            {message}
          </p>
        )}

        {/* Action Buttons */}
        <div className="access-denied-actions">
          {requiresAuth && (
            <button
              onClick={handleLoginRedirect}
              className="btn btn-primary"
            >
              로그인하기
            </button>
          )}

          {redirectUrl && (
            <button
              onClick={handleCustomRedirect}
              className="btn btn-secondary"
            >
              자세히 보기
            </button>
          )}

          <button
            onClick={handleGoBack}
            className="btn btn-outline"
          >
            이전 페이지로
          </button>

          <button
            onClick={handleGoHome}
            className="btn btn-outline"
          >
            홈으로 가기
          </button>
        </div>
      </div>

      <style jsx>{`
        .access-denied-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          padding: 2rem;
        }

        .access-denied-content {
          max-width: 600px;
          text-align: center;
        }

        .access-denied-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .access-denied-title {
          font-size: 2rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .access-denied-message {
          font-size: 1.125rem;
          color: #6b7280;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .access-denied-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          min-width: 200px;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background-color: #2563eb;
        }

        .btn-secondary {
          background-color: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #4b5563;
        }

        .btn-outline {
          background-color: transparent;
          color: #3b82f6;
          border: 1px solid #3b82f6;
        }

        .btn-outline:hover {
          background-color: #eff6ff;
        }

        @media (min-width: 640px) {
          .access-denied-actions {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }

          .btn {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default AccessDeniedMessage;
