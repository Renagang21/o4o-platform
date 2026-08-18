/**
 * ServiceLegalSettingsPage — 공통 "법정정보·약관 설정" Admin UI
 *
 * WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1
 *
 * 5 service 공통 컴포넌트. serviceKey + api 어댑터 주입으로 동작.
 * 3 탭: 법정정보 / 정책 문서 / 공개 상태 확인.
 *
 * 원칙:
 *   - placeholder 자동 입력/실값 seed 없음. 빈 값 저장 가능(백엔드가 ''→null).
 *   - 게시된 정책 문서만 공개됨을 안내(법적 "준수 완료" 류 표현 금지).
 *   - 권한 오류(403)는 우회하지 않고 메시지로 표시.
 *
 * WO-O4O-CROSS-SERVICE-RAW-TABLE-STANDARDIZATION-BATCH-V2:
 *   페이지 단위 표준화 — 정책 문서 목록을 표준 `DataTable`(@o4o/operator-ux-core) +
 *   `RowActionMenu`(편집/게시·게시해제)로 전환하고, 페이지 전체 inline style 을 Tailwind 로 교체했다.
 *   기존의 "inline style (서비스 Tailwind purge 비의존)" 관례는 표준 Tailwind 통일 결정으로 폐기.
 *   서비스별 차이는 기존 props(serviceKey / title / enabledTabs / api)로만 처리하며
 *   공용 컴포넌트에 서비스명 조건문·전용 CSS 를 추가하지 않는다.
 *   편집 폼·게시 동작 계약은 변경하지 않았다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { RowActionMenu } from '@o4o/ui';
import {
  POLICY_DOCUMENT_TYPES,
  type ServiceLegalProfileDto,
  type ServiceLegalProfileInput,
  type ServicePolicyDocumentDto,
  type ServicePolicyDocumentInput,
  type ServiceLegalSettingsPageProps,
  type ServiceLegalTabKey,
} from './types';

// ── Tailwind class tokens (inline style 대체) ──
const C = {
  page: 'max-w-[920px] mx-auto px-4 py-6',
  h1: 'text-xl font-bold text-slate-900 mb-1',
  lead: 'text-sm text-slate-500 leading-relaxed mb-4',
  tabs: 'flex gap-1 border-b border-slate-200 mb-5',
  tab: (active: boolean) =>
    `px-4 py-2.5 text-sm font-semibold cursor-pointer bg-transparent border-none border-b-2 ${
      active ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent'
    }`,
  card: 'bg-white border border-slate-200 rounded-xl p-5 mb-4',
  groupTitle: 'text-[13px] font-bold text-slate-700 mb-3',
  field: 'mb-3',
  label: 'block text-xs text-slate-500 mb-1',
  input: 'w-full box-border px-2.5 py-2 text-sm border border-slate-300 rounded-lg',
  textarea: 'w-full box-border px-2.5 py-2 text-sm border border-slate-300 rounded-lg min-h-20 font-[inherit]',
  btnPrimary:
    'px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60',
  btnGhost:
    'px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40',
  help: 'text-xs text-slate-400 leading-relaxed mt-2.5',
  banner: (type: 'success' | 'error') =>
    `px-3.5 py-2.5 rounded-lg text-sm mb-4 border ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-700 border-red-200'
    }`,
  statusRow: 'flex justify-between py-2.5 border-b border-slate-100 text-sm text-slate-700',
};

/** 상태 배지 — O4O 표준 Tailwind 배지 패턴 */
function policyStatusBadge(status: string) {
  const cls = status === 'published'
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'archived'
      ? 'bg-slate-100 text-slate-600'
      : 'bg-amber-100 text-amber-800';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{status}</span>;
}

type TabKey = ServiceLegalTabKey;
const ALL_TABS: TabKey[] = ['profile', 'policies', 'status'];

