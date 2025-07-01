// 테스트 대시보드 타입 정의
export interface ServiceStatus {
  name: string;            // "main-site"
  displayName: string;     // "메인 사이트"
  status: 'online' | 'offline' | 'warning' | 'unknown';
  url: string;            // "https://neture.co.kr"
  lastChecked: string;    // "2025-07-01 15:30"
  responseTime?: number;  // 응답 시간 (ms)
  description?: string;   // 상태 설명
}

export interface ServiceLink {
  id: string;
  name: string;            // "admin-dashboard"
  displayName: string;     // "관리자 대시보드"
  description: string;     // "사용자 관리, 콘텐츠 관리, 시스템 설정"
  url: string;            // "/admin"
  icon: string;           // 아이콘 이름 또는 URL
  color: string;          // 테마 색상
  status: 'active' | 'development' | 'maintenance';
  newTab: boolean;        // 새 탭에서 열기 여부
}

export interface DevTool {
  id: string;
  name: string;            // "API 테스터"
  description: string;     // "REST API 엔드포인트 테스트"
  url: string;            // "/dev/api-tester"
  icon: string;
  category: 'api' | 'database' | 'auth' | 'performance' | 'other';
  shortcut?: string;      // 키보드 단축키
}

export interface FeatureTest {
  id: string;
  name: string;            // "로그인 플로우 테스트"
  description: string;     // "각종 로그인 시나리오 테스트"
  url: string;            // "/test/auth/login"
  status: 'passing' | 'failing' | 'warning' | 'not-tested';
  lastRun?: string;       // 마지막 실행 시간
  duration?: number;      // 실행 시간 (초)
}

export interface TestCategory {
  id: string;
  name: string;            // "인증 시스템"
  description: string;     // "로그인, 회원가입, 권한 관리 테스트"
  tests: FeatureTest[];
}

export interface RecentUpdate {
  id: string;
  type: 'deployment' | 'commit' | 'issue' | 'feature';
  title: string;           // "헬스케어 플랫폼 메인페이지 추가"
  description: string;     // 변경 내용 설명
  author: string;          // 작성자
  timestamp: string;       // "2시간 전"
  url?: string;           // 관련 링크 (GitHub, 이슈 등)
  service: string;        // 영향받은 서비스
}

export interface QuickLink {
  id: string;
  name: string;            // "GitHub 저장소"
  url: string;            // "https://github.com/..."
  icon: string;
  category: 'development' | 'monitoring' | 'documentation' | 'external';
  description?: string;
}

// 블록 인터페이스들
export interface SystemStatusBlock {
  title: string;           // "시스템 상태"
  services: ServiceStatus[];
  refreshInterval: number; // 자동 새로고침 간격 (초)
}

export interface MainServicesBlock {
  title: string;           // "주요 서비스"
  services: ServiceLink[];
  layout: 'grid' | 'list';
}

export interface DevToolsBlock {
  title: string;           // "개발/테스트 도구"
  tools: DevTool[];
}

export interface FeatureTestsBlock {
  title: string;           // "기능별 테스트"
  categories: TestCategory[];
}

export interface RecentUpdatesBlock {
  title: string;           // "최근 업데이트"
  updates: RecentUpdate[];
  maxItems: number;        // 표시할 최대 항목 수
}

export interface QuickLinksBlock {
  title: string;           // "빠른 링크"
  links: QuickLink[];
  customizable: boolean;   // 사용자 커스터마이징 가능 여부
}