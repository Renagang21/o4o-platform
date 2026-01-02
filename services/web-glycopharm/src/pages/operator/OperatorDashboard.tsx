import {
  Users,
  Building2,
  Truck,
  Handshake,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

const stats = [
  { label: '총 회원', value: '4,521', change: '+156', icon: Users, color: 'primary' },
  { label: '약국', value: '2,450', change: '+45', icon: Building2, color: 'green' },
  { label: '공급자', value: '128', change: '+8', icon: Truck, color: 'blue' },
  { label: '파트너', value: '56', change: '+3', icon: Handshake, color: 'purple' },
];

const pendingApprovals = [
  { id: 1, name: '김약사', type: 'pharmacy', businessName: '건강플러스약국', date: '2024-01-15' },
  { id: 2, name: '이공급', type: 'supplier', businessName: '(주)메디서플라이', date: '2024-01-15' },
  { id: 3, name: '박파트너', type: 'partner', businessName: '덱스콤코리아', date: '2024-01-14' },
  { id: 4, name: '최약사', type: 'pharmacy', businessName: '미래약국', date: '2024-01-14' },
];

const recentActivities = [
  { action: '신규 약국 가입', user: '건강약국', time: '10분 전', type: 'join' },
  { action: '주문 완료', user: '행복약국', time: '25분 전', type: 'order' },
  { action: '상품 등록', user: '(주)메디서플라이', time: '1시간 전', type: 'product' },
  { action: '콘텐츠 업로드', user: '덱스콤코리아', time: '2시간 전', type: 'content' },
  { action: '회원 승인', user: '관리자', time: '3시간 전', type: 'approval' },
];

const typeLabels: Record<string, string> = {
  pharmacy: '약국',
  supplier: '공급자',
  partner: '파트너',
};

export default function OperatorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
        <p className="text-slate-500 text-sm">플랫폼 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-4">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800">승인 대기</h2>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                {pendingApprovals.length}
              </span>
            </div>
            <button className="text-sm text-red-600 flex items-center gap-1">
              전체보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y">
            {pendingApprovals.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {typeLabels[item.type]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.businessName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="font-semibold text-slate-800">최근 활동</h2>
            <button className="text-sm text-primary-600 flex items-center gap-1">
              전체보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y">
            {recentActivities.map((activity, index) => (
              <div key={index} className="p-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'join' ? 'bg-green-500' :
                  activity.type === 'order' ? 'bg-blue-500' :
                  activity.type === 'product' ? 'bg-purple-500' :
                  activity.type === 'content' ? 'bg-yellow-500' :
                  'bg-slate-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{activity.user}</span>
                    {' - '}{activity.action}
                  </p>
                  <p className="text-xs text-slate-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group">
            <Users className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">회원 관리</span>
          </button>
          <button className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">승인 관리</span>
          </button>
          <button className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group">
            <Building2 className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">사이트 설정</span>
          </button>
          <button className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">문의 관리</span>
          </button>
        </div>
      </div>
    </div>
  );
}
