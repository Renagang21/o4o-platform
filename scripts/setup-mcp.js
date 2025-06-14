#!/usr/bin/env node

// MCP 서버 설정 및 설치 스크립트
// Cursor 1.0 MCP 통합을 위한 자동 설정

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class MCPSetup {
  constructor() {
    this.mcpServers = {
      'o4o-filesystem': {
        package: '@modelcontextprotocol/server-filesystem',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        env: {
          'ALLOWED_DIRECTORIES': process.cwd()
        },
        description: 'O4O Platform 파일시스템 접근'
      },
      'o4o-postgres': {
        package: '@modelcontextprotocol/server-postgres',
        command: 'npx',
        args: ['@modelcontextprotocol/server-postgres'],
        env: {
          'POSTGRES_CONNECTION_STRING': 'postgresql://localhost:5432/o4o_platform'
        },
        description: 'PostgreSQL 데이터베이스 관리'
      },
      'o4o-memory': {
        package: '@modelcontextprotocol/server-memory',
        command: 'npx',
        args: ['@modelcontextprotocol/server-memory'],
        env: {},
        description: '대화 메모리 관리'
      },
      'o4o-github': {
        package: '@modelcontextprotocol/server-github',
        command: 'npx',
        args: ['@modelcontextprotocol/server-github'],
        env: {
          'GITHUB_PERSONAL_ACCESS_TOKEN': '${GITHUB_TOKEN}',
          'GITHUB_REPO_WHITELIST': 'o4o-platform/*'
        },
        description: 'GitHub 저장소 관리'
      }
    };
  }

  async setup() {
    console.log('🔌 MCP 서버 설정 시작...\n');

    try {
      await this.checkPrerequisites();
      await this.installMCPPackages();
      await this.createMCPConfig();
      await this.createGlobalMCPConfig();
      await this.setupEnvironmentVariables();
      await this.testMCPServers();
      
      console.log('\n✅ MCP 서버 설정 완료!');
      this.showNextSteps();
    } catch (error) {
      console.error('❌ MCP 설정 실패:', error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 전제 조건 확인...');

    // Node.js 버전 확인
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18 이상이 필요합니다. 현재 버전: ${nodeVersion}`);
    }
    console.log(`   ✅ Node.js ${nodeVersion}`);

    // npm 확인
    try {
      const { stdout } = await execAsync('npm --version');
      console.log(`   ✅ npm ${stdout.trim()}`);
    } catch (error) {
      throw new Error('npm이 설치되지 않았습니다.');
    }

    // .cursor 디렉토리 확인/생성
    const cursorDir = path.join(process.cwd(), '.cursor');
    try {
      await fs.access(cursorDir);
      console.log('   ✅ .cursor 디렉토리 존재');
    } catch (error) {
      await fs.mkdir(cursorDir, { recursive: true });
      console.log('   ✅ .cursor 디렉토리 생성됨');
    }
  }

  async installMCPPackages() {
    console.log('\n📦 MCP 패키지 설치...');

    const packages = Object.values(this.mcpServers).map(server => server.package);
    const uniquePackages = [...new Set(packages)];

    for (const pkg of uniquePackages) {
      console.log(`   📥 ${pkg} 설치 중...`);
      
      try {
        await execAsync(`npm install -g ${pkg}`, { timeout: 60000 });
        console.log(`   ✅ ${pkg} 설치 완료`);
      } catch (error) {
        console.warn(`   ⚠️ ${pkg} 설치 실패: ${error.message}`);
        console.log(`   💡 수동 설치: npm install -g ${pkg}`);
      }
    }
  }

  async createMCPConfig() {
    console.log('\n⚙️ 프로젝트 MCP 설정 파일 생성...');

    const mcpConfigPath = path.join(process.cwd(), '.cursor', 'mcp.json');
    
    // 기존 설정 로드 (있는 경우)
    let existingConfig = { mcpServers: {} };
    try {
      const existingContent = await fs.readFile(mcpConfigPath, 'utf8');
      existingConfig = JSON.parse(existingContent);
    } catch (error) {
      // 파일이 없으면 새로 생성
    }

    // 새 서버 설정 병합
    const mcpConfig = {
      mcpServers: {
        ...existingConfig.mcpServers,
        ...this.generateMCPServerConfig()
      }
    };

    await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
    console.log(`   ✅ MCP 설정 파일 생성: ${mcpConfigPath}`);

    // 설정된 서버 수 표시
    const serverCount = Object.keys(mcpConfig.mcpServers).length;
    console.log(`   📊 총 ${serverCount}개의 MCP 서버 설정됨`);
  }

  generateMCPServerConfig() {
    const config = {};
    
    for (const [serverName, serverInfo] of Object.entries(this.mcpServers)) {
      config[serverName] = {
        command: serverInfo.command,
        args: serverInfo.args,
        env: this.processEnvironmentVariables(serverInfo.env)
      };
    }

    return config;
  }

  processEnvironmentVariables(env) {
    const processedEnv = {};
    
    for (const [key, value] of Object.entries(env)) {
      if (key === 'ALLOWED_DIRECTORIES') {
        // 절대 경로로 변환
        processedEnv[key] = path.resolve(value);
      } else if (key === 'POSTGRES_CONNECTION_STRING') {
        // 환경변수 또는 기본값 설정
        processedEnv[key] = process.env.DATABASE_URL || value;
      } else {
        processedEnv[key] = value;
      }
    }

    return processedEnv;
  }

  async createGlobalMCPConfig() {
    console.log('\n🌐 글로벌 MCP 설정 (선택사항)...');

    const homeDir = require('os').homedir();
    const globalMCPPath = path.join(homeDir, '.cursor', 'mcp.json');

    try {
      // 홈 디렉토리 .cursor 폴더 확인/생성
      await fs.mkdir(path.dirname(globalMCPPath), { recursive: true });

      // 글로벌 설정 (Enhanced Memory 등)
      const globalConfig = {
        mcpServers: {
          'enhanced-memory': {
            command: 'npx',
            args: ['@modelcontextprotocol/server-enhanced-memory'],
            env: {
              'MEMORY_STORAGE_PATH': path.join(homeDir, '.cursor', 'memory')
            }
          },
          'browser-automation': {
            command: 'npx',
            args: ['@modelcontextprotocol/server-playwright'],
            env: {
              'BROWSER_TYPE': 'chromium'
            }
          }
        }
      };

      // 기존 글로벌 설정과 병합
      let existingGlobal = { mcpServers: {} };
      try {
        const existingContent = await fs.readFile(globalMCPPath, 'utf8');
        existingGlobal = JSON.parse(existingContent);
      } catch (error) {
        // 파일이 없으면 새로 생성
      }

      const mergedGlobal = {
        mcpServers: {
          ...existingGlobal.mcpServers,
          ...globalConfig.mcpServers
        }
      };

      await fs.writeFile(globalMCPPath, JSON.stringify(mergedGlobal, null, 2));
      console.log(`   ✅ 글로벌 MCP 설정 생성: ${globalMCPPath}`);

    } catch (error) {
      console.warn(`   ⚠️ 글로벌 MCP 설정 실패: ${error.message}`);
    }
  }

  async setupEnvironmentVariables() {
    console.log('\n🌍 환경변수 설정 확인...');

    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    // 필요한 환경변수들
    const requiredEnvVars = [
      {
        key: 'DATABASE_URL',
        value: 'postgresql://localhost:5432/o4o_platform',
        description: 'PostgreSQL 연결 문자열'
      },
      {
        key: 'GITHUB_TOKEN',
        value: 'your_github_token_here',
        description: 'GitHub Personal Access Token'
      }
    ];

    try {
      // .env 파일 읽기
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch (error) {
        // .env 파일이 없으면 .env.example에서 복사
        try {
          envContent = await fs.readFile(envExamplePath, 'utf8');
          await fs.writeFile(envPath, envContent);
          console.log('   ✅ .env.example에서 .env 파일 생성됨');
        } catch (error) {
          // .env.example도 없으면 새로 생성
          envContent = '# O4O Platform Environment Variables\n\n';
        }
      }

      // 필요한 환경변수 추가
      let envUpdated = false;
      for (const envVar of requiredEnvVars) {
        if (!envContent.includes(`${envVar.key}=`)) {
          envContent += `\n# ${envVar.description}\n${envVar.key}=${envVar.value}\n`;
          envUpdated = true;
          console.log(`   ➕ ${envVar.key} 환경변수 추가됨`);
        } else {
          console.log(`   ✅ ${envVar.key} 환경변수 존재함`);
        }
      }

      // 업데이트된 내용 저장
      if (envUpdated) {
        await fs.writeFile(envPath, envContent);
        console.log('   ✅ .env 파일 업데이트됨');
      }

    } catch (error) {
      console.warn(`   ⚠️ 환경변수 설정 실패: ${error.message}`);
    }
  }

  async testMCPServers() {
    console.log('\n🧪 MCP 서버 테스트...');

    for (const [serverName, serverInfo] of Object.entries(this.mcpServers)) {
      try {
        // 패키지 설치 확인
        await execAsync(`npm list -g ${serverInfo.package}`);
        console.log(`   ✅ ${serverName} - 패키지 설치됨`);
        
        // TODO: 실제 MCP 서버 연결 테스트
        // 현재는 패키지 존재 여부만 확인
        
      } catch (error) {
        console.warn(`   ⚠️ ${serverName} - 패키지 확인 실패`);
      }
    }
  }

  showNextSteps() {
    console.log('\n🎯 다음 단계:');
    console.log('=' .repeat(50));
    console.log('1. Cursor 재시작');
    console.log('2. Settings > MCP에서 서버 목록 확인');
    console.log('3. 환경변수 설정 (.env 파일)');
    console.log('   - DATABASE_URL: PostgreSQL 연결 정보');
    console.log('   - GITHUB_TOKEN: GitHub Personal Access Token');
    console.log('4. Background Agent 활성화 (Cmd/Ctrl+E)');
    console.log('5. Chat에서 MCP 도구 테스트');

    console.log('\n🔧 설정된 MCP 서버들:');
    for (const [serverName, serverInfo] of Object.entries(this.mcpServers)) {
      console.log(`   📌 ${serverName}: ${serverInfo.description}`);
    }

    console.log('\n💡 사용 예시:');
    console.log('   "파일시스템에서 package.json을 읽어줘"');
    console.log('   "데이터베이스에서 users 테이블 구조를 보여줘"');
    console.log('   "GitHub에서 최근 커밋 목록을 가져와줘"');

    console.log('\n🆘 문제 해결:');
    console.log('   - MCP 서버가 보이지 않음: Cursor 재시작');
    console.log('   - 연결 오류: 환경변수 및 권한 확인');
    console.log('   - 패키지 오류: npm install -g [package] 수동 실행');
  }
}

// CLI 인터페이스
if (require.main === module) {
  const setup = new MCPSetup();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔌 MCP 서버 설정 도구

사용법:
  npm run setup:mcp

기능:
  - MCP 패키지 자동 설치
  - 프로젝트 및 글로벌 MCP 설정 생성
  - 환경변수 자동 설정
  - 서버 연결 테스트

옵션:
  --help, -h    도움말 표시
`);
    process.exit(0);
  }

  setup.setup().catch(console.error);
}

module.exports = MCPSetup;
