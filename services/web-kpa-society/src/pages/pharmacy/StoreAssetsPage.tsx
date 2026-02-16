/**
 * StoreAssetsPage — 매장 복사 자산 목록
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 *
 * 커뮤니티 CMS/Signage에서 "매장으로 복사"된 자산 스냅샷 목록 표시
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Monitor,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { assetSnapshotApi, type AssetSnapshotItem } from '../../api/assetSnapshot';

type TabKey = 'all' | 'cms' | 'signage';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export default function StoreAssetsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [items, setItems] = useState<AssetSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assetType = activeTab === 'all' ? undefined : activeTab;
      const res = await assetSnapshotApi.list(assetType);
      setItems(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
    { key: 'all', label: '전체', icon: FileText },
    { key: 'cms', label: 'CMS 콘텐츠', icon: FileText },
    { key: 'signage', label: '사이니지', icon: Monitor },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <a href="/pharmacy/store-hub" className="text-blue-600 hover:underline">&larr; 매장 허브</a>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">매장 자산</h1>
          <p className="text-sm text-slate-500 mt-1">커뮤니티에서 복사된 CMS/사이니지 자산 목록</p>
        </div>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          자산 목록을 불러오는 중...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchItems} className="mt-3 text-sm text-blue-600 hover:underline">
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-sm">복사된 자산이 없습니다.</p>
          <p className="text-xs mt-1">커뮤니티 콘텐츠/사이니지 관리에서 "매장으로 복사" 버튼을 이용해주세요.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-3 font-medium">유형</th>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium w-28">복사일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.assetType === 'cms'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}>
                      {item.assetType === 'cms' ? 'CMS' : '사이니지'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 truncate max-w-md">{item.title}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
