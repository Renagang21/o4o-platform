/**
 * LatestUpdatesSection - 최근 활동 섹션
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 표시 항목: 새 공급자 등록, 새 파트너 참여, 새 포럼 글
 * 정렬: 최신순
 * 표시 개수: 최대 5
 *
 * 데이터: netureApi.getSuppliers() + netureApi.getPartnershipRequests() 조합
 */

import { useState, useEffect } from 'react';
import { Activity, Building2, Handshake } from 'lucide-react';
import { netureApi, type Supplier, type PartnershipRequest } from '../../lib/api';

interface UpdateItem {
  id: string;
  name: string;
  role: string;
  icon: 'supplier' | 'partner';
}

export function LatestUpdatesSection() {
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        const [suppliers, requests] = await Promise.all([
          netureApi.getSuppliers().catch(() => [] as Supplier[]),
          netureApi.getPartnershipRequests('OPEN').catch(() => [] as PartnershipRequest[]),
        ]);

        const updates: UpdateItem[] = [];

        suppliers.slice(0, 3).forEach((s) => {
          updates.push({
            id: `s-${s.id}`,
            name: s.name,
            role: '새 공급자 참여',
            icon: 'supplier',
          });
        });

        requests.slice(0, 2).forEach((r) => {
          updates.push({
            id: `p-${r.id}`,
            name: r.seller.name,
            role: '새 파트너 참여',
            icon: 'partner',
          });
        });

        setItems(updates.slice(0, 5));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <Activity className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Latest Updates</h2>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <Activity className="w-8 h-8 text-primary-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Latest Updates</h2>
          <p className="text-sm text-gray-500">플랫폼 최근 활동</p>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                item.icon === 'supplier' ? 'bg-blue-100' : 'bg-emerald-100'
              }`}>
                {item.icon === 'supplier'
                  ? <Building2 className="w-5 h-5 text-blue-600" />
                  : <Handshake className="w-5 h-5 text-emerald-600" />
                }
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                <span className="text-sm text-gray-500"> — {item.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
