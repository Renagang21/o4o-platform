import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Package, TrendingUp, Target, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CrowdfundingDashboard: FC = () => {
  const stats = [
    { label: '총 모금액', value: '₩1,234,567,890', icon: DollarSign, color: 'text-green-600' },
    { label: '활성 프로젝트', value: '15', icon: Target, color: 'text-blue-600' },
    { label: '총 후원자', value: '3,456', icon: Users, color: 'text-purple-600' },
    { label: '달성률', value: '78.5%', icon: TrendingUp, color: 'text-orange-600' }
  ];

  const activeProjects = [
    { 
      id: 1, 
      name: '스마트 홈 IoT 디바이스', 
      progress: 85, 
      raised: '₩85,000,000', 
      goal: '₩100,000,000',
      backers: 234,
      daysLeft: 15
    },
    { 
      id: 2, 
      name: '친환경 재사용 컵 프로젝트', 
      progress: 62, 
      raised: '₩31,000,000', 
      goal: '₩50,000,000',
      backers: 156,
      daysLeft: 22
    },
    { 
      id: 3, 
      name: '독립 영화 제작 지원', 
      progress: 45, 
      raised: '₩22,500,000', 
      goal: '₩50,000,000',
      backers: 89,
      daysLeft: 8
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">크라우드펀딩 대시보드</h1>
          <p className="text-gray-600 mt-2">프로젝트 펀딩 현황 및 관리</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/crowdfunding/projects/new">새 프로젝트</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/crowdfunding/projects">모든 프로젝트</Link>
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

      {/* 진행중인 프로젝트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            진행중인 프로젝트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeProjects.map(project => (
              <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-lg">{project.name}</h4>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.backers} 후원자
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {project.daysLeft}일 남음
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/crowdfunding/projects/${project.id}`}>상세보기</Link>
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">진행률</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{project.raised}</span>
                    <span className="text-gray-600">목표: {project.goal}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/crowdfunding/projects">모든 프로젝트 보기</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-2">후원자 관리</h3>
            <p className="text-sm text-gray-600 mb-4">후원자 정보 및 리워드 발송 관리</p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/crowdfunding/backers">후원자 관리</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-2">리워드 관리</h3>
            <p className="text-sm text-gray-600 mb-4">프로젝트 리워드 설정 및 관리</p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/crowdfunding/rewards">리워드 관리</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-2">정산 관리</h3>
            <p className="text-sm text-gray-600 mb-4">프로젝트 정산 및 송금 관리</p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/crowdfunding/payments">정산 관리</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CrowdfundingDashboard;