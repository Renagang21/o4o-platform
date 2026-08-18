/**
 * PharmacyHubAdminDashboard — 관리자(구조·정책) 대시보드
 *
 * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1
 *
 * 다른 4서비스와 동일하게 공통 4-Block 골격(@o4o/admin-ux-core `AdminDashboardLayout`,
 * A Structure Snapshot → B Policy Overview → C Governance Alerts → D Structure Actions)을
 * 그대로 쓴다 — Pharmacy-Hub 전용 대시보드 사본을 만들지 않는다.
 *
 * 데이터 원천: 실재하는 관리자 업무(법정정보·약관)의 **실데이터**만 쓴다.
 *   GET /admin/services/pharmacy-hub/legal-profile
 *   GET /admin/services/pharmacy-hub/policies
 * 미구현 업무를 가짜 카드로 만들지 않는다(운영자 대시보드와 같은 원칙).
 *
 * 조회 실패를 0 으로 삼키지 않는다 — "설정 없음"과 "불러오기 실패"는 구분돼야 한다.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AdminDashboardLayout,
  type AdminDashboardConfig,
  type GovernanceAlert,
  type PolicyItem,
  type StructureMetric,
} from '@o4o/admin-ux-core';
import type {
  ServiceLegalProfileDto,
  ServicePolicyDocumentDto,
} from '@o4o/operator-core-ui/modules/service-legal';
import { legalApi } from '../../lib/serviceLegalClient';
import { BRAND, SERVICE_KEY } from '../../config/service';

const LEGAL_SETTINGS_LINK = '/admin/settings/legal-terms';

/** 공개 화면(`/terms` · `/privacy`)이 요구하는 최소 문서 종류. */
const REQUIRED_DOCUMENT_TYPES: { type: string; label: string }[] = [
  { type: 'terms_of_service', label: '이용약관' },
  { type: 'privacy_policy', label: '개인정보처리방침' },
];

/** 법정정보 필수 항목 — 공개 푸터/사업자정보에 실제로 노출되는 필드. */
const REQUIRED_PROFILE_FIELDS: (keyof ServiceLegalProfileDto)[] = [
  'companyName',
  'representativeName',
  'businessRegistrationNumber',
  'businessAddress',
  'customerServicePhone',
  'customerServiceEmail',
];

interface LegalState {
  profile: ServiceLegalProfileDto | null;
  policies: ServicePolicyDocumentDto[];
}

function countFilledProfileFields(profile: ServiceLegalProfileDto | null): number {
  if (!profile) return 0;
  return REQUIRED_PROFILE_FIELDS.filter((f) => {
    const v = profile[f];
    return typeof v === 'string' && v.trim().length > 0;
  }).length;
}

function buildConfig({ profile, policies }: LegalState): AdminDashboardConfig {
  const filled = countFilledProfileFields(profile);
  const total = REQUIRED_PROFILE_FIELDS.length;
  const published = policies.filter((p) => p.status === 'published');
  const drafts = policies.filter((p) => p.status === 'draft');

  const structureMetrics: StructureMetric[] = [
    {
      key: 'legal-profile',
      label: '법정정보 필수 항목',
      value: `${filled}/${total}`,
      status: filled === total ? 'stable' : filled === 0 ? 'critical' : 'attention',
    },
    {
      key: 'policies-published',
      label: '게시중 정책 문서',
      value: published.length,
      status: published.length >= REQUIRED_DOCUMENT_TYPES.length ? 'stable' : 'attention',
    },
    { key: 'policies-draft', label: '작성중(draft) 문서', value: drafts.length },
    { key: 'policies-total', label: '전체 정책 문서', value: policies.length },
  ];

  const policyItems: PolicyItem[] = [
    {
      key: 'legal-profile',
      label: '법정정보(사업자 정보)',
      status: filled === total ? 'configured' : filled === 0 ? 'not_configured' : 'partial',
      link: LEGAL_SETTINGS_LINK,
    },
    ...REQUIRED_DOCUMENT_TYPES.map(({ type, label }) => {
      const doc = published.find((p) => p.documentType === type);
      const draft = drafts.find((p) => p.documentType === type);
      return {
        key: type,
        label,
        status: doc ? ('configured' as const) : draft ? ('partial' as const) : ('not_configured' as const),
        version: doc ? `v${doc.version}` : undefined,
        link: LEGAL_SETTINGS_LINK,
      };
    }),
  ];

  const governanceAlerts: GovernanceAlert[] = [];
  if (filled < total) {
    governanceAlerts.push({
      id: 'legal-profile-incomplete',
      message: `법정정보 필수 항목이 ${total - filled}건 비어 있습니다. 공개 화면의 사업자 정보가 불완전하게 표시됩니다.`,
      level: filled === 0 ? 'critical' : 'warning',
      link: LEGAL_SETTINGS_LINK,
    });
  }
  REQUIRED_DOCUMENT_TYPES.forEach(({ type, label }) => {
    if (!published.some((p) => p.documentType === type)) {
      governanceAlerts.push({
        id: `policy-missing-${type}`,
        message: `${label}이(가) 게시되지 않았습니다. 공개 화면에서 문서를 볼 수 없습니다.`,
        level: 'critical',
        link: LEGAL_SETTINGS_LINK,
      });
    }
  });

  return {
    structureMetrics,
    policies: policyItems,
    governanceAlerts,
    structureActions: [
      {
        id: 'legal-terms',
        label: '법정정보·약관 설정',
        link: LEGAL_SETTINGS_LINK,
        icon: 'settings',
        description: '사업자 정보 · 이용약관 · 개인정보처리방침 작성과 게시',
      },
    ],
  };
}

export default function PharmacyHubAdminDashboard() {
  const [state, setState] = useState<LegalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, policies] = await Promise.all([
        legalApi.getLegalProfile(SERVICE_KEY),
        legalApi.listPolicies(SERVICE_KEY),
      ]);
      setState({ profile: profile ?? null, policies: policies ?? [] });
    } catch (e: any) {
      setError(e?.message ?? '관리자 데이터를 불러오지 못했습니다.');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-slate-500">{error ?? '데이터를 불러올 수 없습니다.'}</p>
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">관리자 대시보드</h1>
          <p className="mt-1 text-sm text-slate-500">
            {BRAND.name} 서비스의 구조·정책(법정정보·약관)을 관리합니다. 가입 승인 등 일상 운영은
            운영 대시보드에서 처리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          새로고침
        </button>
      </div>

      <AdminDashboardLayout config={buildConfig(state)} />
    </div>
  );
}
