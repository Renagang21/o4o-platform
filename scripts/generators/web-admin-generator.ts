// Web Admin Generator
// Phase 11: Admin Create/Edit Web 자동 생성 시스템
//
// 사용법:
// npx tsx scripts/generators/web-admin-generator.ts --business=cosmetics --entity=products

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration Types
// ============================================================================

interface AdminGeneratorConfig {
  business: string;
  entity: string;
  entityPlural: string;
  entitySingular: string;
  displayName: string;
  apiBasePath: string;
  adminApiPath: string;
  primaryColor: string;
  icon: string;
}

interface FormField {
  name: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'switch' | 'date' | 'uuid';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

interface StatusDefinition {
  value: string;
  label: string;
  color: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
}

// ============================================================================
// Template Generators
// ============================================================================

function generateAdminRouter(config: AdminGeneratorConfig): string {
  const { business, entity, entitySingular } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);
  const EntityNamePlural = capitalize(entity);

  return `/**
 * ${BusinessName} ${EntityNamePlural} Admin Router
 *
 * ${config.displayName} 관리 라우터
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const ${EntityName}CreatePage = React.lazy(() => import('./${EntityName}CreatePage'));
const ${EntityName}EditPage = React.lazy(() => import('./${EntityName}EditPage'));
const ${EntityName}StatusPage = React.lazy(() => import('./${EntityName}StatusPage'));

const ${BusinessName}${EntityNamePlural}AdminRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-${config.primaryColor}-600"></div>
        </div>
      }
    >
      <Routes>
        <Route path="create" element={<${EntityName}CreatePage />} />
        <Route path=":${entitySingular}Id/edit" element={<${EntityName}EditPage />} />
        <Route path=":${entitySingular}Id/status" element={<${EntityName}StatusPage />} />
        <Route path="*" element={<Navigate to="/${business}-${entity}" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default ${BusinessName}${EntityNamePlural}AdminRouter;
`;
}

function generateCreatePage(config: AdminGeneratorConfig, fields: FormField[]): string {
  const { business, entity, entitySingular, displayName, adminApiPath, icon } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);

  const fieldInputs = fields.map(field => generateFieldInput(field, entitySingular)).join('\n\n');
  const initialFormData = fields.map(f => `    ${f.name}: ${getDefaultValue(f)},`).join('\n');
  const formDataInterface = fields.map(f => `  ${f.name}${f.required ? '' : '?'}: ${getTypeScriptType(f)};`).join('\n');

  return `/**
 * ${BusinessName} ${EntityName} Create Page
 *
 * ${displayName} 등록 페이지
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
} from '@o4o/ui';
import {
  ${icon},
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FormData {
${formDataInterface}
}

interface FormErrors {
  [key: string]: string;
}

const ${EntityName}CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const api = authClient.api;

  const [formData, setFormData] = useState<FormData>({
${initialFormData}
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

${fields.filter(f => f.required).map(f => `    if (!formData.${f.name}) {
      newErrors.${f.name} = '${f.label}은(는) 필수입니다.';
    }`).join('\n')}

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);

    try {
      const response = await api.post('${adminApiPath}', formData);
      if (response.data) {
        navigate('/${business}-${entity}');
      }
    } catch (err: any) {
      console.error('Failed to create:', err);
      if (err.response?.status === 403) {
        setSubmitError('권한이 없습니다.');
      } else if (err.response?.status === 400) {
        setSubmitError(err.response?.data?.error?.message || '입력값을 확인해주세요.');
      } else {
        setSubmitError(err.message || '등록에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, formData, validate, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="${displayName} 등록"
        description="새로운 ${displayName} 등록"
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
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit}>
          <AGSection>
            <AGCard>
              {submitError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700">{submitError}</p>
                </div>
              )}

              <div className="space-y-6">
${fieldInputs}
              </div>

              <div className="mt-8 pt-6 border-t flex items-center justify-end gap-3">
                <AGButton
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/${business}-${entity}')}
                >
                  취소
                </AGButton>
                <AGButton
                  type="submit"
                  disabled={loading}
                  iconLeft={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {loading ? '등록 중...' : '등록'}
                </AGButton>
              </div>
            </AGCard>
          </AGSection>
        </form>
      </div>
    </div>
  );
};

export default ${EntityName}CreatePage;
`;
}

