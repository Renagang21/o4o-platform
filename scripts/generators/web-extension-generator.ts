// Web Extension Generator
// Phase 10: Extension 기반 Web 자동 생성 시스템
//
// 사용법:
// npx tsx scripts/generators/web-extension-generator.ts --business=cosmetics --entity=products

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration Types
// ============================================================================

interface GeneratorConfig {
  business: string;          // cosmetics, yaksa, dropshipping
  entity: string;            // products, posts, members
  entityPlural: string;      // products, posts, members
  entitySingular: string;    // product, post, member
  displayName: string;       // 화장품 제품, 게시글, 회원
  apiBasePath: string;       // /api/v1/cosmetics/products
  primaryColor: string;      // blue, green, purple
  icon: string;              // Package, MessageSquare, Users
}

interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  label: string;
  required?: boolean;
}

interface StatusDefinition {
  value: string;
  label: string;
  color: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
}

// ============================================================================
// Template Generators
// ============================================================================

function generateRouter(config: GeneratorConfig): string {
  const { business, entity, entitySingular } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);
  const EntityNamePlural = capitalize(entity);

  return `/**
 * ${BusinessName} ${EntityNamePlural} Router
 *
 * ${config.displayName} 라우터
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for code splitting
const ${EntityName}ListPage = React.lazy(() => import('./${EntityName}ListPage'));
const ${EntityName}DetailPage = React.lazy(() => import('./${EntityName}DetailPage'));

const ${BusinessName}${EntityNamePlural}Router: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-${config.primaryColor}-600"></div>
        </div>
      }
    >
      <Routes>
        <Route index element={<${EntityName}ListPage />} />
        <Route path=":${entitySingular}Id" element={<${EntityName}DetailPage />} />
        <Route path="*" element={<Navigate to="/${business}-${entity}" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default ${BusinessName}${EntityNamePlural}Router;
`;
}

function generateListPage(config: GeneratorConfig, statuses: StatusDefinition[]): string {
  const { business, entity, entitySingular, displayName, apiBasePath, icon } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);
  const EntityNamePlural = capitalize(entity);

  const statusLabelsCode = statuses.map(s => `  ${s.value}: '${s.label}',`).join('\n');
  const statusColorsCode = statuses.map(s => `  ${s.value}: '${s.color}',`).join('\n');
  const statusTypeCode = statuses.map(s => `'${s.value}'`).join(' | ');

  return `/**
 * ${BusinessName} ${EntityName} List Page
 *
 * ${displayName} 목록 페이지
 * - 카드 그리드/리스트 뷰
 * - 필터/검색/정렬
 * - 반응형 레이아웃
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
  AGTablePagination,
} from '@o4o/ui';
import {
  ${icon},
  Search,
  RefreshCw,
  Grid,
  List,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import type { ${EntityName}Summary, ${EntityName}ListResponse, PaginationMeta } from './types';

/**
 * Status Definitions
 */
type ${EntityName}Status = ${statusTypeCode};

const statusLabels: Record<${EntityName}Status, string> = {
${statusLabelsCode}
};

const statusColors: Record<${EntityName}Status, 'gray' | 'green' | 'yellow' | 'red' | 'blue'> = {
${statusColorsCode}
};

const ${EntityName}ListPage: React.FC = () => {
  const api = authClient.api;
  const [items, setItems] = useState<${EntityName}Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<${EntityName}Status | 'all'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Fetch items with filters
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      params.set('sort', sortBy);
      params.set('order', sortOrder);

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchTerm.length >= 2) {
        params.set('q', searchTerm);
      }

      const response = await api.get<${EntityName}ListResponse>(\`${apiBasePath}?\${params.toString()}\`);

      if (response.data) {
        setItems(response.data.data);
        setTotalItems(response.data.meta.total);
        setTotalPages(response.data.meta.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch items:', err);
      setError(err.message || '목록을 불러오는데 실패했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, statusFilter, sortBy, sortOrder, searchTerm]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, sortOrder, searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="${EntityNamePlural}"
        description="${displayName}"
        icon={<${icon} className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchItems}
              iconLeft={<RefreshCw className={\`w-4 h-4 \${loading ? 'animate-spin' : ''}\`} />}
            >
              새로고침
            </AGButton>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={\`p-2 transition-colors \${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}\`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={\`p-2 transition-colors \${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}\`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <AGSection>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="검색 (2자 이상)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AGSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ${EntityName}Status | 'all')}
                className="w-32"
              >
                <option value="all">전체 상태</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={\`\${sortBy}_\${sortOrder}\`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('_') as ['createdAt' | 'updatedAt' | 'name', 'asc' | 'desc'];
                  setSortBy(sort);
                  setSortOrder(order);
                }}
                className="w-36"
              >
                <option value="createdAt_desc">최신순</option>
                <option value="createdAt_asc">오래된순</option>
                <option value="name_asc">이름순</option>
                <option value="name_desc">이름역순</option>
              </AGSelect>
            </div>
          </div>
        </AGSection>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{totalItems}</span>개
          </p>
        </div>

        {/* Item List */}
        <AGSection>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <${icon} className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>데이터가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Link key={item.id} to={\`/${business}-${entity}/\${item.id}\`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <AGTag color={statusColors[item.status as ${EntityName}Status]} size="sm">
                            {statusLabels[item.status as ${EntityName}Status]}
                          </AGTag>
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <AGTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default ${EntityName}ListPage;
`;
}

