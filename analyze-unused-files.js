#!/usr/bin/env node

/**
 * O4O Platform 미사용 파일 분석 스크립트
 * - 모든 TypeScript/React 파일을 검색
 * - import/export 관계를 분석
 * - 라우터에서 사용되는 파일들 추적
 * - 사용되지 않는 파일들 식별
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 분석할 앱들
const apps = [
  'apps/admin-dashboard',
  'apps/api-server',
  'apps/main-site',
  'apps/ecommerce',
  'apps/crowdfunding',
  'apps/forum',
  'apps/digital-signage'
];

// 파일 시스템 유틸리티
class FileAnalyzer {
  constructor() {
    this.allFiles = new Set();
    this.usedFiles = new Set();
    this.importGraph = new Map();
    this.routerFiles = [];
    this.entryPoints = [];
  }

  // 모든 TS/TSX 파일 수집
  async collectAllFiles() {
    console.log('📁 Collecting all TypeScript/React files...');
    
    for (const app of apps) {
      const appPath = path.join(process.cwd(), app);
      if (!fs.existsSync(appPath)) {
        console.log(`⚠️  App not found: ${app}`);
        continue;
      }

      // src 디렉토리의 모든 TS/TSX 파일
      const pattern = path.join(appPath, 'src/**/*.{ts,tsx}');
      const files = glob.sync(pattern);
      
      files.forEach(file => {
        const relativePath = path.relative(process.cwd(), file);
        this.allFiles.add(relativePath);
        
        // 엔트리 포인트 식별
        if (file.endsWith('main.tsx') || file.endsWith('index.ts') || file.endsWith('App.tsx') || file.endsWith('server.ts')) {
          this.entryPoints.push(relativePath);
        }
        
        // 라우터 파일 식별
        if (file.includes('router') || file.includes('Router') || file.includes('routes')) {
          this.routerFiles.push(relativePath);
        }
      });
    }
    
    console.log(`📊 Total files found: ${this.allFiles.size}`);
    console.log(`🚀 Entry points: ${this.entryPoints.length}`);
    console.log(`🛣️  Router files: ${this.routerFiles.length}`);
  }

  // 파일의 import/export 분석
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = [];
      const exports = [];

      // Import 문 찾기 (다양한 패턴)
      const importPatterns = [
        /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
        /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,  // dynamic imports
        /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g   // require
      ];

      importPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          imports.push(match[1]);
        }
      });

      // Export 문 찾기
      const exportPatterns = [
        /export\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
        /export\s*\*\s+from\s+['"`]([^'"`]+)['"`]/g
      ];

      exportPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          exports.push(match[1]);
        }
      });

      return { imports, exports };
    } catch (error) {
      console.log(`⚠️  Error reading file ${filePath}: ${error.message}`);
      return { imports: [], exports: [] };
    }
  }

  // import 경로를 실제 파일 경로로 해석
  resolveImportPath(importPath, fromFile) {
    // 절대 경로 (@/ 시작)
    if (importPath.startsWith('@/')) {
      const appDir = path.dirname(fromFile).split('/').slice(0, 2).join('/'); // apps/app-name
      const srcPath = importPath.replace('@/', `${appDir}/src/`);
      
      // .tsx, .ts 확장자 시도
      const candidates = [
        `${srcPath}.tsx`,
        `${srcPath}.ts`,
        `${srcPath}/index.tsx`,
        `${srcPath}/index.ts`
      ];
      
      for (const candidate of candidates) {
        if (this.allFiles.has(candidate)) {
          return candidate;
        }
      }
    }
    
    // 상대 경로
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const fromDir = path.dirname(fromFile);
      const resolvedPath = path.resolve(fromDir, importPath);
      const relativePath = path.relative(process.cwd(), resolvedPath);
      
      const candidates = [
        `${relativePath}.tsx`,
        `${relativePath}.ts`,
        `${relativePath}/index.tsx`,
        `${relativePath}/index.ts`
      ];
      
      for (const candidate of candidates) {
        if (this.allFiles.has(candidate)) {
          return candidate;
        }
      }
    }
    
    return null;
  }

  // 의존성 그래프 구축
  async buildDependencyGraph() {
    console.log('🔗 Building dependency graph...');
    
    for (const file of this.allFiles) {
      const { imports } = this.analyzeFile(file);
      const dependencies = [];
      
      for (const importPath of imports) {
        const resolvedPath = this.resolveImportPath(importPath, file);
        if (resolvedPath) {
          dependencies.push(resolvedPath);
        }
      }
      
      this.importGraph.set(file, dependencies);
    }
  }

  // 엔트리 포인트부터 사용되는 파일들 추적
  traceUsedFiles() {
    console.log('🔍 Tracing used files from entry points...');
    
    const visited = new Set();
    const queue = [...this.entryPoints, ...this.routerFiles];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (visited.has(current)) continue;
      visited.add(current);
      this.usedFiles.add(current);
      
      const dependencies = this.importGraph.get(current) || [];
      queue.push(...dependencies);
    }
  }

  // 결과 분석
  analyzeResults() {
    const unused = [];
    const testFiles = [];
    const legacyFiles = [];
    const backupFiles = [];
    
    for (const file of this.allFiles) {
      if (!this.usedFiles.has(file)) {
        unused.push(file);
        
        // 카테고리 분류
        if (file.includes('.test.') || file.includes('.spec.') || file.includes('/__tests__/') || file.includes('/test/')) {
          testFiles.push(file);
        } else if (file.includes('.backup') || file.includes('.old') || file.includes('-backup')) {
          backupFiles.push(file);
        } else if (file.includes('legacy') || file.includes('old') || file.includes('deprecated')) {
          legacyFiles.push(file);
        }
      }
    }
    
    return {
      total: this.allFiles.size,
      used: this.usedFiles.size,
      unused: unused.length,
      testFiles: testFiles.length,
      legacyFiles: legacyFiles.length,
      backupFiles: backupFiles.length,
      unusedFiles: unused,
      unusedTestFiles: testFiles,
      unusedLegacyFiles: legacyFiles,
      unusedBackupFiles: backupFiles
    };
  }

  // 리포트 생성
  generateReport(results) {
    console.log('\n🎯 ANALYSIS RESULTS');
    console.log('='.repeat(50));
    console.log(`📁 Total files: ${results.total}`);
    console.log(`✅ Used files: ${results.used}`);
    console.log(`❌ Unused files: ${results.unused}`);
    console.log(`🧪 Unused test files: ${results.testFiles}`);
    console.log(`📚 Unused legacy files: ${results.legacyFiles}`);
    console.log(`💾 Unused backup files: ${results.backupFiles}`);
    console.log(`📈 Usage rate: ${((results.used / results.total) * 100).toFixed(1)}%`);
    
    console.log('\n🗑️  UNUSED FILES BY CATEGORY');
    console.log('='.repeat(50));
    
    if (results.unusedBackupFiles.length > 0) {
      console.log('\n📁 BACKUP FILES (Safe to delete):');
      results.unusedBackupFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (results.unusedTestFiles.length > 0) {
      console.log('\n🧪 TEST FILES:');
      results.unusedTestFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (results.unusedLegacyFiles.length > 0) {
      console.log('\n📚 LEGACY FILES:');
      results.unusedLegacyFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    // 일반 사용되지 않는 파일들
    const regularUnused = results.unusedFiles.filter(file => 
      !results.unusedTestFiles.includes(file) &&
      !results.unusedLegacyFiles.includes(file) &&
      !results.unusedBackupFiles.includes(file)
    );
    
    if (regularUnused.length > 0) {
      console.log('\n⚠️  OTHER UNUSED FILES (Review needed):');
      regularUnused.forEach(file => console.log(`  - ${file}`));
    }
    
    // 파일 크기 추정
    let totalSize = 0;
    results.unusedFiles.forEach(file => {
      try {
        const stats = fs.statSync(file);
        totalSize += stats.size;
      } catch (error) {
        // File might not exist
      }
    });
    
    console.log(`\n💽 Estimated space savings: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      ...results,
      regularUnused,
      estimatedSavings: totalSize
    };
  }
}

// 메인 실행
async function main() {
  console.log('🚀 O4O Platform Unused Files Analysis');
  console.log('='.repeat(50));
  
  const analyzer = new FileAnalyzer();
  
  try {
    await analyzer.collectAllFiles();
    await analyzer.buildDependencyGraph();
    analyzer.traceUsedFiles();
    
    const results = analyzer.analyzeResults();
    const report = analyzer.generateReport(results);
    
    // JSON 리포트 저장
    const reportPath = 'unused-files-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { FileAnalyzer };