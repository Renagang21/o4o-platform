import { useId } from "react";
import { Loader2 } from "lucide-react";
import { SIGNAGE_DAY_LABELS as DAY_LABELS } from "@o4o/store-ui-core";
import type { StorePlaylist } from "../../api/storePlaylist";

interface StoreSignageScheduleFormProps {
  editing: boolean;
  playlists: StorePlaylist[];
  schName: string;
  schPlaylistId: string;
  schPriority: number;
  schDays: number[];
  schStartTime: string;
  schEndTime: string;
  schValidFrom: string;
  schValidUntil: string;
  schIsActive: boolean;
  schSaving: boolean;
  saveError: string | null;
  setSchName: (value: string) => void;
  setSchPlaylistId: (value: string) => void;
  setSchPriority: (value: number) => void;
  setSchStartTime: (value: string) => void;
  setSchEndTime: (value: string) => void;
  setSchValidFrom: (value: string) => void;
  setSchValidUntil: (value: string) => void;
  setSchIsActive: (value: boolean) => void;
  toggleSchDay: (day: number) => void;
  handleSaveSchedule: () => void;
  resetScheduleForm: () => void;
}

export function StoreSignageScheduleForm({
  editing,
  playlists,
  schName,
  schPlaylistId,
  schPriority,
  schDays,
  schStartTime,
  schEndTime,
  schValidFrom,
  schValidUntil,
  schIsActive,
  schSaving,
  saveError,
  setSchName,
  setSchPlaylistId,
  setSchPriority,
  setSchStartTime,
  setSchEndTime,
  setSchValidFrom,
  setSchValidUntil,
  setSchIsActive,
  toggleSchDay,
  handleSaveSchedule,
  resetScheduleForm,
}: Readonly<StoreSignageScheduleFormProps>) {
  const fieldId = useId();
  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <div className="text-sm font-medium text-slate-700">
        {editing ? "스케줄 수정" : "새 스케줄"}
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-red-700">
          {saveError}
        </p>
      )}
      {/* Row 1: Name */}
      <input
        type="text"
        value={schName}
        onChange={(e) => setSchName(e.target.value)}
        placeholder="스케줄명 *"
        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Row 2: Playlist + Priority */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          {playlists.filter((p) => p.publishStatus === "published").length ===
            0 && (
            <p className="text-xs text-amber-600 mb-1">
              게시된 플레이리스트가 없습니다. &lsquo;내 플레이리스트&rsquo;
              탭에서 플레이리스트를 게시해주세요.
            </p>
          )}
          <select
            aria-label="플레이리스트 선택"
            value={schPlaylistId}
            onChange={(e) => setSchPlaylistId(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">플레이리스트 선택 *</option>
            {playlists
              .filter((p) => p.publishStatus === "published")
              .map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={`${fieldId}-priority`}
            className="text-xs text-slate-500 whitespace-nowrap"
          >
            우선순위
          </label>
          <input
            id={`${fieldId}-priority`}
            type="number"
            aria-label="우선순위"
            value={schPriority}
            onChange={(e) => setSchPriority(Number(e.target.value))}
            min={0}
            className="w-16 px-2 py-1.5 text-sm border border-slate-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Row 3: Days of week */}
      <div>
        <p id={`${fieldId}-days`} className="text-xs text-slate-500 mb-1 block">
          요일 선택 *
        </p>
        <div
          role="group"
          aria-labelledby={`${fieldId}-days`}
          className="flex flex-wrap gap-1.5"
        >
          {DAY_LABELS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleSchDay(idx)}
              aria-pressed={schDays.includes(idx)}
              className={`min-w-11 min-h-11 rounded-full text-xs font-medium transition-colors ${
                schDays.includes(idx)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: Start / End time */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor={`${fieldId}-start`}
            className="text-xs text-slate-500 mb-1 block"
          >
            시작 시간
          </label>
          <input
            id={`${fieldId}-start`}
            type="time"
            aria-label="시작 시간"
            value={schStartTime}
            onChange={(e) => setSchStartTime(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor={`${fieldId}-end`}
            className="text-xs text-slate-500 mb-1 block"
          >
            종료 시간
          </label>
          <input
            id={`${fieldId}-end`}
            type="time"
            aria-label="종료 시간"
            value={schEndTime}
            onChange={(e) => setSchEndTime(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Row 5: Valid from / until */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor={`${fieldId}-from`}
            className="text-xs text-slate-500 mb-1 block"
          >
            유효 시작일
          </label>
          <input
            id={`${fieldId}-from`}
            type="date"
            aria-label="유효 시작일"
            value={schValidFrom}
            onChange={(e) => setSchValidFrom(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor={`${fieldId}-until`}
            className="text-xs text-slate-500 mb-1 block"
          >
            유효 종료일
          </label>
          <input
            id={`${fieldId}-until`}
            type="date"
            aria-label="유효 종료일"
            value={schValidUntil}
            onChange={(e) => setSchValidUntil(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Row 6: Active toggle + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={schIsActive}
            onChange={(e) => setSchIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">활성화</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSaveSchedule}
            disabled={
              schSaving ||
              !schName.trim() ||
              !schPlaylistId ||
              schDays.length === 0
            }
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {schSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {editing ? "수정" : "저장"}
          </button>
          <button
            onClick={resetScheduleForm}
            className="px-4 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
