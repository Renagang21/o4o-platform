/**
 * AGStorefrontLayout - Lightweight Consumer-Facing Layout
 *
 * Phase 7-I: Storefront & QR Landing UI
 *
 * A minimal, mobile-first layout for consumer-facing storefront pages.
 * Unlike AdminLayout, this has no sidebar - optimized for conversion and readability.
 *
 * Features:
 * - Simple header with partner branding
 * - Clean content container
 * - Mobile-first responsive design
 * - Optional footer
 */

import React, { ReactNode, useState } from 'react';

export interface StorefrontPartner {
  name: string;
  slug: string;
  profileImage?: string;
  tagline?: string;
}

export interface StorefrontPolicies {
  termsOfService?: string | null;
  privacyPolicy?: string | null;
  refundPolicy?: string | null;
  shippingPolicy?: string | null;
}

export interface AGStorefrontLayoutProps {
  partner: StorefrontPartner;
  children: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  policies?: StorefrontPolicies | null;
}

const POLICY_LABELS: Record<string, string> = {
  termsOfService: '이용약관',
  privacyPolicy: '개인정보처리방침',
  refundPolicy: '환불정책',
  shippingPolicy: '배송정책',
};

function PolicyModal({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}

export function AGStorefrontLayout({
  partner,
  children,
  showBackButton = false,
  onBack,
  className = '',
  policies,
}: AGStorefrontLayoutProps) {
  const [openPolicy, setOpenPolicy] = useState<{ title: string; content: string } | null>(null);

  const policyEntries = policies
    ? (Object.entries(POLICY_LABELS) as [keyof StorefrontPolicies, string][]).filter(
        ([key]) => policies[key],
      )
    : [];

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Back button or Partner info */}
          <div className="flex items-center gap-3">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="뒤로 가기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <div className="flex items-center gap-2">
              {partner.profileImage ? (
                <img
                  src={partner.profileImage}
                  alt={partner.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {partner.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 text-sm leading-tight">
                  {partner.name}
                </span>
                {partner.tagline && (
                  <span className="text-xs text-gray-500 leading-tight">
                    {partner.tagline}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Share button */}
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="공유하기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {/* Policy Links */}
          {policyEntries.length > 0 && (
            <div className="flex items-center justify-center gap-1 flex-wrap mb-3">
              {policyEntries.map(([key, label], idx) => (
                <React.Fragment key={key}>
                  {idx > 0 && <span className="text-gray-300 text-xs">|</span>}
                  <button
                    onClick={() =>
                      setOpenPolicy({ title: label, content: policies![key]! })
                    }
                    className="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                  >
                    {label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">
            {partner.name}의 스토어프론트
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Powered by O4O Platform
          </p>
        </div>
      </footer>

      {/* Policy Modal */}
      {openPolicy && (
        <PolicyModal
          title={openPolicy.title}
          content={openPolicy.content}
          onClose={() => setOpenPolicy(null)}
        />
      )}
    </div>
  );
}

/**
 * AGStorefrontPageTitle - Page title component for storefront
 */
export interface AGStorefrontPageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function AGStorefrontPageTitle({
  title,
  subtitle,
  className = '',
}: AGStorefrontPageTitleProps) {
  return (
    <div className={`px-4 py-6 ${className}`}>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * AGStorefrontSection - Content section wrapper
 */
export interface AGStorefrontSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function AGStorefrontSection({
  title,
  children,
  className = '',
  noPadding = false,
}: AGStorefrontSectionProps) {
  return (
    <section className={`${noPadding ? '' : 'px-4 py-4'} ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      )}
      {children}
    </section>
  );
}

/**
 * AGStorefrontHero - Hero section for storefront home
 */
export interface AGStorefrontHeroProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  className?: string;
}

export function AGStorefrontHero({
  title,
  description,
  backgroundImage,
  ctaLabel,
  onCtaClick,
  className = '',
}: AGStorefrontHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl mx-4 my-4 ${className}`}
      style={backgroundImage ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      <div className={`p-6 sm:p-8 ${backgroundImage ? 'text-white' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'}`}>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm sm:text-base opacity-90 max-w-md">
            {description}
          </p>
        )}
        {ctaLabel && onCtaClick && (
          <button
            onClick={onCtaClick}
            className="mt-4 px-6 py-2.5 bg-white text-pink-600 font-semibold rounded-full hover:bg-gray-100 transition-colors shadow-lg"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * AGStorefrontCardGrid - Responsive grid for product/routine cards
 */
export interface AGStorefrontCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function AGStorefrontCardGrid({
  children,
  columns = 2,
  className = '',
}: AGStorefrontCardGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-3 sm:gap-4 ${gridCols[columns]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * AGStorefrontProductCard - Product card for storefront
 */
export interface AGStorefrontProductCardProps {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  price?: number;
  tags?: string[];
  onClick?: () => void;
  className?: string;
}

export function AGStorefrontProductCard({
  name,
  brand,
  image,
  price,
  tags = [],
  onClick,
  className = '',
}: AGStorefrontProductCardProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left w-full ${className}`}
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {brand && (
          <p className="text-xs text-gray-500 mb-0.5">{brand}</p>
        )}
        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
          {name}
        </h3>
        {price !== undefined && (
          <p className="mt-1 font-semibold text-pink-600">
            {price.toLocaleString()}원
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * AGStorefrontRoutineCard - Routine card for storefront
 */
export interface AGStorefrontRoutineCardProps {
  id: string;
  title: string;
  description?: string;
  stepCount: number;
  tags?: string[];
  type?: 'morning' | 'evening' | 'weekly' | 'special';
  onClick?: () => void;
  className?: string;
}

const routineTypeIcons: Record<string, { icon: string; color: string; label: string }> = {
  morning: { icon: '☀️', color: 'bg-amber-100 text-amber-700', label: '모닝' },
  evening: { icon: '🌙', color: 'bg-indigo-100 text-indigo-700', label: '이브닝' },
  weekly: { icon: '📅', color: 'bg-emerald-100 text-emerald-700', label: '주간' },
  special: { icon: '✨', color: 'bg-rose-100 text-rose-700', label: '스페셜' },
};

export function AGStorefrontRoutineCard({
  title,
  description,
  stepCount,
  tags = [],
  type = 'morning',
  onClick,
  className = '',
}: AGStorefrontRoutineCardProps) {
  const typeInfo = routineTypeIcons[type];

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left w-full ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <span className={`flex-shrink-0 px-2 py-1 text-xs rounded-full flex items-center gap-1 ${typeInfo.color}`}>
          <span>{typeInfo.icon}</span>
          <span>{typeInfo.label}</span>
        </span>
      </div>

      {/* Meta */}
      <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {stepCount}단계
        </span>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-pink-50 text-pink-600 rounded-full"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-gray-400">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

export default AGStorefrontLayout;
