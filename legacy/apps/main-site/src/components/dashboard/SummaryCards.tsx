import { FC } from 'react';
import {
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Users
} from 'lucide-react';

const SummaryCards: FC = () => {
  const cards = [
    {
      title: '총 주문 수',
      value: '1,234',
      change: '+12.5%',
      icon: ShoppingBag,
      color: 'blue'
    },
    {
      title: '총 매출액',
      value: '₩12,345,678',
      change: '+8.2%',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: '승인 대기 상품',
      value: '5',
      change: '2건 긴급',
      icon: AlertCircle,
      color: 'yellow'
    },
    {
      title: '누적 방문자',
      value: '8,901',
      change: '+23.1%',
      icon: Users,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      purple: 'bg-purple-50 text-purple-600'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card: any) => (
        <div
          key={card.title}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${getColorClasses(card.color)}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {card.change}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {card.value}
          </h3>
          <p className="text-sm text-gray-500">{card.title}</p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards; 