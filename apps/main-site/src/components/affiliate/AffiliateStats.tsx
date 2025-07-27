import { FC } from 'react';
import { MousePointer, ShoppingBag, DollarSign, Calendar } from 'lucide-react';

const AffiliateStats: FC = () => {
  const stats = [
    {
      id: 'clicks',
      name: '총 클릭 수',
      value: '1,234',
      change: '+12.3%',
      icon: MousePointer,
      color: 'text-blue-600'
    },
    {
      id: 'conversions',
      name: '전환 수',
      value: '89',
      change: '+5.2%',
      icon: ShoppingBag,
      color: 'text-green-600'
    },
    {
      id: 'revenue',
      name: '누적 수익',
      value: '₩1,234,567',
      change: '+8.7%',
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      id: 'estimated',
      name: '이번 달 예상 정산액',
      value: '₩234,567',
      change: '+15.4%',
      icon: Calendar,
      color: 'text-orange-600'
    }
  ];

  return (
    <div 
      className="bg-white rounded-xl shadow-sm"
      role="region"
      aria-label="요약 통계"
    >
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          요약 통계
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="relative p-6 bg-white border border-gray-200 rounded-lg"
            role="article"
            aria-labelledby={`stat-title-${stat.id}`}
          >
            <div className="flex items-center">
              <div 
                className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}
                aria-hidden="true"
              >
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p 
                  className="text-sm font-medium text-gray-500"
                  id={`stat-title-${stat.id}`}
                >
                  {stat.name}
                </p>
                <p 
                  className="text-2xl font-semibold text-gray-900"
                  aria-label={`${stat.name}: ${stat.value}`}
                >
                  {stat.value}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <span 
                className="text-sm font-medium text-green-600"
                aria-label={`지난 달 대비 ${stat.change} 증가`}
              >
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">
                지난 달 대비
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AffiliateStats; 