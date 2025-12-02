/**
 * 상단 공지 배너 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Banner } from '../../types/personalization';
import { trackEvent } from '../../utils/analytics';

interface TopNoticeProps {
  banner?: Banner;
  role: string;
}

export const TopNotice: React.FC<TopNoticeProps> = ({ banner, role }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (banner) {
      // 이전에 dismiss된 배너인지 확인
      const dismissedBanners = JSON.parse(localStorage.getItem('dismissed_banners') || '[]');
      if (dismissedBanners.includes(banner.id)) {
        setIsDismissed(true);
        return;
      }

      // Impression 이벤트
      trackEvent('banner_impression', {
        role,
        bannerId: banner.id,
        type: 'top-notice'
      });
    }
  }, [banner, role]);

  if (!banner || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);

    // 로컬스토리지에 저장
    const dismissedBanners = JSON.parse(localStorage.getItem('dismissed_banners') || '[]');
    dismissedBanners.push(banner.id);
    localStorage.setItem('dismissed_banners', JSON.stringify(dismissedBanners));

    trackEvent('banner_dismissed', {
      role,
      bannerId: banner.id
    });
  };

  const handleClick = () => {
    if (banner.action) {
      trackEvent('banner_click', {
        role,
        bannerId: banner.id,
        url: banner.action.url
      });
    }
  };

  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    error: 'bg-red-50 border-red-200 text-red-900'
  };

  return (
    <div
      className={`top-notice border rounded-lg p-4 mb-6 flex items-start justify-between ${
        variantClasses[banner.variant]
      }`}
      role="alert"
    >
      <div className="flex-1">
        <h4 className="font-semibold mb-1">{banner.title}</h4>
        <p className="text-sm">{banner.message}</p>
        {banner.action && (
          <a
            href={banner.action.url}
            onClick={handleClick}
            className="inline-block mt-2 text-sm font-medium underline hover:no-underline"
          >
            {banner.action.label} →
          </a>
        )}
      </div>

      {banner.dismissible && (
        <button
          onClick={handleDismiss}
          className="ml-4 p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default TopNotice;
