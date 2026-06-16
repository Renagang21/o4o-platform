/**
 * ServiceLegalSettingsPage — 공통 "법정정보·약관 설정" Admin UI
 *
 * WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1
 *
 * 4 service 공통 컴포넌트. serviceKey + api 어댑터 주입으로 동작.
 * 3 탭: 법정정보 / 정책 문서 / 공개 상태 확인.
 *
 * 원칙:
 *   - placeholder 자동 입력/실값 seed 없음. 빈 값 저장 가능(백엔드가 ''→null).
 *   - 게시된 정책 문서만 공개됨을 안내(법적 "준수 완료" 류 표현 금지).
 *   - 권한 오류(403)는 우회하지 않고 메시지로 표시.
 *
 * 스타일: 공통 모듈 관례에 따라 inline style (서비스 Tailwind purge 비의존).
 */

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import {
  POLICY_DOCUMENT_TYPES,
  type ServiceLegalProfileDto,
  type ServiceLegalProfileInput,
  type ServicePolicyDocumentDto,
  type ServicePolicyDocumentInput,
  type ServiceLegalSettingsPageProps,
  type ServiceLegalTabKey,
} from './types';

// ── styles ──
const S = {
  page: { maxWidth: 920, margin: '0 auto', padding: '24px 16px' } as CSSProperties,
  h1: { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' } as CSSProperties,
  lead: { color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' } as CSSProperties,
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 20 } as CSSProperties,
  tab: (active: boolean): CSSProperties => ({
    padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    color: active ? '#0f172a' : '#94a3b8', background: 'none', border: 'none',
    borderBottom: active ? '2px solid #0f172a' : '2px solid transparent',
  }),
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 } as CSSProperties,
  groupTitle: { fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 12px' } as CSSProperties,
  field: { marginBottom: 12 } as CSSProperties,
  label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 } as CSSProperties,
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8 } as CSSProperties,
  textarea: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, minHeight: 80, fontFamily: 'inherit' } as CSSProperties,
  btnPrimary: { padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#fff', background: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer' } as CSSProperties,
  btnGhost: { padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#334155', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' } as CSSProperties,
  help: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginTop: 10 } as CSSProperties,
  banner: (type: 'success' | 'error'): CSSProperties => ({
    padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
    background: type === 'success' ? '#ecfdf5' : '#fef2f2',
    color: type === 'success' ? '#047857' : '#b91c1c',
    border: `1px solid ${type === 'success' ? '#a7f3d0' : '#fecaca'}`,
  }),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 10px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', fontSize: 12 },
  td: { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  badge: (color: string, bg: string): CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, color, background: bg,
  }),
  statusRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' } as CSSProperties,
};

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

  const publishedByType = useMemo(() => {
    const m: Record<string, ServicePolicyDocumentDto> = {};
    for (const p of policies) if (p.status === 'published') m[p.documentType] = p;
    return m;
  }, [policies]);

  const profileHasAnyValue = useMemo(
    () => PROFILE_FIELD_KEYS.some((k) => (form[k as string] ?? '').trim().length > 0),
    [form],
  );

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{title ?? '서비스 설정 — 법정정보·약관'}</h1>
      <p style={S.lead}>
        서비스별 법정정보와 약관 문서를 관리합니다. 입력되지 않은 법정정보 항목은 공개 푸터에서 표시되지 않습니다.
        사업자등록번호, 통신판매업 신고번호, 대표자명, 주소 등은 실제 확인된 정보만 입력해야 합니다.
        <br />대상 서비스: <strong>{serviceKey}</strong>
      </p>

      <div style={S.tabs}>
        {showProfile && <button style={S.tab(tab === 'profile')} onClick={() => setTab('profile')}>법정정보</button>}
        {showPolicies && <button style={S.tab(tab === 'policies')} onClick={() => setTab('policies')}>정책 문서</button>}
        {showStatus && <button style={S.tab(tab === 'status')} onClick={() => setTab('status')}>공개 상태 확인</button>}
      </div>

      {message && <div style={S.banner(message.type)}>{message.text}</div>}

      {/* ── 법정정보 탭 ── */}
      {tab === 'profile' && (
        profileLoading ? <div style={S.card}>불러오는 중…</div> : (
          <>
            {PROFILE_GROUPS.map((group) => (
              <div key={group.title} style={S.card}>
                <p style={S.groupTitle}>{group.title}</p>
                {group.fields.map((f) => (
                  <div key={f.key as string} style={S.field}>
                    <label style={S.label}>{f.label}</label>
                    {f.multiline ? (
                      <textarea
                        style={S.textarea}
                        value={form[f.key as string] ?? ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key as string]: e.target.value }))}
                      />
                    ) : (
                      <input
                        style={S.input}
                        value={form[f.key as string] ?? ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key as string]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div style={S.card}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155' }}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                공개 사용(활성). 해제 시 공개 화면에서 법정정보가 표시되지 않습니다.
              </label>
              <p style={S.help}>값이 입력되지 않은 항목은 공개 푸터에서 표시되지 않습니다. (빈 값으로 저장 가능)</p>
              <div style={{ marginTop: 12 }}>
                <button style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSaveProfile}>
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
          <div style={{ marginBottom: 12 }}>
            <button style={S.btnPrimary} onClick={openNewDoc}>새 문서</button>
          </div>
          <p style={S.help}>게시된 정책 문서만 공개 화면에서 조회됩니다. 정책 문서는 시행일과 버전을 함께 관리하는 것을 권장합니다.</p>

          {editing && (
            <div style={S.card}>
              <p style={S.groupTitle}>{editing === 'new' ? '새 정책 문서' : '정책 문서 수정'}</p>
              <div style={S.field}>
                <label style={S.label}>문서 유형</label>
                <select
                  style={S.input}
                  value={docForm.documentType}
                  disabled={editing !== 'new'}
                  onChange={(e) => setDocForm((p) => ({ ...p, documentType: e.target.value }))}
                >
                  {POLICY_DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>제목</label>
                <input style={S.input} value={docForm.title ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div style={S.field}>
                <label style={S.label}>본문</label>
                <textarea style={{ ...S.textarea, minHeight: 220 }} value={docForm.content ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, content: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={S.label}>버전</label>
                  <input style={S.input} type="number" min={1} value={docForm.version ?? 1} onChange={(e) => setDocForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))} />
                </div>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={S.label}>시행일</label>
                  <input style={S.input} type="date" value={docForm.effectiveDate ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, effectiveDate: e.target.value || null }))} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>변경 사유</label>
                <input style={S.input} value={docForm.changeReason ?? ''} onChange={(e) => setDocForm((p) => ({ ...p, changeReason: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={{ ...S.btnPrimary, opacity: docSaving ? 0.6 : 1 }} disabled={docSaving} onClick={handleSaveDoc}>
                  {docSaving ? '저장 중…' : '초안 저장'}
                </button>
                <button style={S.btnGhost} onClick={() => setEditing(null)}>취소</button>
              </div>
            </div>
          )}

          <div style={S.card}>
            {policiesLoading ? '불러오는 중…' : policies.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>등록된 정책 문서가 없습니다.</p>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>유형</th><th style={S.th}>제목</th><th style={S.th}>버전</th>
                    <th style={S.th}>상태</th><th style={S.th}>시행일</th><th style={S.th}>게시일</th><th style={S.th}>수정일</th><th style={S.th}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((d) => (
                    <tr key={d.id}>
                      <td style={S.td}>{docTypeLabel(d.documentType)}</td>
                      <td style={S.td}>{d.title}</td>
                      <td style={S.td}>v{d.version}</td>
                      <td style={S.td}>
                        {d.status === 'published'
                          ? <span style={S.badge('#047857', '#ecfdf5')}>published</span>
                          : <span style={S.badge('#92400e', '#fef3c7')}>{d.status}</span>}
                      </td>
                      <td style={S.td}>{fmtDate(d.effectiveDate)}</td>
                      <td style={S.td}>{fmtDate(d.publishedAt)}</td>
                      <td style={S.td}>{fmtDate(d.updatedAt)}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={S.btnGhost} onClick={() => openEditDoc(d)}>편집</button>
                          {d.status === 'published'
                            ? <button style={S.btnGhost} onClick={() => handlePublish(d, 'unpublish')}>게시해제</button>
                            : <button style={S.btnGhost} onClick={() => handlePublish(d, 'publish')}>게시</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── 공개 상태 확인 탭 ── */}
      {tab === 'status' && (
        <div style={S.card}>
          <p style={S.groupTitle}>입력·게시 상태 (참고용 — 법적 준수 판정 아님)</p>
          <div style={S.statusRow}>
            <span>법정정보 공개 활성</span>
            <span>{profile?.isActive !== false && profile ? '활성' : '비활성/미설정'}</span>
          </div>
          <div style={S.statusRow}>
            <span>법정정보 입력 항목 존재</span>
            <span>{profileHasAnyValue ? '입력 있음' : '확인 필요'}</span>
          </div>
          <div style={S.statusRow}>
            <span>이용약관(terms) 게시</span>
            <span>{publishedByType['terms'] ? `게시됨 (v${publishedByType['terms'].version})` : '확인 필요'}</span>
          </div>
          <div style={S.statusRow}>
            <span>개인정보처리방침(privacy) 게시</span>
            <span>{publishedByType['privacy'] ? `게시됨 (v${publishedByType['privacy'].version})` : '확인 필요'}</span>
          </div>
          <p style={S.help}>
            "확인 필요"는 미입력/미게시를 의미합니다. 공개 푸터·정책 페이지 연동은 후속 작업에서 처리되며,
            본 화면은 입력·게시 상태만 표시합니다.
          </p>
        </div>
      )}
    </div>
  );
}
