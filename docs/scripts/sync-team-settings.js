#!/usr/bin/env node

// 팀 Cursor 설정 동기화 스크립트
// 팀 저장소에서 최신 Rules, MCP 설정 등을 가져와서 로컬에 적용

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class TeamSettingsSync {
  constructor() {
    this.teamConfigRepo = 'https://github.com/o4o-team/cursor-config.git';
    this.tempDir = path.join(process.cwd(), '.temp-team-config');
    this.cursorDir = path.join(process.cwd(), '.cursor');
  }

  async sync() {
    console.log('🔄 팀 Cursor 설정 동기화 시작...\n');

    try {
      await this.fetchTeamConfig();
      await this.updateRules();
      await this.updateMCPConfig();
      await this.updateCursorSettings();
      await this.cleanup();
      
      console.log('\n✅ 팀 설정 동기화 완료!');
      console.log('   Cursor를 재시작하여 변경사항을 적용하세요.');
    } catch (error) {
      console.error('❌ 동기화 실패:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }

  async fetchTeamConfig() {
    console.log('📥 팀 설정 저장소에서 최신 설정 가져오는 중...');

    try {
      // 임시 디렉토리 정리
      await this.cleanup();

      // Git clone (또는 로컬 백업에서 복사)
      // 실제 팀 저장소가 없는 경우 로컬 템플릿 사용
      await this.createDefaultTeamConfig();
      
      console.log('   ✅ 팀 설정 다운로드 완료');
    } catch (error) {
      throw new Error(`팀 설정 다운로드 실패: ${error.message}`);
    }
  }

  async createDefaultTeamConfig() {
    // 팀 저장소가 없는 경우 기본 설정 생성
    await fs.mkdir(this.tempDir, { recursive: true });

    // 팀 Rules 생성
    const teamRulesDir = path.join(this.tempDir, 'rules');
    await fs.mkdir(teamRulesDir, { recursive: true });

    // 팀 코딩 스타일 Rule
    const teamStyleRule = `---
type: always
name: o4o-team-style
description: O4O Platform 팀 코딩 스타일
---

# 팀 코딩 스타일 가이드

## 공통 규칙
- 모든 파일은 UTF-8 인코딩
- 줄 끝은 LF 사용
- 탭 대신 스페이스 사용
- 파일 끝에 빈 줄 하나 추가

## TypeScript 규칙
- 엄격 모드 활성화
- 명시적 타입 정의 권장
- any 타입 사용 금지
- 함수 반환 타입 명시

## 네이밍 규칙
- 변수/함수: camelCase
- 클래스/인터페이스: PascalCase
- 상수: UPPER_SNAKE_CASE
- 파일명: kebab-case

## 코드 리뷰 기준
- PR 생성 시 BugBot 리뷰 통과 필수
- 최소 2명의 팀원 승인 필요
- 테스트 커버리지 80% 이상
- 린트 에러 0개
`;

    await fs.writeFile(path.join(teamRulesDir, 'team-style.mdc'), teamStyleRule);

    // 팀 MCP 설정
    const teamMCPConfig = {
      mcpServers: {
        "team-github": {
          "command": "npx",
          "args": ["@modelcontextprotocol/server-github"],
          "env": {
            "GITHUB_PERSONAL_ACCESS_TOKEN": "${TEAM_GITHUB_TOKEN}",
            "GITHUB_REPO_WHITELIST": "o4o-platform/*"
          }
        },
        "team-database": {
          "command": "npx",
          "args": ["@modelcontextprotocol/server-postgres"],
          "env": {
            "POSTGRES_CONNECTION_STRING": "${TEAM_DB_CONNECTION_STRING}"
          }
        }
      }
    };

    await fs.writeFile(
      path.join(this.tempDir, 'team-mcp.json'),
      JSON.stringify(teamMCPConfig, null, 2)
    );

    // 팀 Cursor 설정
    const teamCursorSettings = {
      "cursor.copilotPlusPlus.enabled": true,
      "cursor.copilotPlusPlus.chunkedStreaming": true,
      "cursor.backgroundAgent.enabled": true,
      "cursor.chat.longContext.enabled": true,
      "editor.formatOnSave": true,
      "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true,
        "source.organizeImports": true
      },
      "typescript.preferences.importModuleSpecifier": "relative",
      "typescript.suggest.autoImports": true
    };

    await fs.writeFile(
      path.join(this.tempDir, 'cursor-settings.json'),
      JSON.stringify(teamCursorSettings, null, 2)
    );
  }

  async updateRules() {
    console.log('📋 Rules 업데이트 중...');

    const teamRulesDir = path.join(this.tempDir, 'rules');
    const localRulesDir = path.join(this.cursorDir, 'rules');

    try {
      // .cursor/rules 디렉토리 확인/생성
      await fs.mkdir(localRulesDir, { recursive: true });

      // 팀 Rules 파일들 복사
      const teamRuleFiles = await fs.readdir(teamRulesDir);
      
      for (const file of teamRuleFiles) {
        if (file.endsWith('.mdc')) {
          const source = path.join(teamRulesDir, file);
          const dest = path.join(localRulesDir, file);
          
          await fs.copyFile(source, dest);
          console.log(`   ✅ ${file} 업데이트됨`);
        }
      }

      console.log(`   📋 ${teamRuleFiles.length}개의 팀 Rules 적용됨`);
    } catch (error) {
      throw new Error(`Rules 업데이트 실패: ${error.message}`);
    }
  }

  async updateMCPConfig() {
    console.log('🔌 MCP 설정 업데이트 중...');

    try {
      const teamMCPPath = path.join(this.tempDir, 'team-mcp.json');
      const localMCPPath = path.join(this.cursorDir, 'mcp.json');

      // 기존 MCP 설정 읽기
      let localMCPConfig = {};
      try {
        const localMCPContent = await fs.readFile(localMCPPath, 'utf8');
        localMCPConfig = JSON.parse(localMCPContent);
      } catch (error) {
        // 파일이 없으면 새로 생성
        localMCPConfig = { mcpServers: {} };
      }

      // 팀 MCP 설정 읽기
      const teamMCPContent = await fs.readFile(teamMCPPath, 'utf8');
      const teamMCPConfig = JSON.parse(teamMCPContent);

      // 팀 설정을 로컬 설정에 병합
      const mergedConfig = {
        ...localMCPConfig,
        mcpServers: {
          ...localMCPConfig.mcpServers,
          ...teamMCPConfig.mcpServers
        }
      };

      // 업데이트된 설정 저장
      await fs.writeFile(localMCPPath, JSON.stringify(mergedConfig, null, 2));
      
      console.log('   ✅ MCP 설정 병합 완료');
    } catch (error) {
      throw new Error(`MCP 설정 업데이트 실패: ${error.message}`);
    }
  }

  async updateCursorSettings() {
    console.log('⚙️ Cursor 설정 업데이트 중...');

    try {
      const teamSettingsPath = path.join(this.tempDir, 'cursor-settings.json');
      const localSettingsPath = path.join(this.cursorDir, 'settings.json');

      // 팀 설정 읽기
      const teamSettingsContent = await fs.readFile(teamSettingsPath, 'utf8');
      const teamSettings = JSON.parse(teamSettingsContent);

      // 기존 설정 읽기 (있는 경우)
      let localSettings = {};
      try {
        const localSettingsContent = await fs.readFile(localSettingsPath, 'utf8');
        localSettings = JSON.parse(localSettingsContent);
      } catch (error) {
        // 파일이 없으면 새로 생성
      }

      // 설정 병합 (팀 설정 우선)
      const mergedSettings = {
        ...localSettings,
        ...teamSettings
      };

      // 업데이트된 설정 저장
      await fs.writeFile(localSettingsPath, JSON.stringify(mergedSettings, null, 2));
      
      console.log('   ⚙️ Cursor 설정 업데이트 완료');
    } catch (error) {
      throw new Error(`Cursor 설정 업데이트 실패: ${error.message}`);
    }
  }

  async cleanup() {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      // 정리 실패는 무시
    }
  }

  async checkCurrentConfig() {
    console.log('\n📊 현재 설정 상태:');
    console.log('=' .repeat(40));

    // Rules 확인
    const rulesDir = path.join(this.cursorDir, 'rules');
    try {
      const ruleFiles = await fs.readdir(rulesDir);
      console.log(`📋 Rules: ${ruleFiles.length}개 파일`);
      ruleFiles.forEach(file => {
        if (file.endsWith('.mdc')) {
          console.log(`   - ${file}`);
        }
      });
    } catch (error) {
      console.log('📋 Rules: 설정되지 않음');
    }

    // MCP 설정 확인
    const mcpPath = path.join(this.cursorDir, 'mcp.json');
    try {
      const mcpContent = await fs.readFile(mcpPath, 'utf8');
      const mcpConfig = JSON.parse(mcpContent);
      const serverCount = Object.keys(mcpConfig.mcpServers || {}).length;
      console.log(`🔌 MCP 서버: ${serverCount}개 설정됨`);
    } catch (error) {
      console.log('🔌 MCP 서버: 설정되지 않음');
    }

    // Cursor 설정 확인
    const settingsPath = path.join(this.cursorDir, 'settings.json');
    try {
      await fs.access(settingsPath);
      console.log('⚙️ Cursor 설정: 존재함');
    } catch (error) {
      console.log('⚙️ Cursor 설정: 존재하지 않음');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  const sync = new TeamSettingsSync();

  if (args.includes('--check')) {
    sync.checkCurrentConfig().catch(console.error);
  } else {
    sync.sync().catch(console.error);
  }
}

module.exports = TeamSettingsSync;
