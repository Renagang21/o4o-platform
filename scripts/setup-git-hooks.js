#!/usr/bin/env node

// Git hooks 설정 스크립트
// 코드 품질 및 Cursor 1.0 워크플로우 자동화

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class GitHooksSetup {
  constructor() {
    this.hooksDir = path.join(process.cwd(), '.git', 'hooks');
    this.templatesDir = path.join(__dirname, 'git-hooks-templates');
  }

  async setup() {
    console.log('🪝 Git Hooks 설정 시작...\n');

    try {
      await this.checkGitRepository();
      await this.createHookTemplates();
      await this.installHooks();
      await this.setupHusky();
      await this.createCommitTemplate();
      
      console.log('\n✅ Git Hooks 설정 완료!');
      this.showUsageGuide();
    } catch (error) {
      console.error('❌ Git Hooks 설정 실패:', error.message);
      process.exit(1);
    }
  }

  async checkGitRepository() {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      console.log('✅ Git 저장소 확인됨');
    } catch (error) {
      throw new Error('Git 저장소가 아닙니다. git init을 먼저 실행하세요.');
    }

    // hooks 디렉토리 확인/생성
    try {
      await fs.access(this.hooksDir);
      console.log('✅ Git hooks 디렉토리 존재');
    } catch (error) {
      await fs.mkdir(this.hooksDir, { recursive: true });
      console.log('✅ Git hooks 디렉토리 생성됨');
    }
  }

  async createHookTemplates() {
    console.log('📝 Hook 템플릿 생성 중...');

    const hooks = {
      'pre-commit': this.getPreCommitHook(),
      'commit-msg': this.getCommitMsgHook(),
      'pre-push': this.getPrePushHook(),
      'post-commit': this.getPostCommitHook(),
      'post-merge': this.getPostMergeHook()
    };

    for (const [hookName, hookContent] of Object.entries(hooks)) {
      const hookPath = path.join(this.hooksDir, hookName);
      
      await fs.writeFile(hookPath, hookContent);
      
      // 실행 권한 부여 (Unix 계열)
      if (process.platform !== 'win32') {
        await fs.chmod(hookPath, '755');
      }
      
      console.log(`   ✅ ${hookName} hook 생성됨`);
    }
  }

  getPreCommitHook() {
    return `#!/bin/bash

# O4O Platform Pre-commit Hook
# Cursor 1.0 워크플로우 통합

echo "🔍 Pre-commit 검사 시작..."

# 1. 린트 검사
echo "📋 ESLint 검사 중..."
npm run lint:check || {
  echo "❌ ESLint 검사 실패. 다음 명령어로 수정하세요:"
  echo "   npm run lint:fix"
  exit 1
}

# 2. 타입 검사
echo "🔷 TypeScript 타입 검사 중..."
npm run type-check || {
  echo "❌ TypeScript 타입 검사 실패"
  exit 1
}

# 3. 테스트 실행
echo "🧪 단위 테스트 실행 중..."
npm run test:unit || {
  echo "❌ 단위 테스트 실패"
  exit 1
}

# 4. Cursor Rules 검증
echo "📋 Cursor Rules 검증 중..."
node scripts/validate-cursor-rules.js || {
  echo "❌ Cursor Rules 검증 실패"
  exit 1
}

# 5. 커밋 메시지 파일들 스테이징에서 제외
git reset HEAD -- commit-template.txt 2>/dev/null || true

echo "✅ Pre-commit 검사 완료!"
`;
  }

  getCommitMsgHook() {
    return `#!/bin/bash

# O4O Platform Commit Message Hook
# 커밋 메시지 형식 검증

commit_file="$1"
commit_msg=\`cat "$commit_file"\`

echo "📝 커밋 메시지 검증 중..."

# 커밋 메시지 형식 검증 (Conventional Commits)
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\\(.+\\))?: .{1,50}"; then
  echo "❌ 커밋 메시지 형식이 올바르지 않습니다."
  echo ""
  echo "올바른 형식:"
  echo "  type(scope): description"
  echo ""
  echo "Types:"
  echo "  feat:     새로운 기능"
  echo "  fix:      버그 수정"
  echo "  docs:     문서 수정"
  echo "  style:    코드 스타일 변경"
  echo "  refactor: 코드 리팩토링"
  echo "  test:     테스트 추가/수정"
  echo "  chore:    기타 작업"
  echo "  perf:     성능 개선"
  echo "  ci:       CI/CD 설정"
  echo "  build:    빌드 설정"
  echo ""
  echo "예시:"
  echo "  feat(auth): add user login functionality"
  echo "  fix(api): resolve database connection issue"
  echo "  docs(readme): update installation guide"
  exit 1
fi

# 커밋 메시지 길이 검증
first_line=\`echo "$commit_msg" | head -n1\`
if [ \${#first_line} -gt 72 ]; then
  echo "❌ 커밋 메시지 첫 줄이 너무 깁니다 (\${#first_line}/72자)"
  exit 1
fi

echo "✅ 커밋 메시지 검증 완료!"
`;
  }

  getPrePushHook() {
    return `#!/bin/bash

# O4O Platform Pre-push Hook
# 푸시 전 최종 검증

echo "🚀 Pre-push 검사 시작..."

# 현재 브랜치 확인
current_branch=\`git branch --show-current\`
echo "📍 현재 브랜치: $current_branch"

# main/master 브랜치 직접 푸시 방지
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "❌ main/master 브랜치에 직접 푸시할 수 없습니다."
  echo "   feature 브랜치를 생성하고 Pull Request를 사용하세요."
  exit 1
fi

# 1. 전체 테스트 실행
echo "🧪 전체 테스트 실행 중..."
npm run test || {
  echo "❌ 테스트 실패"
  exit 1
}

# 2. 빌드 테스트
echo "🔨 빌드 테스트 중..."
npm run build || {
  echo "❌ 빌드 실패"
  exit 1
}

# 3. Cursor 설정 검증
echo "🔍 Cursor 설정 검증 중..."
npm run cursor:health-check || {
  echo "❌ Cursor 설정 검증 실패"
  exit 1
}

echo "✅ Pre-push 검사 완료!"
`;
  }

  getPostCommitHook() {
    return `#!/bin/bash

# O4O Platform Post-commit Hook
# 커밋 후 자동화 작업

echo "📊 Post-commit 작업 시작..."

# 1. Cursor Background Agent 트리거 (선택사항)
if command -v cursor >/dev/null 2>&1; then
  echo "🤖 Cursor Background Agent 활성화..."
  # Background Agent가 변경사항을 분석하도록 힌트 제공
  echo "# Cursor: analyze recent changes" > .cursor-hint.tmp
  rm -f .cursor-hint.tmp 2>/dev/null || true
fi

# 2. 코드 메트릭 수집
echo "📈 코드 메트릭 수집 중..."
{
  echo "Commit: \$(git rev-parse HEAD)"
  echo "Date: \$(date)"
  echo "Files changed: \$(git diff --name-only HEAD~1)"
  echo "Lines added: \$(git diff --shortstat HEAD~1 | grep -o '[0-9]\\+ insertion' | cut -d' ' -f1)"
  echo "Lines deleted: \$(git diff --shortstat HEAD~1 | grep -o '[0-9]\\+ deletion' | cut -d' ' -f1)"
} >> .git/commit-metrics.log

# 3. 의존성 변경 감지
if git diff --name-only HEAD~1 | grep -q package.json; then
  echo "📦 package.json 변경 감지됨"
  echo "   팀원들에게 npm install 실행을 안내하세요."
fi

echo "✅ Post-commit 작업 완료!"
`;
  }

  getPostMergeHook() {
    return `#!/bin/bash

# O4O Platform Post-merge Hook
# 머지 후 자동화 작업

echo "🔄 Post-merge 작업 시작..."

# 1. 의존성 자동 설치
if git diff --name-only HEAD@{1} HEAD | grep -q package.json; then
  echo "📦 package.json 변경 감지 - 의존성 설치 중..."
  npm install || {
    echo "⚠️ npm install 실패. 수동으로 실행하세요."
  }
fi

# 2. 데이터베이스 마이그레이션 확인
if git diff --name-only HEAD@{1} HEAD | grep -q "migrations/"; then
  echo "🗃️ 마이그레이션 파일 변경 감지"
  echo "   데이터베이스 마이그레이션 실행을 확인하세요:"
  echo "   npm run migration:run"
fi

# 3. Cursor 설정 동기화
if git diff --name-only HEAD@{1} HEAD | grep -q ".cursor/"; then
  echo "⚙️ Cursor 설정 변경 감지"
  echo "   팀 설정 동기화를 실행하세요:"
  echo "   npm run cursor:sync-team"
fi

echo "✅ Post-merge 작업 완료!"
`;
  }

  async installHooks() {
    console.log('🔧 Git hooks 활성화 중...');

    // Git 설정 업데이트
    try {
      execSync('git config core.hooksPath .git/hooks', { stdio: 'ignore' });
      console.log('✅ Git hooks 경로 설정됨');
    } catch (error) {
      console.warn('⚠️ Git hooks 경로 설정 실패:', error.message);
    }
  }

  async setupHusky() {
    console.log('🐕 Husky 설정 (선택사항)...');

    try {
      // Husky 설치 확인
      execSync('npm list husky', { stdio: 'ignore' });
      
      // Husky 초기화
      execSync('npx husky install', { stdio: 'ignore' });
      
      // package.json 스크립트 추가
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (!packageJson.scripts.prepare) {
        packageJson.scripts.prepare = 'husky install';
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Husky prepare 스크립트 추가됨');
      }
      
      console.log('✅ Husky 설정 완료');
      
    } catch (error) {
      console.log('⚠️ Husky 설정 건너뜀 (선택사항)');
    }
  }

  async createCommitTemplate() {
    console.log('📝 커밋 템플릿 생성 중...');

    const templateContent = `# <type>(<scope>): <description>
#
# Types:
#   feat:     새로운 기능
#   fix:      버그 수정  
#   docs:     문서 수정
#   style:    코드 스타일 변경 (포맷팅, 세미콜론 추가 등)
#   refactor: 코드 리팩토링
#   test:     테스트 추가/수정
#   chore:    기타 작업 (빌드, 패키지 매니저 설정 등)
#   perf:     성능 개선
#   ci:       CI/CD 설정
#   build:    빌드 설정
#
# Scope (선택사항):
#   auth, api, ui, database, docs, config, etc.
#
# Description:
#   - 현재 시제, 명령문 사용 ("add" not "added" nor "adds")
#   - 첫 글자 소문자
#   - 마침표로 끝나지 않음
#   - 50자 이내
#
# Body (선택사항):
#   - 변경 사항의 동기와 이전 동작과의 차이점 설명
#   - 72자에서 줄바꿈
#
# Footer (선택사항):
#   - Breaking changes: BREAKING CHANGE: description
#   - 이슈 참조: Closes #123, Fixes #456
#
# 예시:
#   feat(auth): add OAuth2 login integration
#   fix(api): resolve user profile update error
#   docs(readme): update installation instructions
`;

    const templatePath = path.join(process.cwd(), '.gitmessage');
    await fs.writeFile(templatePath, templateContent);

    // Git 설정에 템플릿 등록
    try {
      execSync(`git config commit.template ${templatePath}`, { stdio: 'ignore' });
      console.log('✅ 커밋 템플릿 설정됨');
    } catch (error) {
      console.warn('⚠️ 커밋 템플릿 설정 실패:', error.message);
    }
  }

  showUsageGuide() {
    console.log('\n🎯 Git Hooks 사용 가이드:');
    console.log('=' .repeat(50));
    
    console.log('\n📋 설정된 Hooks:');
    console.log('  • pre-commit:  린트, 타입체크, 단위테스트');
    console.log('  • commit-msg:  커밋 메시지 형식 검증');
    console.log('  • pre-push:    전체 테스트, 빌드 검증');
    console.log('  • post-commit: 메트릭 수집, Background Agent');
    console.log('  • post-merge:  의존성 설치, 마이그레이션 안내');

    console.log('\n✅ 올바른 커밋 메시지 예시:');
    console.log('  git commit -m "feat(auth): add OAuth2 login"');
    console.log('  git commit -m "fix(api): resolve database timeout"');
    console.log('  git commit -m "docs(readme): update setup guide"');

    console.log('\n🔧 Hook 관리 명령어:');
    console.log('  • Hook 비활성화: git config core.hooksPath /dev/null');
    console.log('  • Hook 재활성화: git config core.hooksPath .git/hooks');
    console.log('  • Hook 수정:    .git/hooks/ 디렉토리 편집');

    console.log('\n💡 팁:');
    console.log('  • 커밋 템플릿: git commit (에디터에서 템플릿 확인)');
    console.log('  • Hook 건너뛰기: git commit --no-verify (비추천)');
    console.log('  • 빠른 수정: npm run lint:fix');

    console.log('\n🤝 팀 협업:');
    console.log('  • 모든 팀원이 동일한 hooks를 사용합니다');
    console.log('  • CI/CD에서 동일한 검증을 수행합니다');
    console.log('  • Cursor BugBot이 추가 리뷰를 제공합니다');
  }
}

// CLI 실행
if (require.main === module) {
  const setup = new GitHooksSetup();
  setup.setup().catch(console.error);
}

module.exports = GitHooksSetup;
