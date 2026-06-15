/**
 * ContentHubCardGrid — ContentHubTemplate renderItems 용 공통 카드 그리드
 *
 * WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1
 *
 * GP/KCos `/store-hub/content` 의 near-identical 카드 그리드 wrapper 중복 제거.
 * - 카드 구조/복사 버튼 상태(idle/copying/copied)는 공통.
 * - 서비스별 차이는 accent 색만 → accent 파라미터로 주입.
 * - 복사 문구(copyLabel/copiedLabel/copyingLabel)는 ctx 로 주입(ContentHubTemplate config)
 *   → "내 매장" / "내 약국" 등 서비스 용어는 config 에서 그대로 보존된다.
 *
 * 사용: `renderItems: contentHubCardGrid('primary')` (config 에 지정).
 * accent 클래스는 정적 literal 로 보유 → 각 소비 서비스 Tailwind content(shared-space-ui/src 포함)가
 * 자기 팔레트(GP primary / KCos pink)를 생성한다. (동적 `bg-${x}` 금지)
 */

import type { ReactNode } from 'react';
import { Check, Loader2, Copy, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import type { ContentHubItem, ContentHubItemContext } from './ContentHubTemplate';

export type ContentHubCardAccent = 'primary' | 'pink' | 'emerald' | 'blue';

const ACCENTS: Record<ContentHubCardAccent, { hoverBorder: string; copyIdle: string }> = {
  primary: { hoverBorder: 'hover:border-primary-200', copyIdle: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
  pink: { hoverBorder: 'hover:border-pink-200', copyIdle: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
  emerald: { hoverBorder: 'hover:border-emerald-200', copyIdle: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
  blue: { hoverBorder: 'hover:border-blue-200', copyIdle: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
};

function ContentHubCard({
  item,
  ctx,
  accent,
}: {
  item: ContentHubItem;
  ctx: ContentHubItemContext;
  accent: ContentHubCardAccent;
}) {
  const isCopying = ctx.copyingId === item.id;
  const alreadyCopied = ctx.copiedIds.has(item.id);
  const a = ACCENTS[accent];

  return (
    <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden transition-all hover:shadow-md ${a.hoverBorder}`}>
      {item.thumbnail ? (
        <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-slate-50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-200" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {item.type && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded mb-1.5">
                {item.type}
              </span>
            )}
            <h3 className="text-sm font-semibold text-slate-800 line-clamp-2">{item.title}</h3>
            {item.summary && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.summary}</p>
            )}
          </div>
          {item.href && <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />}
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-slate-400">{item.date}</p>
          {ctx.onCopy && (
            <button
              onClick={(e) => { e.stopPropagation(); ctx.onCopy!(item); }}
              disabled={alreadyCopied || isCopying}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                alreadyCopied
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : isCopying
                    ? 'bg-slate-100 text-slate-400 cursor-wait'
                    : a.copyIdle
              }`}
            >
              {alreadyCopied ? (
                <><Check className="w-3 h-3" /> {ctx.copiedLabel}</>
              ) : isCopying ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> {ctx.copyingLabel}</>
              ) : (
                <><Copy className="w-3 h-3" /> {ctx.copyLabel}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ContentHubConfig.renderItems 에 바로 지정 가능한 카드 그리드 렌더러를 생성한다.
 * @param accent 서비스 accent 색 (GP='primary', KCos='pink')
 */
export function contentHubCardGrid(accent: ContentHubCardAccent) {
  return (items: ContentHubItem[], ctx: ContentHubItemContext): ReactNode => {
    if (items.length === 0) {
      return (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">등록된 콘텐츠가 없습니다.</p>
        </div>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(item => <ContentHubCard key={item.id} item={item} ctx={ctx} accent={accent} />)}
      </div>
    );
  };
}
