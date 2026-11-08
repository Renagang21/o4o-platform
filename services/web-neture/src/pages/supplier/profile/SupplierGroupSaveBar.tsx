import { Save, Loader2, CheckCircle } from 'lucide-react';

/**
 * 묶음별 저장 버튼 (WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4).
 * 버튼은 자기 묶음의 필드만 저장하고, 진행 · 결과도 자기 묶음 것만 보인다.
 */
export default function SupplierGroupSaveBar({
  label,
  onSave,
  saving,
  saved,
  error,
  busy,
  savedMessage = '저장되었습니다.',
}: {
  label: string;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
  /** 다른 묶음이 저장 중이어도 중복 요청을 막는다. */
  busy: boolean;
  savedMessage?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? '저장 중...' : saved ? '저장됨' : label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-green-600">{savedMessage}</p>}
    </div>
  );
}
