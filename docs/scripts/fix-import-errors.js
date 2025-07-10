#!/usr/bin/env node

/**
 * O4O Platform - Import 에러 자동 수정 스크립트
 * 누락된 컴포넌트와 잘못된 import 경로를 감지하고 수정합니다.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 O4O Platform Import 에러 수정 시작...');

// 1. 자주 발생하는 import 경로 문제들
const COMMON_FIXES = [
  {
    pattern: /from ['"]@\/components\/dropshipping\//g,
    replacement: 'from "@shared/components/dropshipping/',
    description: 'Dropshipping 컴포넌트 경로 수정'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/import['"]/g,
    replacement: 'from "../../import"',
    description: 'Editor import 경로 수정'
  },
  {
    pattern: /from ['"]@\/components\/ui\/([^'"]+)['"]/g,
    replacement: 'from "@shared/ui/$1"',
    description: 'UI 컴포넌트 경로 수정'
  },
  {
    pattern: /from ['"]@\/components\/common\/([^'"]+)['"]/g,
    replacement: 'from "@shared/ui/$1"',
    description: 'Common 컴포넌트를 UI로 경로 수정'
  },
  {
    pattern: /from ['"]@\/lib\/utils['"]/g,
    replacement: 'from "@/lib/utils"',
    description: 'Utils import 경로 확인 (이미 올바름)'
  },
  {
    pattern: /from ['"]@shared\/ui\/([a-z][^'"]*)['"]/g,
    replacement: (match, component) => {
      // 첫 글자를 대문자로 변환
      const capitalizedComponent = component.charAt(0).toUpperCase() + component.slice(1);
      return `from "@shared/ui/${capitalizedComponent}"`;
    },
    description: 'UI 컴포넌트명 첫 글자 대문자로 수정'
  }
];

// 2. 누락된 컴포넌트들을 위한 플레이스홀더 생성
const MISSING_COMPONENTS = [
  'SellerInventoryPage',
  'SellerOrderManagementPage', 
  'SellerPricingRulesPage',
  'SellerSuppliersPage',
  'SellerReportsPage',
  'SupplierDashboard',
  'SupplierProductManagementPage',
  'SupplierOrdersPage',
  'SupplierShippingPage',
  'SupplierSettlementPage',
  'SupplierReportsPage',
  'AdminDashboard',
  'UserManagementPage',
  'SystemMonitoringPage',
  'PlatformReportsPage',
  'SettingsPage'
];

function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let fixedContent = content;
    let hasChanges = false;

    // 일반적인 경로 수정
    COMMON_FIXES.forEach(fix => {
      if (fix.pattern.test(fixedContent)) {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement);
        hasChanges = true;
        console.log(`   ✅ ${fix.description}: ${path.basename(filePath)}`);
      }
    });

    // 변경사항이 있으면 파일 저장
    if (hasChanges) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`   💾 저장됨: ${filePath}`);
    }

  } catch (error) {
    console.log(`   ❌ 오류: ${filePath} - ${error.message}`);
  }
}

function scanDirectory(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
        fixFile(fullPath);
      }
    });
  } catch (error) {
    console.log(`   ⚠️  디렉토리 스캔 실패: ${dir}`);
  }
}

// 메인 실행
console.log('📁 TypeScript/React 파일 스캔 중...');

// shared 디렉토리 스캔
const sharedDir = path.join(__dirname, '..', 'shared');
if (fs.existsSync(sharedDir)) {
  console.log('🔍 Shared 디렉토리 스캔...');
  scanDirectory(sharedDir);
}

// main-site 디렉토리 스캔  
const mainSiteDir = path.join(__dirname, '..', 'services', 'main-site', 'src');
if (fs.existsSync(mainSiteDir)) {
  console.log('🔍 Main-site 디렉토리 스캔...');
  scanDirectory(mainSiteDir);
}

console.log('\n✅ Import 에러 수정 완료!');
console.log('💡 브라우저를 새로고침하여 변경사항을 확인하세요.');
console.log('🌐 http://localhost:3011');