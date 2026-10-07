/**
 * O4OPublicHero — O4O 공개 홈 공통 Hero (WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1)
 *
 * 화면에 h1 은 이 Hero 하나다. 제목 · 설명은 줄 배열로 받는다 — 데스크톱은 줄 단위,
 * 모바일(≤640px)은 설명만 이어서 흐른다(tokens.css). 강조색은 `accent` 하나만 서비스가 준다.
 * CTA 는 각 서비스가 실제 route · 동작으로 `actions` 에 넣는다 — 이 컴포넌트는 링크를 만들지 않는다.
 * `media` 는 브랜드 이미지가 제공되면 쓰는 자리다(없으면 렌더하지 않는다).
 * 스타일은 `./tokens.css` (각 앱 index.css 가 @import). 이 파일에 서비스명 조건문을 두지 않는다.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface O4OPublicHeroProps {
  /** 서비스 표시 이름 등 짧은 머리말 (선택) */
  eyebrow?: ReactNode;
  /** 제목 줄 — h1 */
  title: readonly string[];
  /** 설명 줄 */
  description?: readonly string[];
  /** 실제 CTA 들 (서비스가 Link / button 으로 구성) */
  actions?: ReactNode;
  /** CTA 아래 보조 영역 (상태 패널 등) */
  children?: ReactNode;
  /** 브랜드 이미지 자리 — 제공 전에는 넘기지 않는다 */
  media?: ReactNode;
  /** 서비스 강조색 (CTA · eyebrow) */
  accent?: string;
  className?: string;
  /** h1 id — aria-labelledby 연결용 */
  titleId?: string;
}

export function O4OPublicHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  media,
  accent,
  className,
  titleId = 'o4o-public-hero-title',
}: O4OPublicHeroProps) {
  const style = accent ? ({ '--o4o-accent': accent } as CSSProperties) : undefined;
  return (
    <section
      className={className ? `o4o-hero ${className}` : 'o4o-hero'}
      style={style}
      aria-labelledby={titleId}
      data-testid="o4o-public-hero"
    >
      <div className="o4o-hero__inner">
        <div className="o4o-hero__body">
          {eyebrow ? <p className="o4o-hero__eyebrow">{eyebrow}</p> : null}
          <h1 id={titleId} className="o4o-hero__title">
            {title.map((line) => (
              <span key={line} className="o4o-hero__line">
                {line}
              </span>
            ))}
          </h1>
          {description && description.length > 0 ? (
            <p className="o4o-hero__desc">
              {description.map((line) => (
                <span key={line} className="o4o-hero__line">
                  {line}
                </span>
              ))}
            </p>
          ) : null}
          {actions ? <div className="o4o-hero__actions">{actions}</div> : null}
          {children ? <div className="o4o-hero__children">{children}</div> : null}
        </div>
        {media ? <div className="o4o-hero__media">{media}</div> : null}
      </div>
    </section>
  );
}