function generateEditPage(config: AdminGeneratorConfig, fields: FormField[]): string {
  const { business, entity, entitySingular, displayName, apiBasePath, adminApiPath, icon } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);

  const fieldInputs = fields.map(field => generateFieldInput(field, entitySingular)).join('\n\n');
  const formDataInterface = fields.map(f => `  ${f.name}${f.required ? '' : '?'}: ${getTypeScriptType(f)};`).join('\n');

  return `/**
 * ${BusinessName} ${EntityName} Edit Page
 *
 * ${displayName} 수정 페이지
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
} from '@o4o/ui';
import {
  ${icon},
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FormData {
${formDataInterface}
}

interface FormErrors {
  [key: string]: string;
}

const ${EntityName}EditPage: React.FC = () => {
  const { ${entitySingular}Id } = useParams<{ ${entitySingular}Id: string }>();
  const navigate = useNavigate();
  const api = authClient.api;

  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!${entitySingular}Id) {
      setFetchError('ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const response = await api.get(\`${apiBasePath}/\${${entitySingular}Id}\`);
      if (response.data?.data) {
        setFormData(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch:', err);
      if (err.response?.status === 404) {
        setFetchError('데이터를 찾을 수 없습니다.');
      } else {
        setFetchError(err.message || '데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, ${entitySingular}Id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = useCallback((name: string, value: any) => {
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !${entitySingular}Id) return;

    setSaving(true);
    setSubmitError(null);

    try {
      const response = await api.put(\`${adminApiPath}/\${${entitySingular}Id}\`, formData);
      if (response.data) {
        navigate('/${business}-${entity}');
      }
    } catch (err: any) {
      console.error('Failed to update:', err);
      if (err.response?.status === 403) {
        setSubmitError('권한이 없습니다.');
      } else if (err.response?.status === 400) {
        setSubmitError(err.response?.data?.error?.message || '입력값을 확인해주세요.');
      } else {
        setSubmitError(err.message || '수정에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  }, [api, formData, ${entitySingular}Id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{fetchError || '데이터를 찾을 수 없습니다'}</p>
          <AGButton variant="outline" onClick={() => navigate('/${business}-${entity}')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="${displayName} 수정"
        description="기존 ${displayName} 정보 수정"
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
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit}>
          <AGSection>
            <AGCard>
              {submitError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700">{submitError}</p>
                </div>
              )}

              <div className="space-y-6">
${fieldInputs}
              </div>

              <div className="mt-8 pt-6 border-t flex items-center justify-end gap-3">
                <AGButton
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/${business}-${entity}')}
                >
                  취소
                </AGButton>
                <AGButton
                  type="submit"
                  disabled={saving}
                  iconLeft={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {saving ? '저장 중...' : '저장'}
                </AGButton>
              </div>
            </AGCard>
          </AGSection>
        </form>
      </div>
    </div>
  );
};

export default ${EntityName}EditPage;
`;
}

