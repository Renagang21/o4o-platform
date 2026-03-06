/**
 * PartnerLinksPage - 파트너 홍보 링크 관리 페이지
 *
 * Work Order: WO-O4O-PARTNER-LINKS-PAGE-V1
 *
 * 구조:
 * - Toolbar: 검색 + 콘텐츠 필터 + 상태 필터 + 생성 버튼
 * - Table: 링크 목록 (Desktop) / Card (Mobile)
 * - Empty State: 링크 없을 때
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Copy, Edit3, Trash2, Link2 } from 'lucide-react';

// ── Types ──

type LinkStatus = 'Draft' | 'Active' | 'Inactive';

interface LinkItem {
  id: string;
  path: string;
  contentTitle: string;
  storeName: string;
  createdAt: string;
  status: LinkStatus;
}

// ── Mock Data ──

const mockLinks: LinkItem[] = [
  { id: '1', path: '/neture/p/123', contentTitle: '비타민C 홍보', storeName: '서울약국', createdAt: '2026-03-01', status: 'Active' },
  { id: '2', path: '/neture/p/124', contentTitle: '혈당측정기 홍보', storeName: '강남약국', createdAt: '2026-02-28', status: 'Active' },
  { id: '3', path: '/neture/p/125', contentTitle: '프로바이오틱스 리뷰', storeName: '부산약국', createdAt: '2026-02-25', status: 'Draft' },
  { id: '4', path: '/neture/p/126', contentTitle: '봄 시즌 캠페인', storeName: '대전약국', createdAt: '2026-02-20', status: 'Active' },
  { id: '5', path: '/neture/p/127', contentTitle: '신제품 런칭', storeName: '인천약국', createdAt: '2026-02-15', status: 'Inactive' },
];

const contentOptions = [...new Set(mockLinks.map((l) => l.contentTitle))];
const linkStatuses: LinkStatus[] = ['Draft', 'Active', 'Inactive'];

// ── Style Helpers ──

const statusStyle: Record<LinkStatus, string> = {
  Draft: 'bg-amber-100 text-amber-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-500',
};

export function PartnerLinksPage() {
  const [search, setSearch] = useState('');
  const [contentFilter, setContentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LinkStatus | ''>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = mockLinks.filter((l) => {
    if (search && !l.path.toLowerCase().includes(search.toLowerCase()) && !l.contentTitle.toLowerCase().includes(search.toLowerCase())) return false;
    if (contentFilter && l.contentTitle !== contentFilter) return false;
    if (statusFilter && l.status !== statusFilter) return false;
    return true;
  });

  const handleCopy = async (link: LinkItem) => {
    try {
      await navigator.clipboard.writeText(`https://neture.co.kr${link.path}`);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Links</h1>
          <p className="text-sm text-gray-500 mt-1">홍보 링크를 생성하고 매장 연결을 관리합니다</p>
        </div>
        <Link
          to="/account/partner/links/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          링크 생성
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="링크 또는 콘텐츠 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={contentFilter}
          onChange={(e) => setContentFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">모든 콘텐츠</option>
          {contentOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LinkStatus | '')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">모든 상태</option>
          {linkStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">등록된 홍보 링크가 없습니다</p>
          <p className="text-sm text-gray-400 mb-6">홍보 링크를 생성하여 매장과 콘텐츠를 연결하세요.</p>
          <Link
            to="/account/partner/links/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            링크 생성
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">링크</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">콘텐츠</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">매장</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">생성일</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {l.path}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-900">{l.contentTitle}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600">{l.storeName}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-500">{l.createdAt}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[l.status]}`}>
                        {l.status}
                      </span>
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
                          title={copiedId === l.id ? 'Copied!' : 'Copy'}
                        >
                          <Copy size={15} />
                        </button>
                        <Link
                          to={`/account/partner/links/${l.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </Link>
                        <button
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
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
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{l.contentTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{l.storeName}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[l.status]}`}>
                    {l.status}
                  </span>
                </div>
                <code className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded block mb-3">
                  {l.path}
                </code>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{l.createdAt}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(l)}
                      className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                        copiedId === l.id
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                    >
                      {copiedId === l.id ? 'Copied!' : <Copy size={15} />}
                    </button>
                    <Link
                      to={`/account/partner/links/${l.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md"
                    >
                      <Edit3 size={15} />
                    </Link>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 rounded-md">
                      <Trash2 size={15} />
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
