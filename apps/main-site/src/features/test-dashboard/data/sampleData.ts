import { 
  ServiceStatus, 
  ServiceLink, 
  DevTool, 
  TestCategory, 
  RecentUpdate, 
  QuickLink 
} from '../types';

// 서비스 상태 샘플 데이터
export const sampleServiceStatus: ServiceStatus[] = [
  {
    name: "main-site",
    displayName: "메인 사이트",
    status: "online",
    url: "https://neture.co.kr",
    lastChecked: "2025-07-01 15:30",
    responseTime: 245,
    description: "정상 운영 중"
  },
  {
    name: "admin-dashboard", 
    displayName: "관리자 대시보드",
    status: "online",
    url: "https://neture.co.kr/admin",
    lastChecked: "2025-07-01 15:29",
    responseTime: 312
  },
  {
    name: "api-server",
    displayName: "API 서버", 
    status: "warning",
    url: "https://api.neture.co.kr",
    lastChecked: "2025-07-01 15:28",
    responseTime: 1205,
    description: "응답 속도 느림"
  },
  {
    name: "auth-service",
    displayName: "인증 서비스",
    status: "offline",
    url: "https://auth.neture.co.kr",
    lastChecked: "2025-07-01 15:25",
    description: "서비스 점검 중"
  },
  {
    name: "common-core",
    displayName: "공통 코어",
    status: "online",
    url: "https://neture.co.kr/common",
    lastChecked: "2025-07-01 15:30",
    responseTime: 180,
    description: "정상 운영 중"
  }
];

// 주요 서비스 샘플 데이터
export const sampleMainServices: ServiceLink[] = [
  {
    id: "main-site",
    name: "main-site",
    displayName: "메인 사이트",
    description: "헬스케어 플랫폼 메인 페이지 및 사용자 인터페이스",
    url: "/",
    icon: "home",
    color: "#2563eb",
    status: "active",
    newTab: false
  },
  {
    id: "healthcare",
    name: "healthcare",
    displayName: "헬스케어 플랫폼",
    description: "건강 관련 서비스 및 콘텐츠 제공",
    url: "/healthcare",
    icon: "heart",
    color: "#10b981",
    status: "active",
    newTab: false
  },
  {
    id: "admin-dashboard",
    name: "admin-dashboard", 
    displayName: "관리자 대시보드",
    description: "사용자 관리, 콘텐츠 관리, 시스템 설정",
    url: "/admin",
    icon: "settings",
    color: "#dc2626", 
    status: "active",
    newTab: true
  },
  {
    id: "dropshipping",
    name: "dropshipping",
    displayName: "드랍쉬핑",
    description: "상품 관리, 주문 처리, 파트너 관리",
    url: "/dropshipping",
    icon: "package",
    color: "#f59e0b",
    status: "active",
    newTab: false
  },
  {
    id: "ecommerce",
    name: "ecommerce",
    displayName: "이커머스",
    description: "제품 관리, 주문 처리, 결제 시스템",
    url: "/ecommerce",
    icon: "shopping-cart",
    color: "#16a34a",
    status: "development",
    newTab: false
  },
  {
    id: "crowdfunding",
    name: "crowdfunding",
    displayName: "크라우드펀딩",
    description: "프로젝트 등록, 펀딩 관리, 후원자 관리",
    url: "/crowdfunding", 
    icon: "trending-up",
    color: "#ca8a04",
    status: "development",
    newTab: false
  },
  {
    id: "signage",
    name: "signage",
    displayName: "디지털 사이니지",
    description: "광고 콘텐츠 관리, 디스플레이 제어",
    url: "/signage",
    icon: "monitor",
    color: "#7c3aed",
    status: "development",
    newTab: false
  },
  {
    id: "forum",
    name: "forum", 
    displayName: "포럼",
    description: "커뮤니티 게시판, 사용자 소통 공간",
    url: "/forum",
    icon: "message-circle",
    color: "#0891b2",
    status: "development", 
    newTab: false
  }
];

// 개발 도구 샘플 데이터
export const sampleDevTools: DevTool[] = [
  {
    id: "api-tester",
    name: "API 테스터",
    description: "REST API 엔드포인트 테스트 및 디버깅",
    url: "/dev/api-tester",
    icon: "code",
    category: "api",
    shortcut: "Ctrl+Shift+A"
  },
  {
    id: "db-viewer",
    name: "데이터베이스 뷰어", 
    description: "데이터베이스 스키마 및 데이터 조회",
    url: "/dev/database",
    icon: "database",
    category: "database"
  },
  {
    id: "auth-test",
    name: "인증 테스트",
    description: "로그인, 권한, 토큰 관리 테스트",
    url: "/dev/auth-test",
    icon: "shield",
    category: "auth"
  },
  {
    id: "performance",
    name: "성능 모니터", 
    description: "응답 시간, 메모리 사용량, 트래픽 모니터링",
    url: "/dev/performance",
    icon: "activity",
    category: "performance"
  },
  {
    id: "logs",
    name: "로그 뷰어",
    description: "시스템 로그, 에러 로그 실시간 조회",
    url: "/dev/logs",
    icon: "file-text",
    category: "other"
  },
  {
    id: "build-status",
    name: "빌드 상태",
    description: "CI/CD 파이프라인 및 빌드 현황",
    url: "/dev/build-status",
    icon: "play-circle",
    category: "other"
  }
];

