interface KPI {
  label: string;
  value: number | string;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}

interface DropshippingDashboardProps {
  title: string;
  kpis: KPI[];
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
};

export function DropshippingDashboard({ title, kpis }: DropshippingDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg border-2 shadow-sm ${
              kpi.color ? colorClasses[kpi.color] : 'bg-white border-gray-200'
            }`}
          >
            <div className="text-sm font-medium mb-2 opacity-75">{kpi.label}</div>
            <div className="text-3xl font-bold">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
            <div className="font-medium">View Products</div>
            <div className="text-sm text-gray-600 mt-1">Manage your product catalog</div>
          </button>
          <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
            <div className="font-medium">Orders</div>
            <div className="text-sm text-gray-600 mt-1">Check order status</div>
          </button>
          <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
            <div className="font-medium">Analytics</div>
            <div className="text-sm text-gray-600 mt-1">View detailed reports</div>
          </button>
        </div>
      </div>
    </div>
  );
}