function generateDetailPage(config: GeneratorConfig, statuses: StatusDefinition[]): string {
  const { business, entity, entitySingular, displayName, apiBasePath, icon } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);
  const EntityNamePlural = capitalize(entity);

  const statusLabelsCode = statuses.map(s => `  ${s.value}: '${s.label}',`).join('\n');
  const statusColorsCode = statuses.map(s => `  ${s.value}: '${s.color}',`).join('\n');
  const statusTypeCode = statuses.map(s => `'${s.value}'`).join(' | ');

  return `/**
 * ${BusinessName} ${EntityName} Detail Page
 *
 * ${displayName} 상세 페이지
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
} from '@o4o/ui';
import {
  ${icon},
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import type { ${EntityName}Detail, ${EntityName}DetailResponse } from './types';

/**
 * Status Definitions
 */
type ${EntityName}Status = ${statusTypeCode};

const statusLabels: Record<${EntityName}Status, string> = {
${statusLabelsCode}
};

const statusColors: Record<${EntityName}Status, 'gray' | 'green' | 'yellow' | 'red' | 'blue'> = {
${statusColorsCode}
};

const ${EntityName}DetailPage: React.FC = () => {
  const { ${entitySingular}Id } = useParams<{ ${entitySingular}Id: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [item, setItem] = useState<${EntityName}Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!${entitySingular}Id) {
      setError('ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<${EntityName}DetailResponse>(\`${apiBasePath}/\${${entitySingular}Id}\`);
      if (response.data) {
        setItem(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch item:', err);
      if (err.response?.status === 404) {
        setError('데이터를 찾을 수 없습니다.');
      } else {
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, ${entitySingular}Id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
            </>
          ) : (
            <>
              <${icon} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">데이터를 찾을 수 없습니다</p>
            </>
          )}
          <AGButton variant="outline" onClick={() => navigate('/${business}-${entity}')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title={item.name}
        description="${displayName} 상세"
        icon={<${icon} className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/${business}-${entity}"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Link>
        }
        actions={
          <AGTag color={statusColors[item.status as ${EntityName}Status]} size="md">
            {statusLabels[item.status as ${EntityName}Status]}
          </AGTag>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Detail Content */}
        <AGSection>
          <AGCard>
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
                {item.description && (
                  <p className="text-gray-600 mt-2">{item.description}</p>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm pt-6 border-t">
                <div>
                  <span className="text-gray-500">생성일</span>
                  <p className="font-medium text-gray-900">{formatDate(item.createdAt)}</p>
                </div>
                <div>
                  <span className="text-gray-500">수정일</span>
                  <p className="font-medium text-gray-900">{formatDate(item.updatedAt)}</p>
                </div>
              </div>
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default ${EntityName}DetailPage;
`;
}

function generateTypes(config: GeneratorConfig, statuses: StatusDefinition[]): string {
  const { entitySingular } = config;
  const EntityName = capitalize(entitySingular);
  const statusTypeCode = statuses.map(s => `'${s.value}'`).join(' | ');

  return `/**
 * ${EntityName} Types
 *
 * OpenAPI 계약 기반 타입 정의
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

export type ${EntityName}Status = ${statusTypeCode};

export interface ${EntityName}Summary {
  id: string;
  name: string;
  description?: string;
  status: ${EntityName}Status;
  createdAt: string;
  updatedAt: string;
}

export interface ${EntityName}Detail extends ${EntityName}Summary {
  // Add detail-specific fields here
  metadata?: Record<string, any>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ${EntityName}ListResponse {
  data: ${EntityName}Summary[];
  meta: PaginationMeta;
}

export interface ${EntityName}DetailResponse {
  data: ${EntityName}Detail;
}
`;
}

