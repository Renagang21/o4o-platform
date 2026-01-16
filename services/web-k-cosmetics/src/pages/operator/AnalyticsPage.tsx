/**
 * AnalyticsPage - K-Cosmetics 분석/리포트
 */

const salesByCategory = [
  { category: '스킨케어', sales: '₩45,200,000', percentage: 35, growth: '+12%' },
  { category: '메이크업', sales: '₩32,100,000', percentage: 25, growth: '+8%' },
  { category: '클렌징', sales: '₩19,400,000', percentage: 15, growth: '+5%' },
  { category: '선케어', sales: '₩16,800,000', percentage: 13, growth: '+18%' },
  { category: '에센스', sales: '₩15,500,000', percentage: 12, growth: '+3%' },
];

const topStores = [
  { rank: 1, name: '뷰티스타 압구정점', sales: '₩21,300,000', orders: 156, growth: '+15%' },
  { rank: 2, name: '스킨케어 명동점', sales: '₩15,200,000', orders: 134, growth: '+8%' },
  { rank: 3, name: '뷰티랩 강남점', sales: '₩12,500,000', orders: 98, growth: '+12%' },
  { rank: 4, name: '코스메틱 홍대점', sales: '₩8,900,000', orders: 67, growth: '+5%' },
  { rank: 5, name: '메이크업 신촌점', sales: '₩6,700,000', orders: 45, growth: '+3%' },
];

const topProducts = [
  { rank: 1, name: '수분 크림 50ml', brand: '글로우랩', sold: 1234, revenue: '₩55,530,000' },
  { rank: 2, name: '비타민C 세럼', brand: '스킨퓨어', sold: 892, revenue: '₩60,656,000' },
  { rank: 3, name: '선크림 SPF50+', brand: '썬가드', sold: 756, revenue: '₩24,192,000' },
  { rank: 4, name: '클렌징 폼', brand: '클린뷰티', sold: 623, revenue: '₩13,706,000' },
  { rank: 5, name: '립스틱 레드', brand: '컬러팝', sold: 512, revenue: '₩14,336,000' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">분석/리포트</h1>
          <p className="text-slate-500 mt-1">플랫폼 성과 분석 및 인사이트</p>
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
            <option>2024년 1월</option>
            <option>2023년 12월</option>
            <option>2023년 11월</option>
          </select>
          <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
            리포트 다운로드
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">총 매출</p>
          <p className="text-2xl font-bold text-slate-800">₩129,000,000</p>
          <p className="text-sm text-green-600 mt-1">+12% vs 전월</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">총 주문수</p>
          <p className="text-2xl font-bold text-slate-800">1,523</p>
          <p className="text-sm text-green-600 mt-1">+8% vs 전월</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">평균 주문액</p>
          <p className="text-2xl font-bold text-slate-800">₩84,700</p>
          <p className="text-sm text-green-600 mt-1">+3% vs 전월</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">활성 매장</p>
          <p className="text-2xl font-bold text-slate-800">48</p>
          <p className="text-sm text-green-600 mt-1">+5 신규</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">카테고리별 매출</h2>
          <div className="space-y-4">
            {salesByCategory.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.category}</span>
                  <div className="flex gap-4">
                    <span className="text-sm text-slate-600">{item.sales}</span>
                    <span className="text-sm text-green-600">{item.growth}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Stores */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">매출 상위 매장</h2>
          <div className="space-y-3">
            {topStores.map((store) => (
              <div key={store.rank} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  store.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                  store.rank === 2 ? 'bg-gray-100 text-gray-700' :
                  store.rank === 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {store.rank}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{store.name}</p>
                  <p className="text-sm text-slate-500">{store.orders}건</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800">{store.sales}</p>
                  <p className="text-sm text-green-600">{store.growth}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">인기 상품 TOP 5</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">순위</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상품명</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">브랜드</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">판매량</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">매출</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topProducts.map((product) => (
              <tr key={product.rank} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                    product.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    product.rank === 2 ? 'bg-gray-100 text-gray-700' :
                    product.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {product.rank}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{product.brand}</td>
                <td className="px-6 py-4 text-right text-slate-600">{product.sold.toLocaleString()}개</td>
                <td className="px-6 py-4 text-right font-medium text-slate-800">{product.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
