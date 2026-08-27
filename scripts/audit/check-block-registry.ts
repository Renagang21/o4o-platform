#!/usr/bin/env tsx
/**
 * Block Registry Audit Script
 * Scans filesystem for block definitions and compares with registered blocks
 *
 * Usage: npx tsx scripts/audit/check-block-registry.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** repository root — 이 스크립트는 `scripts/audit/` 에 있다. */
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1
 *
 * report 의 경로는 **repo root 기준 POSIX 경로**로만 기록한다.
 * 절대경로를 그대로 넣으면 실행 머신마다 report 전체가 달라진다
 * (`C:\Users\me\repo\x.ts` vs `/home/dev/repo/x.ts`).
 * 구분자도 `/` 로 통일해 Windows/Linux 출력이 같아지게 한다.
 *
 * sibling 인 check-shortcode-registry.ts 에 **같은 함수를 그대로** 둔다.
 * 공용 helper 로 추출하면 scripts/ 의 모듈 경계가 커져 이번 범위를 넘는다.
 */
function toRepoPath(absPath: string): string {
  return path.relative(PROJECT_ROOT, absPath).split(path.sep).join('/');
}

/**
 * 기본 출력은 **재실행해도 byte-identical** 이어야 한다.
 * 실행 시각이 필요한 경우에만 `--timestamp` 로 명시한다.
 */
const INCLUDE_TIMESTAMP = process.argv.includes('--timestamp');

interface BlockFile {
  filePath: string;
  fileName: string;
  blockName: string;
  category: string;
}

interface RegistryEntry {
  name: string;
  source: string;
}

interface AuditReport {
  /** `--timestamp` 를 준 실행에서만 존재한다. */
  timestamp?: string;
  foundBlocks: BlockFile[];
  registeredBlocks: RegistryEntry[];
  missingInRegistry: BlockFile[];
  danglingRegistryEntries: RegistryEntry[];
  summary: {
    totalFiles: number;
    totalRegistered: number;
    totalMissing: number;
    totalDangling: number;
  };
}

/**
 * Extract block name from file name
 * Examples:
 * - paragraph.tsx → o4o/paragraph
 * - heading.tsx → o4o/heading
 * - TimelineChart.definition.tsx → o4o/timeline-chart
 */
function fileNameToBlockName(fileName: string): string {
  // Remove extensions
  const baseName = fileName
    .replace(/\.definition\.tsx?$/, '')
    .replace(/\.tsx?$/, '');

  // Convert PascalCase to kebab-case
  const kebabCase = baseName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

  return `o4o/${kebabCase}`;
}

/**
 * Recursively find files in a directory
 */
function findFilesRecursive(dir: string, pattern: RegExp, exclude: RegExp[]): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  // readdirSync 순서는 파일시스템마다 다르다 — 정렬해 순회 순서를 고정한다.
  const files = fs.readdirSync(dir).sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip excluded patterns
    if (exclude.some(regex => regex.test(filePath))) {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(...findFilesRecursive(filePath, pattern, exclude));
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }

  return results;
}

/**
 * Find all block definition files in the project
 */
