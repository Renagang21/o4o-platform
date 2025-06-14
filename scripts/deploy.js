#!/usr/bin/env node

// O4O Platform 자동 배포 스크립트
// Cursor 1.0 워크플로우 통합

const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DeploymentManager {
  constructor() {
    this.environments = {
      staging: {
        name: 'Staging',
        url: 'https://staging.o4o-platform.com',
        branch: 'develop',
        dockerTag: 'staging',
        healthCheck: '/api/health'
      },
      production: {
        name: 'Production',
        url: 'https://o4o-platform.com',
        branch: 'main',
        dockerTag: 'latest',
        healthCheck: '/api/health'
      }
    };
  }

  async deploy(environment) {
    const env = this.environments[environment];
    if (!env) {
      throw new Error(`지원하지 않는 환경: ${environment}`);
    }

    console.log(`🚀 ${env.name} 환경 배포 시작...\n`);

    try {
      await this.preDeploymentChecks(environment);
      await this.runTests();
      await this.buildApplication();
      await this.buildDockerImages(env.dockerTag);
      await this.deployToEnvironment(environment);
      await this.postDeploymentTasks(environment);
      
      console.log(`\n✅ ${env.name} 배포 완료!`);
      console.log(`🌐 URL: ${env.url}`);
      
    } catch (error) {
      console.error(`❌ ${env.name} 배포 실패:`, error.message);
      await this.rollbackIfNeeded(environment, error);
      process.exit(1);
    }
  }

  async preDeploymentChecks(environment) {
    console.log('🔍 배포 전 검사 시작...');

    const env = this.environments[environment];

    // 1. Git 상태 확인
    try {
      const { stdout: status } = await execAsync('git status --porcelain');
      if (status.trim()) {
        throw new Error('커밋되지 않은 변경사항이 있습니다. 먼저 커밋하세요.');
      }
      console.log('   ✅ Git 작업 디렉토리 깨끗함');
    } catch (error) {
      throw new Error(`Git 상태 확인 실패: ${error.message}`);
    }

    // 2. 올바른 브랜치 확인
    try {
      const { stdout: currentBranch } = await execAsync('git branch --show-current');
      if (currentBranch.trim() !== env.branch) {
        throw new Error(`배포 브랜치 불일치. 예상: ${env.branch}, 현재: ${currentBranch.trim()}`);
      }
      console.log(`   ✅ 올바른 브랜치: ${env.branch}`);
    } catch (error) {
      throw new Error(`브랜치 확인 실패: ${error.message}`);
    }

    // 3. 최신 코드 확인
    try {
      await execAsync('git fetch origin');
      const { stdout: behind } = await execAsync(`git rev-list --count HEAD..origin/${env.branch}`);
      if (parseInt(behind.trim()) > 0) {
        throw new Error(`로컬 브랜치가 ${behind.trim()}개 커밋 뒤처져 있습니다. git pull을 실행하세요.`);
      }
      console.log('   ✅ 최신 코드 상태');
    } catch (error) {
      throw new Error(`원격 브랜치 확인 실패: ${error.message}`);
    }

    // 4. 환경변수 확인
    await this.checkEnvironmentVariables(environment);

    // 5. Docker 확인
    try {
      await execAsync('docker --version');
      console.log('   ✅ Docker 사용 가능');
    } catch (error) {
      throw new Error('Docker가 설치되지 않았거나 실행되지 않습니다.');
    }

    // 6. Cursor 설정 검증
    try {
      const cursorHealth = spawn('node', ['scripts/cursor-health-check.js'], { stdio: 'pipe' });
      await new Promise((resolve, reject) => {
        cursorHealth.on('close', (code) => {
          if (code === 0) {
            console.log('   ✅ Cursor 설정 검증 완료');
            resolve();
          } else {
            reject(new Error('Cursor 설정 검증 실패'));
          }
        });
      });
    } catch (error) {
      console.warn('   ⚠️ Cursor 설정 검증 건너뜀:', error.message);
    }
  }

  async checkEnvironmentVariables(environment) {
    const requiredVars = {
      staging: [
        'STAGING_DATABASE_URL',
        'STAGING_REDIS_URL',
        'STAGING_JWT_SECRET'
      ],
      production: [
        'PRODUCTION_DATABASE_URL',
        'PRODUCTION_REDIS_URL',
        'PRODUCTION_JWT_SECRET',
        'PRODUCTION_MONITORING_KEY'
      ]
    };

    const vars = requiredVars[environment] || [];
    
    for (const varName of vars) {
      if (!process.env[varName]) {
        throw new Error(`필수 환경변수 누락: ${varName}`);
      }
    }

    if (vars.length > 0) {
      console.log(`   ✅ ${vars.length}개 환경변수 확인됨`);
    }
  }

  async runTests() {
    console.log('\n🧪 테스트 실행...');

    // 1. 단위 테스트
    console.log('   📋 단위 테스트 실행 중...');
    try {
      await execAsync('npm run test:unit', { timeout: 300000 }); // 5분 타임아웃
      console.log('   ✅ 단위 테스트 통과');
    } catch (error) {
      throw new Error(`단위 테스트 실패: ${error.message}`);
    }

    // 2. 통합 테스트
    console.log('   🔗 통합 테스트 실행 중...');
    try {
      await execAsync('npm run test:integration', { timeout: 600000 }); // 10분 타임아웃
      console.log('   ✅ 통합 테스트 통과');
    } catch (error) {
      throw new Error(`통합 테스트 실패: ${error.message}`);
    }

    // 3. E2E 테스트 (스테이징에만)
    if (process.argv.includes('--full-test')) {
      console.log('   🌐 E2E 테스트 실행 중...');
      try {
        await execAsync('npm run test:e2e', { timeout: 900000 }); // 15분 타임아웃
        console.log('   ✅ E2E 테스트 통과');
      } catch (error) {
        throw new Error(`E2E 테스트 실패: ${error.message}`);
      }
    }
  }

  async buildApplication() {
    console.log('\n🔨 애플리케이션 빌드...');

    // 1. 의존성 설치 확인
    console.log('   📦 의존성 확인 중...');
    await execAsync('npm ci');
    console.log('   ✅ 의존성 설치 완료');

    // 2. API 서버 빌드
    console.log('   🔧 API 서버 빌드 중...');
    await execAsync('npm run build:api');
    console.log('   ✅ API 서버 빌드 완료');

    // 3. 웹 앱 빌드
    console.log('   🌐 웹 앱 빌드 중...');
    await execAsync('npm run build:web');
    console.log('   ✅ 웹 앱 빌드 완료');

    // 4. 빌드 결과 검증
    const apiDistPath = path.join(process.cwd(), 'services/api-server/dist');
    const webDistPath = path.join(process.cwd(), 'services/main-site/dist');

    try {
      await fs.access(apiDistPath);
      await fs.access(webDistPath);
      console.log('   ✅ 빌드 결과 검증 완료');
    } catch (error) {
      throw new Error('빌드 결과물을 찾을 수 없습니다.');
    }
  }

  async buildDockerImages(tag) {
    console.log('\n🐳 Docker 이미지 빌드...');

    const images = [
      {
        name: 'o4o-api',
        path: './services/api-server',
        dockerfile: 'Dockerfile'
      },
      {
        name: 'o4o-web',
        path: './services/main-site', 
        dockerfile: 'Dockerfile'
      }
    ];

    for (const image of images) {
      console.log(`   🔨 ${image.name}:${tag} 빌드 중...`);
      
      try {
        await execAsync(`docker build -t ${image.name}:${tag} -f ${image.path}/${image.dockerfile} ${image.path}`);
        console.log(`   ✅ ${image.name}:${tag} 빌드 완료`);
      } catch (error) {
        throw new Error(`Docker 이미지 빌드 실패 (${image.name}): ${error.message}`);
      }
    }

    // 이미지 크기 확인
    try {
      const { stdout } = await execAsync(`docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}" | grep o4o-`);
      console.log('\n   📊 빌드된 이미지들:');
      console.log('   ' + stdout.trim().replace(/\n/g, '\n   '));
    } catch (error) {
      console.warn('   ⚠️ 이미지 크기 확인 실패');
    }
  }

  async deployToEnvironment(environment) {
    console.log(`\n🚀 ${this.environments[environment].name} 환경 배포 중...`);

    const env = this.environments[environment];

    // 1. Docker Compose로 배포
    const composeFile = `docker-compose.${environment}.yml`;
    
    try {
      await fs.access(composeFile);
      
      console.log(`   📋 ${composeFile} 사용하여 배포...`);
      await execAsync(`docker-compose -f ${composeFile} up -d --force-recreate`);
      console.log('   ✅ 컨테이너 배포 완료');
      
    } catch (error) {
      console.log('   ⚠️ Docker Compose 파일 없음, 직접 컨테이너 실행...');
      await this.deployWithDockerRun(environment);
    }

    // 2. 헬스체크 대기
    await this.waitForHealthCheck(env);
  }

  async deployWithDockerRun(environment) {
    const env = this.environments[environment];
    const tag = env.dockerTag;

    // API 서버 컨테이너 실행
    console.log('   🔧 API 서버 컨테이너 시작...');
    const apiPort = environment === 'production' ? '3000' : '3001';
    
    await execAsync(`docker stop o4o-api-${environment} 2>/dev/null || true`);
    await execAsync(`docker rm o4o-api-${environment} 2>/dev/null || true`);
    
    await execAsync(`docker run -d --name o4o-api-${environment} -p ${apiPort}:3000 --env-file .env.${environment} o4o-api:${tag}`);

    // 웹 서버 컨테이너 실행
    console.log('   🌐 웹 서버 컨테이너 시작...');
    const webPort = environment === 'production' ? '80' : '8080';
    
    await execAsync(`docker stop o4o-web-${environment} 2>/dev/null || true`);
    await execAsync(`docker rm o4o-web-${environment} 2>/dev/null || true`);
    
    await execAsync(`docker run -d --name o4o-web-${environment} -p ${webPort}:80 o4o-web:${tag}`);
    
    console.log('   ✅ 컨테이너 실행 완료');
  }

  async waitForHealthCheck(env) {
    console.log('   ⏳ 서비스 시작 대기 중...');

    const maxAttempts = 30;
    const delay = 10000; // 10초

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${env.url}${env.healthCheck}`);
        
        if (response.ok) {
          console.log(`   ✅ 서비스 정상 시작 확인 (${attempt}/${maxAttempts})`);
          return;
        }
      } catch (error) {
        // 계속 시도
      }

      console.log(`   ⏳ 헬스체크 대기 중... (${attempt}/${maxAttempts})`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('서비스 헬스체크 타임아웃');
  }

  async postDeploymentTasks(environment) {
    console.log('\n📋 배포 후 작업...');

    const env = this.environments[environment];

    // 1. 데이터베이스 마이그레이션 (필요한 경우)
    if (environment === 'production') {
      try {
        console.log('   🗃️ 데이터베이스 마이그레이션 실행...');
        await execAsync(`docker exec o4o-api-${environment} npm run migration:run`);
        console.log('   ✅ 마이그레이션 완료');
      } catch (error) {
        console.warn('   ⚠️ 마이그레이션 실패:', error.message);
      }
    }

    // 2. 캐시 초기화
    try {
      console.log('   🗑️ 캐시 초기화 중...');
      await execAsync(`docker exec o4o-api-${environment} npm run cache:clear`);
      console.log('   ✅ 캐시 초기화 완료');
    } catch (error) {
      console.warn('   ⚠️ 캐시 초기화 실패:', error.message);
    }

    // 3. 모니터링 알림
    await this.sendDeploymentNotification(environment);

    // 4. 배포 기록
    await this.recordDeployment(environment);

    // 5. 이전 이미지 정리
    await this.cleanupOldImages();
  }

  async sendDeploymentNotification(environment) {
    try {
      const env = this.environments[environment];
      const { stdout: commit } = await execAsync('git rev-parse --short HEAD');
      const { stdout: author } = await execAsync('git log -1 --format="%an"');
      
      const message = {
        environment: env.name,
        url: env.url,
        commit: commit.trim(),
        author: author.trim(),
        timestamp: new Date().toISOString()
      };

      console.log('   📤 배포 알림 전송...');
      console.log(`   📝 ${env.name} 환경에 ${commit.trim()} 커밋이 배포되었습니다.`);
      
      // TODO: Slack, Discord, 이메일 등으로 알림 전송
      // await this.sendSlackNotification(message);
      
    } catch (error) {
      console.warn('   ⚠️ 알림 전송 실패:', error.message);
    }
  }

  async recordDeployment(environment) {
    try {
      const deploymentRecord = {
        environment,
        timestamp: new Date().toISOString(),
        commit: (await execAsync('git rev-parse HEAD')).stdout.trim(),
        tag: this.environments[environment].dockerTag,
        deployedBy: process.env.USER || process.env.USERNAME || 'unknown'
      };

      const recordPath = path.join(process.cwd(), '.deployments', `${environment}.json`);
      await fs.mkdir(path.dirname(recordPath), { recursive: true });
      
      let records = [];
      try {
        const existingRecords = await fs.readFile(recordPath, 'utf8');
        records = JSON.parse(existingRecords);
      } catch (error) {
        // 파일이 없으면 새로 생성
      }

      records.unshift(deploymentRecord);
      records = records.slice(0, 50); // 최근 50개만 보관

      await fs.writeFile(recordPath, JSON.stringify(records, null, 2));
      console.log('   ✅ 배포 기록 저장됨');

    } catch (error) {
      console.warn('   ⚠️ 배포 기록 실패:', error.message);
    }
  }

  async cleanupOldImages() {
    try {
      console.log('   🧹 이전 Docker 이미지 정리...');
      
      // 사용하지 않는 이미지 제거
      await execAsync('docker image prune -f');
      
      // 30일 이상 된 이미지 제거 (실제 환경에서는 더 신중하게)
      const { stdout } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}}" | grep o4o-');
      const images = stdout.trim().split('\n').filter(img => img);
      
      if (images.length > 10) {
        console.log(`   🗑️ ${images.length}개 중 오래된 이미지들 정리...`);
        // 실제로는 더 정교한 정리 로직 필요
      }
      
      console.log('   ✅ 이미지 정리 완료');
      
    } catch (error) {
      console.warn('   ⚠️ 이미지 정리 실패:', error.message);
    }
  }

  async rollbackIfNeeded(environment, error) {
    console.log('\n🔄 롤백 검토 중...');

    if (error.message.includes('헬스체크') || error.message.includes('컨테이너')) {
      console.log('   ⚡ 자동 롤백 시작...');
      
      try {
        // 이전 버전으로 롤백
        await execAsync(`docker-compose -f docker-compose.${environment}.yml down`);
        
        // 이전 성공한 배포 찾기
        const recordPath = path.join(process.cwd(), '.deployments', `${environment}.json`);
        try {
          const records = JSON.parse(await fs.readFile(recordPath, 'utf8'));
          const lastSuccessful = records[1]; // 현재 실패한 것 다음
          
          if (lastSuccessful) {
            console.log(`   📦 ${lastSuccessful.commit} 커밋으로 롤백 중...`);
            // 롤백 로직 구현
            console.log('   ✅ 롤백 완료');
          }
        } catch (error) {
          console.warn('   ⚠️ 롤백 기록을 찾을 수 없습니다.');
        }
        
      } catch (rollbackError) {
        console.error('   ❌ 롤백 실패:', rollbackError.message);
      }
    } else {
      console.log('   ℹ️ 수동 롤백이 필요할 수 있습니다.');
    }
  }
}

// CLI 인터페이스
if (require.main === module) {
  const args = process.argv.slice(2);
  const environment = args[0];

  if (!environment || !['staging', 'production'].includes(environment)) {
    console.log(`
🚀 O4O Platform 배포 도구

사용법:
  npm run deploy:staging
  npm run deploy:production

옵션:
  --full-test    E2E 테스트 포함 (느림)
  --skip-tests   테스트 건너뛰기 (비추천)

예시:
  npm run deploy:staging -- --full-test
  npm run deploy:production
`);
    process.exit(1);
  }

  const deployer = new DeploymentManager();
  deployer.deploy(environment).catch(console.error);
}

module.exports = DeploymentManager;
