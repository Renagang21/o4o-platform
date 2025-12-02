/**
 * 하단 배너 컴포넌트 (교육/프로모션)
 */

import React, { useEffect } from 'react';
import { Banner } from '../../types/personalization';
import { trackEvent } from '../../utils/analytics';

interface BottomBannersProps {
  banners: Banner[];
  role: string;
}

export const BottomBanners: React.FC<BottomBannersProps> = ({ banners, role }) => {
  useEffect(() => {
    banners.forEach((banner) => {
      trackEvent('banner_impression', {
        role,
        bannerId: banner.id,
        type: 'bottom'
      });
    });
  }, [banners, role]);

  const handleClick = (banner: Banner) => {
    if (banner.action) {
      trackEvent('banner_click', {
        role,
        bannerId: banner.id,
        url: banner.action.url
      });
    }
  };

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="bottom-banners mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white"
        >
          <h4 className="font-semibold text-gray-900 mb-2">{banner.title}</h4>
          <p className="text-sm text-gray-600 mb-4">{banner.message}</p>
          {banner.action && (
            <a
              href={banner.action.url}
              onClick={() => handleClick(banner)}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {banner.action.label}
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

export default BottomBanners;
