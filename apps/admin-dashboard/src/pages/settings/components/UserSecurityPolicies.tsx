/**
 * User Security Policies Component
 * 사용자 관리 및 보안 정책 컴포넌트
 */

import { useState } from 'react';
import {
  Shield,
  Lock,
  Key,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  Activity,
  Ban,
  Zap,
  Info
} from 'lucide-react';

interface UserSecuritySettings {
  requireApproval: boolean;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
  };
}

interface UserSecurityPoliciesProps {
  settings: UserSecuritySettings;
  onUpdate: (updates: Partial<UserSecuritySettings>) => void;
}

const UserSecurityPolicies: FC<UserSecurityPoliciesProps> = ({ settings, onUpdate }) => {
  const [showPasswordPolicy, setShowPasswordPolicy] = useState(false);

  // Mock security stats
  const securityStats = {
    totalUsers: 1247,
    pendingApproval: 23,
    activeUsers: 892,
    suspendedUsers: 12,
    recentLogins: 156,
    failedAttempts: 8,
    twoFactorEnabled: 654,
    securityScore: 87.5
  };

  const recentSecurityEvents = [
    { id: 1, type: 'login_fail', user: 'user@example.com', time: '2분 전', ip: '192.168.1.100' },
    { id: 2, type: 'suspicious', user: 'admin@company.com', time: '15분 전', ip: '10.0.0.15' },
    { id: 3, type: 'password_change', user: 'manager@company.com', time: '1시간 전', ip: '192.168.1.50' },
    { id: 4, type: 'account_locked', user: 'test@example.com', time: '2시간 전', ip: '203.0.113.0' },
    { id: 5, type: 'new_device', user: 'employee@company.com', time: '3시간 전', ip: '198.51.100.1' }
  ];

  const handleApprovalToggle = () => {
    onUpdate({ requireApproval: !settings.requireApproval });
  };

  const handleSessionTimeoutChange = (timeout: number) => {
    onUpdate({ sessionTimeout: timeout });
  };

  const handlePasswordPolicyChange = (policy: Partial<UserSecuritySettings['passwordPolicy']>) => {
    onUpdate({
      passwordPolicy: {
        ...settings.passwordPolicy,
        ...policy
      }
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const getEventTypeIcon = (type: string) => {
    const icons = {
      login_fail: <UserX className="w-4 h-4 text-red-500" />,
      suspicious: <AlertTriangle className="w-4 h-4 text-orange-500" />,
      password_change: <Key className="w-4 h-4 text-blue-500" />,
      account_locked: <Ban className="w-4 h-4 text-red-500" />,
      new_device: <Smartphone className="w-4 h-4 text-green-500" />
    };
    return icons[type as keyof typeof icons] || <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getEventTypeText = (type: string) => {
    const texts = {
      login_fail: '로그인 실패',
      suspicious: '의심스러운 활동',
      password_change: '비밀번호 변경',
      account_locked: '계정 잠금',
      new_device: '새 기기 로그인'
    };
    return texts[type as keyof typeof texts] || '알 수 없는 이벤트';
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityScoreText = (score: number) => {
    if (score >= 90) return '우수';
    if (score >= 70) return '보통';
    return '주의';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Shield className="w-6 h-6 mr-3 text-red-600" />
          사용자 보안 정책
        </h2>
        <p className="text-gray-600 mt-2">
          사용자 승인, 세션 관리, 비밀번호 정책 및 보안 설정을 관리합니다.
        </p>
      </div>

      {/* Security Overview */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            보안 현황 개요
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(securityStats.totalUsers)}</div>
              <div className="text-sm text-blue-800">총 사용자</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{securityStats.pendingApproval}</div>
              <div className="text-sm text-yellow-800">승인 대기</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatNumber(securityStats.activeUsers)}</div>
              <div className="text-sm text-green-800">활성 사용자</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{securityStats.suspendedUsers}</div>
              <div className="text-sm text-red-800">정지된 사용자</div>
            </div>
          </div>

          {/* Security Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-gray-900">보안 점수</div>
                <div className={`text-2xl font-bold ${getSecurityScoreColor(securityStats.securityScore)}`}>
                  {securityStats.securityScore}점
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    securityStats.securityScore >= 90 ? 'bg-green-500' :
                    securityStats.securityScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${securityStats.securityScore}%` }}
                />
              </div>
              <div className={`text-sm ${getSecurityScoreColor(securityStats.securityScore)}`}>
                {getSecurityScoreText(securityStats.securityScore)} 보안 수준
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-lg font-semibold text-purple-800 mb-2">2단계 인증</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{formatNumber(securityStats.twoFactorEnabled)}</div>
                  <div className="text-sm text-purple-700">활성화된 사용자</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-purple-600">
                    {((securityStats.twoFactorEnabled / securityStats.totalUsers) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-purple-700">적용률</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Approval Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-green-600" />
            사용자 승인 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* Manual Approval Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">수동 승인 필수</div>
                <div className="text-sm text-gray-600">
                  신규 사용자 가입 시 관리자의 수동 승인을 요구합니다.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireApproval}
                  onChange={handleApprovalToggle}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Approval Workflow */}
            {settings.requireApproval && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800 mb-4">
                  <div className="font-medium mb-2">승인 워크플로우</div>
                  <p>수동 승인이 활성화되어 있습니다. 승인 프로세스를 설정하세요.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      승인 권한자
                    </label>
                    <select className="wp-input">
                      <option value="admin">관리자만</option>
                      <option value="manager">관리자 + 매니저</option>
                      <option value="hr">관리자 + HR 담당자</option>
                      <option value="custom">사용자 정의</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      승인 알림 방식
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                        <span className="text-sm text-blue-800">이메일</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                        <span className="text-sm text-blue-800">SMS</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                        <span className="text-sm text-blue-800">푸시 알림</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Current Approval Queue */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">{securityStats.pendingApproval}</div>
                <div className="text-sm text-yellow-800">대기 중</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">47</div>
                <div className="text-sm text-green-800">이번 주 승인</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">3</div>
                <div className="text-sm text-red-800">이번 주 거부</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-600" />
            세션 관리
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* Session Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                세션 타임아웃 (시간)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={settings.sessionTimeout}
                    onChange={(e: any) => handleSessionTimeoutChange(parseInt(e.target.value) || 1)}
                    className="wp-input"
                    placeholder="8"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    비활성 상태가 이 시간을 초과하면 자동 로그아웃됩니다.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm text-orange-800">
                    <div className="font-medium mb-1">현재 설정</div>
                    <div>{settings.sessionTimeout}시간 후 자동 로그아웃</div>
                    <div className="text-xs mt-1 text-orange-700">
                      현재 {securityStats.activeUsers}명이 활성 세션 중입니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Security */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">중복 로그인 방지</div>
                  <div className="text-sm text-gray-600">동일 계정의 동시 로그인을 제한합니다</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">IP 주소 제한</div>
                  <div className="text-sm text-gray-600">허용된 IP 범위에서만 접속 가능</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">기기 등록 필수</div>
                  <div className="text-sm text-gray-600">새 기기 로그인 시 승인 요구</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Policy */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Lock className="w-5 h-5 mr-2 text-purple-600" />
              비밀번호 정책
            </h3>
            <button
              onClick={() => setShowPasswordPolicy(!showPasswordPolicy)}
              className="wp-button-secondary"
            >
              {showPasswordPolicy ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPasswordPolicy ? '정책 숨기기' : '정책 보기'}
            </button>
          </div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* Password Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 비밀번호 길이
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    min="4"
                    max="32"
                    value={settings.passwordPolicy.minLength}
                    onChange={(e: any) => handlePasswordPolicyChange({ minLength: parseInt(e.target.value) || 4 })}
                    className="wp-input"
                    placeholder="8"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    비밀번호 최소 길이를 설정합니다.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm text-purple-800">
                    <div className="font-medium mb-1">현재 설정</div>
                    <div>최소 {settings.passwordPolicy.minLength}자 이상</div>
                    <div className="text-xs mt-1 text-purple-700">
                      권장 길이: 12자 이상
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Characters */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">특수문자 필수</div>
                <div className="text-sm text-gray-600">
                  비밀번호에 특수문자(!@#$%^&* 등) 포함을 필수로 합니다.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.passwordPolicy.requireSpecialChars}
                  onChange={(e: any) => handlePasswordPolicyChange({ requireSpecialChars: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Additional Password Rules */}
            {showPasswordPolicy && (
              <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm text-purple-800 mb-4">
                  <div className="font-medium mb-2">추가 비밀번호 규칙</div>
                  <p>보안을 강화하기 위한 추가 규칙을 설정할 수 있습니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                      <span className="text-sm text-purple-800">대문자 포함 필수</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                      <span className="text-sm text-purple-800">소문자 포함 필수</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                      <span className="text-sm text-purple-800">숫자 포함 필수</span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="wp-checkbox mr-2" />
                      <span className="text-sm text-purple-800">연속 문자 금지</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="wp-checkbox mr-2" />
                      <span className="text-sm text-purple-800">사전 단어 금지</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                      <span className="text-sm text-purple-800">개인정보 포함 금지</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-purple-300 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-1">
                        비밀번호 만료 (일)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="365"
                        defaultValue="90"
                        className="wp-input"
                        placeholder="90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-1">
                        재사용 금지 개수
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        defaultValue="5"
                        className="wp-input"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Smartphone className="w-5 h-5 mr-2 text-green-600" />
            2단계 인증 (2FA)
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* 2FA Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">2단계 인증 필수</div>
                  <div className="text-sm text-gray-600">모든 사용자에게 2FA 활성화 요구</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">관리자 2FA 필수</div>
                  <div className="text-sm text-gray-600">관리자 권한 사용자는 2FA 필수</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">백업 코드 제공</div>
                  <div className="text-sm text-gray-600">2FA 실패 시 사용할 백업 코드 제공</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* 2FA Methods */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">지원하는 2FA 방식</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Smartphone className="w-5 h-5 text-green-600 mr-2" />
                    <div className="font-medium text-green-800">앱 인증</div>
                  </div>
                  <div className="text-sm text-green-700">
                    Google Authenticator, Authy 등
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Mail className="w-5 h-5 text-blue-600 mr-2" />
                    <div className="font-medium text-blue-800">이메일 인증</div>
                  </div>
                  <div className="text-sm text-blue-700">
                    등록된 이메일로 코드 발송
                  </div>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Key className="w-5 h-5 text-purple-600 mr-2" />
                    <div className="font-medium text-purple-800">하드웨어 키</div>
                  </div>
                  <div className="text-sm text-purple-700">
                    YubiKey, FIDO2 지원
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
              최근 보안 이벤트
            </h3>
            <button className="wp-button-secondary">
              <Activity className="w-4 h-4 mr-2" />
              전체 로그 보기
            </button>
          </div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-3">
            {recentSecurityEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    {getEventTypeIcon(event.type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {getEventTypeText(event.type)}
                    </div>
                    <div className="text-sm text-gray-600">
                      사용자: {event.user} | IP: {event.ip}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{event.time}</div>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    자세히 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-600" />
            보안 권장사항
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-green-800">강력한 비밀번호 정책 적용됨</div>
                  <div className="text-green-700">현재 설정이 보안 표준을 충족합니다.</div>
                </div>
              </div>

              <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">2FA 적용률 개선 필요</div>
                  <div className="text-yellow-700">현재 52% 적용률, 80% 이상 권장</div>
                </div>
              </div>

              <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-blue-800">정기 보안 교육 실시</div>
                  <div className="text-blue-700">분기별 보안 교육으로 인식 개선</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-3">보안 체크리스트</div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                  <span className="text-sm text-gray-700">비밀번호 정책 강화</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                  <span className="text-sm text-gray-700">세션 타임아웃 설정</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="wp-checkbox mr-2" />
                  <span className="text-sm text-gray-700">IP 화이트리스트 적용</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="wp-checkbox mr-2" />
                  <span className="text-sm text-gray-700">2FA 전체 적용</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="wp-checkbox mr-2" />
                  <span className="text-sm text-gray-700">보안 로그 모니터링</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSecurityPolicies;