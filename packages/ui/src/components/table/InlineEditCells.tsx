/**
 * InlineEditCells — Standardized Inline Edit Components for DataTable
 *
 * WO-O4O-TABLE-STANDARD-V4 Phase 3
 *
 * 테이블 셀 내 인라인 편집 표준 컴포넌트.
 * - EditableTextCell: 텍스트 인라인 편집
 * - EditableNumberCell: 숫자 인라인 편집
 * - ToggleCell: 불린 토글 스위치
 *
 * 사용:
 *   render: (_v, row) => (
 *     <EditableTextCell
 *       value={row.name}
 *       onSave={(val) => api.updateName(row.id, val)}
 *     />
 *   )
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ─── EditableTextCell ─────────────────────────────────────────

export interface EditableTextCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  allowEmpty?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function EditableTextCell({
  value,
  onSave,
  allowEmpty = false,
  placeholder = '값을 입력하세요',
  maxLength,
  className = '',
}: EditableTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value);
    setEditing(true);
  }, [value]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(value);
  }, [value]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    if (!allowEmpty && !trimmed) return;
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      // Error handling done by caller (toast etc.)
    } finally {
      setSaving(false);
    }
  }, [draft, value, allowEmpty, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') cancel();
    },
    [save, cancel],
  );

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          disabled={saving}
          placeholder={placeholder}
          className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={save}
          disabled={saving || (!allowEmpty && !draft.trim())}
          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          title="저장"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="p-1 text-slate-400 hover:bg-slate-100 rounded disabled:opacity-50"
          title="취소"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 cursor-pointer ${className}`}
      onClick={startEdit}
      title="클릭하여 수정"
    >
      <span className="text-sm">{value || <span className="text-slate-400 italic">{placeholder}</span>}</span>
      <svg
        className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </div>
  );
}

// ─── EditableNumberCell ───────────────────────────────────────

export interface EditableNumberCellProps {
  value: number;
  onSave: (newValue: number) => Promise<void>;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function EditableNumberCell({
  value,
  onSave,
  min,
  max,
  step = 1,
  className = '',
}: EditableNumberCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(String(value));
    setEditing(true);
  }, [value]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(String(value));
  }, [value]);

  const save = useCallback(async () => {
    const num = Number(draft);
    if (isNaN(num)) return;
    if (min !== undefined && num < min) return;
    if (max !== undefined && num > max) return;
    if (num === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(num);
      setEditing(false);
    } catch {
      // Error handling done by caller
    } finally {
      setSaving(false);
    }
  }, [draft, value, min, max, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') cancel();
    },
    [save, cancel],
  );

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          disabled={saving}
          className="w-24 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={save}
          disabled={saving || isNaN(Number(draft))}
          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          title="저장"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="p-1 text-slate-400 hover:bg-slate-100 rounded disabled:opacity-50"
          title="취소"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 cursor-pointer ${className}`}
      onClick={startEdit}
      title="클릭하여 수정"
    >
      <span className="text-sm tabular-nums">{value}</span>
      <svg
        className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </div>
  );
}

// ─── ToggleCell ───────────────────────────────────────────────

export interface ToggleCellProps {
  value: boolean;
  onChange: (newValue: boolean) => Promise<void>;
  labelOn?: string;
  labelOff?: string;
  disabled?: boolean;
  className?: string;
}

export function ToggleCell({
  value,
  onChange,
  labelOn = '활성',
  labelOff = '비활성',
  disabled = false,
  className = '',
}: ToggleCellProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || toggling) return;
    setToggling(true);
    try {
      await onChange(!value);
    } catch {
      // Error handling done by caller
    } finally {
      setToggling(false);
    }
  }, [value, disabled, toggling, onChange]);

  return (
    <div className={`flex items-center gap-2 ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        disabled={disabled || toggling}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          value ? 'bg-blue-600' : 'bg-slate-300'
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className={`text-xs ${value ? 'text-blue-600' : 'text-slate-400'}`}>
        {toggling ? '...' : value ? labelOn : labelOff}
      </span>
    </div>
  );
}
