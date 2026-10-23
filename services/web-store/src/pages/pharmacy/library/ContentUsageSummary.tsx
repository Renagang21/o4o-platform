import type { StoreContentUsage } from '../../../api/assetSnapshot';

/** Counts describe the reported coverage, never every place a copy might be used. */
export function ContentUsageSummary({ usage, onRetry }: Readonly<{
  usage: StoreContentUsage | null | undefined;
  onRetry: () => void;
}>) {
  if (usage === undefined) return <span>사용처 확인 중…</span>;
  const counts = usage?.usage;
  if (!counts || ![counts.qr, counts.tablet_display, counts.product_link, counts.pop_pdf]
    .every(value => Number.isSafeInteger(value) && value >= 0)) {
    return <span>사용처를 확인하지 못했습니다. <button type="button" className="min-h-11 underline" onClick={onRetry}>사용처 다시 확인</button></span>;
  }
  const labels = [
    counts.qr > 0 ? `QR ${counts.qr}` : '',
    counts.tablet_display > 0 ? `태블릿 ${counts.tablet_display}` : '',
    counts.product_link > 0 ? `취급제품 ${counts.product_link}` : '',
    counts.pop_pdf > 0 ? `POP ${counts.pop_pdf}` : '',
  ].filter(Boolean);
  const coverage = usage?.coverage;
  const limits = [
    coverage?.tablet_content_list_block === 'not_counted' ? '태블릿 블록 미집계' : '',
    coverage?.store_videos === 'no_link' ? '영상 연결 미집계' : '',
    coverage?.pop === 'approximate' ? 'POP은 근사 집계' : '',
  ].filter(Boolean);
  return <span className="inline-flex flex-col gap-1">
    <span>{labels.length ? `${labels.join(' · ')}에서 사용 중` : '집계된 사용처 없음'}</span>
    <span className="text-xs font-normal text-slate-500">{limits.length ? limits.join(' · ') : '전체 사용처 집계 여부는 확인이 필요합니다.'}</span>
  </span>;
}
