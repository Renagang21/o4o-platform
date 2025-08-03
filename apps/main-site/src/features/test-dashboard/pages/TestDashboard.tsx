import { FC, useState, useEffect  } from 'react';
import { 
  ServiceStatusCard, 
  ServiceLinkCard, 
  DevToolCard 
} from '../components';
import { 
  sampleServiceStatus, 
  sampleMainServices, 
  sampleDevTools,
  sampleFeatureTests,
  sampleRecentUpdates,
  sampleQuickLinks 
} from '../data/sampleData';
import { ServiceStatus, ServiceLink, DevTool } from '../types';

export const TestDashboard: FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [services, setServices] = useState(sampleServiceStatus);

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 서비스 상태 새로고침
  const handleRefreshService = (serviceName: string) => {
    setServices(prevServices =>
      prevServices.map((service: any) =>
        service.name === serviceName
          ? {
              ...service,
              lastChecked: new Date().toLocaleString('ko-KR'),
              responseTime: Math.floor(Math.random() * 1000) + 100
            }
          : service
      )
    );
  };

  // 전체 서비스 새로고침
  const handleRefreshAll = () => {
    const now = new Date().toLocaleString('ko-KR');
    setServices(prevServices =>
      prevServices.map((service: any) => ({
        ...service,
        lastChecked: now,
        responseTime: Math.floor(Math.random() * 1000) + 100
      }))
    );
  };

  // 서비스 링크 클릭 핸들러
  const handleServiceClick = (service: ServiceLink) => {
    if (service.newTab) {
      window.open(service.url, '_blank');
    } else {
      window.location.href = service.url;
    }
  };

  // 개발 도구 클릭 핸들러
  const handleDevToolClick = (tool: DevTool) => {
    // 실제로는 각 도구의 구현에 따라 다르게 처리
    console.log(`Opening dev tool: ${tool.name}`);
    // 임시로 URL로 이동 (실제로는 모달이나 별도 페이지 등)
    if (tool.url.startsWith('/')) {
      window.location.href = tool.url;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-white">o4o-platform 테스트 대시보드</h1>
            <p className="text-gray-400 mt-1">개발자/관리자용 서비스 테스트 및 모니터링</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">현재 시간</p>
            <p className="text-lg font-mono text-white">
              {currentTime.toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* 시스템 상태 블록 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">시스템 상태</h2>
            <button
              onClick={handleRefreshAll}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              전체 새로고침
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service: any) => (
              <ServiceStatusCard
                key={service.name}
                service={service}
                onRefresh={handleRefreshService}
              />
            ))}
          </div>
        </section>

        {/* 주요 서비스 블록 */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">주요 서비스</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleMainServices.map((service: any) => (
              <ServiceLinkCard
                key={service.id}
                service={service}
                onClick={handleServiceClick}
              />
            ))}
          </div>
        </section>

        {/* 개발/테스트 도구 블록 */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">개발/테스트 도구</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleDevTools.map((tool: any) => (
              <DevToolCard
                key={tool.id}
                tool={tool}
                onClick={handleDevToolClick}
              />
            ))}
          </div>
        </section>

        {/* 기능별 테스트 블록 */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">기능별 테스트</h2>
          <div className="space-y-6">
            {sampleFeatureTests.map((category: any) => (
              <div key={category.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                  <p className="text-gray-400 text-sm">{category.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.tests.map((test: any) => (
                    <div key={test.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium">{test.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          test.status === 'passing' ? 'bg-green-600 text-white' :
                          test.status === 'failing' ? 'bg-red-600 text-white' :
                          test.status === 'warning' ? 'bg-yellow-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {test.status === 'passing' ? '통과' :
                           test.status === 'failing' ? '실패' :
                           test.status === 'warning' ? '경고' : '미테스트'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{test.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{test.lastRun || '실행 안됨'}</span>
                        {test.duration && <span>{test.duration}초</span>}
                      </div>
                      <button
                        onClick={() => window.location.href = test.url}
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        테스트 실행
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 최근 업데이트 블록 */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">최근 업데이트</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="space-y-4">
              {sampleRecentUpdates.map((update: any) => (
                <div key={update.id} className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    update.type === 'feature' ? 'bg-green-500' :
                    update.type === 'deployment' ? 'bg-blue-500' :
                    update.type === 'commit' ? 'bg-purple-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="text-white font-medium">{update.title}</h3>
                      <span className="text-xs text-gray-400">{update.timestamp}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{update.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>작성자: {update.author}</span>
                      <span>서비스: {update.service}</span>
                      {update.url && (
                        <a 
                          href={update.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          링크 →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 빠른 링크 블록 */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">빠른 링크</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {sampleQuickLinks.map((link: any) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 hover:bg-gray-750 transition-all group"
              >
                <div className="text-center">
                  <div className="text-blue-400 mb-2">
                    {link.icon === 'github' ? (
                      <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors">
                    {link.name}
                  </h3>
                  {link.description && (
                    <p className="text-gray-400 text-xs mt-1">{link.description}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};