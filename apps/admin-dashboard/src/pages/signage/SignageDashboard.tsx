import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Play, Clock, Activity, Wifi, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SignageDashboard: FC = () => {
  const stats = [
    { label: '활성 디스플레이', value: '12', icon: Monitor, color: 'text-blue-600' },
    { label: '재생 중인 콘텐츠', value: '8', icon: Play, color: 'text-green-600' },
    { label: '예약된 콘텐츠', value: '24', icon: Clock, color: 'text-purple-600' },
    { label: '온라인 디바이스', value: '10/12', icon: Wifi, color: 'text-orange-600' }
  ];

  const activeDisplays = [
    { id: 1, name: '로비 메인', status: '재생중', content: '프로모션 비디오 A', uptime: '99.8%' },
    { id: 2, name: '2층 복도', status: '재생중', content: '공지사항 슬라이드', uptime: '98.5%' },
    { id: 3, name: '엘리베이터 A', status: '대기중', content: '-', uptime: '100%' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">디지털 사이니지</h1>
          <p className="text-gray-600 mt-2">디스플레이 콘텐츠 관리 시스템</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/signage/content">콘텐츠 관리</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/signage/schedule">스케줄</Link>
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 디스플레이 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              활성 디스플레이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeDisplays.map(display => (
                <div key={display.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{display.name}</h4>
                    <p className="text-sm text-gray-500">{display.content}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      display.status === '재생중' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {display.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">가동률 {display.uptime}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              시스템 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">CPU 사용률</span>
                <span className="text-sm font-medium">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">메모리 사용률</span>
                <span className="text-sm font-medium">62%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">스토리지</span>
                <span className="text-sm font-medium">120GB / 500GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '24%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button variant="outline" asChild>
              <Link to="/signage/screens">화면 관리</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/signage/content">콘텐츠 업로드</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/signage/playlists">재생목록</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/signage/schedule">스케줄 설정</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/signage/devices">디바이스</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/signage/analytics">분석</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignageDashboard;