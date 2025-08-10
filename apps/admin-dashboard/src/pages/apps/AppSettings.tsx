import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  ArrowLeft,
  Save,
  RefreshCw,
  Shield,
  Database,
  Bell,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import toast from 'react-hot-toast';

const AppSettings: FC = () => {
  const navigate = useNavigate();

  const handleSave = () => {
    toast.success('설정이 저장되었습니다');
  };

  const handleReset = () => {
    if (window.confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
      toast.success('설정이 초기화되었습니다');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/apps')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">앱 설정</h1>
            <p className="text-gray-600 mt-1">앱 전역 설정을 관리합니다</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            초기화
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            일반 설정
          </CardTitle>
          <CardDescription>
            앱 시스템의 기본 동작을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">자동 업데이트</div>
                <div className="text-sm text-gray-500">새 버전이 출시되면 자동으로 업데이트합니다</div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">백그라운드 작업</div>
                <div className="text-sm text-gray-500">앱이 백그라운드에서 작업을 수행할 수 있습니다</div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <div>
                <div className="font-medium">개발자 모드</div>
                <div className="text-sm text-gray-500">디버그 정보와 개발 도구를 활성화합니다</div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            보안 설정
          </CardTitle>
          <CardDescription>
            앱 권한과 보안 정책을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">권한 검증</div>
                <div className="text-sm text-gray-500">앱 활성화 시 필요한 권한을 확인합니다</div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">API 접근 제한</div>
                <div className="text-sm text-gray-500">앱이 접근할 수 있는 API를 제한합니다</div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <div>
                <div className="font-medium">샌드박스 모드</div>
                <div className="text-sm text-gray-500">앱을 격리된 환경에서 실행합니다</div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Database Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            데이터베이스 설정
          </CardTitle>
          <CardDescription>
            앱 데이터 저장 방식을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              데이터 보관 기간
            </label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option value="30">30일</option>
              <option value="90">90일</option>
              <option value="180">180일</option>
              <option value="365">1년</option>
              <option value="0">무제한</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">자동 백업</div>
                <div className="text-sm text-gray-500">앱 데이터를 정기적으로 백업합니다</div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <div>
                <div className="font-medium">데이터 압축</div>
                <div className="text-sm text-gray-500">저장 공간을 절약하기 위해 데이터를 압축합니다</div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            알림 설정
          </CardTitle>
          <CardDescription>
            앱 관련 알림을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">앱 업데이트 알림</div>
                <div className="text-sm text-gray-500">새 버전이 출시되면 알려줍니다</div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">오류 알림</div>
                <div className="text-sm text-gray-500">앱에서 오류가 발생하면 알려줍니다</div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <div>
                <div className="font-medium">사용량 알림</div>
                <div className="text-sm text-gray-500">앱 사용량이 한계에 도달하면 알려줍니다</div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            API 설정
          </CardTitle>
          <CardDescription>
            외부 API 연동을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              API 요청 제한
            </label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option value="100">100 요청/분</option>
              <option value="500">500 요청/분</option>
              <option value="1000">1000 요청/분</option>
              <option value="5000">5000 요청/분</option>
              <option value="0">무제한</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              타임아웃 설정 (초)
            </label>
            <input
              type="number"
              defaultValue="30"
              className="w-full px-3 py-2 border rounded-lg"
              min="1"
              max="300"
            />
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="rounded" />
              <div>
                <div className="font-medium">API 캐싱</div>
                <div className="text-sm text-gray-500">API 응답을 캐싱하여 성능을 향상시킵니다</div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppSettings;