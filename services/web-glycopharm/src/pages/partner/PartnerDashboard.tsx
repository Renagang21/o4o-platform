import {
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Eye,
  Download,
  ArrowRight,
} from 'lucide-react';

const stats = [
  { label: '콘텐츠 조회수', value: '12,450', change: '+22.5%', icon: Eye, color: 'purple' },
  { label: '등록 콘텐츠', value: '45개', change: '+5', icon: FileText, color: 'blue' },
  { label: '다운로드', value: '2,340', change: '+18.2%', icon: Download, color: 'green' },
  { label: '연결 약국', value: '89곳', change: '+7', icon: Users, color: 'primary' },
];

const recentContents = [
  { title: 'CGM 사용 가이드 2024', type: 'PDF', views: 1250, downloads: 340, date: '2024-01-15' },
  { title: '혈당 관리 웨비나', type: '웨비나', views: 890, downloads: 0, date: '2024-01-12' },
  { title: '인슐린 펜 사용법', type: '영상', views: 2100, downloads: 0, date: '2024-01-10' },
  { title: '당뇨 식단 가이드', type: '문서', views: 780, downloads: 220, date: '2024-01-08' },
];

export default function PartnerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">파트너 대시보드</h1>
        <p className="text-slate-500 text-sm">콘텐츠 성과를 확인하세요</p>
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Contents */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="font-semibold text-slate-800">최근 콘텐츠</h2>
            <button className="text-sm text-purple-600 flex items-center gap-1">
              전체보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y">
            {recentContents.map((content) => (
              <div key={content.title} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{content.title}</p>
                    <p className="text-xs text-slate-400">{content.type} · {content.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{content.views.toLocaleString()} 조회</p>
                  {content.downloads > 0 && (
                    <p className="text-xs text-slate-400">{content.downloads} 다운로드</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">성과 요약</h2>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-700">이번 주 조회수</span>
                <span className="text-sm font-bold text-purple-700">3,450</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-700">신규 구독자</span>
                <span className="text-sm font-bold text-blue-700">+28</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-700">평균 체류시간</span>
                <span className="text-sm font-bold text-green-700">4분 32초</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
