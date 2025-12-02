interface AdminStatsCardProps {
  users: number;
  products: number;
  ordersToday: number;
  revenue: number;
  sellers: number;
  suppliers: number;
  partners: number;
}

export function AdminStatsCard({
  users,
  products,
  ordersToday,
  revenue,
  sellers,
  suppliers,
  partners,
}: AdminStatsCardProps) {
  const stats = [
    { label: '전체 사용자', value: users.toLocaleString(), color: 'blue' },
    { label: '전체 상품', value: products.toLocaleString(), color: 'green' },
    { label: '오늘 주문', value: ordersToday.toLocaleString(), color: 'purple' },
    { label: '총 매출', value: `₩${revenue.toLocaleString()}`, color: 'yellow' },
    { label: '판매자', value: sellers.toLocaleString(), color: 'red' },
    { label: '공급자', value: suppliers.toLocaleString(), color: 'indigo' },
    { label: '파트너', value: partners.toLocaleString(), color: 'pink' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-6 rounded-lg border-2 shadow-sm ${colorClasses[stat.color]}`}
        >
          <div className="text-sm font-medium mb-2 opacity-75">{stat.label}</div>
          <div className="text-3xl font-bold">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
