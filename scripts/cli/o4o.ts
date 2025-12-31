#!/usr/bin/env node
// O4O Platform Generator CLI
// Phase 13: 인터랙티브 생성 파이프라인
//
// 사용법:
// npx tsx scripts/cli/o4o.ts generate
// npx tsx scripts/cli/o4o.ts generate --dry-run
// npx tsx scripts/cli/o4o.ts generate --force

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';

// ============================================================================
// Configuration
// ============================================================================

const SERVICES_DIR = 'docs/services';
const PAGES_DIR = 'apps/admin-dashboard/src/pages';
const GENERATORS = {
  types: 'scripts/generators/openapi-types-generator.ts',
  web: 'scripts/generators/web-extension-generator.ts',
  admin: 'scripts/generators/web-admin-generator.ts',
};

// Lucide icon suggestions
const ICON_SUGGESTIONS: Record<string, string> = {
  products: 'Package',
  brands: 'Award',
  posts: 'MessageSquare',
  members: 'Users',
  orders: 'ShoppingCart',
  categories: 'FolderTree',
  settings: 'Settings',
  default: 'FileText',
};

// ============================================================================
// Types
// ============================================================================

interface ServiceInfo {
  name: string;
  displayName: string;
  openapiPath: string;
  entities: EntityInfo[];
}

interface EntityInfo {
  name: string;
  plural: string;
  singular: string;
  hasAdminEndpoints: boolean;
  endpoints: string[];
}

interface GenerationConfig {
  business: string;
  entity: string;
  displayName: string;
  icon: string;
  generateWeb: boolean;
  generateAdmin: boolean;
  dryRun: boolean;
  force: boolean;
}

interface GenerationResult {
  success: boolean;
  filesGenerated: string[];
  errors: string[];
}

// ============================================================================
// Readline Interface
// ============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function promptSelect(question: string, options: string[]): Promise<number> {
  return new Promise(async (resolve) => {
    console.log(`\n${question}`);
    options.forEach((opt, i) => {
      console.log(`  ${i + 1}. ${opt}`);
    });
    const answer = await prompt(`선택 (1-${options.length}): `);
    const index = parseInt(answer, 10) - 1;
    if (index >= 0 && index < options.length) {
      resolve(index);
    } else {
      console.log('잘못된 선택입니다. 다시 선택해주세요.');
      resolve(await promptSelect(question, options));
    }
  });
}

function promptYesNo(question: string, defaultYes = true): Promise<boolean> {
  return new Promise(async (resolve) => {
    const hint = defaultYes ? '[Y/n]' : '[y/N]';
    const answer = await prompt(`${question} ${hint}: `);
    if (answer === '') {
      resolve(defaultYes);
    } else {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    }
  });
}

// ============================================================================
// Service Discovery
// ============================================================================

function discoverServices(): ServiceInfo[] {
  const servicesPath = path.resolve(process.cwd(), SERVICES_DIR);
  const services: ServiceInfo[] = [];

  if (!fs.existsSync(servicesPath)) {
    return services;
  }

  const entries = fs.readdirSync(servicesPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const serviceName = entry.name;
    const openapiPath = path.join(servicesPath, serviceName, 'openapi.yaml');

    if (fs.existsSync(openapiPath)) {
      const entities = extractEntities(openapiPath);
      services.push({
        name: serviceName,
        displayName: capitalize(serviceName),
        openapiPath,
        entities,
      });
    }
  }

  return services;
}

