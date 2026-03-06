/**
 * FeaturedSection - Featured Suppliers / Partners
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 운영자 선택 기반 Featured 표시.
 * 현재는 API에서 상위 공급자를 가져와 표시.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';
import { netureApi, type Supplier } from '../../lib/api';

export function FeaturedSection() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        const data = await netureApi.getSuppliers();
        setSuppliers(data.slice(0, 3));
      } catch {
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        {/* Featured Suppliers */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Featured Suppliers</h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 bg-gray-50 rounded-xl border border-gray-200 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : suppliers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {suppliers.map((supplier) => (
                <Link
                  key={supplier.id}
                  to={`/community/knowledge`}
                  className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <img
                      src={supplier.logo}
                      alt={supplier.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{supplier.name}</h4>
                      <span className="text-xs text-gray-500">{supplier.category}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {supplier.shortDescription}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-500">등록된 공급자가 없습니다</p>
            </div>
          )}
        </div>

        {/* Featured Partners */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Featured Partners</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {['콘텐츠 마케팅', 'SNS 홍보', '매장 디자인'].map((name) => (
              <div
                key={name}
                className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 text-center"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{name}</h4>
                <p className="text-xs text-gray-500">파트너 참여 가능</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
