/**
 * HomepageAds — CMS 기반 3-column 광고 영역
 * WO-O4O-NETURE-HOMEPAGE-CMS-V1
 *
 * 데이터 0건이면 섹션 미표시
 */

import { useState, useEffect } from 'react';
import type { CmsContent } from '../../lib/api/content';
import { homepageCmsApi } from '../../lib/api/content';

export default function HomepageAds() {
  const [ads, setAds] = useState<CmsContent[]>([]);

  useEffect(() => {
    homepageCmsApi.getAds().then(setAds);
  }, []);

  if (ads.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <a
              key={ad.id}
              href={ad.linkUrl || '#'}
              target={ad.linkUrl?.startsWith('http') ? '_blank' : undefined}
              rel={ad.linkUrl?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group block rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
            >
              {ad.imageUrl && (
                <div className="aspect-video overflow-hidden bg-gray-100">
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {ad.title}
                </h3>
                {ad.summary && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{ad.summary}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
