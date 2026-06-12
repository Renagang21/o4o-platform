/**
 * ContactInquiryAdminPage — 공통 "문의 관리" Admin UI (GP/KCos)
 *
 * WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1
 *
 * serviceKey + api 어댑터 주입. 목록(상태 필터/페이지) + 상세(본문/상태 변경/내부 메모).
 * 본문은 plain text(whitespace-pre-wrap) — dangerouslySetInnerHTML 미사용(XSS 회피).
 * 스타일: inline (서비스 Tailwind 비의존).
 */

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import {
  CONTACT_STATUSES,
  type ContactInquiryDetail,
  type ContactInquiryListItem,
  type ContactInquiryListResult,
  type ContactInquiryAdminPageProps,
} from './types';

const STATUS_LABEL: Record<string, string> = Object.fromEntries(CONTACT_STATUSES.map((s) => [s.value, s.label]));

const S = {
  page: { maxWidth: 1000, margin: '0 auto', padding: '24px 16px' } as CSSProperties,
  h1: { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' } as CSSProperties,
  lead: { color: '#64748b', fontSize: 13, margin: '0 0 16px' } as CSSProperties,
  bar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' } as CSSProperties,
  select: { padding: '7px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8 } as CSSProperties,
  btnGhost: { padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#334155', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' } as CSSProperties,
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' } as CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 } as CSSProperties,
  th: { textAlign: 'left', padding: '9px 10px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', fontSize: 12 } as CSSProperties,
  td: { padding: '9px 10px', borderBottom: '1px solid #f1f5f9', color: '#334155' } as CSSProperties,
  badge: (c: string, b: string): CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: c, background: b }),
  state: { padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 } as CSSProperties,
  banner: (t: 'success' | 'error'): CSSProperties => ({ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, background: t === 'success' ? '#ecfdf5' : '#fef2f2', color: t === 'success' ? '#047857' : '#b91c1c', border: `1px solid ${t === 'success' ? '#a7f3d0' : '#fecaca'}` }),
  // detail panel
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 } as CSSProperties,
  drawer: { width: 'min(560px, 100%)', height: '100%', background: '#fff', overflowY: 'auto', padding: 24, boxSizing: 'border-box' } as CSSProperties,
  dh: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 } as CSSProperties,
  dTitle: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 } as CSSProperties,
  field: { marginBottom: 12 } as CSSProperties,
  label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 3 } as CSSProperties,
  value: { fontSize: 14, color: '#1e293b' } as CSSProperties,
  body: { fontSize: 14, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 } as CSSProperties,
  textarea: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, minHeight: 80, fontFamily: 'inherit' } as CSSProperties,
  btnPrimary: { padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#fff', background: '#0f172a', border: 'none', borderRadius: 8, cursor: 'pointer' } as CSSProperties,
};

function statusBadge(status: string) {
  const label = STATUS_LABEL[status] || status;
  const map: Record<string, [string, string]> = {
    received: ['#1d4ed8', '#dbeafe'],
    in_review: ['#92400e', '#fef3c7'],
    answered: ['#047857', '#ecfdf5'],
    closed: ['#475569', '#f1f5f9'],
    spam: ['#b91c1c', '#fef2f2'],
  };
  const [c, b] = map[status] || ['#475569', '#f1f5f9'];
  return <span style={S.badge(c, b)}>{label}</span>;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return '-'; }
}

