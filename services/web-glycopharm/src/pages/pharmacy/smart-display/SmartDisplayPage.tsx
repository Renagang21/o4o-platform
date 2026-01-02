import { NavLink } from 'react-router-dom';
import {
  Tv,
  ListVideo,
  Calendar,
  Film,
  Share2,
  Play,
  Plus,
  Clock,
  BarChart3,
} from 'lucide-react';

// Mock 통계 데이터
const mockStats = {
  totalPlaylists: 5,
  activePlaylists: 3,
  totalMedia: 24,
  scheduledHours: 12,
  sharedPlaylists: 2,
};

// Mock 최근 활동 데이터
const mockRecentActivity = [
  { id: '1', type: 'playlist_created', message: '홍보 영상 모음 플레이리스트 생성', time: '2시간 전' },
  { id: '2', type: 'schedule_updated', message: '오전 시간대 스케줄 변경', time: '5시간 전' },
  { id: '3', type: 'media_added', message: '새 영상 3개 추가됨', time: '1일 전' },
];

const menuCards = [
  {
    title: '플레이리스트',
    description: '영상 목록을 만들고 관리하세요',
    icon: ListVideo,
    path: '/pharmacy/smart-display/playlists',
    color: 'blue',
    stat: `${mockStats.totalPlaylists}개`,
  },
  {
    title: '스케줄 관리',
    description: '시간대별 재생 스케줄을 설정하세요',
    icon: Calendar,
    path: '/pharmacy/smart-display/schedules',
    color: 'green',
    stat: `${mockStats.scheduledHours}시간`,
  },
  {
    title: '미디어 라이브러리',
    description: 'YouTube/Vimeo 영상을 추가하세요',
    icon: Film,
    path: '/pharmacy/smart-display/media',
    color: 'purple',
    stat: `${mockStats.totalMedia}개`,
  },
  {
    title: '공유 포럼',
    description: '다른 약국의 플레이리스트를 둘러보세요',
    icon: Share2,
    path: '/pharmacy/smart-display/forum',
    color: 'orange',
    stat: `${mockStats.sharedPlaylists}개 공유중`,
  },
];

const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100' },
};

export default function SmartDisplayPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Tv className="w-7 h-7 text-primary-600" />
            스마트 디스플레이
          </h1>
          <p className="text-slate-500 mt-1">
            약국 TV에서 재생할 홍보 영상을 관리하세요
          </p>
        </div>
        <div className="flex gap-2">
          <NavLink
            to="/pharmacy/smart-display/playlists/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 플레이리스트
          </NavLink>
          <NavLink
            to="/display/preview"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Play className="w-4 h-4" />
            미리보기
          </NavLink>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ListVideo className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{mockStats.totalPlaylists}</p>
              <p className="text-sm text-slate-500">플레이리스트</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{mockStats.activePlaylists}</p>
              <p className="text-sm text-slate-500">활성 상태</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Film className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{mockStats.totalMedia}</p>
              <p className="text-sm text-slate-500">미디어</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{mockStats.scheduledHours}h</p>
              <p className="text-sm text-slate-500">스케줄</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuCards.map((card) => {
          const Icon = card.icon;
          const colors = colorClasses[card.color];
          return (
            <NavLink
              key={card.path}
              to={card.path}
              className="group bg-white rounded-xl p-6 border border-slate-200 hover:border-primary-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{card.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                  {card.stat}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            최근 활동
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {mockRecentActivity.map((activity) => (
            <div key={activity.id} className="px-6 py-4 flex items-center justify-between">
              <p className="text-slate-700">{activity.message}</p>
              <span className="text-sm text-slate-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TV 연결 안내 */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <Tv className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">TV에서 재생하기</h3>
            <p className="text-primary-100 mt-1">
              약국 TV의 브라우저에서 아래 주소로 접속하세요
            </p>
            <code className="mt-2 inline-block px-3 py-1 bg-white/20 rounded-lg text-sm">
              https://glycopharm.neture.co.kr/display/YOUR_PHARMACY_ID
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
