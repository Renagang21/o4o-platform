/**
 * ReferralLinksPage - 내 Referral 링크 관리
 *
 * Work Order: WO-O4O-PARTNER-HUB-CORE-V1
 * Refined: WO-O4O-PARTNER-HUB-REFINEMENT-V1
 * Style finish: WO-O4O-NETURE-EXPANDABLE-AND-REMAINING-LISTS-STANDARDIZATION-BATCH-V5
 *   styles.* inline 객체 제거 → Tailwind / O4O 토큰. 데스크톱 DataTable · 모바일 카드 구조 유지.
 *
 * Desktop: DataTable (Product | Store | Referral URL | Created date | Actions)
 * Mobile: Card list
 */

import { useState, useEffect, useCallback } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { partnerAffiliateApi } from '../../lib/api/index.js';
import type { ReferralLink } from '../../lib/api/index.js';

// 링크 액션 버튼 — 데스크톱/모바일 공용 (인라인 스타일 대신 Tailwind).
// Copy 는 '복사됨' 상태 피드백이 있는 주 CTA 라 인라인 유지(RowActionMenu 미적용).
const actionBtnBase =
  'inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-semibold cursor-pointer transition-colors';

export default function ReferralLinksPage() {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await partnerAffiliateApi.getReferralLinks();
      setLinks(data);
      setLoading(false);
    })();
  }, []);

  const buildUrl = useCallback((link: ReferralLink) => {
    if (link.store_slug && link.product_slug) {
      return `/store/${link.store_slug}/product/${link.product_slug}?ref=${link.referral_token}`;
    }
    return `/store/product/${link.product_id}?ref=${link.referral_token}`;
  }, []);

  const handleCopy = useCallback(async (link: ReferralLink) => {
    const url = `${window.location.origin}${buildUrl(link)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, [buildUrl]);

  const handleOpen = useCallback((link: ReferralLink) => {
    window.open(buildUrl(link), '_blank', 'noopener,noreferrer');
  }, [buildUrl]);

  const copyBtnClass = (isCopied: boolean) =>
    `${actionBtnBase} ${
      isCopied
        ? 'border border-green-600 bg-green-100 text-green-800'
        : 'border border-blue-600 bg-white text-blue-600 hover:bg-blue-50'
    }`;

  const openBtnClass = `${actionBtnBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;

  const urlCodeClass =
    'text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded break-all';

  // WO-…-V1: raw <table> → 표준 DataTable 컬럼. 표시 내용 동일.
  const columns: ListColumnDef<ReferralLink>[] = [
    {
      key: 'product_name',
      header: 'Product',
      minWidth: 180,
      render: (_v, link) => (
        <div>
          <div className="font-medium text-slate-800">{link.product_name}</div>
          {link.commission_per_unit != null && (
            <div className="text-xs text-green-600 mt-0.5">
              커미션 ₩{link.commission_per_unit.toLocaleString()}/개
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'store_slug',
      header: 'Store',
      width: '140px',
      render: (_v, link) => <span className="text-[13px] text-slate-500">{link.store_slug || '-'}</span>,
    },
    {
      key: 'referral_url',
      header: 'Referral URL',
      minWidth: 200,
      render: (_v, link) => <code className={urlCodeClass}>{buildUrl(link)}</code>,
    },
    {
      key: 'created_at',
      header: 'Created',
      width: '120px',
      render: (_v, link) => (
        <span className="text-[13px] text-slate-500 whitespace-nowrap">
          {new Date(link.created_at).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: '_actions',
      header: 'Actions',
      width: '170px',
      align: 'center',
      system: true,
      render: (_v, link) => {
        const isCopied = copiedId === link.id;
        return (
          <div className="flex justify-center gap-1.5">
            <button onClick={() => handleCopy(link)} className={copyBtnClass(isCopied)} title="URL 복사">
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              {isCopied ? '복사됨' : 'Copy'}
            </button>
            <button onClick={() => handleOpen(link)} className={openBtnClass} title="URL 열기">
              <ExternalLink size={14} />
              Open
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-[1000px] mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 m-0">My Links</h1>
        <p className="text-sm text-slate-500 mt-1">생성한 Referral 링크를 관리하고 공유하세요</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : links.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-2">
          <Link2 size={40} className="text-slate-400" />
          <p className="text-sm text-slate-500 m-0">생성된 Referral 링크가 없습니다.</p>
          <p className="text-[13px] text-slate-400 m-0">Products에서 제품을 선택하여 링크를 생성하세요.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="referral-links-table">
            {/* WO-…-V1: raw <table> → 표준 DataTable (데스크톱 표만, 모바일 카드 뷰 유지). */}
            <DataTable<ReferralLink>
              columns={columns}
              data={links}
              rowKey={(l) => l.id}
              emptyMessage="생성된 링크가 없습니다"
            />
          </div>

          {/* Mobile Cards */}
          <div className="referral-links-cards">
            {links.map((link) => {
              const url = buildUrl(link);
              const isCopied = copiedId === link.id;
              return (
                <div
                  key={link.id}
                  className="flex justify-between items-center flex-wrap gap-4 bg-white rounded-xl border border-slate-200 px-5 py-4"
                >
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-[15px] font-semibold text-slate-900 mb-1">{link.product_name}</h3>
                    <p className="text-[13px] text-slate-500 mb-2">
                      가격: ₩{link.price_general.toLocaleString()}
                      {link.commission_per_unit != null && (
                        <> · 커미션: ₩{link.commission_per_unit.toLocaleString()}/개</>
                      )}
                    </p>
                    <div className="mb-1">
                      <code className={urlCodeClass}>{url}</code>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      생성일: {new Date(link.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleCopy(link)} className={copyBtnClass(isCopied)}>
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      {isCopied ? '복사됨' : 'URL 복사'}
                    </button>
                    <button onClick={() => handleOpen(link)} className={openBtnClass}>
                      <ExternalLink size={14} />
                      열기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Responsive CSS — 데스크톱/모바일 뷰 전환만 담당 (inline style 대신 클래스 기반) */}
          <style>{`
            .referral-links-cards { display: none; }
            @media (max-width: 768px) {
              .referral-links-table { display: none !important; }
              .referral-links-cards { display: flex !important; flex-direction: column; gap: 12px; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
