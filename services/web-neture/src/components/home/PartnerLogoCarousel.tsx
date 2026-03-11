/**
 * PartnerLogoCarousel — CMS 기반 파트너 로고 자동 스크롤
 * WO-O4O-NETURE-HOMEPAGE-CMS-V1
 *
 * CSS animation 기반 infinite scroll
 * 데이터 0건이면 섹션 미표시
 */

import { useState, useEffect } from 'react';
import type { CmsContent } from '../../lib/api/content';
import { homepageCmsApi } from '../../lib/api/content';

export default function PartnerLogoCarousel() {
  const [logos, setLogos] = useState<CmsContent[]>([]);

  useEffect(() => {
    homepageCmsApi.getLogos().then(setLogos);
  }, []);

  if (logos.length === 0) return null;

  // Duplicate logos for seamless infinite scroll
  const scrollLogos = [...logos, ...logos];

  return (
    <section className="py-12 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-lg font-semibold text-gray-500 mb-8">
          파트너사
        </h2>
      </div>
      <div className="relative">
        <div
          className="flex items-center gap-12 animate-scroll"
          style={{
            width: `${scrollLogos.length * 160}px`,
            animation: `scroll ${logos.length * 3}s linear infinite`,
          }}
        >
          {scrollLogos.map((logo, idx) => {
            const logoUrl = (logo.metadata as any)?.logoUrl || logo.imageUrl;
            return (
              <a
                key={`${logo.id}-${idx}`}
                href={logo.linkUrl || '#'}
                target={logo.linkUrl?.startsWith('http') ? '_blank' : undefined}
                rel={logo.linkUrl?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex-shrink-0 flex items-center justify-center w-32 h-16 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all"
                title={logo.title}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={logo.title} className="max-h-12 max-w-full object-contain" />
                ) : (
                  <span className="text-sm font-medium text-gray-400">{logo.title}</span>
                )}
              </a>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
