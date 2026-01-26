import { Wrench, Database, Upload, Download, Shield, Code, RefreshCw, FileSearch, Settings, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ToolsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Wrench className="w-8 h-8 text-modern-primary" />
            도구
          </h1>
          <p className="text-modern-text-secondary mt-1">
            시스템 관리와 유지보수를 위한 다양한 도구들
          </p>
        </div>
      </div>

      {/* Tool Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database Tools */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5 text-modern-primary" />
              데이터베이스 도구
            </h2>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-3">
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">데이터베이스 백업</h3>
                <p className="text-sm text-modern-text-secondary">전체 데이터베이스 백업 생성</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">데이터베이스 복원</h3>
                <p className="text-sm text-modern-text-secondary">백업에서 데이터베이스 복원</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">테이블 최적화</h3>
                <p className="text-sm text-modern-text-secondary">데이터베이스 테이블 최적화 실행</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">쿼리 분석기</h3>
                <p className="text-sm text-modern-text-secondary">느린 쿼리 분석 및 최적화</p>
              </button>
            </div>
          </div>
        </div>

        {/* Import/Export Tools */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-modern-success" />
              가져오기/내보내기
            </h2>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-3">
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">사용자 데이터 내보내기</h3>
                <p className="text-sm text-modern-text-secondary">CSV 또는 Excel 형식으로 내보내기</p>
              </button>
              <button
                onClick={() => navigate('/dropshipping/products/bulk-import')}
                className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors cursor-pointer"
              >
                <h3 className="font-medium text-modern-text-primary mb-1">상품 일괄 가져오기</h3>
                <p className="text-sm text-modern-text-secondary">CSV 파일로 드롭셀링 상품 대량 등록</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">주문 내역 내보내기</h3>
                <p className="text-sm text-modern-text-secondary">주문 데이터 다운로드</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">미디어 일괄 업로드</h3>
                <p className="text-sm text-modern-text-secondary">여러 이미지 한번에 업로드</p>
              </button>
            </div>
          </div>
        </div>

        {/* Security Tools */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-modern-danger" />
              보안 도구
            </h2>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-3">
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">보안 스캔</h3>
                <p className="text-sm text-modern-text-secondary">취약점 및 악성코드 스캔</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">활동 로그</h3>
                <p className="text-sm text-modern-text-secondary">사용자 활동 기록 확인</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">권한 감사</h3>
                <p className="text-sm text-modern-text-secondary">사용자 권한 검토 및 정리</p>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <h3 className="font-medium text-modern-text-primary mb-1">IP 차단 관리</h3>
                <p className="text-sm text-modern-text-secondary">차단된 IP 주소 관리</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Development Tools */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Code className="w-5 h-5 text-modern-warning" />
              개발자 도구
            </h2>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-3">
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-modern-text-secondary" />
                  <div>
                    <h3 className="font-medium text-modern-text-primary">API 테스터</h3>
                    <p className="text-sm text-modern-text-secondary">REST API 엔드포인트 테스트</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <FileSearch className="w-5 h-5 text-modern-text-secondary" />
                  <div>
                    <h3 className="font-medium text-modern-text-primary">로그 뷰어</h3>
                    <p className="text-sm text-modern-text-secondary">시스템 로그 실시간 확인</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-modern-text-secondary" />
                  <div>
                    <h3 className="font-medium text-modern-text-primary">캐시 관리</h3>
                    <p className="text-sm text-modern-text-secondary">시스템 캐시 삭제 및 재생성</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* System Maintenance */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-modern-accent" />
              시스템 유지보수
            </h2>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-3">
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-modern-text-secondary" />
                  <div>
                    <h3 className="font-medium text-modern-text-primary">시스템 백업</h3>
                    <p className="text-sm text-modern-text-secondary">전체 시스템 백업 생성</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-modern-text-secondary" />
                  <div>
                    <h3 className="font-medium text-modern-text-primary">인덱스 재구축</h3>
                    <p className="text-sm text-modern-text-secondary">검색 인덱스 재생성</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-modern-text-secondary" />
                  <div>
                    <h3 className="font-medium text-modern-text-primary">시스템 상태 점검</h3>
                    <p className="text-sm text-modern-text-secondary">전체 시스템 상태 진단</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="o4o-card">
        <div className="o4o-card-header">
          <h2 className="text-lg font-semibold">시스템 상태</h2>
        </div>
        <div className="o4o-card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-2xl font-bold text-modern-text-primary">98.2%</p>
              <p className="text-sm text-modern-text-secondary">서버 가동률</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-2xl font-bold text-modern-text-primary">2.3GB</p>
              <p className="text-sm text-modern-text-secondary">데이터베이스 크기</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-2xl font-bold text-modern-text-primary">45ms</p>
              <p className="text-sm text-modern-text-secondary">평균 응답 시간</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <p className="text-2xl font-bold text-modern-text-primary">v1.0.0</p>
              <p className="text-sm text-modern-text-secondary">시스템 버전</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;