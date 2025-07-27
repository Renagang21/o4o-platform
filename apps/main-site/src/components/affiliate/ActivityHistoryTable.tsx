import { useState, FC } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ActivityHistoryTable: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const activities = [
    {
      id: '1',
      date: '2024-03-15',
      clicks: 123,
      conversions: 5,
      revenue: 125000
    },
    {
      id: '2',
      date: '2024-03-14',
      clicks: 98,
      conversions: 3,
      revenue: 75000
    },
    {
      id: '3',
      date: '2024-03-13',
      clicks: 156,
      conversions: 7,
      revenue: 175000
    },
    {
      id: '4',
      date: '2024-03-12',
      clicks: 87,
      conversions: 4,
      revenue: 100000
    },
    {
      id: '5',
      date: '2024-03-11',
      clicks: 134,
      conversions: 6,
      revenue: 150000
    }
  ];

  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-xl shadow-sm" role="region" aria-label="활동 이력">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-text-main">
          활동 이력
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table 
          className="min-w-full divide-y divide-gray-200"
          aria-label="활동 이력 테이블"
        >
          <thead className="bg-secondary">
            <tr>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                날짜
              </th>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                클릭 수
              </th>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                전환 수
              </th>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                발생 수익
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentActivities.map((activity) => (
              <tr key={activity.id}>
                <td className="px-6 py-4 whitespace-nowrap text-base text-text-main">
                  {activity.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-text-main">
                  {activity.clicks.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-text-main">
                  {activity.conversions.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-text-main">
                  ₩{activity.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            총 {activities.length}개의 기록
          </div>
          <nav 
            className="flex items-center space-x-2"
            aria-label="페이지 내비게이션"
          >
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="이전 페이지"
              className="p-2 text-text-secondary hover:text-primary disabled:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg transition-colors duration-200"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <span 
              className="text-sm text-text-main"
              aria-current="page"
            >
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="다음 페이지"
              className="p-2 text-text-secondary hover:text-primary disabled:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg transition-colors duration-200"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ActivityHistoryTable; 