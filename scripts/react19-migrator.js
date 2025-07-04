#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class React19Migrator {
  constructor(srcPath) {
    this.srcPath = srcPath;
    this.changes = [];
    this.backupDir = path.join(process.cwd(), 'react19-migration-backup');
  }

  // 백업 디렉토리 생성
  createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    console.log(`✅ 백업 디렉토리 생성: ${this.backupDir}`);
  }

  // 모든 TSX 파일 찾기
  findTsxFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.findTsxFiles(fullPath, files);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // React.FC 패턴 변환
  convertReactFC(content, filePath) {
    let modified = false;
    
    // 패턴 1: const Component: React.FC<Props> = ({ ...props }) => {
    const fcPattern1 = /const\s+(\w+):\s*React\.FC<([^>]+)>\s*=\s*\(([^)]*)\)\s*=>/g;
    content = content.replace(fcPattern1, (match, componentName, propsType, params) => {
      modified = true;
      return `const ${componentName} = (${params}: ${propsType}) =>`;
    });

    // 패턴 2: const Component: React.FC = ({ ...props }) => {
    const fcPattern2 = /const\s+(\w+):\s*React\.FC\s*=\s*\(([^)]*)\)\s*=>/g;
    content = content.replace(fcPattern2, (match, componentName, params) => {
      modified = true;
      return `const ${componentName} = (${params}) =>`;
    });

    // 패턴 3: export const Component: React.FC<Props> = ({ ...props }) => {
    const fcPattern3 = /export\s+const\s+(\w+):\s*React\.FC<([^>]+)>\s*=\s*\(([^)]*)\)\s*=>/g;
    content = content.replace(fcPattern3, (match, componentName, propsType, params) => {
      modified = true;
      return `export const ${componentName} = (${params}: ${propsType}) =>`;
    });

    // 패턴 4: export const Component: React.FC = ({ ...props }) => {
    const fcPattern4 = /export\s+const\s+(\w+):\s*React\.FC\s*=\s*\(([^)]*)\)\s*=>/g;
    content = content.replace(fcPattern4, (match, componentName, params) => {
      modified = true;
      return `export const ${componentName} = (${params}) =>`;
    });

    if (modified) {
      this.changes.push({
        file: filePath,
        type: 'React.FC 제거',
        description: 'React.FC 타입을 제거하고 일반 함수형 컴포넌트로 변환'
      });
    }

    return content;
  }

  // React import 정리
  cleanupReactImports(content, filePath) {
    let modified = false;
    
    // React에서 FC import 제거
    const importPattern = /import\s+React(?:,\s*{([^}]+)})?\s+from\s+['"]react['"];?/g;
    content = content.replace(importPattern, (match, namedImports) => {
      if (namedImports) {
        // FC를 제거하고 다른 import들은 유지
        const imports = namedImports
          .split(',')
          .map(imp => imp.trim())
          .filter(imp => !imp.includes('FC'))
          .join(', ');
        
        if (imports.length > 0) {
          modified = true;
          return `import React, { ${imports} } from 'react';`;
        } else {
          modified = true;
          return `import React from 'react';`;
        }
      }
      return match;
    });

    if (modified) {
      this.changes.push({
        file: filePath,
        type: 'Import 정리',
        description: 'React에서 FC import 제거'
      });
    }

    return content;
  }

  // forwardRef 패턴 업데이트 (React 19에서는 ref가 자동으로 forwarded됨)
  updateForwardRef(content, filePath) {
    let modified = false;
    
    // forwardRef 패턴 감지하고 코멘트 추가
    if (content.includes('forwardRef')) {
      // 복잡한 변환이므로 일단 코멘트만 추가
      content = `// TODO: React 19 - forwardRef는 더 이상 필요하지 않을 수 있습니다. ref prop이 자동으로 forwarded됩니다.\n${content}`;
      modified = true;
      
      this.changes.push({
        file: filePath,
        type: 'forwardRef 검토 필요',
        description: 'React 19에서 forwardRef 패턴 검토 필요'
      });
    }

    return content;
  }

  // 파일 백업
  backupFile(filePath) {
    const relativePath = path.relative(this.srcPath, filePath);
    const backupPath = path.join(this.backupDir, relativePath);
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, backupPath);
  }

  // 단일 파일 마이그레이션
  migrateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    // 백업 생성
    this.backupFile(filePath);

    // 변환 적용
    newContent = this.convertReactFC(newContent, filePath);
    newContent = this.cleanupReactImports(newContent, filePath);
    newContent = this.updateForwardRef(newContent, filePath);

    // 변경사항이 있으면 파일 저장
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ 변환 완료: ${path.relative(this.srcPath, filePath)}`);
    }
  }

  // 전체 마이그레이션 실행
  async migrate() {
    console.log('🚀 React 19 마이그레이션 시작...\n');
    
    this.createBackup();
    
    const tsxFiles = this.findTsxFiles(this.srcPath);
    console.log(`📁 발견된 파일: ${tsxFiles.length}개\n`);

    let processedCount = 0;
    for (const file of tsxFiles) {
      this.migrateFile(file);
      processedCount++;
      
      // 진행률 표시
      if (processedCount % 10 === 0) {
        console.log(`📊 진행률: ${processedCount}/${tsxFiles.length} (${Math.round(processedCount/tsxFiles.length*100)}%)`);
      }
    }

    console.log('\n✨ 마이그레이션 완료!\n');
    
    // 변경사항 요약
    this.printSummary();
  }

  // 변경사항 요약 출력
  printSummary() {
    console.log('📋 변경사항 요약:');
    console.log('='.repeat(50));
    
    const groupedChanges = {};
    this.changes.forEach(change => {
      if (!groupedChanges[change.type]) {
        groupedChanges[change.type] = [];
      }
      groupedChanges[change.type].push(change);
    });

    Object.keys(groupedChanges).forEach(type => {
      console.log(`\n🔧 ${type}: ${groupedChanges[type].length}개 파일`);
      groupedChanges[type].slice(0, 5).forEach(change => {
        console.log(`   - ${path.relative(process.cwd(), change.file)}`);
      });
      if (groupedChanges[type].length > 5) {
        console.log(`   ... 및 ${groupedChanges[type].length - 5}개 파일 더`);
      }
    });

    console.log(`\n📁 백업 위치: ${this.backupDir}`);
    console.log('\n⚠️  다음 단계:');
    console.log('   1. npm run type-check 실행');
    console.log('   2. npm run build 실행');
    console.log('   3. 테스트 실행');
    console.log('   4. forwardRef 사용 파일들 수동 검토');
  }

  // 롤백 기능
  rollback() {
    console.log('🔄 변경사항 롤백 중...');
    
    if (!fs.existsSync(this.backupDir)) {
      console.log('❌ 백업 디렉토리를 찾을 수 없습니다.');
      return;
    }

    const backupFiles = this.findTsxFiles(this.backupDir);
    
    for (const backupFile of backupFiles) {
      const relativePath = path.relative(this.backupDir, backupFile);
      const originalPath = path.join(this.srcPath, relativePath);
      
      if (fs.existsSync(originalPath)) {
        fs.copyFileSync(backupFile, originalPath);
        console.log(`↩️  복원: ${relativePath}`);
      }
    }

    console.log('✅ 롤백 완료');
  }
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const srcPath = args[1] || './src';

  const migrator = new React19Migrator(srcPath);

  switch (command) {
    case 'migrate':
      migrator.migrate();
      break;
    case 'rollback':
      migrator.rollback();
      break;
    default:
      console.log(`
🚀 React 19 마이그레이션 도구

사용법:
  node react19-migrator.js migrate [src경로]   # 마이그레이션 실행
  node react19-migrator.js rollback          # 변경사항 롤백

예시:
  node react19-migrator.js migrate ./src
  node react19-migrator.js rollback
      `);
      break;
  }
}

module.exports = React19Migrator;