/**
 * Footer — Pharmacy-Hub 공개 푸터
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1
 *
 * K-Cosmetics / Neture 푸터와 같은 구조(브랜드 + 섹션 링크 + 법정정보 bottom bar)지만
 * **링크는 Pharmacy-Hub 에 실제로 존재하는 route 만** 담는다(config/navigation.ts 의 SSOT).
 * /terms · /privacy 는 WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1 에서 route 가
 * 생겨 등재됐다. route 없는 /contact 등은 여전히 옮기지 않는다(데드링크 0).
 *
 * 법정정보는 하드코딩 금지 — ServiceLegalProfile public API 값이 있을 때만 표시하며
 * 미설정/비활성/오류 시 해당 영역만 비표시된다(PublicLegalFooterInfo 계약).
 *
 * Tailwind 로 작성한다(다른 서비스의 inline style 사본을 만들지 않는다).
 */

import { Link } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { BRAND, SERVICE_KEY } from '../config/service';
import { PH_FOOTER_SECTIONS } from '../config/navigation';
import { loadFooterLegal } from '../lib/footerLegal';

export default function Footer() {
  return (
    <footer className="mt-auto bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
                <Pill className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold text-white">{BRAND.name}</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">{BRAND.tagline}</p>
            <p className="mt-3 text-xs text-slate-500">{BRAND.domain}</p>
          </div>

          {PH_FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-sm font-semibold text-white">{section.title}</h4>
              <ul className="flex flex-col gap-2">
                {section.links.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className="text-sm text-slate-300 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          <p>&copy; 2026 {BRAND.name}. All rights reserved.</p>
          <PublicLegalFooterInfo serviceKey={SERVICE_KEY} loadProfile={loadFooterLegal} />
        </div>
      </div>
    </footer>
  );
}
