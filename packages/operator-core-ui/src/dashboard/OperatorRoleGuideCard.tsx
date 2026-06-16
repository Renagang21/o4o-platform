/**
 * OperatorRoleGuideCard — 운영 철학 안내 카드 (공통)
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-UI-PARITY-V1:
 *   KPA inline OperatorRoleGuideCard → 공통 컴포넌트로 추출.
 *   "운영자는 관리자가 아닙니다" 운영 철학 안내를 세 서비스(KPA/GlycoPharm/K-Cos)
 *   operator 첫 화면에서 동일 구조로 표시한다.
 *
 * 카드 본문(제목/설명/철학)은 service-neutral static.
 * 가이드 링크는 서비스별 route 가 다르므로 prop 으로 주입한다.
 *   - guideHref 미지정 시 링크 생략 → 데드링크 방지 (CLAUDE.md 데드링크 0).
 */

import { Link } from 'react-router-dom';

export interface OperatorRoleGuideCardProps {
  /** 가이드 링크 대상 (서비스별 주입). 미지정 시 링크 생략 — 데드링크 방지. */
  guideHref?: string;
  /** 가이드 링크 라벨. 기본값 '운영자 활용 가이드 보기'. */
  guideLabel?: string;
}

export function OperatorRoleGuideCard({
  guideHref,
  guideLabel = '운영자 활용 가이드 보기',
}: OperatorRoleGuideCardProps) {
  return (
    <section className="bg-white rounded-xl border border-indigo-100 p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden="true">🤝</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            운영자는 관리자가 아닙니다
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            공급자 협력 · 자료 구성 · AI 보조 · 매장 지원 · 운영 생태계 구축
          </p>
          <p className={`text-sm text-slate-600 leading-relaxed${guideHref ? ' mb-4' : ''}`}>
            운영자는 공급자와 협력하고 자료를 정리하며 AI 도움을 활용하여
            매장이 실제 활용할 수 있는 환경을 지원합니다.
          </p>
          {guideHref && (
            <Link
              to={guideHref}
              className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {guideLabel}
              <span className="ml-1" aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