function extractEntities(openapiPath: string): EntityInfo[] {
  const content = fs.readFileSync(openapiPath, 'utf-8');
  const entities: Map<string, EntityInfo> = new Map();

  // Extract paths from OpenAPI
  const pathMatches = content.matchAll(/^\s*["']?\/\w+\/(\w+)/gm);

  for (const match of pathMatches) {
    const entityName = match[1];
    if (entityName === 'admin' || entityName === 'health') continue;

    if (!entities.has(entityName)) {
      entities.set(entityName, {
        name: entityName,
        plural: entityName,
        singular: toSingular(entityName),
        hasAdminEndpoints: content.includes(`/admin/${entityName}`),
        endpoints: [],
      });
    }

    const entity = entities.get(entityName)!;
    entity.endpoints.push(match[0].trim());
  }

  return Array.from(entities.values());
}

// ============================================================================
// Generation Pipeline
// ============================================================================

function checkExistingDirectory(config: GenerationConfig): string | null {
  const webDir = path.join(PAGES_DIR, `${config.business}-${config.entity}`);
  const adminDir = path.join(PAGES_DIR, `${config.business}-${config.entity}-admin`);

  const existing: string[] = [];
  if (config.generateWeb && fs.existsSync(webDir)) {
    existing.push(webDir);
  }
  if (config.generateAdmin && fs.existsSync(adminDir)) {
    existing.push(adminDir);
  }

  if (existing.length > 0) {
    return existing.join(', ');
  }
  return null;
}

function generateTypes(config: GenerationConfig): GenerationResult {
  const result: GenerationResult = { success: false, filesGenerated: [], errors: [] };

  console.log('\n📦 Phase 1: OpenAPI → Types 생성');

  if (config.dryRun) {
    console.log(`   [DRY-RUN] Would generate: packages/api-types/src/${config.business}.ts`);
    result.success = true;
    result.filesGenerated.push(`packages/api-types/src/${config.business}.ts`);
    return result;
  }

  try {
    execSync(`npx tsx ${GENERATORS.types} --service=${config.business}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    result.success = true;
    result.filesGenerated.push(`packages/api-types/src/${config.business}.ts`);
  } catch (error: any) {
    result.errors.push(`Types generation failed: ${error.message}`);
  }

  return result;
}

function generateWeb(config: GenerationConfig): GenerationResult {
  const result: GenerationResult = { success: false, filesGenerated: [], errors: [] };

  if (!config.generateWeb) {
    result.success = true;
    return result;
  }

  console.log('\n📄 Phase 2: Web (List/Detail) 생성');

  const outputDir = `${PAGES_DIR}/${config.business}-${config.entity}`;

  if (config.dryRun) {
    console.log(`   [DRY-RUN] Would generate:`);
    console.log(`     - ${outputDir}/${capitalize(config.business)}${capitalize(config.entity)}Router.tsx`);
    console.log(`     - ${outputDir}/${capitalize(toSingular(config.entity))}ListPage.tsx`);
    console.log(`     - ${outputDir}/${capitalize(toSingular(config.entity))}DetailPage.tsx`);
    console.log(`     - ${outputDir}/types.ts`);
    console.log(`     - ${outputDir}/api.ts`);
    console.log(`     - ${outputDir}/index.ts`);
    result.success = true;
    result.filesGenerated.push(outputDir);
    return result;
  }

  try {
    const cmd = `npx tsx ${GENERATORS.web} --business=${config.business} --entity=${config.entity} --displayName="${config.displayName}" --icon=${config.icon}`;
    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    result.success = true;
    result.filesGenerated.push(outputDir);
  } catch (error: any) {
    result.errors.push(`Web generation failed: ${error.message}`);
  }

  return result;
}

function generateAdmin(config: GenerationConfig): GenerationResult {
  const result: GenerationResult = { success: false, filesGenerated: [], errors: [] };

  if (!config.generateAdmin) {
    result.success = true;
    return result;
  }

  console.log('\n🔧 Phase 3: Admin (Create/Edit/Status) 생성');

  const outputDir = `${PAGES_DIR}/${config.business}-${config.entity}-admin`;

  if (config.dryRun) {
    console.log(`   [DRY-RUN] Would generate:`);
    console.log(`     - ${outputDir}/${capitalize(config.business)}${capitalize(config.entity)}AdminRouter.tsx`);
    console.log(`     - ${outputDir}/${capitalize(toSingular(config.entity))}CreatePage.tsx`);
    console.log(`     - ${outputDir}/${capitalize(toSingular(config.entity))}EditPage.tsx`);
    console.log(`     - ${outputDir}/${capitalize(toSingular(config.entity))}StatusPage.tsx`);
    console.log(`     - ${outputDir}/formSchema.ts`);
    console.log(`     - ${outputDir}/types.ts`);
    console.log(`     - ${outputDir}/api.ts`);
    console.log(`     - ${outputDir}/index.ts`);
    result.success = true;
    result.filesGenerated.push(outputDir);
    return result;
  }

  try {
    const cmd = `npx tsx ${GENERATORS.admin} --business=${config.business} --entity=${config.entity} --displayName="${config.displayName}" --icon=${config.icon}`;
    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    result.success = true;
    result.filesGenerated.push(outputDir);
  } catch (error: any) {
    result.errors.push(`Admin generation failed: ${error.message}`);
  }

  return result;
}

// ============================================================================
// Interactive Flow
// ============================================================================

async function runInteractiveGenerate(dryRun: boolean, force: boolean): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          O4O Platform Generator CLI (Phase 13)             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (dryRun) {
    console.log('\n⚠️  DRY-RUN 모드: 실제 파일이 생성되지 않습니다.\n');
  }

  // Step 1: Discover services
  const services = discoverServices();

  if (services.length === 0) {
    console.log('\n❌ 서비스를 찾을 수 없습니다.');
    console.log('   docs/services/{service}/openapi.yaml 파일이 필요합니다.');
    rl.close();
    process.exit(1);
  }

  // Step 2: Select business
  const businessIndex = await promptSelect(
    '📁 Business 선택:',
    services.map(s => `${s.name} (${s.entities.length} entities)`)
  );
  const selectedService = services[businessIndex];

  console.log(`\n   선택된 Business: ${selectedService.name}`);
  console.log(`   OpenAPI: ${selectedService.openapiPath}`);

  // Step 3: Select entity
  if (selectedService.entities.length === 0) {
    console.log('\n❌ 엔티티를 찾을 수 없습니다.');
    rl.close();
    process.exit(1);
  }

  const entityIndex = await promptSelect(
    '📦 Entity 선택:',
    selectedService.entities.map(e =>
      `${e.name}${e.hasAdminEndpoints ? ' (Admin 지원)' : ''}`
    )
  );
  const selectedEntity = selectedService.entities[entityIndex];

  // Step 4: Generation options
  console.log('\n📋 생성 옵션:');

  const generateWeb = await promptYesNo('   Web (List/Detail) 페이지 생성?', true);
  const generateAdmin = selectedEntity.hasAdminEndpoints
    ? await promptYesNo('   Admin (Create/Edit/Status) 페이지 생성?', true)
    : false;

  if (!generateWeb && !generateAdmin) {
    console.log('\n⚠️  생성할 항목이 없습니다.');
    rl.close();
    return;
  }

  // Step 5: Display info
  const defaultDisplayName = `${selectedService.displayName} ${capitalize(toSingular(selectedEntity.name))}`;
  const displayNameInput = await prompt(`\n📝 Display Name [${defaultDisplayName}]: `);
  const displayName = displayNameInput || defaultDisplayName;

  const defaultIcon = ICON_SUGGESTIONS[selectedEntity.name] || ICON_SUGGESTIONS.default;
  const iconInput = await prompt(`🎨 Lucide Icon [${defaultIcon}]: `);
  const icon = iconInput || defaultIcon;

  // Build config
  const config: GenerationConfig = {
    business: selectedService.name,
    entity: selectedEntity.plural,
    displayName,
    icon,
    generateWeb,
    generateAdmin,
    dryRun,
    force,
  };

  // Step 6: Check existing directories
  const existingDir = checkExistingDirectory(config);
  if (existingDir && !force) {
    console.log(`\n⚠️  이미 존재하는 디렉터리가 있습니다:`);
    console.log(`   ${existingDir}`);
    console.log(`\n   --force 옵션으로 덮어쓰기할 수 있습니다.`);

    const proceed = await promptYesNo('   계속 진행하시겠습니까?', false);
    if (!proceed) {
      console.log('\n❌ 생성이 취소되었습니다.');
      rl.close();
      return;
    }
  }

  // Step 7: Preview
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 생성 미리보기');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Business:     ${config.business}`);
  console.log(`   Entity:       ${config.entity}`);
  console.log(`   Display Name: ${config.displayName}`);
  console.log(`   Icon:         ${config.icon}`);
  console.log(`   Web 생성:     ${config.generateWeb ? '✅' : '❌'}`);
  console.log(`   Admin 생성:   ${config.generateAdmin ? '✅' : '❌'}`);

  console.log('\n   실행될 Generator:');
  console.log('   1. openapi-types-generator.ts (Types)');
  if (config.generateWeb) {
    console.log('   2. web-extension-generator.ts (Web List/Detail)');
  }
  if (config.generateAdmin) {
    console.log(`   ${config.generateWeb ? '3' : '2'}. web-admin-generator.ts (Admin Create/Edit/Status)`);
  }

  // Step 8: Confirm
  console.log('');
  const confirm = await promptYesNo('🚀 생성을 시작하시겠습니까?', true);

  if (!confirm) {
    console.log('\n❌ 생성이 취소되었습니다.');
    rl.close();
    return;
  }

  // Step 9: Execute
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔄 생성 시작');
  console.log('═══════════════════════════════════════════════════════════════');

  const results: GenerationResult[] = [];
  const allFiles: string[] = [];
  const allErrors: string[] = [];

  // Generate Types
  const typesResult = generateTypes(config);
  results.push(typesResult);
  allFiles.push(...typesResult.filesGenerated);
  allErrors.push(...typesResult.errors);

  if (!typesResult.success) {
    console.log('\n❌ Types 생성 실패. 중단합니다.');
    rl.close();
    process.exit(1);
  }

  // Generate Web
  if (config.generateWeb) {
    const webResult = generateWeb(config);
    results.push(webResult);
    allFiles.push(...webResult.filesGenerated);
    allErrors.push(...webResult.errors);

    if (!webResult.success) {
      console.log('\n❌ Web 생성 실패. 중단합니다.');
      rl.close();
      process.exit(1);
    }
  }

  // Generate Admin
  if (config.generateAdmin) {
    const adminResult = generateAdmin(config);
    results.push(adminResult);
    allFiles.push(...adminResult.filesGenerated);
    allErrors.push(...adminResult.errors);

    if (!adminResult.success) {
      console.log('\n❌ Admin 생성 실패.');
    }
  }

  // Step 10: Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✨ 생성 완료');
  console.log('═══════════════════════════════════════════════════════════════');

  console.log('\n📁 생성된 파일/디렉터리:');
  allFiles.forEach(f => console.log(`   - ${f}`));

  if (allErrors.length > 0) {
    console.log('\n⚠️  오류:');
    allErrors.forEach(e => console.log(`   - ${e}`));
  }

  console.log('\n📌 다음 단계:');
  console.log('   1. App.tsx에 Router 등록');
  if (config.generateWeb) {
    console.log(`      const ${capitalize(config.business)}${capitalize(config.entity)}Router = React.lazy(`);
    console.log(`        () => import('./pages/${config.business}-${config.entity}/${capitalize(config.business)}${capitalize(config.entity)}Router')`);
    console.log(`      );`);
  }
  if (config.generateAdmin) {
    console.log(`      const ${capitalize(config.business)}${capitalize(config.entity)}AdminRouter = React.lazy(`);
    console.log(`        () => import('./pages/${config.business}-${config.entity}-admin/${capitalize(config.business)}${capitalize(config.entity)}AdminRouter')`);
    console.log(`      );`);
  }
  console.log('   2. API 서버가 해당 엔드포인트를 지원하는지 확인');
  console.log('   3. pnpm run dev:admin으로 확인');

  rl.close();
}

// ============================================================================
// CLI Commands
// ============================================================================

async function showHelp(): Promise<void> {
  console.log(`
O4O Platform Generator CLI

사용법:
  npx tsx scripts/cli/o4o.ts <command> [options]

Commands:
  generate    인터랙티브 모드로 Web/Admin 페이지 생성

Options:
  --dry-run   실제 파일을 생성하지 않고 미리보기만 표시
  --force     기존 디렉터리 존재 시 덮어쓰기
  --help      도움말 표시

Examples:
  npx tsx scripts/cli/o4o.ts generate
  npx tsx scripts/cli/o4o.ts generate --dry-run
  npx tsx scripts/cli/o4o.ts generate --force

Phase 10~12 Generator를 순차 실행하여 Web/Admin 페이지를 생성합니다.
`);
}

// ============================================================================
// Utility Functions
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toSingular(plural: string): string {
  if (plural.endsWith('ies')) {
    return plural.slice(0, -3) + 'y';
  }
  if (plural.endsWith('es')) {
    return plural.slice(0, -2);
  }
  if (plural.endsWith('s')) {
    return plural.slice(0, -1);
  }
  return plural;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const help = args.includes('--help') || args.includes('-h');

  if (help || !command) {
    await showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'generate':
      await runInteractiveGenerate(dryRun, force);
      break;
    default:
      console.log(`❌ Unknown command: ${command}`);
      await showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