export function ContactInquiryAdminPage({ serviceKey, api, inquiryTypeLabels = {}, title }: ContactInquiryAdminPageProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [result, setResult] = useState<ContactInquiryListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detail, setDetail] = useState<ContactInquiryDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState('');
  const [detailNote, setDetailNote] = useState('');
  const [saving, setSaving] = useState(false);

  const typeLabel = (t: string) => inquiryTypeLabels[t] || t;

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await api.list(serviceKey, { status: statusFilter || undefined, page, limit: 20 });
      setResult(r);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '문의 목록을 불러오지 못했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [api, serviceKey, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const openDetail = async (id: string) => {
    setMessage(null);
    try {
      const d = await api.getDetail(serviceKey, id);
      setDetail(d);
      setDetailStatus(d.status);
      setDetailNote(d.internalNote ?? '');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '문의 상세를 불러오지 못했습니다.' });
    }
  };

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    setMessage(null);
    try {
      let updated = detail;
      if (detailStatus !== detail.status) updated = await api.setStatus(serviceKey, detail.id, detailStatus);
      if (detailNote !== (detail.internalNote ?? '')) updated = await api.setNote(serviceKey, detail.id, detailNote);
      setDetail(updated);
      setMessage({ type: 'success', text: '저장되었습니다.' });
      await load(result?.pagination.page ?? 1);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{title ?? '문의 관리'}</h1>
      <p style={S.lead}>공개 문의(Contact)로 접수된 내역을 확인·처리합니다. 대상 서비스: <strong>{serviceKey}</strong></p>

      {message && <div style={S.banner(message.type)}>{message.text}</div>}

      <div style={S.bar}>
        <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button style={S.btnGhost} onClick={() => load(1)}>새로고침</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={S.state}>불러오는 중…</div> : !result || result.items.length === 0 ? (
          <div style={S.state}>접수된 문의가 없습니다.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>접수일</th><th style={S.th}>유형</th><th style={S.th}>제목</th>
                <th style={S.th}>이름</th><th style={S.th}>소속</th><th style={S.th}>상태</th><th style={S.th}>처리일</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((i: ContactInquiryListItem) => (
                <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(i.id)}>
                  <td style={S.td}>{fmt(i.createdAt)}</td>
                  <td style={S.td}>{typeLabel(i.inquiryType)}</td>
                  <td style={{ ...S.td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.subject}>{i.subject}</td>
                  <td style={S.td}>{i.name}</td>
                  <td style={S.td}>{i.organizationName || '-'}</td>
                  <td style={S.td}>{statusBadge(i.status)}</td>
                  <td style={S.td}>{i.handledAt ? fmt(i.handledAt) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {result && result.pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginTop: 14 }}>
          <button style={S.btnGhost} disabled={result.pagination.page <= 1} onClick={() => load(result.pagination.page - 1)}>이전</button>
          <span style={{ fontSize: 13, color: '#64748b' }}>{result.pagination.page} / {result.pagination.totalPages}</span>
          <button style={S.btnGhost} disabled={result.pagination.page >= result.pagination.totalPages} onClick={() => load(result.pagination.page + 1)}>다음</button>
        </div>
      )}

      {detail && (
        <div style={S.overlay} onClick={() => setDetail(null)}>
          <div style={S.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={S.dh}>
              <h2 style={S.dTitle}>{detail.subject}</h2>
              <button style={S.btnGhost} onClick={() => setDetail(null)}>닫기</button>
            </div>
            <div style={S.field}><span style={S.label}>유형</span><span style={S.value}>{typeLabel(detail.inquiryType)}</span></div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ ...S.field, flex: 1 }}><span style={S.label}>이름</span><span style={S.value}>{detail.name}</span></div>
              <div style={{ ...S.field, flex: 1 }}><span style={S.label}>이메일</span><span style={S.value}>{detail.email}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ ...S.field, flex: 1 }}><span style={S.label}>연락처</span><span style={S.value}>{detail.phone || '-'}</span></div>
              <div style={{ ...S.field, flex: 1 }}><span style={S.label}>소속</span><span style={S.value}>{detail.organizationName || '-'}</span></div>
            </div>
            <div style={S.field}><span style={S.label}>문의 내용</span><div style={S.body}>{detail.message}</div></div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ ...S.field, flex: 1 }}><span style={S.label}>접수일</span><span style={S.value}>{fmt(detail.createdAt)}</span></div>
              <div style={{ ...S.field, flex: 1 }}><span style={S.label}>알림 상태</span><span style={S.value}>{detail.notificationStatus || '-'}</span></div>
            </div>
            {detail.sourcePath && <div style={S.field}><span style={S.label}>경로</span><span style={S.value}>{detail.sourcePath}</span></div>}

            <div style={{ height: 1, background: '#e2e8f0', margin: '14px 0' }} />

            <div style={S.field}>
              <span style={S.label}>상태</span>
              <select style={{ ...S.select, width: '100%' }} value={detailStatus} onChange={(e) => setDetailStatus(e.target.value)}>
                {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <span style={S.label}>내부 메모</span>
              <textarea style={S.textarea} value={detailNote} onChange={(e) => setDetailNote(e.target.value)} />
            </div>
            <button style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