function findBlockFiles(): BlockFile[] {
  const projectRoot = path.join(__dirname, '../..');

  const searchDirs = [
    path.join(projectRoot, 'apps/admin-dashboard/src/blocks/definitions'),
    path.join(projectRoot, 'apps/admin-dashboard/src/blocks/generated'),
  ];

  const pattern = /\.(ts|tsx)$/;
  const exclude = [
    /\.test\.(ts|tsx)$/,
    /\.spec\.(ts|tsx)$/,
    /__tests__/,
    /\/dist\//,
    /\/node_modules\//,
    /\/types\.ts$/,
    /\/form-types\.ts$/,
    /\/useSlideAttributes\.ts$/,
    /\/SlideEditPanel\.tsx$/,
    /\/SlideBlock\.tsx$/,
    /\/SlidePreview\.tsx$/,
    /\/QueryControls\.tsx$/,
  ];

  const allFiles: BlockFile[] = [];

  for (const dir of searchDirs) {
    const files = findFilesRecursive(dir, pattern, exclude);

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check if file contains a block definition export
      if (
        content.includes('BlockDefinition') &&
        (content.includes('export default') || content.includes('export const'))
      ) {
        const blockName = fileNameToBlockName(fileName);

        // Try to extract category from file
        const categoryMatch = content.match(/category:\s*['"](\w+)['"]/);
        const category = categoryMatch ? categoryMatch[1] : 'unknown';

        allFiles.push({
          filePath: toRepoPath(filePath),
          fileName,
          blockName,
          category,
        });
      }
    }
  }

  return allFiles;
}

/**
 * Extract registered block names from the main registration file
 */
function findRegisteredBlocks(): RegistryEntry[] {
  const projectRoot = path.join(__dirname, '../..');
  const registrations: RegistryEntry[] = [];

  // Check main blocks index.ts
  const indexPath = path.join(
    projectRoot,
    'apps/admin-dashboard/src/blocks/index.ts'
  );

  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');

    // Extract import statements
    const importPattern = /import\s+(?:\{?\s*)?(\w+BlockDefinition)(?:\s*\}?)?\s+from\s+['"]([^'"]+)['"]/g;
    const importMatches = content.matchAll(importPattern);

    for (const match of importMatches) {
      const varName = match[1];

      // Convert variable name to block name
      // Example: paragraphBlockDefinition → o4o/paragraph
      const baseName = varName.replace(/BlockDefinition$/, '');
      const kebabCase = baseName
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
      const blockName = `o4o/${kebabCase}`;

      registrations.push({
        name: blockName,
        source: `apps/admin-dashboard/src/blocks/index.ts (${varName})`,
      });
    }
  }

  return registrations;
}

/**
 * Compare found files with registered blocks
 */
function analyzeRegistry(
  files: BlockFile[],
  registered: RegistryEntry[]
): {
  missing: BlockFile[];
  dangling: RegistryEntry[];
} {
  const registeredNames = new Set(registered.map(r => r.name));
  const fileNames = new Map(files.map(f => [f.blockName, f]));

  const missing: BlockFile[] = [];
  const dangling: RegistryEntry[] = [];

  // Find missing registrations
  for (const file of files) {
    if (!registeredNames.has(file.blockName)) {
      missing.push(file);
    }
  }

  // Find dangling registrations
  for (const reg of registered) {
    if (!fileNames.has(reg.name)) {
      dangling.push(reg);
    }
  }

  return { missing, dangling };
}

/**
 * Generate audit report
 */
function generateReport(): AuditReport {
  console.log('🔍 Scanning block definition files...');
  const files = findBlockFiles();
  console.log(`   Found ${files.length} block definition files`);

  console.log('📋 Extracting registered blocks...');
  const registered = findRegisteredBlocks();
  console.log(`   Found ${registered.length} registered blocks`);

  console.log('🔬 Analyzing registry...');
  const { missing, dangling } = analyzeRegistry(files, registered);

  const report: AuditReport = {
    ...(INCLUDE_TIMESTAMP ? { timestamp: new Date().toISOString() } : {}),
    foundBlocks: files,
    registeredBlocks: registered,
    missingInRegistry: missing,
    danglingRegistryEntries: dangling,
    summary: {
      totalFiles: files.length,
      totalRegistered: registered.length,
      totalMissing: missing.length,
      totalDangling: dangling.length,
    },
  };

  return report;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('═══════════════════════════════════════════════');
    console.log('  Block Registry Integrity Check');
    console.log('═══════════════════════════════════════════════\n');

    const report = generateReport();

    // Save report to JSON
    const reportPath = path.join(__dirname, 'block-registry-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved to: ${reportPath}`);

    // Print summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total definition files:    ${report.summary.totalFiles}`);
    console.log(`Total registered:          ${report.summary.totalRegistered}`);
    console.log(`Missing in registry:       ${report.summary.totalMissing}`);
    console.log(`Dangling registry entries: ${report.summary.totalDangling}`);

    // Print missing registrations
    if (report.missingInRegistry.length > 0) {
      console.log('\n⚠️  Missing Registrations:');
      for (const file of report.missingInRegistry) {
        console.log(`   - ${file.fileName} → ${file.blockName} (${file.category})`);
      }
    }

    // Print dangling entries
    if (report.danglingRegistryEntries.length > 0) {
      console.log('\n⚠️  Dangling Registry Entries (no file found):');
      for (const entry of report.danglingRegistryEntries) {
        console.log(`   - ${entry.name} (from ${entry.source})`);
      }
    }

    console.log('\n═══════════════════════════════════════════════\n');

    // Exit with error if issues found
    if (report.summary.totalMissing > 0 || report.summary.totalDangling > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during audit:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();

export { generateReport };