function generateStatusPage(config: AdminGeneratorConfig, statuses: StatusDefinition[]): string {
  const { business, entity, entitySingular, displayName, apiBasePath, adminApiPath, icon } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);

  const statusLabelsCode = statuses.map(s => `  ${s.value}: '${s.label}',`).join('\n');
  const statusColorsCode = statuses.map(s => `  ${s.value}: '${s.color}',`).join('\n');
  const statusTypeCode = statuses.map(s => `'${s.value}'`).join(' | ');

  return `/**
 * ${BusinessName} ${EntityName} Status Page
 *
 * ${displayName} 상태 변경 페이지
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGSelect,
  AGTag,
} from '@o4o/ui';
import {
  ${icon},
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type ${EntityName}Status = ${statusTypeCode};

const statusLabels: Record<${EntityName}Status, string> = {
${statusLabelsCode}
};

const statusColors: Record<${EntityName}Status, 'gray' | 'green' | 'yellow' | 'red' | 'blue'> = {
${statusColorsCode}
};

interface ${EntityName}Data {
  id: string;
  name: string;
  status: ${EntityName}Status;
}

const ${EntityName}StatusPage: React.FC = () => {
  const { ${entitySingular}Id } = useParams<{ ${entitySingular}Id: string }>();
  const navigate = useNavigate();
  const api = authClient.api;

  const [data, setData] = useState<${EntityName}Data | null>(null);
  const [newStatus, setNewStatus] = useState<${EntityName}Status | ''>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!${entitySingular}Id) {
      setFetchError('ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const response = await api.get(\`${apiBasePath}/\${${entitySingular}Id}\`);
      if (response.data?.data) {
        setData(response.data.data);
        setNewStatus(response.data.data.status);
      }
    } catch (err: any) {
      console.error('Failed to fetch:', err);
      if (err.response?.status === 404) {
        setFetchError('데이터를 찾을 수 없습니다.');
      } else {
        setFetchError(err.message || '데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, ${entitySingular}Id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !${entitySingular}Id || !newStatus) return;
    if (newStatus === data.status) {
      setSubmitError('현재 상태와 동일합니다.');
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const response = await api.patch(\`${adminApiPath}/\${${entitySingular}Id}/status\`, {
        status: newStatus,
        reason: reason || undefined,
      });
      if (response.data) {
        navigate('/${business}-${entity}');
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      if (err.response?.status === 403) {
        setSubmitError('권한이 없습니다.');
      } else if (err.response?.status === 400) {
        setSubmitError(err.response?.data?.error?.message || '상태 변경이 불가능합니다.');
      } else {
        setSubmitError(err.message || '상태 변경에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  }, [api, data, ${entitySingular}Id, newStatus, reason, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{fetchError || '데이터를 찾을 수 없습니다'}</p>
          <AGButton variant="outline" onClick={() => navigate('/${business}-${entity}')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="상태 변경"
        description={\`\${data.name} 상태 변경\`}
        icon={<RefreshCw className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/${business}-${entity}"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Link>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit}>
          <AGSection>
            <AGCard>
              {submitError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700">{submitError}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Current Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    현재 상태
                  </label>
                  <AGTag color={statusColors[data.status]} size="lg">
                    {statusLabels[data.status]}
                  </AGTag>
                </div>

                {/* New Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    변경할 상태 <span className="text-red-500">*</span>
                  </label>
                  <AGSelect
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ${EntityName}Status)}
                    className="w-full max-w-xs"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </AGSelect>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    변경 사유
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="상태 변경 사유를 입력하세요 (선택)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex items-center justify-end gap-3">
                <AGButton
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/${business}-${entity}')}
                >
                  취소
                </AGButton>
                <AGButton
                  type="submit"
                  disabled={saving || newStatus === data.status}
                  iconLeft={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {saving ? '변경 중...' : '상태 변경'}
                </AGButton>
              </div>
            </AGCard>
          </AGSection>
        </form>
      </div>
    </div>
  );
};

export default ${EntityName}StatusPage;
`;
}

function generateFormSchema(config: AdminGeneratorConfig, fields: FormField[]): string {
  const { entitySingular } = config;
  const EntityName = capitalize(entitySingular);

  const fieldsCode = fields.map(f => {
    const validationCode = f.validation
      ? JSON.stringify(f.validation, null, 4).replace(/\n/g, '\n    ')
      : 'undefined';
    const optionsCode = f.options
      ? JSON.stringify(f.options, null, 4).replace(/\n/g, '\n    ')
      : 'undefined';

    return `  {
    name: '${f.name}',
    type: '${f.type}',
    label: '${f.label}',
    required: ${f.required},
    placeholder: ${f.placeholder ? `'${f.placeholder}'` : 'undefined'},
    options: ${optionsCode},
    validation: ${validationCode},
  }`;
  }).join(',\n');

  return `/**
 * ${EntityName} Form Schema
 *
 * OpenAPI → Form 매핑 스키마
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

export interface FormField {
  name: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'switch' | 'date' | 'uuid';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export const ${entitySingular}FormSchema: FormField[] = [
${fieldsCode}
];

export default ${entitySingular}FormSchema;
`;
}

