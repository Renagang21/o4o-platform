#!/usr/bin/env node

/**
 * Workspace Configuration
 * 환경별 워크스페이스 정의 및 빌드 순서 관리
 */

// Phase 4.1 분석 결과 반영
const WORKSPACE_CONFIG = {
  // 로컬 개발 환경 (전체 워크스페이스)
  local: {
    apps: [
      'admin-dashboard',    // 관리자 대시보드
      'api-server',        // REST API 서버
      'main-site',         // 메인 사이트 (storefront 대체)
      'storefront'         // 스토어프론트 (legacy)
    ],
    packages: [
      'types',             // 기본 타입 정의
      'utils',             // 유틸리티 함수
      'auth-client',       // 인증 클라이언트
      'auth-context',      // 인증 컨텍스트
      'ui',               // UI 컴포넌트
      'crowdfunding-types', // 크라우드펀딩 타입
      'forum-types',       // 포럼 타입 (미사용 but 유지)
      'shortcodes',        // 숏코드 (미사용 but 유지)
      'supplier-connector' // 공급자 연결
    ],
    description: '전체 개발 환경 (소스 제공자)'
  },
  
  // 웹서버 환경 (프론트엔드 전용)
  webserver: {
    apps: [
      'admin-dashboard',   // 관리자 대시보드
      'main-site',        // 메인 사이트
      'storefront'        // 스토어프론트
    ],
    packages: [
      'types',            // 타입 정의
      'utils',            // 유틸리티
      'auth-client',      // 인증 클라이언트
      'auth-context',     // 인증 컨텍스트
      'ui',              // UI 컴포넌트
      'crowdfunding-types' // 크라우드펀딩 타입
      // forum-types, shortcodes 제외 (미사용)
    ],
    description: '프론트엔드 전용 환경 (53% 최적화)'
  },
  
  // API 서버 환경 (백엔드 전용)
  apiserver: {
    apps: [
      'api-server'        // REST API 서버만
    ],
    packages: [
      'supplier-connector' // API에서 실제 사용
      // 대부분의 프론트엔드 패키지 제외
    ],
    description: '백엔드 전용 환경 (85% 최적화)'
  }
};

// 빌드 순서 정의 (의존성 기반)
const BUILD_ORDER = {
  packages: [
    'types',           // 1. 기본 타입 (독립적)
    'utils',           // 2. 유틸리티 (독립적)
    'auth-client',     // 3. 인증 클라이언트 (독립적)
    'ui',             // 4. UI (types, utils 의존)
    'auth-context',    // 5. 인증 컨텍스트 (types, auth-client 의존)
    'forum-types',     // 6. 포럼 타입 (types 의존)
    'crowdfunding-types', // 7. 크라우드펀딩 타입 (types 의존)
    'shortcodes',      // 8. 숏코드 (독립적)
    'supplier-connector' // 9. 공급자 연결 (독립적)
  ],
  apps: [
    'api-server',      // 백엔드 먼저
    'admin-dashboard', // 관리자 대시보드
    'main-site',      // 메인 사이트
    'storefront'      // 스토어프론트
  ]
};

// 패키지 의존성 맵
const DEPENDENCIES = {
  'types': [],
  'utils': [],
  'auth-client': [],
  'ui': ['types', 'utils'],
  'auth-context': ['types', 'auth-client'],
  'forum-types': ['types'],
  'crowdfunding-types': ['types'],
  'shortcodes': [],
  'supplier-connector': []
};

// 빌드 스크립트 정보
const BUILD_SCRIPTS = {
  // TypeScript 컴파일
  default: 'npx tsc',
  
  // 커스텀 빌드 스크립트
  'auth-context': 'node build.js',
  'forum-types': 'node build.cjs',
  'crowdfunding-types': 'node build.js',
  
  // 앱별 빌드 스크립트
  'admin-dashboard': 'vite build',
  'main-site': 'vite build',
  'storefront': 'vite build',
  'api-server': 'webpack --mode production'
};

