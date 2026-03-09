/**
 * PartnerLinksPage - 파트너 Referral 링크 관리 페이지
 *
 * WO-O4O-PARTNER-LINKS-API-INTEGRATION-V1
 *
 * partner_referrals 실제 데이터 조회
 */

import { useEffect, useState, useCallback } from 'react';
import { Search, Copy, ExternalLink, Link2, Loader2 } from 'lucide-react';
import { partnerAffiliateApi, type ReferralLink } from '../../lib/api/partner';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function PartnerLinksPage() {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    const data = await partnerAffiliateApi.getReferralLinks();
    setLinks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const filtered = links.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.product_name.toLowerCase().includes(q) ||
      (l.store_name || '').toLowerCase().includes(q) ||
      l.referral_token.toLowerCase().includes(q)
    );
  });

  const handleCopy = async (link: ReferralLink) => {
    try {
      const fullUrl = `${window.location.origin}${link.referral_url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleOpen = (link: ReferralLink) => {
    window.open(link.referral_url, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Links</h1>
        <p className="text-sm text-gray-500 mt-1">생성한 Referral 링크를 관리합니다</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="상품명, 매장명, 토큰 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 size={24} className="text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">링크를 불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">
            {links.length === 0 ? '생성된 Referral 링크가 없습니다' : '검색 결과가 없습니다'}
          </p>
          <p className="text-sm text-gray-400">
            {links.length === 0 ? 'Products 탭에서 Referral 링크를 생성하세요.' : '다른 검색어를 입력해보세요.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Referral URL</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-gray-900">{l.product_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600">{l.store_name || l.store_slug}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded max-w-xs truncate block">
                        {l.referral_url}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-500">{fmtDate(l.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleCopy(l)}
                          className={`p-1.5 rounded-md transition-colors ${
                            copiedId === l.id
                              ? 'text-emerald-600 bg-emerald-50'
                              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title={copiedId === l.id ? 'Copied!' : 'Copy URL'}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => handleOpen(l)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Open Page"
                        >
                          <ExternalLink size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((l) => (
              <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-900">{l.product_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{l.store_name || l.store_slug}</p>
                </div>
                <code className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded block mb-3 truncate">
                  {l.referral_url}
                </code>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{fmtDate(l.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(l)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        copiedId === l.id
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200'
                      }`}
                    >
                      {copiedId === l.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleOpen(l)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