function generateAdminTypes(config: AdminGeneratorConfig, fields: FormField[], statuses: StatusDefinition[]): string {
  const { entitySingular } = config;
  const EntityName = capitalize(entitySingular);
  const statusTypeCode = statuses.map(s => `'${s.value}'`).join(' | ');

  const createRequestFields = fields.map(f =>
    `  ${f.name}${f.required ? '' : '?'}: ${getTypeScriptType(f)};`
  ).join('\n');

  const updateRequestFields = fields.map(f =>
    `  ${f.name}?: ${getTypeScriptType(f)};`
  ).join('\n');

  return `/**
 * ${EntityName} Admin Types
 *
 * OpenAPI 계약 기반 타입 정의
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

export type ${EntityName}Status = ${statusTypeCode};

export interface Create${EntityName}Request {
${createRequestFields}
}

export interface Update${EntityName}Request {
${updateRequestFields}
}

export interface UpdateStatusRequest {
  status: ${EntityName}Status;
  reason?: string;
}

export interface StatusChangeResponse {
  data: {
    id: string;
    status: ${EntityName}Status;
    previous_status: ${EntityName}Status;
    changed_at: string;
    changed_by?: string;
  };
}
`;
}

function generateAdminApi(config: AdminGeneratorConfig): string {
  const { entitySingular, apiBasePath, adminApiPath } = config;
  const EntityName = capitalize(entitySingular);

  return `/**
 * ${EntityName} Admin API
 *
 * authClient.api 래퍼 (Admin 전용)
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 */

import { authClient } from '@o4o/auth-client';
import type {
  Create${EntityName}Request,
  Update${EntityName}Request,
  UpdateStatusRequest,
  StatusChangeResponse,
} from './types';

const api = authClient.api;
const BASE_PATH = '${apiBasePath}';
const ADMIN_PATH = '${adminApiPath}';

export const ${entitySingular}AdminApi = {
  /**
   * 생성 (Admin)
   */
  create: async (data: Create${EntityName}Request) => {
    const response = await api.post(ADMIN_PATH, data);
    return response.data;
  },

  /**
   * 수정 (Admin)
   */
  update: async (id: string, data: Update${EntityName}Request) => {
    const response = await api.put(\`\${ADMIN_PATH}/\${id}\`, data);
    return response.data;
  },

  /**
   * 상태 변경 (Admin)
   */
  updateStatus: async (id: string, data: UpdateStatusRequest): Promise<StatusChangeResponse> => {
    const response = await api.patch<StatusChangeResponse>(\`\${ADMIN_PATH}/\${id}/status\`, data);
    return response.data;
  },
};

export default ${entitySingular}AdminApi;
`;
}

