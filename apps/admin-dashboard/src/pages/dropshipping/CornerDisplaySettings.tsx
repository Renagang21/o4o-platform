/**
 * CornerDisplaySettings
 *
 * Phase 1: 코너 디스플레이 설정 페이지
 * - 코너 생성/삭제
 * - 디바이스 ID 등록
 * - 코너 ↔ 디바이스 매핑
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@o4o/ui';

// 코너 타입
interface Corner {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

// 디바이스 타입
interface Device {
  id: string;
  deviceId: string;
  name: string;
  type: 'kiosk' | 'tablet' | 'signage' | 'web' | 'mobile';
  cornerId?: string;
  isActive: boolean;
}

// 초기 샘플 데이터 (실제로는 API에서 로드)
const SAMPLE_CORNERS: Corner[] = [
  {
    id: '1',
    name: '프리미엄 코너',
    slug: 'premium_zone',
    description: '고급 상품 진열 영역',
    isActive: true,
    createdAt: '2026-01-22',
  },
  {
    id: '2',
    name: '신상품 코너',
    slug: 'new_arrivals',
    description: '신규 입고 상품',
    isActive: true,
    createdAt: '2026-01-22',
  },
];

const SAMPLE_DEVICES: Device[] = [
  {
    id: '1',
    deviceId: 'kiosk_1',
    name: '입구 키오스크',
    type: 'kiosk',
    cornerId: '1',
    isActive: true,
  },
  {
    id: '2',
    deviceId: 'tablet_corner_a',
    name: 'A코너 태블릿',
    type: 'tablet',
    cornerId: '2',
    isActive: true,
  },
];

const DEVICE_TYPES = [
  { value: 'kiosk', label: '키오스크' },
  { value: 'tablet', label: '태블릿' },
  { value: 'signage', label: '사이니지' },
  { value: 'web', label: '웹' },
  { value: 'mobile', label: '모바일' },
];

const CornerDisplaySettings: React.FC = () => {
  // 상태
  const [corners, setCorners] = useState<Corner[]>(SAMPLE_CORNERS);
  const [devices, setDevices] = useState<Device[]>(SAMPLE_DEVICES);
  const [activeTab, setActiveTab] = useState<'corners' | 'devices'>('corners');

  // 코너 폼 상태
  const [newCornerName, setNewCornerName] = useState('');
  const [newCornerSlug, setNewCornerSlug] = useState('');
  const [newCornerDesc, setNewCornerDesc] = useState('');

  // 디바이스 폼 상태
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<Device['type']>('kiosk');
  const [newDeviceCorner, setNewDeviceCorner] = useState('');

  // 코너 추가
  const handleAddCorner = useCallback(() => {
    if (!newCornerName.trim() || !newCornerSlug.trim()) return;

    const newCorner: Corner = {
      id: Date.now().toString(),
      name: newCornerName.trim(),
      slug: newCornerSlug.trim().toLowerCase().replace(/\s+/g, '_'),
      description: newCornerDesc.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setCorners([...corners, newCorner]);
    setNewCornerName('');
    setNewCornerSlug('');
    setNewCornerDesc('');
  }, [corners, newCornerName, newCornerSlug, newCornerDesc]);

  // 코너 삭제
  const handleDeleteCorner = useCallback((cornerId: string) => {
    if (!window.confirm('이 코너를 삭제하시겠습니까?\n연결된 디바이스의 코너 설정이 해제됩니다.')) return;

    setCorners(corners.filter((c) => c.id !== cornerId));
    setDevices(devices.map((d) => d.cornerId === cornerId ? { ...d, cornerId: undefined } : d));
  }, [corners, devices]);

  // 코너 활성화 토글
  const handleToggleCorner = useCallback((cornerId: string) => {
    setCorners(corners.map((c) =>
      c.id === cornerId ? { ...c, isActive: !c.isActive } : c
    ));
  }, [corners]);

  // 디바이스 추가
  const handleAddDevice = useCallback(() => {
    if (!newDeviceId.trim() || !newDeviceName.trim()) return;

    const newDevice: Device = {
      id: Date.now().toString(),
      deviceId: newDeviceId.trim().toLowerCase().replace(/\s+/g, '_'),
      name: newDeviceName.trim(),
      type: newDeviceType,
      cornerId: newDeviceCorner || undefined,
      isActive: true,
    };

    setDevices([...devices, newDevice]);
    setNewDeviceId('');
    setNewDeviceName('');
    setNewDeviceType('kiosk');
    setNewDeviceCorner('');
  }, [devices, newDeviceId, newDeviceName, newDeviceType, newDeviceCorner]);

  // 디바이스 삭제
  const handleDeleteDevice = useCallback((deviceId: string) => {
    if (!window.confirm('이 디바이스를 삭제하시겠습니까?')) return;
    setDevices(devices.filter((d) => d.id !== deviceId));
  }, [devices]);

  // 디바이스 코너 변경
  const handleDeviceCornerChange = useCallback((deviceId: string, cornerId: string) => {
    setDevices(devices.map((d) =>
      d.id === deviceId ? { ...d, cornerId: cornerId || undefined } : d
    ));
  }, [devices]);

  // 코너 이름 가져오기
  const getCornerName = (cornerId?: string) => {
    if (!cornerId) return '미지정';
    const corner = corners.find((c) => c.id === cornerId);
    return corner?.name || '알 수 없음';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">코너 디스플레이 설정</h1>
        <p className="mt-1 text-gray-600">
          매장 내 코너와 디바이스를 관리하고 제품 진열을 설정합니다.
        </p>
      </div>

      {/* 안내 메시지 */}
      <Alert>
        <AlertTitle>Phase 1 알파</AlertTitle>
        <AlertDescription>
          설정 변경은 새로고침 후 바로 반영됩니다. 제품 진열 연결은 Listings 페이지에서 설정하세요.
        </AlertDescription>
      </Alert>

      {/* 탭 */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('corners')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'corners'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          코너 관리 ({corners.length})
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'devices'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          디바이스 관리 ({devices.length})
        </button>
      </div>

      {/* 코너 관리 탭 */}
      {activeTab === 'corners' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 코너 추가 폼 */}
          <Card>
            <CardHeader>
              <CardTitle>새 코너 추가</CardTitle>
              <CardDescription>
                매장 내 제품 진열 영역을 정의합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cornerName">코너 이름 *</Label>
                <Input
                  id="cornerName"
                  value={newCornerName}
                  onChange={(e) => setNewCornerName(e.target.value)}
                  placeholder="예: 프리미엄 코너"
                />
              </div>
              <div>
                <Label htmlFor="cornerSlug">코너 ID (영문) *</Label>
                <Input
                  id="cornerSlug"
                  value={newCornerSlug}
                  onChange={(e) => setNewCornerSlug(e.target.value)}
                  placeholder="예: premium_zone"
                />
                <p className="mt-1 text-xs text-gray-500">
                  영문 소문자와 밑줄(_)만 사용
                </p>
              </div>
              <div>
                <Label htmlFor="cornerDesc">설명</Label>
                <Input
                  id="cornerDesc"
                  value={newCornerDesc}
                  onChange={(e) => setNewCornerDesc(e.target.value)}
                  placeholder="예: 고급 상품 진열 영역"
                />
              </div>
              <Button
                onClick={handleAddCorner}
                disabled={!newCornerName.trim() || !newCornerSlug.trim()}
                className="w-full"
              >
                코너 추가
              </Button>
            </CardContent>
          </Card>

          {/* 코너 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>등록된 코너</CardTitle>
              <CardDescription>
                {corners.length === 0 ? '등록된 코너가 없습니다.' : `총 ${corners.length}개`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {corners.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  코너를 추가해주세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {corners.map((corner) => (
                    <div
                      key={corner.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{corner.name}</span>
                          <Badge variant={corner.isActive ? 'default' : 'secondary'}>
                            {corner.isActive ? '활성' : '비활성'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          ID: {corner.slug}
                          {corner.description && ` · ${corner.description}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCorner(corner.id)}
                        >
                          {corner.isActive ? '비활성화' : '활성화'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCorner(corner.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 디바이스 관리 탭 */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 디바이스 추가 폼 */}
          <Card>
            <CardHeader>
              <CardTitle>새 디바이스 추가</CardTitle>
              <CardDescription>
                매장 내 키오스크, 태블릿 등을 등록합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="deviceId">디바이스 ID *</Label>
                <Input
                  id="deviceId"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="예: kiosk_1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  영문 소문자, 숫자, 밑줄(_)만 사용
                </p>
              </div>
              <div>
                <Label htmlFor="deviceName">디바이스 이름 *</Label>
                <Input
                  id="deviceName"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="예: 입구 키오스크"
                />
              </div>
              <div>
                <Label htmlFor="deviceType">디바이스 유형</Label>
                <select
                  id="deviceType"
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as Device['type'])}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  {DEVICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="deviceCorner">연결 코너</Label>
                <select
                  id="deviceCorner"
                  value={newDeviceCorner}
                  onChange={(e) => setNewDeviceCorner(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  <option value="">선택 안함</option>
                  {corners.filter((c) => c.isActive).map((corner) => (
                    <option key={corner.id} value={corner.id}>
                      {corner.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleAddDevice}
                disabled={!newDeviceId.trim() || !newDeviceName.trim()}
                className="w-full"
              >
                디바이스 추가
              </Button>
            </CardContent>
          </Card>

          {/* 디바이스 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>등록된 디바이스</CardTitle>
              <CardDescription>
                {devices.length === 0 ? '등록된 디바이스가 없습니다.' : `총 ${devices.length}개`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  디바이스를 추가해주세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{device.name}</span>
                          <Badge variant="secondary">
                            {DEVICE_TYPES.find((t) => t.value === device.type)?.label}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDevice(device.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          삭제
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        ID: {device.deviceId}
                      </p>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">연결 코너:</Label>
                        <select
                          value={device.cornerId || ''}
                          onChange={(e) => handleDeviceCornerChange(device.id, e.target.value)}
                          className="h-8 px-2 text-sm border rounded"
                        >
                          <option value="">미지정</option>
                          {corners.filter((c) => c.isActive).map((corner) => (
                            <option key={corner.id} value={corner.id}>
                              {corner.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 사용 가이드 */}
      <Card>
        <CardHeader>
          <CardTitle>사용 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>
              <strong>코너 생성</strong>: 매장 내 진열 영역(예: 프리미엄 코너, 신상품 코너)을 정의합니다.
            </li>
            <li>
              <strong>디바이스 등록</strong>: 키오스크, 태블릿 등 물리적 디바이스를 등록합니다.
            </li>
            <li>
              <strong>코너 연결</strong>: 각 디바이스가 표시할 코너를 지정합니다.
            </li>
            <li>
              <strong>제품 연결</strong>: Listings 페이지에서 각 Listing의 display 설정에 코너와 디바이스를 지정합니다.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default CornerDisplaySettings;