/**
 * 환경에 맞는 워크스페이스 목록 반환
 */
function getWorkspaces(environment) {
  const config = WORKSPACE_CONFIG[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  return {
    apps: config.apps,
    packages: config.packages,
    all: [...config.packages, ...config.apps]
  };
}

/**
 * 빌드 순서에 맞게 워크스페이스 정렬
 */
function getOrderedWorkspaces(environment) {
  const workspaces = getWorkspaces(environment);
  const ordered = [];
  
  // 패키지 먼저 (빌드 순서대로)
  BUILD_ORDER.packages.forEach(pkg => {
    if (workspaces.packages.includes(pkg)) {
      ordered.push(`packages/${pkg}`);
    }
  });
  
  // 앱 나중에 (빌드 순서대로)
  BUILD_ORDER.apps.forEach(app => {
    if (workspaces.apps.includes(app)) {
      ordered.push(`apps/${app}`);
    }
  });
  
  return ordered;
}

/**
 * 특정 워크스페이스의 빌드 스크립트 반환
 */
function getBuildScript(workspace) {
  const name = workspace.split('/').pop();
  return BUILD_SCRIPTS[name] || BUILD_SCRIPTS.default;
}

/**
 * 워크스페이스 의존성 확인
 */
function getDependencies(workspace) {
  const name = workspace.split('/').pop();
  return DEPENDENCIES[name] || [];
}

/**
 * 환경별 통계 정보
 */
function getEnvironmentStats(environment) {
  const config = WORKSPACE_CONFIG[environment];
  const totalWorkspaces = config.apps.length + config.packages.length;
  
  // 전체 대비 비율 계산
  const fullConfig = WORKSPACE_CONFIG.local;
  const fullTotal = fullConfig.apps.length + fullConfig.packages.length;
  const optimization = Math.round((1 - totalWorkspaces / fullTotal) * 100);
  
  return {
    environment,
    description: config.description,
    apps: config.apps.length,
    packages: config.packages.length,
    total: totalWorkspaces,
    optimization: optimization > 0 ? `${optimization}%` : 'Full stack'
  };
}

// CLI로 직접 실행 시
if (require.main === module) {
  const { detectEnvironment } = require('./detectEnvironment.cjs');
  const environment = process.argv[2] || detectEnvironment();
  
  console.log(`\n📦 Workspace Configuration for ${environment.toUpperCase()}`);
  console.log('='.repeat(50));
  
  const stats = getEnvironmentStats(environment);
  console.log(`📝 Description: ${stats.description}`);
  console.log(`📊 Statistics:`);
  console.log(`   - Apps: ${stats.apps}`);
  console.log(`   - Packages: ${stats.packages}`);
  console.log(`   - Total: ${stats.total}`);
  console.log(`   - Optimization: ${stats.optimization}`);
  
  const workspaces = getWorkspaces(environment);
  console.log(`\n📱 Apps:`);
  workspaces.apps.forEach(app => console.log(`   - ${app}`));
  
  console.log(`\n📦 Packages:`);
  workspaces.packages.forEach(pkg => console.log(`   - ${pkg}`));
  
  console.log(`\n🔧 Build Order:`);
  const ordered = getOrderedWorkspaces(environment);
  ordered.forEach((ws, idx) => {
    const deps = getDependencies(ws);
    const depStr = deps.length > 0 ? ` (depends on: ${deps.join(', ')})` : '';
    console.log(`   ${idx + 1}. ${ws}${depStr}`);
  });
}

module.exports = {
  WORKSPACE_CONFIG,
  BUILD_ORDER,
  DEPENDENCIES,
  BUILD_SCRIPTS,
  getWorkspaces,
  getOrderedWorkspaces,
  getBuildScript,
  getDependencies,
  getEnvironmentStats
};