function generateAdminIndex(config: AdminGeneratorConfig): string {
  const { business, entitySingular, entity } = config;
  const BusinessName = capitalize(business);
  const EntityName = capitalize(entitySingular);
  const EntityNamePlural = capitalize(entity);

  return `/**
 * ${BusinessName} ${EntityNamePlural} Admin Module Entry Point
 *
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 */

export { default as ${BusinessName}${EntityNamePlural}AdminRouter } from './${BusinessName}${EntityNamePlural}AdminRouter';
export { default as ${EntityName}CreatePage } from './${EntityName}CreatePage';
export { default as ${EntityName}EditPage } from './${EntityName}EditPage';
export { default as ${EntityName}StatusPage } from './${EntityName}StatusPage';
export * from './types';
export * from './api';
export * from './formSchema';
`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateFieldInput(field: FormField, entitySingular: string): string {
  const errorCheck = `errors.${field.name}`;
  const valueAccess = `formData.${field.name}`;
  const requiredMark = field.required ? '<span className="text-red-500">*</span>' : '';

  switch (field.type) {
    case 'textarea':
      return `                {/* ${field.label} */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ${field.label} ${requiredMark}
                  </label>
                  <textarea
                    value={${valueAccess} || ''}
                    onChange={(e) => handleChange('${field.name}', e.target.value)}
                    placeholder="${field.placeholder || ''}"
                    className={\`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 \${${errorCheck} ? 'border-red-500' : 'border-gray-300'}\`}
                    rows={4}
                  />
                  {${errorCheck} && <p className="mt-1 text-sm text-red-500">{${errorCheck}}</p>}
                </div>`;

    case 'select': {
      const options = field.options?.map(o =>
        `<option value="${o.value}">${o.label}</option>`
      ).join('\n                      ') || '';
      return `                {/* ${field.label} */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ${field.label} ${requiredMark}
                  </label>
                  <AGSelect
                    value={${valueAccess} || ''}
                    onChange={(e) => handleChange('${field.name}', e.target.value)}
                    className={\`w-full max-w-xs \${${errorCheck} ? 'border-red-500' : ''}\`}
                  >
                    <option value="">선택하세요</option>
                    ${options}
                  </AGSelect>
                  {${errorCheck} && <p className="mt-1 text-sm text-red-500">{${errorCheck}}</p>}
                </div>`;
    }

    case 'number':
      return `                {/* ${field.label} */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ${field.label} ${requiredMark}
                  </label>
                  <AGInput
                    type="number"
                    value={${valueAccess} ?? ''}
                    onChange={(e) => handleChange('${field.name}', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="${field.placeholder || ''}"
                    className={\`max-w-xs \${${errorCheck} ? 'border-red-500' : ''}\`}
                  />
                  {${errorCheck} && <p className="mt-1 text-sm text-red-500">{${errorCheck}}</p>}
                </div>`;

    case 'switch':
      return `                {/* ${field.label} */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={${valueAccess} || false}
                    onChange={(e) => handleChange('${field.name}', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    ${field.label}
                  </label>
                </div>`;

    default: // text, uuid
      return `                {/* ${field.label} */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ${field.label} ${requiredMark}
                  </label>
                  <AGInput
                    type="text"
                    value={${valueAccess} || ''}
                    onChange={(e) => handleChange('${field.name}', e.target.value)}
                    placeholder="${field.placeholder || ''}"
                    className={\`w-full \${${errorCheck} ? 'border-red-500' : ''}\`}
                  />
                  {${errorCheck} && <p className="mt-1 text-sm text-red-500">{${errorCheck}}</p>}
                </div>`;
  }
}

function getDefaultValue(field: FormField): string {
  switch (field.type) {
    case 'number': return 'undefined';
    case 'switch': return 'false';
    case 'multiselect': return '[]';
    default: return "''";
  }
}

function getTypeScriptType(field: FormField): string {
  switch (field.type) {
    case 'number': return 'number';
    case 'switch': return 'boolean';
    case 'multiselect': return 'string[]';
    default: return 'string';
  }
}

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

export interface AdminGenerateOptions {
  business: string;
  entity: string;
  displayName: string;
  apiBasePath: string;
  adminApiPath: string;
  primaryColor?: string;
  icon?: string;
  fields?: FormField[];
  statuses?: StatusDefinition[];
  outputDir?: string;
}

export function generateAdminWebExtension(options: AdminGenerateOptions): void {
  const {
    business,
    entity,
    displayName,
    apiBasePath,
    adminApiPath,
    primaryColor = 'blue',
    icon = 'Package',
    fields = [
      { name: 'name', type: 'text', label: '이름', required: true, placeholder: '이름을 입력하세요' },
      { name: 'description', type: 'textarea', label: '설명', required: false, placeholder: '설명을 입력하세요' },
    ],
    statuses = [
      { value: 'draft', label: '초안', color: 'gray' },
      { value: 'active', label: '활성', color: 'green' },
      { value: 'inactive', label: '비활성', color: 'yellow' },
      { value: 'archived', label: '보관됨', color: 'red' },
    ],
    outputDir = `apps/admin-dashboard/src/pages/${business}-${entity}-admin`,
  } = options;

  const config: AdminGeneratorConfig = {
    business,
    entity,
    entityPlural: entity,
    entitySingular: toSingular(entity),
    displayName,
    apiBasePath,
    adminApiPath,
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
    { name: `${BusinessName}${EntityNamePlural}AdminRouter.tsx`, content: generateAdminRouter(config) },
    { name: `${EntityName}CreatePage.tsx`, content: generateCreatePage(config, fields) },
    { name: `${EntityName}EditPage.tsx`, content: generateEditPage(config, fields) },
    { name: `${EntityName}StatusPage.tsx`, content: generateStatusPage(config, statuses) },
    { name: 'formSchema.ts', content: generateFormSchema(config, fields) },
    { name: 'types.ts', content: generateAdminTypes(config, fields, statuses) },
    { name: 'api.ts', content: generateAdminApi(config) },
    { name: 'index.ts', content: generateAdminIndex(config) },
  ];

  console.log(`\n📁 Generating Admin Web Extension: ${business}-${entity}-admin`);
  console.log(`   Output: ${fullOutputDir}\n`);

  for (const file of files) {
    const filePath = path.join(fullOutputDir, file.name);
    fs.writeFileSync(filePath, file.content, 'utf-8');
    console.log(`   ✅ ${file.name}`);
  }

  console.log(`\n✨ Admin Generation complete!\n`);
  console.log(`📌 Next steps:`);
  console.log(`   1. Register admin router in App.tsx`);
  console.log(`   2. Add admin links to ListPage`);
  console.log(`   3. Verify OpenAPI endpoints exist\n`);
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
Usage: npx tsx scripts/generators/web-admin-generator.ts --business=<business> --entity=<entity>

Required:
  --business    Business key (cosmetics, yaksa, dropshipping)
  --entity      Entity name in plural (products, posts, members)

Optional:
  --displayName Display name in Korean (default: entity name)
  --apiPath     API base path for GET (default: /api/v1/{business}/{entity})
  --adminPath   Admin API path for POST/PUT (default: /api/v1/{business}/admin/{entity})
  --color       Primary color (default: blue)
  --icon        Lucide icon name (default: Package)

Example:
  npx tsx scripts/generators/web-admin-generator.ts --business=cosmetics --entity=products --displayName="화장품 제품"
`);
    process.exit(1);
  }

  // Default fields for cosmetics products (from OpenAPI)
  const defaultFields: FormField[] = params.business === 'cosmetics' && params.entity === 'products'
    ? [
        { name: 'name', type: 'text', label: '상품명', required: true, placeholder: '상품명을 입력하세요', validation: { minLength: 1, maxLength: 200 } },
        { name: 'brand_id', type: 'uuid', label: '브랜드', required: true, placeholder: '브랜드 ID' },
        { name: 'line_id', type: 'uuid', label: '라인', required: false, placeholder: '라인 ID' },
        { name: 'description', type: 'textarea', label: '상품 설명', required: false, placeholder: '상품 설명을 입력하세요', validation: { maxLength: 5000 } },
        { name: 'base_price', type: 'number', label: '기본가', required: true, placeholder: '0', validation: { min: 0 } },
        { name: 'sale_price', type: 'number', label: '할인가', required: false, placeholder: '0', validation: { min: 0 } },
      ]
    : [
        { name: 'name', type: 'text', label: '이름', required: true, placeholder: '이름을 입력하세요' },
        { name: 'description', type: 'textarea', label: '설명', required: false, placeholder: '설명을 입력하세요' },
      ];

  const defaultStatuses: StatusDefinition[] = params.business === 'cosmetics' && params.entity === 'products'
    ? [
        { value: 'draft', label: '초안', color: 'gray' },
        { value: 'visible', label: '공개', color: 'green' },
        { value: 'hidden', label: '숨김', color: 'yellow' },
        { value: 'sold_out', label: '품절', color: 'red' },
      ]
    : [
        { value: 'draft', label: '초안', color: 'gray' },
        { value: 'active', label: '활성', color: 'green' },
        { value: 'inactive', label: '비활성', color: 'yellow' },
        { value: 'archived', label: '보관됨', color: 'red' },
      ];

  generateAdminWebExtension({
    business: params.business,
    entity: params.entity,
    displayName: params.displayName || params.entity,
    apiBasePath: params.apiPath || `/api/v1/${params.business}/${params.entity}`,
    adminApiPath: params.adminPath || `/api/v1/${params.business}/admin/${params.entity}`,
    primaryColor: params.color,
    icon: params.icon,
    fields: defaultFields,
    statuses: defaultStatuses,
  });
}

// Run CLI
runCLI();