interface ProfileFieldDef { key: keyof ServiceLegalProfileInput; label: string; multiline?: boolean }
const PROFILE_GROUPS: { title: string; fields: ProfileFieldDef[] }[] = [
  { title: '사업자 기본정보', fields: [
    { key: 'companyName', label: '상호' },
    { key: 'representativeName', label: '대표자명' },
    { key: 'businessRegistrationNumber', label: '사업자등록번호' },
    { key: 'businessAddress', label: '사업장 주소' },
  ]},
  { title: '고객문의 정보', fields: [
    { key: 'customerServicePhone', label: '고객문의 전화' },
    { key: 'customerServiceEmail', label: '고객문의 이메일' },
  ]},
  { title: '통신판매 정보', fields: [
    { key: 'ecommerceRegistrationNumber', label: '통신판매업 신고번호' },
    { key: 'ecommerceRegistrationAgency', label: '신고기관' },
    { key: 'businessInfoVerificationUrl', label: '사업자정보확인 URL' },
  ]},
  { title: '개인정보보호 정보', fields: [
    { key: 'privacyOfficerName', label: '개인정보보호책임자명' },
    { key: 'privacyOfficerEmail', label: '개인정보보호 이메일' },
    { key: 'privacyOfficerPhone', label: '개인정보보호 전화' },
  ]},
  { title: '호스팅/거래안전 정보', fields: [
    { key: 'hostingProvider', label: '호스팅 제공자' },
    { key: 'purchaseSafetyServiceInfo', label: '구매안전서비스 안내', multiline: true },
  ]},
  { title: '고지 문구', fields: [
    { key: 'mailOrderBrokerNotice', label: '통신판매중개 고지', multiline: true },
    { key: 'additionalLegalNotice', label: '추가 법적 고지', multiline: true },
  ]},
];
const PROFILE_FIELD_KEYS = PROFILE_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

function emptyProfileForm(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of PROFILE_FIELD_KEYS) o[k as string] = '';
  return o;
}

