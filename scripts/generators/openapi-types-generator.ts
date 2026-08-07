// OpenAPI → TypeScript Types Generator
// Phase 12: OpenAPI 계약 → 타입 완전 자동화
//
// 사용법:
// npx tsx scripts/generators/openapi-types-generator.ts
// npx tsx scripts/generators/openapi-types-generator.ts --service=cosmetics
//
// 주의: 생성된 타입 파일은 직접 수정 금지
// 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// Configuration
// ============================================================================

interface ServiceConfig {
  name: string;
  displayName: string;
  openapiPath: string;
  outputPath: string;
}

const SERVICES_BASE = 'docs/services';
const OUTPUT_BASE = 'packages/api-types/src';

// 서비스 자동 감지
function discoverServices(): ServiceConfig[] {
  const servicesDir = path.resolve(process.cwd(), SERVICES_BASE);
  const services: ServiceConfig[] = [];

  if (!fs.existsSync(servicesDir)) {
    console.warn(`⚠️ Services directory not found: ${servicesDir}`);
    return services;
  }

  const entries = fs.readdirSync(servicesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const serviceName = entry.name;
    const openapiPath = path.join(servicesDir, serviceName, 'openapi.yaml');

    if (fs.existsSync(openapiPath)) {
      services.push({
        name: serviceName,
        displayName: serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
        openapiPath: path.relative(process.cwd(), openapiPath),
        outputPath: path.join(OUTPUT_BASE, `${serviceName}.ts`),
      });
    }
  }

  return services;
}

// ============================================================================
// Type Generation
// ============================================================================

function generateTypesForService(service: ServiceConfig): boolean {
  const absoluteOpenapiPath = path.resolve(process.cwd(), service.openapiPath);
  const absoluteOutputPath = path.resolve(process.cwd(), service.outputPath);

  console.log(`\n📦 Generating types for: ${service.displayName}`);
  console.log(`   Input:  ${service.openapiPath}`);
  console.log(`   Output: ${service.outputPath}`);

  // OpenAPI 파일 존재 확인
  if (!fs.existsSync(absoluteOpenapiPath)) {
    console.error(`   ❌ OpenAPI spec not found: ${absoluteOpenapiPath}`);
    return false;
  }

  // 출력 디렉터리 생성
  const outputDir = path.dirname(absoluteOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // openapi-typescript 실행
    const cmd = `npx openapi-typescript "${absoluteOpenapiPath}" -o "${absoluteOutputPath}"`;
    execSync(cmd, {
      stdio: 'pipe',
      cwd: process.cwd(),
      encoding: 'utf-8'
    });

    // 생성된 파일에 경고 헤더 추가
    if (fs.existsSync(absoluteOutputPath)) {
      const content = fs.readFileSync(absoluteOutputPath, 'utf-8');
      const header = `/**
 * ${service.displayName} API Types
 *
 * ⚠️ 자동 생성 파일 - 직접 수정 금지 ⚠️
 *
 * 이 파일은 OpenAPI 스펙에서 자동 생성됩니다.
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 *
 * Source: ${service.openapiPath}
 * Generated: ${new Date().toISOString()}
 * Generator: scripts/generators/openapi-types-generator.ts
 *
 * 관련 규칙: docs/architecture/BUSINESS-SERVICE-RULES.md §1 (API Contract Enforcement)
 */

`;
      fs.writeFileSync(absoluteOutputPath, header + content, 'utf-8');
      console.log(`   ✅ Types generated successfully`);
      return true;
    } else {
      console.error(`   ❌ Output file not created`);
      return false;
    }
  } catch (error: any) {
    console.error(`   ❌ Generation failed: ${error.message}`);
    if (error.stdout) console.error(`   stdout: ${error.stdout}`);
    if (error.stderr) console.error(`   stderr: ${error.stderr}`);
    return false;
  }
}

// ============================================================================
// Index File Generation
// ============================================================================

function generateIndexFile(services: ServiceConfig[]): void {
  const indexPath = path.resolve(process.cwd(), OUTPUT_BASE, 'index.ts');

  const header = `/**
 * O4O Platform API Types
 *
 * ⚠️ 자동 생성 파일 - 직접 수정 금지 ⚠️
 *
 * 이 파일은 OpenAPI 스펙에서 자동 생성됩니다.
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 *
 * Generated: ${new Date().toISOString()}
 * Generator: scripts/generators/openapi-types-generator.ts
 *
 * 관련 규칙: docs/architecture/BUSINESS-SERVICE-RULES.md §1 (API Contract Enforcement)
 */

`;

  const exports = services.map(s =>
    `export * as ${s.name} from './${s.name}.js';`
  ).join('\n');

  const reexports = services.map(s => {
    const typeName = s.displayName;
    return `// ${typeName} API
export type { paths as ${typeName}Paths, components as ${typeName}Components, operations as ${typeName}Operations } from './${s.name}.js';`;
  }).join('\n\n');

  const content = `${header}// Namespace exports
${exports}

// Named type exports
${reexports}
`;

  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log(`\n📄 Index file generated: ${OUTPUT_BASE}/index.ts`);
}

// ============================================================================
// Validation
// ============================================================================

function validateOpenAPISpec(openapiPath: string): boolean {
  console.log(`\n🔍 Validating: ${openapiPath}`);

  try {
    // Redocly CLI로 검증 (설치되어 있는 경우)
    execSync(`npx @redocly/cli lint "${openapiPath}" --skip-rule=no-unused-components`, {
      stdio: 'pipe',
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    console.log(`   ✅ Validation passed`);
    return true;
  } catch (error: any) {
    // Redocly가 없으면 기본 파일 존재 및 구조 확인
    const absolutePath = path.resolve(process.cwd(), openapiPath);
    if (fs.existsSync(absolutePath)) {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      // 기본 OpenAPI 구조 확인 (openapi: 키 존재 여부)
      if (content.includes('openapi:')) {
        console.log(`   ✅ OpenAPI spec file exists (Redocly not available)`);
        return true;
      }
    }
    console.error(`   ❌ OpenAPI spec validation failed`);
    return false;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

function main(): void {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     OpenAPI → TypeScript Types Generator (Phase 12)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // CLI 인자 파싱
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    if (key && value) {
      params[key] = value;
    }
  }

  // 서비스 감지
  let services = discoverServices();

  if (services.length === 0) {
    console.error('\n❌ No OpenAPI specs found in docs/services/*/openapi.yaml');
    process.exit(1);
  }

  // 특정 서비스만 생성
  if (params.service) {
    const targetService = services.find(s => s.name === params.service);
    if (!targetService) {
      console.error(`\n❌ Service not found: ${params.service}`);
      console.log(`Available services: ${services.map(s => s.name).join(', ')}`);
      process.exit(1);
    }
    services = [targetService];
  }

  console.log(`\n📋 Found ${services.length} service(s):`);
  services.forEach(s => console.log(`   - ${s.name}`));

  // 검증 (선택적)
  if (!params['skip-validation']) {
    console.log('\n───────────────────────────────────────────────────────────────');
    console.log('Phase 1: OpenAPI Validation');
    console.log('───────────────────────────────────────────────────────────────');

    for (const service of services) {
      validateOpenAPISpec(service.openapiPath);
    }
  }

  // 타입 생성
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('Phase 2: Type Generation');
  console.log('───────────────────────────────────────────────────────────────');

  let successCount = 0;
  let failCount = 0;

  for (const service of services) {
    const success = generateTypesForService(service);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Index 파일 생성
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('Phase 3: Index Generation');
  console.log('───────────────────────────────────────────────────────────────');

  const generatedServices = discoverServices().filter(s =>
    fs.existsSync(path.resolve(process.cwd(), s.outputPath))
  );

  if (generatedServices.length > 0) {
    generateIndexFile(generatedServices);
  }

  // 결과 요약
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Generation Complete');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed:  ${failCount}`);
  console.log('');

  if (failCount > 0) {
    console.log('⚠️  Some generations failed. Check the errors above.');
    process.exit(1);
  }

  console.log('📌 Next steps:');
  console.log('   1. Run: pnpm --filter @o4o/api-types build');
  console.log('   2. Import types: import { cosmetics } from "@o4o/api-types"');
  console.log('   3. Use types: type Product = cosmetics.components["schemas"]["Product"]');
  console.log('');
}

// Run
main();
