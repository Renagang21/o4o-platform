#!/usr/bin/env node

// Cursor 환경 헬스체크 스크립트
// Cursor 1.0 기능들과 o4o-platform 설정 상태 확인

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CursorHealthCheck {
  constructor() {
    this.checks = [];
    this.warnings = [];
    this.errors = [];
  }

  async run() {
    console.log('🏥 Cursor 1.0 & o4o-platform 헬스체크 시작...\n');

    try {
      await this.checkCursorInstallation();
      await this.checkProjectStructure();
      await this.checkCursorRules();
      await this.checkMCPConfiguration();
      await this.checkDevelopmentTools();
      await this.checkEnvironmentVariables();
      await this.checkDependencies();
      
      this.showSummary();
    } catch (error) {
      console.error('❌ 헬스체크 실행 중 오류:', error.message);
      process.exit(1);
    }
  }

  async checkCursorInstallation() {
    console.log('🔍 Cursor 설치 및 버전 확인...');

    try {
      // Cursor 실행 파일 확인 (Windows)
      if (process.platform === 'win32') {
        const cursorPaths = [
          path.join(process.env.LOCALAPPDATA, 'Programs', 'cursor', 'Cursor.exe'),
          path.join(process.env.PROGRAMFILES, 'Cursor', 'Cursor.exe')
        ];

        let cursorFound = false;
        for (const cursorPath of cursorPaths) {
          try {
            await fs.access(cursorPath);
            this.addCheck('✅ Cursor 설치됨', `경로: ${cursorPath}`);
            cursorFound = true;
            break;
          } catch (error) {
            // 다음 경로 시도
          }
        }

        if (!cursorFound) {
          this.addWarning('⚠️ Cursor 설치 경로를 찾을 수 없음', 'https://cursor.com에서 다운로드');
        }
      }

      // .cursor 디렉토리 확인
      const cursorDir = path.join(process.cwd(), '.cursor');
      try {
        await fs.access(cursorDir);
        this.addCheck('✅ .cursor 디렉토리 존재', cursorDir);
      } catch (error) {
        this.addError('❌ .cursor 디렉토리 없음', '프로젝트에 Cursor 설정이 없습니다.');
      }

    } catch (error) {
      this.addError('❌ Cursor 설치 확인 실패', error.message);
    }
  }

  async checkProjectStructure() {
    console.log('📁 프로젝트 구조 확인...');

    const requiredDirs = [
      'services/api-server',
      'services/main-site',
      'scripts',
      'tests'
    ];

    const requiredFiles = [
      'package.json',
      '.env.example',
      'README.md'
    ];

    // 디렉토리 확인
    for (const dir of requiredDirs) {
      try {
        await fs.access(path.join(process.cwd(), dir));
        this.addCheck(`✅ ${dir} 디렉토리 존재`);
      } catch (error) {
        this.addWarning(`⚠️ ${dir} 디렉토리 없음`, '표준 프로젝트 구조를 확인하세요.');
      }
    }

    // 파일 확인
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(process.cwd(), file));
        this.addCheck(`✅ ${file} 파일 존재`);
      } catch (error) {
        this.addWarning(`⚠️ ${file} 파일 없음`, '프로젝트 설정을 확인하세요.');
      }
    }
  }

  async checkCursorRules() {
    console.log('📋 Cursor Rules 설정 확인...');

    const rulesDir = path.join(process.cwd(), '.cursor', 'rules');
    
    try {
      const ruleFiles = await fs.readdir(rulesDir);
      const mdcFiles = ruleFiles.filter(file => file.endsWith('.mdc'));

      if (mdcFiles.length > 0) {
        this.addCheck(`✅ ${mdcFiles.length}개의 Rules 파일 발견`);
        
        // 필수 Rules 확인
        const requiredRules = [
          'o4o-architecture.mdc',
          'backend-dev.mdc',
          'frontend-dev.mdc'
        ];

        for (const rule of requiredRules) {
          if (mdcFiles.includes(rule)) {
            this.addCheck(`✅ ${rule} 설정됨`);
          } else {
            this.addWarning(`⚠️ ${rule} 없음`, '기본 Rules를 설정하세요.');
          }
        }

        // Rule 파일 내용 검증
        for (const ruleFile of mdcFiles) {
          await this.validateRuleFile(path.join(rulesDir, ruleFile));
        }

      } else {
        this.addWarning('⚠️ Rules 파일 없음', 'npm run cursor:migrate를 실행하세요.');
      }

    } catch (error) {
      this.addError('❌ Rules 디렉토리 없음', '.cursor/rules 디렉토리를 생성하세요.');
    }
  }

  async validateRuleFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);

      // YAML 프론트매터 확인
      if (content.startsWith('---')) {
        const endIndex = content.indexOf('---', 3);
        if (endIndex > 0) {
          this.addCheck(`✅ ${fileName} - 올바른 MDC 형식`);
          
          // 필수 필드 확인
          const frontMatter = content.substring(0, endIndex);
          if (frontMatter.includes('type:') && frontMatter.includes('name:')) {
            this.addCheck(`✅ ${fileName} - 필수 메타데이터 포함`);
          } else {
            this.addWarning(`⚠️ ${fileName} - 메타데이터 누락`, 'type과 name 필드가 필요합니다.');
          }
        } else {
          this.addWarning(`⚠️ ${fileName} - 잘못된 MDC 형식`, 'YAML 프론트매터를 확인하세요.');
        }
      } else {
        this.addWarning(`⚠️ ${fileName} - MDC 형식 아님`, 'Cursor 1.0 MDC 형식으로 변환하세요.');
      }

    } catch (error) {
      this.addError(`❌ ${path.basename(filePath)} 읽기 실패`, error.message);
    }
  }

  async checkMCPConfiguration() {
    console.log('🔌 MCP 설정 확인...');

    const mcpConfigPath = path.join(process.cwd(), '.cursor', 'mcp.json');
    
    try {
      const mcpContent = await fs.readFile(mcpConfigPath, 'utf8');
      const mcpConfig = JSON.parse(mcpContent);

      if (mcpConfig.mcpServers) {
        const serverCount = Object.keys(mcpConfig.mcpServers).length;
        this.addCheck(`✅ ${serverCount}개의 MCP 서버 설정됨`);

        // 권장 MCP 서버들 확인
        const recommendedServers = [
          'o4o-filesystem',
          'o4o-postgres',
          'o4o-memory'
        ];

        for (const server of recommendedServers) {
          if (mcpConfig.mcpServers[server]) {
            this.addCheck(`✅ ${server} MCP 서버 설정됨`);
          } else {
            this.addWarning(`⚠️ ${server} MCP 서버 없음`, '권장 MCP 서버를 추가하세요.');
          }
        }

        // 환경변수 확인
        for (const [serverName, serverConfig] of Object.entries(mcpConfig.mcpServers)) {
          if (serverConfig.env) {
            for (const [envKey, envValue] of Object.entries(serverConfig.env)) {
              if (typeof envValue === 'string' && envValue.includes('${')) {
                this.addWarning(`⚠️ ${serverName} - 환경변수 미설정`, `${envKey} 환경변수를 설정하세요.`);
              }
            }
          }
        }

      } else {
        this.addWarning('⚠️ MCP 서버 설정 없음', 'mcpServers 설정을 추가하세요.');
      }

    } catch (error) {
      this.addError('❌ MCP 설정 파일 없음', '.cursor/mcp.json 파일을 생성하세요.');
    }
  }

  async checkDevelopmentTools() {
    console.log('🛠️ 개발 도구 확인...');

    const tools = [
      { command: 'node --version', name: 'Node.js' },
      { command: 'npm --version', name: 'npm' },
      { command: 'git --version', name: 'Git' }
    ];

    for (const tool of tools) {
      try {
        const { stdout } = await execAsync(tool.command);
        this.addCheck(`✅ ${tool.name} 설치됨`, stdout.trim());
      } catch (error) {
        this.addError(`❌ ${tool.name} 없음`, `${tool.name}을 설치하세요.`);
      }
    }

    // PostgreSQL 확인
    try {
      await execAsync('pg_isready');
      this.addCheck('✅ PostgreSQL 실행 중');
    } catch (error) {
      this.addWarning('⚠️ PostgreSQL 미실행', 'PostgreSQL 서비스를 시작하세요.');
    }
  }

  async checkEnvironmentVariables() {
    console.log('🌍 환경변수 설정 확인...');

    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    try {
      await fs.access(envPath);
      this.addCheck('✅ .env 파일 존재');

      // .env.example과 비교
      try {
        const envExample = await fs.readFile(envExamplePath, 'utf8');
        const envActual = await fs.readFile(envPath, 'utf8');

        const exampleKeys = this.extractEnvKeys(envExample);
        const actualKeys = this.extractEnvKeys(envActual);

        const missingKeys = exampleKeys.filter(key => !actualKeys.includes(key));
        
        if (missingKeys.length === 0) {
          this.addCheck('✅ 모든 필수 환경변수 설정됨');
        } else {
          this.addWarning(`⚠️ ${missingKeys.length}개 환경변수 누락`, `누락: ${missingKeys.join(', ')}`);
        }

      } catch (error) {
        this.addWarning('⚠️ .env.example 파일 없음', '환경변수 템플릿이 없습니다.');
      }

    } catch (error) {
      this.addError('❌ .env 파일 없음', '.env.example을 복사하여 .env 파일을 생성하세요.');
    }
  }

  extractEnvKeys(envContent) {
    return envContent
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim())
      .filter(key => key.length > 0);
  }

  async checkDependencies() {
    console.log('📦 의존성 확인...');

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // node_modules 확인
      try {
        await fs.access(path.join(process.cwd(), 'node_modules'));
        this.addCheck('✅ 루트 의존성 설치됨');
      } catch (error) {
        this.addError('❌ 루트 의존성 미설치', 'npm install을 실행하세요.');
      }

      // 서비스별 의존성 확인
      const services = ['api-server', 'main-site'];
      
      for (const service of services) {
        const servicePath = path.join(process.cwd(), 'services', service);
        try {
          await fs.access(path.join(servicePath, 'node_modules'));
          this.addCheck(`✅ ${service} 의존성 설치됨`);
        } catch (error) {
          this.addWarning(`⚠️ ${service} 의존성 미설치`, `cd services/${service} && npm install`);
        }
      }

      // 중요 스크립트 확인
      const importantScripts = [
        'dev:smart',
        'cursor:migrate',
        'cursor:generate-component',
        'cursor:generate-api'
      ];

      for (const script of importantScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addCheck(`✅ ${script} 스크립트 존재`);
        } else {
          this.addWarning(`⚠️ ${script} 스크립트 없음`, 'package.json 스크립트를 확인하세요.');
        }
      }

    } catch (error) {
      this.addError('❌ package.json 읽기 실패', error.message);
    }
  }

  addCheck(message, detail = '') {
    this.checks.push({ message, detail, type: 'success' });
    console.log(`${message}${detail ? ` (${detail})` : ''}`);
  }

  addWarning(message, detail = '') {
    this.warnings.push({ message, detail, type: 'warning' });
    console.log(`${message}${detail ? ` (${detail})` : ''}`);
  }

  addError(message, detail = '') {
    this.errors.push({ message, detail, type: 'error' });
    console.log(`${message}${detail ? ` (${detail})` : ''}`);
  }

  showSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 헬스체크 요약');
    console.log('='.repeat(60));

    console.log(`✅ 성공: ${this.checks.length}개`);
    console.log(`⚠️ 경고: ${this.warnings.length}개`);
    console.log(`❌ 오류: ${this.errors.length}개`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️ 개선 권장사항:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
        if (warning.detail) {
          console.log(`   해결방법: ${warning.detail}`);
        }
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ 필수 수정사항:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
        if (error.detail) {
          console.log(`   해결방법: ${error.detail}`);
        }
      });
    }

    // 전체 상태 평가
    console.log('\n🏆 전체 상태:');
    if (this.errors.length === 0) {
      if (this.warnings.length === 0) {
        console.log('🟢 완벽! Cursor 1.0 환경이 완전히 설정되었습니다.');
      } else if (this.warnings.length <= 3) {
        console.log('🟡 양호! 몇 가지 개선사항이 있지만 개발 가능합니다.');
      } else {
        console.log('🟠 보통! 여러 개선사항이 있습니다.');
      }
    } else {
      console.log('🔴 주의! 필수 구성요소가 누락되어 있습니다.');
    }

    console.log('\n💡 다음 단계 제안:');
    if (this.errors.length > 0) {
      console.log('1. 오류 사항들을 먼저 해결하세요');
      console.log('2. npm run cursor:migrate 실행');
    } else if (this.warnings.length > 0) {
      console.log('1. 경고 사항들을 차례로 해결하세요');
      console.log('2. npm run dev:smart로 개발 환경 테스트');
    } else {
      console.log('1. npm run dev:smart로 개발 시작');
      console.log('2. Cursor에서 Background Agent 활성화');
      console.log('3. @codebase로 전체 프로젝트 컨텍스트 활용');
    }

    console.log('\n📚 도움말:');
    console.log('- 설정 가이드: docs-hub/guides/cursor-1.0-setup-guide.md');
    console.log('- 문제 해결: npm run cursor:migrate');
    console.log('- 팀 설정 동기화: npm run cursor:sync-team');
  }
}

// CLI 실행
if (require.main === module) {
  const healthCheck = new CursorHealthCheck();
  healthCheck.run().catch(console.error);
}

module.exports = CursorHealthCheck;
