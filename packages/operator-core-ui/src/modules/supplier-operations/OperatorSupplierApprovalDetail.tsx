import type { ReactNode } from 'react';
import type { AdminSupplier } from './types';
import { isProfileComplete, profileMissingLabels, getDeferredItems, describeDeferred, statusColors, statusLabels, mailOrderStatusLabels, type SupplierEditForm } from './operatorSupplierApprovalModel';

const Row = ({ label, value }: Readonly<{ label: string; value: ReactNode }>) => (
    <div className="flex gap-3 mb-2.5">
      <span className="font-semibold text-slate-500 min-w-[88px] shrink-0">{label}</span>
      <span className="min-w-0 break-words text-slate-800">{value}</span>
    </div>
  );

// ─── Drawer 본문 ───
export function SupplierDetailBody({
  supplier: s,
  onOpenCategories,
  onDownload,
  editable,
  editing,
  editForm,
  savingEdit,
  onChangeEditForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: Readonly<{
  supplier: AdminSupplier;
  onOpenCategories: () => void;
  onDownload: (id: string, type: 'business_registration' | 'bank_statement' | 'mail_order_report') => void;
  editable: boolean;
  editing: boolean;
  editForm: SupplierEditForm;
  savingEdit: boolean;
  onChangeEditForm: (patch: Partial<SupplierEditForm>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}>) {
  const complete = isProfileComplete(s);
  const missing = profileMissingLabels(s);
  const deferred = getDeferredItems(s);

  // 안정된 key로 입력을 유지하여 편집 중 포커스를 보존한다.
  const editFields: { label: string; field: keyof SupplierEditForm; placeholder: string }[] = [
    { label: '대표자', field: 'representativeName', placeholder: '대표자명' },
    { label: '담당자명', field: 'managerName', placeholder: '담당자명' },
    { label: '담당자 연락처', field: 'managerPhone', placeholder: '숫자만 입력' },
    { label: '사업자번호', field: 'businessNumber', placeholder: '000-00-00000' },
    { label: '세금계산서', field: 'taxInvoiceEmail', placeholder: '세금계산서 이메일' },
  ];

  return (
    <div className="text-sm text-slate-700">
      {/* 기본 정보 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">기본 정보</span>
          {editable && !editing && (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
            >
              정보 보완
            </button>
          )}
        </div>
        <Row label="공급자명" value={s.name || '-'} />
        <Row label="이메일" value={s.email || '-'} />
        {editing ? (
          <>
            {editFields.map(({ label, field, placeholder }) => (
              <div key={field} className="flex gap-3 mb-2.5 items-center">
                <label htmlFor={`supplier-edit-${field}`} className="font-semibold text-slate-500 min-w-[88px] shrink-0">{label}</label>
                <input
                  id={`supplier-edit-${field}`}
                  disabled={savingEdit}
                  type="text"
                  value={editForm[field]}
                  placeholder={placeholder}
                  onChange={(e) => onChangeEditForm({ [field]: e.target.value } as Partial<SupplierEditForm>)}
                  className="min-w-0 flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-3">
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={savingEdit}
                className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={savingEdit}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
              >
                {savingEdit ? '저장 중…' : '저장'}
              </button>
            </div>
          </>
        ) : (
          <>
            <Row label="대표자" value={s.representativeName || '-'} />
            <Row label="담당자" value={[s.managerName, s.managerPhone].filter(Boolean).join(' / ') || '-'} />
            <Row label="담당자 이메일" value={s.managerEmail || '-'} />
            <Row label="사업자번호" value={s.businessNumber || '-'} />
            <Row label="세금계산서" value={s.taxInvoiceEmail || '-'} />
          </>
        )}
        <Row
          label="상태"
          value={
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[s.status] || s.status}
            </span>
          }
        />
        <Row label="등록일" value={new Date(s.createdAt).toLocaleDateString('ko-KR')} />
      </div>

      {/* 프로필 정보 상태 — 승인 차단 아님 (승인 후 보완 항목) */}
      <div className={`mb-5 rounded-lg border p-3 ${complete ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-sky-50'}`}>
        <div className={`font-medium ${complete ? 'text-emerald-700' : 'text-sky-700'}`}>
          {complete ? '프로필 정보 완료' : '정보 미완료 — 승인은 가능하며, 승인 후 공급자가 보완합니다'}
        </div>
        {!complete && missing.length > 0 && (
          <div className="text-xs text-sky-700 mt-1">미입력: {missing.join(', ')}</div>
        )}
        {deferred.length > 0 && (
          <div className="text-xs text-slate-500 mt-1">{describeDeferred(deferred)}</div>
        )}
      </div>

      {/* 정산 정보 */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-slate-500 mb-2">정산 정보</div>
        <Row
          label="계좌"
          value={
            s.settlementBankName && s.settlementAccountHolder
              ? `${s.settlementBankName} / ${s.settlementAccountHolder} / ${s.settlementAccountNumberMasked || '-'}`
              : '정산 정보 없음'
          }
        />
      </div>

      {/* 통신판매업 */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-slate-500 mb-2">통신판매업</div>
        <Row
          label="신고 상태"
          value={
            s.mailOrderSalesStatus
              ? `${mailOrderStatusLabels[s.mailOrderSalesStatus] || s.mailOrderSalesStatus}${s.mailOrderSalesRegistrationNumber ? ` (${s.mailOrderSalesRegistrationNumber})` : ''}`
              : '미입력'
          }
        />
      </div>

      {/* 서류 다운로드 */}
      <div className="mb-5 flex flex-wrap gap-3 text-xs">
        {s.businessRegistrationDocumentId && (
          <button type="button" onClick={() => onDownload(s.id, 'business_registration')} className="text-emerald-700 hover:text-emerald-900 underline">
            사업자등록증
          </button>
        )}
        {s.settlementBankbookDocumentId && (
          <button type="button" onClick={() => onDownload(s.id, 'bank_statement')} className="text-emerald-700 hover:text-emerald-900 underline">
            통장 사본
          </button>
        )}
        {s.mailOrderSalesDocumentId && (
          <button type="button" onClick={() => onDownload(s.id, 'mail_order_report')} className="text-emerald-700 hover:text-emerald-900 underline">
            통신판매업 신고증
          </button>
        )}
      </div>

      {/* 규제 품목군 */}
      <div className="border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onOpenCategories}
          className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
        >
          규제 품목군 검토
        </button>
      </div>
    </div>
  );
}
