const fs = require('fs');
const path = require('path');

function getMarkdownFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      getMarkdownFiles(fullPath, files);
    } else if (item.isFile() && item.name.endsWith('.md')) {
      files.push(fullPath);
    }
  });
  return files;
}

function analyzeMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  
  let maxDepth = 0;
  let codeBlocks = 0;
  
  lines.forEach(line => {
    const headingMatch = line.match(/^(#+)/);
    if (headingMatch) {
      maxDepth = Math.max(maxDepth, headingMatch[1].length);
    }
    if (line.trim().startsWith('```')) {
      codeBlocks++;
    }
  });
  
  codeBlocks = Math.floor(codeBlocks / 2);
  const readTime = Math.ceil(lineCount / 50);
  
  return { lineCount, maxDepth, codeBlocks, readTime };
}

const files = getMarkdownFiles('docs');
const results = files.map(f => {
  const relPath = f.replace(/\/g, '/').replace(/.*docs[/]/i, '');
  return {
    path: relPath,
    ...analyzeMarkdown(f)
  };
}).sort((a,b) => a.path.localeCompare(b.path));

console.log(JSON.stringify(results, null, 2));
