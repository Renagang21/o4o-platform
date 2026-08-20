/**
 * GuideServiceIntroPage — `/service-guide` 공통 서비스 소개 landing
 *
 * WO-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1 §6 · §12 · §13
 *
 * KPA / K-Cosmetics / GlycoPharm 이 각각 들고 있던 ServiceGuidePage 3개(219~222 lines)가
 * 같은 레이아웃이었다. 문구·아이콘·경로만 다르므로 View 를 여기로 수렴시키고
 * 서비스별 데이터는 copy 파일에서 주입한다.
 *
 * 규칙:
 *   - 이 View 는 fetch / axios / 서비스 분기(if service === ...) 를 하지 않는다.
 *   - route 는 props 로만 들어온다 (하드코딩 금지).
 *   - Tailwind class 는 기존 3개 페이지와 동일하게 유지한다 (§14 디자인 개편 금지).
 */
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare } from 'lucide-react';
import type {
  GuideServiceIntroAction,
  GuideServiceIntroCardSection,
  GuideServiceIntroPageProps,
} from './types.js';

function ActionLink({ action, variant }: { action: GuideServiceIntroAction; variant: 'primary' | 'secondary' }) {
  const Icon = action.icon;
  const cls =
    variant === 'primary'
      ? 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm'
      : 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors';
  return (
    <Link to={action.to} className={cls}>
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {action.label}
    </Link>
  );
}

function CardGrid({ section, tone }: { section: GuideServiceIntroCardSection; tone: 'primary' | 'slate' }) {
  const cols = section.columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  const iconWrap = tone === 'primary' ? 'bg-primary-100' : 'bg-slate-100';
  const iconColor = tone === 'primary' ? 'text-primary-600' : 'text-slate-600';
  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {section.cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.title} className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <div className={`w-10 h-10 rounded-lg ${iconWrap} flex items-center justify-center mb-4`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">{c.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

export function GuideServiceIntroPage({
  badge = '서비스 안내',
  headline,
  lead,
  heroActions,
  intro,
  audiences,
  features,
  steps,
  contact,
  relatedGuide,
  renderText,
}: GuideServiceIntroPageProps) {
  const ContactIcon = contact.icon ?? MessageSquare;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-600 text-white text-sm font-medium mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white/90" />
            {badge}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">{headline}</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            {renderText ? renderText('hero-lead', lead) : lead}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            {heroActions.map((a, i) => (
              <ActionLink key={a.to + a.label} action={a} variant={i === 0 ? 'primary' : 'secondary'} />
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 서비스 소개 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">{intro.title}</h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 space-y-3">
            {intro.paragraphs.map((p, i) => (
              <p key={i} className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {renderText ? renderText(`intro-${i}`, p) : p}
              </p>
            ))}
          </div>
        </section>

        {/* 3. 이용 대상 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">{audiences.title}</h2>
          {audiences.description ? <p className="text-sm text-slate-500 mb-6">{audiences.description}</p> : null}
          <CardGrid section={{ ...audiences, columns: 3 }} tone="primary" />
        </section>

        {/* 4. 주요 기능 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">{features.title}</h2>
          {features.description ? <p className="text-sm text-slate-500 mb-6">{features.description}</p> : null}
          <CardGrid section={features} tone="slate" />
          {features.note ? <p className="text-xs text-slate-400 leading-relaxed mt-4">{features.note}</p> : null}
        </section>

        {/* 5. 이용 흐름 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">{steps.title}</h2>
          {steps.description ? <p className="text-sm text-slate-500 mb-6">{steps.description}</p> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {steps.items.map((s) => (
              <div key={s.no} className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <span className="text-xs font-bold text-primary-500">STEP {s.no}</span>
                <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{s.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. 기능 사용 가이드 연결 (§9 — /service-guide ↔ /guide 상호 연결) */}
        {relatedGuide ? (
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-1">{relatedGuide.title}</h2>
            {relatedGuide.description ? (
              <p className="text-sm text-slate-500 mb-6">{relatedGuide.description}</p>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedGuide.links.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-100 shadow-sm p-5 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      {Icon ? <Icon className="w-4 h-4 text-primary-600" /> : null}
                      {l.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* 7. 문의 안내 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">{contact.title}</h2>
          <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <ContactIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{contact.body}</p>
                {contact.note ? <p className="text-xs text-slate-400 leading-relaxed mt-2">{contact.note}</p> : null}
                <div className="mt-5">
                  <ActionLink action={contact.action} variant="primary" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
