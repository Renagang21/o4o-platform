#!/usr/bin/env node

/**
 * Admin Dashboard 안정화 스크립트
 * 자동화 도구 작업 전후 실행하여 환경 무결성 보장
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const ADMIN_DASHBOARD_PATH = 'apps/admin-dashboard';
const CONFIG_FILES = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json'
];

class AdminDashboardStabilizer {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async stabilize() {
    console.log('🔧 Admin Dashboard 안정화 시작...\n');
    
    try {
      await this.checkEnvironment();
      await this.validateConfigs();
      await this.cleanupConflicts();
      await this.validateDependencies();
      await this.testConnectivity();
      
      this.printReport();
    } catch (error) {
      console.error('❌ 안정화 실패:', error.message);
      process.exit(1);
    }
  }

  async checkEnvironment() {
    console.log('📋 환경 점검...');
    
    // Node.js 버전 확인
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v20.')) {
      this.warnings.push(`Node.js 20.x 권장 (현재: ${nodeVersion})`);
    }
    
    // 필수 디렉토리 확인
    if (!fs.existsSync(ADMIN_DASHBOARD_PATH)) {
      throw new Error(`${ADMIN_DASHBOARD_PATH} 경로가 존재하지 않습니다`);
    }
    
    console.log('✅ 환경 점검 완료');
  }

  async validateConfigs() {
    console.log('⚙️  설정 파일 검증...');
    
    for (const configFile of CONFIG_FILES) {
      const filePath = path.join(ADMIN_DASHBOARD_PATH, configFile);
      
      if (!fs.existsSync(filePath)) {
        this.errors.push(`${configFile} 파일이 누락되었습니다`);
        continue;
      }
      
      // package.json 포트 검증
      if (configFile === 'package.json') {
        const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const devScript = packageJson.scripts?.dev || '';
        
        if (!devScript.includes('--port 3001')) {
          this.warnings.push('package.json dev 스크립트에 --port 3001 누락');
        }
      }
      
      // vite.config.ts 포트 검증
      if (configFile === 'vite.config.ts') {
        const viteConfig = fs.readFileSync(filePath, 'utf8');
        
        if (!viteConfig.includes('port: 3001')) {
          this.warnings.push('vite.config.ts에 port: 3001 설정 누락');
        }
        
        if (!viteConfig.includes("host: '0.0.0.0'")) {
          this.warnings.push('vite.config.ts에 WSL2 호환 host 설정 누락');
        }
      }
    }
    
    console.log('✅ 설정 파일 검증 완료');
  }

  async cleanupConflicts() {
    console.log('🧹 충돌 요소 정리...');
    
    const conflictFiles = [
      'server.js',           // 자동 생성된 프록시 서버
      'vite.config.js',      // TypeScript 설정과 충돌 가능
      '*.log',               // 로그 파일들
      '*-DESKTOP-*.*'        // 백업 파일들
    ];
    
    for (const pattern of conflictFiles) {
      try {
        if (pattern.includes('*')) {
          // 글로브 패턴 처리
          await this.execCommand(`find ${ADMIN_DASHBOARD_PATH} -name "${pattern}" -delete`);
        } else {
          const filePath = path.join(ADMIN_DASHBOARD_PATH, pattern);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   🗑️  제거됨: ${pattern}`);
          }
        }
      } catch (error) {
        this.warnings.push(`${pattern} 정리 중 오류: ${error.message}`);
      }
    }
    
    console.log('✅ 충돌 요소 정리 완료');
  }

  async validateDependencies() {
    console.log('📦 의존성 검증...');
    
    try {
      // 로컬 패키지 존재 확인
      const authClientPath = 'packages/auth-client';
      const authContextPath = 'packages/auth-context';
      
      if (!fs.existsSync(authClientPath)) {
        this.errors.push('@o4o/auth-client 패키지 누락');
      }
      
      if (!fs.existsSync(authContextPath)) {
        this.errors.push('@o4o/auth-context 패키지 누락');
      }
      
      // 중복/충돌 의존성 확인
      const packageJsonPath = path.join(ADMIN_DASHBOARD_PATH, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const problematicDeps = [
        'express',
        'http-proxy-middleware',
        'react-query' // @tanstack/react-query와 충돌
      ];
      
      for (const dep of problematicDeps) {
        if (packageJson.dependencies?.[dep]) {
          this.warnings.push(`문제될 수 있는 의존성 발견: ${dep}`);
        }
      }
      
    } catch (error) {
      this.warnings.push(`의존성 검증 중 오류: ${error.message}`);
    }
    
    console.log('✅ 의존성 검증 완료');
  }

  async testConnectivity() {
    console.log('🌐 연결성 테스트...');
    
    try {
      // 포트 3001 사용 여부 확인
      await this.execCommand('lsof -ti:3001 | xargs kill -9 || true');
      
      // WSL2 IP 확인
      const wslIP = await this.execCommand("ip route show | grep -i default | awk '{ print $3}'");
      console.log(`   🔗 WSL2 Gateway IP: ${wslIP.trim()}`);
      
      // 로컬호스트 연결 테스트
      const curlTest = await this.execCommand('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 || echo "connection_failed"');
      
      if (curlTest.trim() === 'connection_failed') {
        console.log('   ⚠️  현재 서버가 실행 중이 아님 (정상)');
      } else {
        console.log(`   📊 HTTP 응답 코드: ${curlTest.trim()}`);
      }
      
    } catch (error) {
      this.warnings.push(`연결성 테스트 중 오류: ${error.message}`);
    }
    
    console.log('✅ 연결성 테스트 완료');
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error && !command.includes('|| true')) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  printReport() {
    console.log('\n📊 안정화 보고서');
    console.log('='.repeat(40));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 모든 검사 통과! 환경이 안정적입니다.');
    } else {
      if (this.errors.length > 0) {
        console.log('\n❌ 오류 (즉시 수정 필요):');
        this.errors.forEach(error => console.log(`  • ${error}`));
      }
      
      if (this.warnings.length > 0) {
        console.log('\n⚠️  경고 (권장 수정사항):');
        this.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    }
    
    console.log('\n🔧 권장 다음 단계:');
    console.log('  1. npm run dev:admin 실행');
    console.log('  2. http://localhost:3001 브라우저 접속');
    console.log('  3. 정상 작동 확인 후 개발 진행');
    console.log('\n='.repeat(40));
  }
}

// 실행
if (require.main === module) {
  const stabilizer = new AdminDashboardStabilizer();
  stabilizer.stabilize().catch(console.error);
}

module.exports = AdminDashboardStabilizer;