// 기능 테스트 샘플 데이터
export const sampleFeatureTests: TestCategory[] = [
  {
    id: "auth",
    name: "인증 시스템",
    description: "로그인, 회원가입, 권한 관리 테스트",
    tests: [
      {
        id: "login-flow",
        name: "로그인 플로우 테스트",
        description: "일반/소셜/관리자 로그인 시나리오",
        url: "/test/auth/login",
        status: "passing",
        lastRun: "30분 전",
        duration: 12
      },
      {
        id: "signup-flow", 
        name: "회원가입 플로우 테스트",
        description: "이메일 인증, 프로필 설정 포함",
        url: "/test/auth/signup",
        status: "failing",
        lastRun: "1시간 전",
        duration: 25
      },
      {
        id: "permission-test",
        name: "권한 관리 테스트",
        description: "역할별 접근 권한 확인",
        url: "/test/auth/permissions",
        status: "warning",
        lastRun: "45분 전",
        duration: 8
      }
    ]
  },
  {
    id: "healthcare",
    name: "헬스케어 플랫폼",
    description: "헬스케어 관련 기능 테스트", 
    tests: [
      {
        id: "main-page",
        name: "메인 페이지 테스트",
        description: "헬스케어 메인 페이지 로딩 및 표시",
        url: "/test/healthcare/main",
        status: "passing",
        lastRun: "15분 전",
        duration: 5
      },
      {
        id: "content-blocks",
        name: "콘텐츠 블록 테스트",
        description: "각종 콘텐츠 블록 렌더링",
        url: "/test/healthcare/blocks",
        status: "not-tested"
      }
    ]
  },
  {
    id: "ecommerce",
    name: "이커머스",
    description: "제품, 주문, 결제 기능 테스트", 
    tests: [
      {
        id: "product-crud",
        name: "제품 CRUD 테스트",
        description: "제품 등록, 수정, 삭제, 조회",
        url: "/test/ecommerce/products",
        status: "warning",
        lastRun: "2시간 전",
        duration: 18
      },
      {
        id: "order-process",
        name: "주문 프로세스 테스트", 
        description: "장바구니부터 결제 완료까지",
        url: "/test/ecommerce/orders",
        status: "not-tested"
      }
    ]
  }
];

// 최근 업데이트 샘플 데이터
export const sampleRecentUpdates: RecentUpdate[] = [
  {
    id: "1",
    type: "feature",
    title: "테스트 대시보드 추가",
    description: "개발자용 테스트 접근 페이지 구현 완료",
    author: "Claude",
    timestamp: "방금 전",
    service: "main-site",
    url: "/test-dashboard"
  },
  {
    id: "2",
    type: "commit",
    title: "종합 플랫폼 가이드 문서 추가",
    description: "패키지 버전, 서비스 구조, 코딩 실수 패턴 정리",
    author: "Claude",
    timestamp: "30분 전",
    service: "docs",
    url: "https://github.com/Renagang21/o4o-platform/commit/130bec16"
  },
  {
    id: "3",
    type: "deployment",
    title: "헬스케어 플랫폼 배포",
    description: "메인 페이지 및 콘텐츠 블록 시스템 배포",
    author: "System",
    timestamp: "2시간 전",
    service: "healthcare"
  },
  {
    id: "4",
    type: "issue",
    title: "Import 경로 오류 해결",
    description: "@shared/components 경로 문제 수정",
    author: "Claude",
    timestamp: "3시간 전",
    service: "shared"
  },
  {
    id: "5",
    type: "commit",
    title: "공유 컴포넌트 인프라 구축",
    description: "UI 컴포넌트 및 훅 시스템 개선",
    author: "Claude",
    timestamp: "4시간 전",
    service: "shared",
    url: "https://github.com/Renagang21/o4o-platform/commit/9c6b305d"
  }
];

// 빠른 링크 샘플 데이터
export const sampleQuickLinks: QuickLink[] = [
  {
    id: "github-main",
    name: "GitHub 메인 저장소",
    url: "https://github.com/Renagang21/o4o-platform",
    icon: "github",
    category: "development",
    description: "o4o-platform 메인 저장소"
  },
  {
    id: "github-docs",
    name: "문서",
    url: "https://github.com/Renagang21/o4o-platform/tree/main/docs",
    icon: "book",
    category: "documentation",
    description: "프로젝트 문서"
  },
  {
    id: "github-common-core",
    name: "Common Core",
    url: "https://github.com/Renagang21/common-core",
    icon: "layers",
    category: "development",
    description: "공통 코어 모듈"
  },
  {
    id: "neture-prod",
    name: "운영 사이트",
    url: "https://neture.co.kr",
    icon: "external-link",
    category: "external",
    description: "실제 운영 중인 사이트"
  },
  {
    id: "claude-guide",
    name: "개발 가이드",
    url: "/docs/technical/o4o-platform-comprehensive-guide.md",
    icon: "file-text",
    category: "documentation",
    description: "Claude Code 개발 가이드"
  }
];