function docTypeLabel(t: string): string {
  return POLICY_DOCUMENT_TYPES.find((d) => d.value === t)?.label ?? t;
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

export function ServiceLegalSettingsPage({ serviceKey, api, title, enabledTabs }: ServiceLegalSettingsPageProps) {
  // WO-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1: 일부 서비스는 정책문서 탭을 숨긴다(법정정보만).
  const allowedTabs: TabKey[] = enabledTabs && enabledTabs.length > 0 ? enabledTabs : ALL_TABS;
  const showProfile = allowedTabs.includes('profile');
  const showPolicies = allowedTabs.includes('policies');
  const showStatus = allowedTabs.includes('status');

  const [tab, setTab] = useState<TabKey>(allowedTabs[0]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── profile state ──
  const [profile, setProfile] = useState<ServiceLegalProfileDto | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyProfileForm());
  const [isActive, setIsActive] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── policies state ──
  const [policies, setPolicies] = useState<ServicePolicyDocumentDto[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [editing, setEditing] = useState<ServicePolicyDocumentDto | 'new' | null>(null);
  const [docForm, setDocForm] = useState<ServicePolicyDocumentInput>({ documentType: 'terms', title: '', content: '', version: 1 });
  const [docSaving, setDocSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const p = await api.getLegalProfile(serviceKey);
      setProfile(p);
      const next = emptyProfileForm();
      if (p) {
        for (const k of PROFILE_FIELD_KEYS) {
          const v = (p as any)[k];
          next[k as string] = v == null ? '' : String(v);
        }
        setIsActive(p.isActive !== false);
      }
      setForm(next);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '법정정보를 불러오지 못했습니다.' });
    } finally {
      setProfileLoading(false);
    }
  }, [api, serviceKey]);

  const loadPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    try {
      setPolicies(await api.listPolicies(serviceKey));
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '정책 문서를 불러오지 못했습니다.' });
    } finally {
      setPoliciesLoading(false);
    }
  }, [api, serviceKey]);

  useEffect(() => {
    if (showProfile) loadProfile();
    // 정책문서 탭/공개상태 탭이 숨겨진 서비스는 service_policy_documents 를 조회하지 않는다.
    if (showPolicies || showStatus) loadPolicies();
  }, [loadProfile, loadPolicies, showProfile, showPolicies, showStatus]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: ServiceLegalProfileInput = { isActive };
      for (const k of PROFILE_FIELD_KEYS) {
        (payload as any)[k] = form[k as string] ?? '';
      }
      const saved = await api.updateLegalProfile(serviceKey, payload);
      setProfile(saved);
      setMessage({ type: 'success', text: '법정정보가 저장되었습니다.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const openNewDoc = () => {
    setDocForm({ documentType: 'terms', title: '', content: '', version: 1, effectiveDate: null, changeReason: '' });
    setEditing('new');
  };
  const openEditDoc = (d: ServicePolicyDocumentDto) => {
    setDocForm({
      documentType: d.documentType, title: d.title, content: d.content, version: d.version,
      slug: d.slug, effectiveDate: d.effectiveDate ? d.effectiveDate.slice(0, 10) : null, changeReason: d.changeReason ?? '',
    });
    setEditing(d);
  };

  const handleSaveDoc = async () => {
    setDocSaving(true);
    setMessage(null);
    try {
      if (editing === 'new') {
        await api.createPolicy(serviceKey, docForm);
        setMessage({ type: 'success', text: '정책 문서 초안이 생성되었습니다.' });
      } else if (editing) {
        await api.updatePolicy(serviceKey, editing.id, docForm);
        setMessage({ type: 'success', text: '정책 문서가 수정되었습니다.' });
      }
      setEditing(null);
      await loadPolicies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '정책 문서 저장에 실패했습니다.' });
    } finally {
      setDocSaving(false);
    }
  };

  const handlePublish = async (d: ServicePolicyDocumentDto, action: 'publish' | 'unpublish') => {
    setMessage(null);
    try {
      await api.publishPolicy(serviceKey, d.id, action);
      setMessage({ type: 'success', text: action === 'publish' ? '게시되었습니다.' : '게시 해제되었습니다.' });
      await loadPolicies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '게시 처리에 실패했습니다.' });
    }
  };

  const handleLifecycle = async (d: ServicePolicyDocumentDto, action: 'archive' | 'restore') => {
    setMessage(null);
    try {
      await api.changePolicyLifecycle(serviceKey, d.id, action);
      setMessage({ type: 'success', text: action === 'archive' ? '문서가 보관되었습니다.' : '문서가 초안으로 복원되었습니다.' });
      if (editing !== 'new' && editing?.id === d.id) setEditing(null);
      await loadPolicies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '문서 보관 처리에 실패했습니다.' });
    }
  };

  const publishedByType = useMemo(() => {
    const m: Record<string, ServicePolicyDocumentDto> = {};
    for (const p of policies) if (p.status === 'published') m[p.documentType] = p;
    return m;
  }, [policies]);

  const profileHasAnyValue = useMemo(
    () => PROFILE_FIELD_KEYS.some((k) => (form[k as string] ?? '').trim().length > 0),
    [form],
  );

  // WO-…-BATCH-V2: 정책 문서 목록 컬럼. 행 액션(편집/게시·게시해제)은 RowActionMenu 로 이관.
  const policyColumns: ListColumnDef<ServicePolicyDocumentDto>[] = [
    { key: 'documentType', header: '유형', width: '140px', render: (_v, d) => docTypeLabel(d.documentType) },
    { key: 'title', header: '제목', minWidth: 180, render: (_v, d) => d.title },
    { key: 'version', header: '버전', width: '80px', render: (_v, d) => `v${d.version}` },
    { key: 'status', header: '상태', width: '110px', render: (_v, d) => policyStatusBadge(d.status) },
    { key: 'effectiveDate', header: '시행일', width: '110px', render: (_v, d) => fmtDate(d.effectiveDate) },
    { key: 'publishedAt', header: '게시일', width: '110px', render: (_v, d) => fmtDate(d.publishedAt) },
    { key: 'updatedAt', header: '수정일', width: '110px', render: (_v, d) => fmtDate(d.updatedAt) },
    {
      key: '_actions',
      header: '관리',
      width: '72px',
      align: 'center',
      system: true,
      render: (_v, d) => (
        <RowActionMenu
          actions={[
            ...(d.status === 'archived'
              ? [{ key: 'restore', label: '초안으로 복원', onClick: () => handleLifecycle(d, 'restore') }]
              : [
                  { key: 'edit', label: '편집', onClick: () => openEditDoc(d) },
                  d.status === 'published'
                    ? { key: 'unpublish', label: '게시해제', onClick: () => handlePublish(d, 'unpublish') }
                    : { key: 'publish', label: '게시', onClick: () => handlePublish(d, 'publish') },
                  ...(d.status === 'draft'
                    ? [{
                        key: 'archive',
                        label: '보관',
                        onClick: () => handleLifecycle(d, 'archive'),
                        confirm: { title: '정책 문서 보관', message: `“${d.title}” 문서를 보관하시겠습니까?` },
                      }]
                    : []),
                ]),
          ]}
        />
      ),
    },
  ];

  return (
    <div className={C.page}>
      <h1 className={C.h1}>{title ?? '서비스 설정 — 법정정보·약관'}</h1>
      <p className={C.lead}>
        서비스별 법정정보와 약관 문서를 관리합니다. 입력되지 않은 법정정보 항목은 공개 푸터에서 표시되지 않습니다.
        사업자등록번호, 통신판매업 신고번호, 대표자명, 주소 등은 실제 확인된 정보만 입력해야 합니다.
        <br />대상 서비스: <strong>{serviceKey}</strong>
      </p>

      <div className={C.tabs}>
        {showProfile && <button className={C.tab(tab === 'profile')} onClick={() => setTab('profile')}>법정정보</button>}
        {showPolicies && <button className={C.tab(tab === 'policies')} onClick={() => setTab('policies')}>정책 문서</button>}
        {showStatus && <button className={C.tab(tab === 'status')} onClick={() => setTab('status')}>공개 상태 확인</button>}
      </div>

      {message && <div className={C.banner(message.type)}>{message.text}</div>}

      {/* ── 법정정보 탭 ── */}
      {tab === 'profile' && (
        profileLoading ? <div className={C.card}>불러오는 중…</div> : (
          <>
            {PROFILE_GROUPS.map((group) => (
              <div key={group.title} className={C.card}>
                <p className={C.groupTitle}>{group.title}</p>
                {group.fields.map((f) => (
                  <div key={f.key as string} className={C.field}>
                    <label className={C.label}>{f.label}</label>
                    {f.multiline ? (
                      <textarea
                        className={C.textarea}
                        value={form[f.key as string] ?? ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key as string]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className={C.input}
                        value={form[f.key as string] ?? ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key as string]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div className={C.card}>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                공개 사용(활성). 해제 시 공개 화면에서 법정정보가 표시되지 않습니다.
              </label>
              <p className={C.help}>값이 입력되지 않은 항목은 공개 푸터에서 표시되지 않습니다. (빈 값으로 저장 가능)</p>
              <div className="mt-3">
                <button className={C.btnPrimary} disabled={saving} onClick={handleSaveProfile}>
                  {saving ? '저장 중…' : '법정정보 저장'}
                </button>
              </div>
            </div>
          </>
        )
      )}

      {/* ── 정책 문서 탭 ── */}
      {tab === 'policies' && (
        <>
          <div className="mb-3">
            <button className={C.btnPrimary} onClick={openNewDoc}>새 문서</button>
          </div>
          <p className={C.help}>게시된 정책 문서만 공개 화면에서 조회됩니다. 정책 문서는 시행일과 버전을 함께 관리하는 것을 권장합니다.</p>

          {editing && (
            <div className={C.card}>
              <p className={C.groupTitle}>{editing === 'new' ? '새 정책 문서' : '정책 문서 수정'}</p>
              <div className={C.field}>
                <label className={C.label}>문서 유형</label>
                <select
                  className={C.input}
                  value={docForm.documentType}
                  disabled={editing !== 'new'}
                  onChange={(e) => setDocForm((p) => ({ ...p, documentType: e.target.value }))}
                >
                  {POLICY_DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className={C.field}>
                <label className={C.label}>제목</label>
                <input className={C.input} value={docForm.title ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className={C.field}>
                <label className={C.label}>본문</label>
                <textarea className={`${C.textarea} min-h-[220px]`} value={docForm.content ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, content: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <div className={`${C.field} flex-1`}>
                  <label className={C.label}>버전</label>
                  <input className={C.input} type="number" min={1} value={docForm.version ?? 1} onChange={(e) => setDocForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))} />
                </div>
                <div className={`${C.field} flex-1`}>
                  <label className={C.label}>시행일</label>
                  <input className={C.input} type="date" value={docForm.effectiveDate ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, effectiveDate: e.target.value || null }))} />
                </div>
              </div>
              <div className={C.field}>
                <label className={C.label}>변경 사유</label>
                <input className={C.input} value={docForm.changeReason ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, changeReason: e.target.value }))} />
              </div>
              <div className="flex gap-2 mt-2">
                <button className={C.btnPrimary} disabled={docSaving} onClick={handleSaveDoc}>
                  {docSaving ? '저장 중…' : '초안 저장'}
                </button>
                <button className={C.btnGhost} onClick={() => setEditing(null)}>취소</button>
              </div>
            </div>
          )}

          {/* WO-…-BATCH-V2: 정책 문서 목록 — 표준 DataTable + RowActionMenu.
              읽기 위주 목록이며 일괄 작업이 정의되어 있지 않아 체크박스/ActionBar 는 두지 않는다. */}
          <DataTable<ServicePolicyDocumentDto>
            columns={policyColumns}
            data={policies}
            rowKey={(d) => d.id}
            loading={policiesLoading}
            emptyMessage="등록된 정책 문서가 없습니다."
          />
        </>
      )}

      {/* ── 공개 상태 확인 탭 ── */}
      {tab === 'status' && (
        <div className={C.card}>
          <p className={C.groupTitle}>입력·게시 상태 (참고용 — 법적 준수 판정 아님)</p>
          <div className={C.statusRow}>
            <span>법정정보 공개 활성</span>
            <span>{profile?.isActive !== false && profile ? '활성' : '비활성/미설정'}</span>
          </div>
          <div className={C.statusRow}>
            <span>법정정보 입력 항목 존재</span>
            <span>{profileHasAnyValue ? '입력 있음' : '확인 필요'}</span>
          </div>
          <div className={C.statusRow}>
            <span>이용약관(terms) 게시</span>
            <span>{publishedByType['terms'] ? `게시됨 (v${publishedByType['terms'].version})` : '확인 필요'}</span>
          </div>
          <div className={C.statusRow}>
            <span>개인정보처리방침(privacy) 게시</span>
            <span>{publishedByType['privacy'] ? `게시됨 (v${publishedByType['privacy'].version})` : '확인 필요'}</span>
          </div>
          <p className={C.help}>
            "확인 필요"는 미입력/미게시를 의미합니다. 공개 푸터·정책 페이지 연동은 후속 작업에서 처리되며,
            본 화면은 입력·게시 상태만 표시합니다.
          </p>
        </div>
      )}
    </div>
  );
}
