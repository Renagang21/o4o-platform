#!/usr/bin/env node

// O4O Platform 스마트 개발 환경 시작 스크립트
// Cursor 1.0 Background Agent와 연동

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

class SmartDevStarter {
  constructor() {
    this.services = [
      { name: 'api-server', port: 4000, path: 'services/api-server' },
      { name: 'main-site', port: 3011, path: 'services/main-site' }
    ];
  }

  async start() {
    console.log('🚀 O4O Platform 스마트 개발 환경 시작...\n');

    try {
      await this.checkPrerequisites();
      await this.checkDatabase();
      await this.installDependencies();
      await this.startServices();
      await this.openBrowsers();
      await this.showStatus();
    } catch (error) {
      console.error('❌ 개발 환경 시작 실패:', error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 전제 조건 확인 중...');

    // Node.js 버전 체크
    const nodeVersion = process.version;
    console.log(`   ✅ Node.js ${nodeVersion}`);

    // npm 설치 확인
    try {
      const { stdout } = await execAsync('npm --version');
      console.log(`   ✅ npm ${stdout.trim()}`);
    } catch (error) {
      throw new Error('npm이 설치되지 않았습니다.');
    }

    // PostgreSQL 확인
    try {
      await execAsync('pg_isready');
      console.log('   ✅ PostgreSQL 실행 중');
    } catch (error) {
      console.log('   ⚠️ PostgreSQL이 실행되지 않음 (수동 시작 필요)');
    }

    // .env 파일 확인
    if (fs.existsSync('.env')) {
      console.log('   ✅ .env 파일 존재');
    } else {
      console.log('   ⚠️ .env 파일 없음 (env.example을 복사하세요)');
    }
  }

  async checkDatabase() {
    console.log('\n📊 데이터베이스 상태 확인 중...');
    
    try {
      // 데이터베이스 연결 테스트 (API 서버를 통해)
      const apiServerPath = path.join(process.cwd(), 'services/api-server');
      if (fs.existsSync(path.join(apiServerPath, 'src/database/connection.ts'))) {
        console.log('   ✅ 데이터베이스 설정 파일 존재');
      }
      
      // 마이그레이션 확인
      const migrationsPath = path.join(apiServerPath, 'src/migrations');
      if (fs.existsSync(migrationsPath)) {
        const migrations = fs.readdirSync(migrationsPath);
        console.log(`   ✅ ${migrations.length}개의 마이그레이션 파일 발견`);
      }
    } catch (error) {
      console.log('   ⚠️ 데이터베이스 확인 실패:', error.message);
    }
  }

  async installDependencies() {
    console.log('\n📦 의존성 설치 확인 중...');

    for (const service of this.services) {
      const servicePath = path.join(process.cwd(), service.path);
      const nodeModulesPath = path.join(servicePath, 'node_modules');

      if (!fs.existsSync(nodeModulesPath)) {
        console.log(`   📥 ${service.name} 의존성 설치 중...`);
        await execAsync(`cd ${service.path} && npm install`);
        console.log(`   ✅ ${service.name} 의존성 설치 완료`);
      } else {
        console.log(`   ✅ ${service.name} 의존성 이미 설치됨`);
      }
    }
  }

  async startServices() {
    console.log('\n⚡ 서비스 시작 중...');

    // 환경변수 로드
    require('dotenv').config();

    // API 서버 시작
    console.log('   🔧 API 서버 시작 중...');
    const apiProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'services/api-server'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // 웹 서버 시작
    console.log('   🌐 웹 서버 시작 중...');
    const webProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'services/main-site'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // 프로세스 출력 처리
    apiProcess.stdout.on('data', (data) => {
      console.log(`[API] ${data.toString().trim()}`);
    });

    webProcess.stdout.on('data', (data) => {
      console.log(`[WEB] ${data.toString().trim()}`);
    });

    // 에러 처리
    apiProcess.stderr.on('data', (data) => {
      console.error(`[API ERROR] ${data.toString().trim()}`);
    });

    webProcess.stderr.on('data', (data) => {
      console.error(`[WEB ERROR] ${data.toString().trim()}`);
    });

    // 서버 시작 대기
    await this.waitForServices();
  }

  async waitForServices() {
    console.log('\n⏳ 서비스 시작 대기 중...');

    const maxAttempts = 30;
    const delay = 1000; // 1초

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // API 서버 체크
        const apiResponse = await this.checkService('http://localhost:4000/api/health');
        const webResponse = await this.checkService('http://localhost:3011');

        if (apiResponse && webResponse) {
          console.log('   ✅ 모든 서비스가 정상적으로 시작되었습니다!');
          return;
        }
      } catch (error) {
        // 계속 시도
      }

      console.log(`   ⏳ 서비스 시작 대기 중... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log('   ⚠️ 서비스 시작 확인 시간 초과 (수동으로 확인하세요)');
  }

  async checkService(url) {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async openBrowsers() {
    console.log('\n🌐 브라우저 자동 오픈...');

    const urls = [
      'http://localhost:3011',      // 웹 앱
      'http://localhost:4000/api/docs'  // API 문서
    ];

    for (const url of urls) {
      try {
        // Windows
        if (process.platform === 'win32') {
          await execAsync(`start ${url}`);
        }
        // macOS
        else if (process.platform === 'darwin') {
          await execAsync(`open ${url}`);
        }
        // Linux
        else {
          await execAsync(`xdg-open ${url}`);
        }
        
        console.log(`   ✅ ${url} 오픈됨`);
      } catch (error) {
        console.log(`   ⚠️ ${url} 자동 오픈 실패 (수동으로 접속하세요)`);
      }
    }
  }

  async showStatus() {
    console.log('\n📋 개발 환경 상태:');
    console.log('=' .repeat(50));
    console.log('🔧 API 서버:     http://localhost:4000');
    console.log('📖 API 문서:     http://localhost:4000/api/docs');
    console.log('🌐 웹 앱:        http://localhost:3011');
    console.log('📊 관리자 패널:   http://localhost:4000/admin (예정)');
    console.log('=' .repeat(50));
    console.log('\n💡 개발 팁:');
    console.log('   - Cursor Background Agent를 활성화하세요 (Cmd/Ctrl+E)');
    console.log('   - Long Context Chat으로 @codebase 사용');
    console.log('   - BugBot이 PR을 자동으로 리뷰합니다');
    console.log('   - MCP 도구들이 활성화되어 있습니다');
    console.log('\n🛑 종료하려면 Ctrl+C를 누르세요');

    // 프로세스 종료 처리
    process.on('SIGINT', () => {
      console.log('\n\n🛑 개발 환경 종료 중...');
      console.log('   서버 프로세스들이 백그라운드에서 계속 실행될 수 있습니다.');
      console.log('   완전히 종료하려면: npm run clean:processes');
      process.exit(0);
    });

    // 무한 대기 (사용자가 Ctrl+C로 종료할 때까지)
    await new Promise(() => {});
  }
}

// 스크립트 실행
if (require.main === module) {
  const starter = new SmartDevStarter();
  starter.start().catch(console.error);
}

module.exports = SmartDevStarter;
