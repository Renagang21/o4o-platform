import React from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';

interface HealthCheck {
  id: string;
  name: string;
  status: 'good' | 'warning' | 'critical';
  description: string;
  recommendation?: string;
}

export function SiteHealthWidget() {
  const healthChecks: HealthCheck[] = [
    {
      id: '1',
      name: 'PHP 버전',
      status: 'good',
      description: 'PHP 8.1.0이 실행 중입니다.',
    },
    {
      id: '2',
      name: 'WordPress 버전',
      status: 'good',
      description: '최신 버전을 사용하고 있습니다.',
    },
    {
      id: '3',
      name: '플러그인 업데이트',
      status: 'warning',
      description: '2개의 플러그인에 업데이트가 있습니다.',
      recommendation: '플러그인을 최신 버전으로 업데이트하세요.'
    },
    {
      id: '4',
      name: 'SSL 인증서',
      status: 'good',
      description: 'SSL 인증서가 정상적으로 설치되어 있습니다.',
    },
    {
      id: '5',
      name: '백업 상태',
      status: 'critical',
      description: '마지막 백업: 7일 전',
      recommendation: '정기적인 백업을 설정하세요.'
    }
  ];

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: HealthCheck['status']) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const goodCount = healthChecks.filter(check => check.status === 'good').length;
  const warningCount = healthChecks.filter(check => check.status === 'warning').length;
  const criticalCount = healthChecks.filter(check => check.status === 'critical').length;

  const getOverallStatus = () => {
    if (criticalCount > 0) return { label: '개선 필요', color: 'text-red-600', bg: 'bg-red-100' };
    if (warningCount > 0) return { label: '주의 필요', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: '좋음', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const overallStatus = getOverallStatus();
  const healthScore = Math.round((goodCount / healthChecks.length) * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-orange-600" />
          사이트 상태
        </h3>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {/* Overall Health Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">전체 상태 점수</span>
            <span className={`text-2xl font-bold ${overallStatus.color}`}>
              {healthScore}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                healthScore >= 80 ? 'bg-green-600' : 
                healthScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${healthScore}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${overallStatus.bg} ${overallStatus.color}`}>
              {overallStatus.label}
            </span>
            <span className="text-xs text-gray-500">
              {goodCount}개 정상, {warningCount}개 주의, {criticalCount}개 위험
            </span>
          </div>
        </div>

        {/* Health Checks */}
        <div className="space-y-3">
          {healthChecks.map((check) => (
            <div key={check.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {check.name}
                  </p>
                  <span className={`text-xs font-medium ${getStatusColor(check.status)}`}>
                    {check.status === 'good' && '정상'}
                    {check.status === 'warning' && '주의'}
                    {check.status === 'critical' && '위험'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {check.description}
                </p>
                {check.recommendation && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    권장사항: {check.recommendation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Site Health Page Link */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <a 
            href="/admin/site-health" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
          >
            전체 사이트 상태 보기
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}