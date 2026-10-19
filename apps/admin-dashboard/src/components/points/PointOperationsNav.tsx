import { NavLink } from 'react-router-dom';

export default function PointOperationsNav({ showTasks = false }: { showTasks?: boolean }) {
  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="포인트 업무" className="flex flex-wrap gap-2">
        {[
          { to: '/operator/points', label: '지급·차감·거래 조회' },
          { to: '/operator/points/budget', label: '서비스 예산' },
        ].map(({ to, label }) => (
          <NavLink key={to} to={to} end className={({ isActive }) =>
            `rounded-md border px-3 py-2 text-sm ${isActive ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`
          }>{label}</NavLink>
        ))}
      </nav>
      {showTasks && <nav aria-label="이 페이지의 작업" className="flex flex-wrap gap-4 text-sm text-blue-700">
        <a href="#point-grant">포인트 지급</a>
        <a href="#point-spend">포인트 차감</a>
        <a href="#point-transactions">거래 조회</a>
      </nav>}
    </div>
  );
}
