#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const docsDir = '/home/sohae21/o4o-platform/docs';

function getAllMarkdownFiles(dir, baseDir = dir) {
  const files = [];

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.md')) {
        const relativePath = path.relative(baseDir, fullPath);
        const category = path.dirname(relativePath);

        // 첫 번째 # 제목 추출
        const content = fs.readFileSync(fullPath, 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : item.replace('.md', '');

        files.push({
          fullPath,
          relativePath,
          category: category === '.' ? 'root' : category,
          filename: item,
          title,
          size: stat.size
        });
      }
    }
  }

  traverse(dir);
  return files;
}

const files = getAllMarkdownFiles(docsDir);

console.log(`총 ${files.length}개의 마크다운 파일 발견\n`);

// 카테고리별로 그룹화
const byCategory = {};
files.forEach(file => {
  if (!byCategory[file.category]) {
    byCategory[file.category] = [];
  }
  byCategory[file.category].push(file);
});

// 카테고리별 출력
console.log('📁 카테고리별 파일 개수:');
Object.keys(byCategory).sort().forEach(category => {
  console.log(`  ${category}: ${byCategory[category].length}개`);
});

console.log('\n📄 파일 목록 샘플 (처음 10개):');
files.slice(0, 10).forEach(file => {
  console.log(`  - [${file.category}] ${file.title}`);
  console.log(`    파일: ${file.filename}`);
});

// JSON 출력
fs.writeFileSync(
  '/home/sohae21/o4o-platform/scripts/docs-files.json',
  JSON.stringify(files, null, 2)
);

console.log('\n✅ 전체 목록을 scripts/docs-files.json에 저장했습니다.');
