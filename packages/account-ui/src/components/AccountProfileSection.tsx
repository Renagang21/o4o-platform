import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ProfileCard } from './ProfileCard.js';
import { ProfileInfoField } from './ProfileInfoField.js';

export type AccountProfileFieldType = 'text' | 'tel' | 'email';

export interface AccountProfileFieldSpec {
  /** Key into `values` / the draft handed to `onSave`. */
  key: string;
  label: string;
  icon?: ReactNode;
  type?: AccountProfileFieldType;
  /** false → 읽기 전용 (이메일 · 역할 · 상태 등). Default true. */
  editable?: boolean;
  /** 값이 비었을 때 보여줄 문구 (예: '등록된 연락처가 없습니다'). */
  emptyText?: string;
  /** 보기 모드에서 값이 있을 때만 노출되는 보조 설명 (예: 닉네임 공개 안내). */
  hint?: string;
}

export interface AccountProfileSectionProps {
  /** 아바타 이니셜. 생략 시 name 첫 글자. */
  initial?: string;
  name: string;
  email: string;
  roleLabel: string;
  statusLabel?: string;
  statusColor?: string;
  fields: AccountProfileFieldSpec[];
  /** 현재 저장돼 있는 값. 편집 진입 시 draft 의 시작점이 된다. */
  values: Record<string, string>;
  /** 편집 가능한 필드의 draft 를 받아 저장한다. 실패는 반드시 throw. */
  onSave: (draft: Record<string, string>) => Promise<void>;
  /**
   * 저장 실패 처리. 주입하면 toast 등 호출자 방식으로 처리하고,
   * 생략하면 카드 안에 인라인 오류를 렌더한다 (Pharmacy-Hub 방식).
   */
  onError?: (message: string) => void;
  /** 저장 성공 시 인라인으로 보여줄 문구. 생략하면 아무것도 렌더하지 않는다. */
  successMessage?: string;
  /** 저장 전 검증. 문자열을 반환하면 그 메시지로 저장을 중단한다. */
  validate?: (draft: Record<string, string>) => string | null;
  /** 카드 하단 추가 콘텐츠. */
  children?: ReactNode;
}

function defaultErrorMessage(err: unknown): string {
  const anyErr = err as any;
  return (
    anyErr?.response?.data?.message ||
    anyErr?.response?.data?.error ||
    (err instanceof Error ? err.message : '') ||
    '프로필 수정에 실패했습니다.'
  );
}

/**
 * AccountProfileSection — 기본 계정정보(이름 · 닉네임 · 연락처 · 이메일 · 역할) 공통 섹션
 *
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics / Neture / Pharmacy-Hub 의 프로필 화면에 4벌 복제돼 있던
 * "ProfileCard + ProfileInfoField 목록 + 편집/저장 상태기계" 를 단일 구현으로 수렴한다.
 * 서비스 차이는 `fields` 구성과 `onSave` adapter 로만 표현한다 —
 * API 계약(`PUT /users/profile` vs `PATCH /pharmacy-hub/...`)은 호출자가 흡수한다.
 */
export function AccountProfileSection({
  initial,
  name,
  email,
  roleLabel,
  statusLabel,
  statusColor,
  fields,
  values,
  onSave,
  onError,
  successMessage,
  validate,
  children,
}: AccountProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const editableKeys = fields.filter((f) => f.editable !== false).map((f) => f.key);
  /**
   * 편집 가능한 필드가 하나도 없으면 수정 버튼을 노출하지 않는다.
   * (역할·계약상 수정 경로가 없는 조회 전용 화면 — 빈 편집 모드로 들어가지 않게 한다)
   */
  const canEdit = editableKeys.length > 0;

  const buildDraft = useCallback(() => {
    const next: Record<string, string> = {};
    for (const key of editableKeys) next[key] = values[key] ?? '';
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, editableKeys.join('|')]);

  const handleEdit = () => {
    setDraft(buildDraft());
    setError(null);
    setSaved(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(buildDraft());
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const validationError = validate?.(draft) ?? null;
    if (validationError) {
      if (onError) onError(validationError);
      else setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setIsEditing(false);
      setSaved(true);
    } catch (err) {
      const message = defaultErrorMessage(err);
      if (onError) onError(message);
      else setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {successMessage && saved && !isEditing ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 mb-4">
          {successMessage}
        </div>
      ) : null}
      <ProfileCard
        initial={initial ?? name?.charAt(0) ?? '?'}
        name={name}
        email={email}
        roleLabel={roleLabel}
        statusLabel={statusLabel}
        statusColor={statusColor}
        isEditing={isEditing}
        saving={saving}
        canEdit={canEdit}
        onEdit={handleEdit}
        onSave={() => void handleSave()}
        onCancel={handleCancel}
      >
        {fields.map((field) => {
          const editable = field.editable !== false;
          const value = values[field.key] ?? '';
          return (
            <div key={field.key}>
              <ProfileInfoField
                label={field.label}
                value={value || field.emptyText || '-'}
                editValue={editable ? draft[field.key] ?? '' : undefined}
                isEditing={isEditing}
                onChange={
                  editable
                    ? (v: string) => setDraft((prev) => ({ ...prev, [field.key]: v }))
                    : undefined
                }
                editable={editable}
                type={field.type}
                icon={field.icon}
              />
              {!isEditing && field.hint && value ? (
                <p className="text-xs text-gray-400 mt-1 ml-10 mb-2">{field.hint}</p>
              ) : null}
            </div>
          );
        })}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {children}
      </ProfileCard>
    </>
  );
}