function generateApi(config: GeneratorConfig): string {
  const { entitySingular, apiBasePath } = config;
  const EntityName = capitalize(entitySingular);

  return `/**
 * ${EntityName} API
 *
 * authClient.api 래퍼
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
 */

import { authClient } from '@o4o/auth-client';
import type {
  ${EntityName}ListResponse,
  ${EntityName}DetailResponse,
} from './types';

const api = authClient.api;
const BASE_PATH = '${apiBasePath}';

export const ${entitySingular}Api = {
  /**
   * 목록 조회
   */
  list: async (params?: URLSearchParams): Promise<${EntityName}ListResponse> => {
    const query = params ? \`?\${params.toString()}\` : '';
    const response = await api.get<${EntityName}ListResponse>(\`\${BASE_PATH}\${query}\`);
    return response.data;
  },

  /**
   * 상세 조회
   */
  get: async (id: string): Promise<${EntityName}DetailResponse> => {
    const response = await api.get<${EntityName}DetailResponse>(\`\${BASE_PATH}/\${id}\`);
    return response.data;
  },
};

export default ${entitySingular}Api;
`;
}

function generateIndex(config: GeneratorConfig): string {
  const { business, entitySingular, entity } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);
  const EntityNamePlural = capitalize(entity);

  return `/**
 * ${BusinessName} ${EntityNamePlural} Module Entry Point
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 */

export { default as ${BusinessName}${EntityNamePlural}Router } from './${BusinessName}${EntityNamePlural}Router';
export { default as ${EntityName}ListPage } from './${EntityName}ListPage';
export { default as ${EntityName}DetailPage } from './${EntityName}DetailPage';
export * from './types';
export * from './api';
`;
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
// Main Generator Function
// ============================================================================

export interface GenerateOptions {
  business: string;
  entity: string;
  displayName: string;
  apiBasePath: string;
  primaryColor?: string;
  icon?: string;
  statuses?: StatusDefinition[];
  outputDir?: string;
}

export function generateWebExtension(options: GenerateOptions): void {
  const {
    business,
    entity,
    displayName,
    apiBasePath,
    primaryColor = 'blue',
    icon = 'Package',
    statuses = [
      { value: 'draft', label: '초안', color: 'gray' },
      { value: 'active', label: '활성', color: 'green' },
      { value: 'inactive', label: '비활성', color: 'yellow' },
      { value: 'archived', label: '보관됨', color: 'red' },
    ],
    outputDir = `apps/admin-dashboard/src/pages/${business}-${entity}`,
  } = options;

  const config: GeneratorConfig = {
    business,
    entity,
    entityPlural: entity,
    entitySingular: toSingular(entity),
    displayName,
    apiBasePath,
    primaryColor,
    icon,
  };

  const BusinessName = capitalize(business);
  const EntityName = capitalize(config.entitySingular);
  const EntityNamePlural = capitalize(entity);

  // Create output directory
  const fullOutputDir = path.resolve(process.cwd(), outputDir);
  if (!fs.existsSync(fullOutputDir)) {
    fs.mkdirSync(fullOutputDir, { recursive: true });
  }

  // Generate files
  const files = [
    { name: `${BusinessName}${EntityNamePlural}Router.tsx`, content: generateRouter(config) },
    { name: `${EntityName}ListPage.tsx`, content: generateListPage(config, statuses) },
    { name: `${EntityName}DetailPage.tsx`, content: generateDetailPage(config, statuses) },
    { name: 'types.ts', content: generateTypes(config, statuses) },
    { name: 'api.ts', content: generateApi(config) },
    { name: 'index.ts', content: generateIndex(config) },
  ];

  console.log(`\n📁 Generating Web Extension: ${business}-${entity}`);
  console.log(`   Output: ${fullOutputDir}\n`);

  for (const file of files) {
    const filePath = path.join(fullOutputDir, file.name);
    fs.writeFileSync(filePath, file.content, 'utf-8');
    console.log(`   ✅ ${file.name}`);
  }

  console.log(`\n✨ Generation complete!\n`);
  console.log(`📌 Next steps:`);
  console.log(`   1. Register router in App.tsx`);
  console.log(`   2. Verify API endpoints exist`);
  console.log(`   3. Customize types.ts based on OpenAPI spec\n`);
}

// ============================================================================
// CLI Execution
// ============================================================================

function runCLI() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    if (key && value) {
      params[key] = value;
    }
  }

  if (!params.business || !params.entity) {
    console.log(`
Usage: npx tsx scripts/generators/web-extension-generator.ts --business=<business> --entity=<entity>

Required:
  --business    Business key (cosmetics, yaksa, dropshipping)
  --entity      Entity name in plural (products, posts, members)

Optional:
  --displayName Display name in Korean (default: entity name)
  --apiPath     API base path (default: /api/v1/{business}/{entity})
  --color       Primary color (default: blue)
  --icon        Lucide icon name (default: Package)

Example:
  npx tsx scripts/generators/web-extension-generator.ts --business=cosmetics --entity=products --displayName="화장품 제품"
`);
    process.exit(1);
  }

  generateWebExtension({
    business: params.business,
    entity: params.entity,
    displayName: params.displayName || params.entity,
    apiBasePath: params.apiPath || `/api/v1/${params.business}/${params.entity}`,
    primaryColor: params.color,
    icon: params.icon,
  });
}

// Run CLI if executed directly
runCLI();
