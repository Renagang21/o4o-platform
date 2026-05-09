/**
 * BlogPublicHeader — 공개 Blog 페이지 상단 매장 identity 헤더
 *
 * WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1
 *
 * 목표:
 *  - 사용자가 "어떤 전문 매장이 운영하는 Blog 인가" 즉시 인지
 *  - 전문 콘텐츠 채널 느낌 (쇼핑몰/마케팅 톤 회피)
 *  - 매장명 / 로고 / 짧은 소개 / 매장 사이트 링크 표시
 *
 * 비포함: 상품 노출 / CTA 버튼 / 카테고리 / 카운터 (storefront 책임)
 */

import { Link } from 'react-router-dom';
import type { PublicStoreInfo, PublicBlogSettings } from '../../../api/blog';

interface BlogPublicHeaderProps {
  storeSlug: string;
  storeInfo: PublicStoreInfo | null;
  /** WO-O4O-KPA-STORE-BLOG-META-V1: Blog identity 메타. 없으면 storeInfo fallback. */
  blogSettings?: PublicBlogSettings | null;
  /** 상세 페이지에서 호출 시 true — 헤더를 더 컴팩트하게 표시 */
  compact?: boolean;
}

export function BlogPublicHeader({ storeSlug, storeInfo, blogSettings, compact = false }: BlogPublicHeaderProps) {
  // 우선순위: blog settings → store info → fallback
  const name = (blogSettings?.blogName?.trim() || storeInfo?.name?.trim() || '매장');
  const description = (blogSettings?.description?.trim() || storeInfo?.description?.trim() || null);
  const heroImage = blogSettings?.heroImage || null;
  const logo = storeInfo?.logo || null;

  return (
    <header
      style={{
        borderBottom: '1px solid #e2e8f0',
        background: '#fff',
        padding: compact ? '20px 0 16px' : '0 0 24px',
        marginBottom: compact ? '24px' : '32px',
      }}
    >
      {/* WO-O4O-KPA-STORE-BLOG-META-V1: hero image — full mode only, 절제된 column masthead.
          쇼핑몰 배너 톤 회피 위해 max-height 280px, 폭 100%, fade 없음. */}
      {!compact && heroImage && (
        <div
          style={{
            width: '100%',
            maxHeight: 280,
            overflow: 'hidden',
            background: '#0f172a',
            marginBottom: 24,
          }}
        >
          <img
            src={heroImage}
            alt={`${name} 대표 이미지`}
            style={{
              width: '100%',
              maxHeight: 280,
              objectFit: 'cover',
              display: 'block',
            }}
            loading="lazy"
          />
        </div>
      )}

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 16px', paddingTop: !compact && !heroImage ? 32 : 0 }}>
        {/* 매장 사이트 진입 — 작고 절제된 링크 */}
        <Link
          to={`/store/${storeSlug}`}
          style={{
            fontSize: '12px',
            color: '#64748b',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          ← 매장 메인으로
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: compact ? 'center' : 'flex-start',
            gap: compact ? '12px' : '16px',
            marginTop: compact ? '12px' : '16px',
          }}
        >
          {/* 로고 */}
          {logo ? (
            <img
              src={logo}
              alt={`${name} 로고`}
              style={{
                width: compact ? 40 : 56,
                height: compact ? 40 : 56,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: '1px solid #e2e8f0',
              }}
              loading="lazy"
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: compact ? 40 : 56,
                height: compact ? 40 : 56,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: compact ? 16 : 20,
                fontWeight: 700,
                color: '#475569',
                border: '1px solid #e2e8f0',
              }}
            >
              {name.charAt(0)}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  fontSize: compact ? 18 : 22,
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {name}
              </h1>
              <span
                style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Column
              </span>
            </div>

            {!compact && description && (
              <p
                style={{
                  fontSize: 14,
                  color: '#475569',
                  margin: '6px 0 0',
                  lineHeight: 1.6,
                }}
              >
                {description.length > 140 ? description.slice(0, 140) + '...' : description}
              </p>
            )}

            {!compact && !description && (
              <p
                style={{
                  fontSize: 13,
                  color: '#94a3b8',
                  margin: '6px 0 0',
                  fontStyle: 'italic',
                }}
              >
                전문가가 직접 작성하는 콘텐츠 채널입니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default BlogPublicHeader;
