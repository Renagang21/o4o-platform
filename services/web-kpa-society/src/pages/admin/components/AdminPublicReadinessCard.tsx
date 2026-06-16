/**
 * AdminPublicReadinessCard — KPA 관리자 공개 상태 점검 카드
 *
 * WO-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1
 *
 * 운영자가 법정정보 입력 후 공개 준비 상태를 한눈에 점검한다(읽기 전용).
 *   - 법정정보(service_legal_profiles, kpa-society) 입력/활성 여부
 *   - 이용약관 / 개인정보처리방침 게시 여부 (legacy kpa_legal_documents — public read 재사용)
 *   - 문의 설정(contact-settings) 완료 여부
 *   - 공개 footer 표시 흐름
 *
 * 정책문서 트랙은 변경하지 않는다 — 정책문서는 운영자 "법률 관리"(/operator/legal) 위치를 안내만 한다.
 * 각 조회는 독립 try/catch — 실패 시 "확인 필요" fallback(대시보드 깨짐 없음).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ArrowRight, CircleCheck, CircleAlert, CircleHelp, Circle } from 'lucide-react';
import { coreApiClient } from '../../../api/client';
import { loadPublishedPolicyDocument } from '../../../lib/legalDocument';

const SERVICE_KEY = 'kpa-society';

type Status = 'ok' | 'warn' | 'missing' | 'unknown';

interface CheckRow {
  key: string;
  label: string;
  status: Status;
  detail: string;
}

const STATUS_META: Record<Status, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  ok: { label: '정상', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CircleCheck },
  warn: { label: '주의', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: CircleAlert },
  missing: { label: '미설정', cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: Circle },
  unknown: { label: '확인 필요', cls: 'bg-slate-100 text-slate-500 border-slate-200', Icon: CircleHelp },
};

function nonEmpty(v: unknown): boolean {
  return typeof v === 'string' ? v.trim().length > 0 : v != null;
}

export function AdminPublicReadinessCard() {
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function run() {
      // ── 법정정보 (service_legal_profiles, admin endpoint) ──
      const legalRow: CheckRow = await (async () => {
        try {
          const res = await coreApiClient.get<{ data: any }>(`/admin/services/${SERVICE_KEY}/legal-profile`);
          const p = (res as any)?.data ?? null;
          if (!p) return { key: 'legal', label: '법정정보 입력', status: 'missing' as Status, detail: '미입력 — 법정정보 설정에서 입력하세요.' };
          const fields = [
            p.companyName,
            p.representativeName,
            p.businessRegistrationNumber,
            p.businessAddress,
            p.customerServiceEmail || p.customerServicePhone,
          ];
          const filled = fields.filter(nonEmpty).length;
          const active = p.isActive !== false;
          if (filled === 0) return { key: 'legal', label: '법정정보 입력', status: 'missing', detail: '미입력 — 법정정보 설정에서 입력하세요.' };
          if (!active) return { key: 'legal', label: '법정정보 입력', status: 'warn', detail: `입력됨(${filled}/5) — 공개 비활성 상태입니다.` };
          if (filled < 5) return { key: 'legal', label: '법정정보 입력', status: 'warn', detail: `일부 누락(${filled}/5) — 누락 항목을 확인하세요.` };
          return { key: 'legal', label: '법정정보 입력', status: 'ok', detail: '주요 항목 입력 완료 · 공개 활성.' };
        } catch {
          return { key: 'legal', label: '법정정보 입력', status: 'unknown', detail: '조회하지 못했습니다 — 권한/네트워크를 확인하세요.' };
        }
      })();

      // ── footer 공개 표시 흐름 (법정정보 결과 파생) ──
      const footerRow: CheckRow = {
        key: 'footer',
        label: '공개 footer 표시',
        status: legalRow.status === 'ok' ? 'ok' : legalRow.status === 'unknown' ? 'unknown' : 'warn',
        detail:
          legalRow.status === 'ok'
            ? '공개 footer에 법정정보가 표시됩니다.'
            : legalRow.status === 'unknown'
              ? '법정정보 조회 실패로 표시 여부를 확인할 수 없습니다.'
              : '법정정보 미입력/비활성 항목은 footer에 표시되지 않습니다.',
      };

      // ── 이용약관 / 개인정보처리방침 (표준 service_policy_documents + legacy fallback) ──
      async function policyRow(type: 'terms' | 'privacy', label: string): Promise<CheckRow> {
        const r = await loadPublishedPolicyDocument(type);
        if (r.status === 'ok') {
          return r.doc.source === 'service'
            ? { key: type, label, status: 'ok', detail: '게시됨(표준).' }
            : { key: type, label, status: 'warn', detail: '게시됨(legacy) — 법정정보·약관 설정에서 표준 위치로 재게시 권장.' };
        }
        if (r.status === 'empty') return { key: type, label, status: 'missing', detail: '미게시 — 법정정보·약관 설정의 정책 문서 탭에서 게시하세요.' };
        return { key: type, label, status: 'unknown', detail: '조회하지 못했습니다.' };
      }
      const termsRow = await policyRow('terms', '이용약관 게시');
      const privacyRow = await policyRow('privacy', '개인정보처리방침 게시');

      // ── 문의 설정 (contact-settings) ──
      const contactRow: CheckRow = await (async () => {
        try {
          const res = await coreApiClient.get<{ data: any }>(`/admin/services/${SERVICE_KEY}/contact-settings`);
          const s = (res as any)?.data ?? null;
          const configured = !!s?.configured || (Array.isArray(s?.recipientEmails) && s.recipientEmails.length > 0);
          return configured
            ? { key: 'contact', label: '문의 설정', status: 'ok' as Status, detail: '문의 수신 설정 완료.' }
            : { key: 'contact', label: '문의 설정', status: 'warn' as Status, detail: '미완료 — 문의 설정에서 수신자를 지정하세요.' };
        } catch {
          return { key: 'contact', label: '문의 설정', status: 'unknown' as Status, detail: '조회하지 못했습니다.' };
        }
      })();

      if (alive) {
        setRows([legalRow, footerRow, termsRow, privacyRow, contactRow]);
        setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <ClipboardCheck className="w-4 h-4 text-indigo-600" />
        <h2 className="text-sm font-semibold text-slate-700">공개 상태 점검</h2>
        <span className="ml-2 text-xs text-slate-400">참고용 — 법적 준수 판정 아님</span>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {rows.map((row) => {
            const meta = STATUS_META[row.status];
            const Icon = meta.Icon;
            return (
              <li key={row.key} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{row.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{row.detail}</p>
                </div>
                <span className={`inline-flex items-center gap-1 shrink-0 px-2 py-1 text-xs font-semibold rounded-full border ${meta.cls}`}>
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* 편집 위치 안내 */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 space-y-2">
        <p className="text-xs text-slate-500 leading-relaxed">
          법정정보(공개 footer)와 이용약관·개인정보처리방침 문서는 모두 <strong>법정정보·약관 설정</strong>
          (관리자)에서 관리합니다. 게시된 정책 문서는 공개 <strong>/policy · /privacy</strong> 에 반영됩니다.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link to="/admin/settings/legal" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
            법정정보·약관 설정 <ArrowRight className="w-3 h-3" />
          </Link>
          <Link to="/admin/settings/contact" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
            문의 설정 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
