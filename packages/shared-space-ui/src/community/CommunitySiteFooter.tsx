/**
 * CommunitySiteFooter — 커뮤니티 서비스 공개 푸터 공통 View
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §14
 *
 * 배경:
 *   KPA-Society 는 inline style 로 손수 짠 1단 링크 나열, Pharmacy-Hub 는 Tailwind
 *   섹션 그리드로 서로 다른 푸터를 갖고 있었다. 링크 목록은 이미 서비스 config 가
 *   소유하므로(SSOT), **View 만** 공통으로 올려 두 서비스가 같은 구조를 쓰게 한다.
 *
 * 역할 분담:
 *   - 공통(이 파일) : 브랜드 블록 + 섹션 그리드 + 하단 법정정보 바 (레이아웃·시각)
 *   - 서비스        : 브랜드 값 · 섹션 링크 config · 법정정보 슬롯
 *
 * 불변식:
 *   - 링크를 이 파일에 하드코딩하지 않는다. 전부 `sections` 로 주입한다(데드링크 0 는
 *     서비스 config 가 보증한다).
 *   - 법정정보는 하드코딩 금지 — 서비스가 `legalSlot` 으로 PublicLegalFooterInfo 를 넣는다.
 *   - 서비스 분기(`serviceKey === ...`)를 두지 않는다.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface CommunityFooterLink {
  label: string;
  href: string;
}

export interface CommunityFooterSection {
  title: string;
  links: readonly CommunityFooterLink[];
}

export interface CommunitySiteFooterProps {
  brand: {
    /** 로고 마크 — emoji 문자열 또는 아이콘 노드 */
    icon?: ReactNode;
    name: string;
    /** 브랜드 한 줄 설명 */
    tagline?: string;
    /** 도메인 등 보조 표기 */
    subtitle?: string;
    /** 로고 배경 색 (Tailwind 임의값 대신 inline — 서비스 브랜드 색) */
    accentColor?: string;
  };
  sections: readonly CommunityFooterSection[];
  /** © 라인 문구 */
  copyright: string;
  /** 법정정보 — 보통 <PublicLegalFooterInfo …/> */
  legalSlot?: ReactNode;
}

export function CommunitySiteFooter({
  brand,
  sections,
  copyright,
  legalSlot,
}: CommunitySiteFooterProps) {
  return (
    <footer className="mt-auto bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2 no-underline">
              {brand.icon ? (
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: brand.accentColor ?? '#334155' }}
                  aria-hidden="true"
                >
                  {brand.icon}
                </span>
              ) : null}
              <span className="text-xl font-bold text-white">{brand.name}</span>
            </Link>
            {brand.tagline ? (
              <p className="max-w-sm text-sm leading-relaxed text-slate-400">{brand.tagline}</p>
            ) : null}
            {brand.subtitle ? (
              <p className="mt-3 text-xs text-slate-500">{brand.subtitle}</p>
            ) : null}
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-sm font-semibold text-white">{section.title}</h4>
              <ul className="flex flex-col gap-2">
                {section.links.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className="text-sm text-slate-300 no-underline hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          <p className="m-0">{copyright}</p>
          {legalSlot}
        </div>
      </div>
    </footer>
  );
}

export default CommunitySiteFooter;
