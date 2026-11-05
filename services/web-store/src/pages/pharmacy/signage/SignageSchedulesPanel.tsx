import {
  // WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-B: 공통 사이니지 순수 로직
  SIGNAGE_DAY_LABELS as DAY_LABELS,
  isScheduleNowActive,
  toHHMM,
} from "@o4o/store-ui-core";
import { type Column } from "@o4o/ui";
import {
  AlertCircle,
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SignageScheduleItem } from "../../../api/signageSchedule";
import { StoreSignageScheduleForm } from "../StoreSignageScheduleForm";
import { SignageSelectionTable } from "../signage/SignageSelectionTable";
import type { SignageWorkspaceState } from "../useSignageWorkspace";

export function SignageSchedulesPanel({
  state,
}: Readonly<{ state: SignageWorkspaceState }>) {
  const {
    base,
    deletingScheduleIds,
    editingSchedule,
    handleDeleteSchedule,
    handleSaveSchedule,
    loadPlaylists,
    loadSchedules,
    loadSignagePlaylists,
    openEditSchedule,
    organizationId,
    playlistError,
    playlistLoading,
    playlists,
    resetScheduleForm,
    savedSchedule,
    schDays,
    schEndTime,
    schIsActive,
    schName,
    schPlaylistId,
    schPriority,
    schSaveError,
    schSaving,
    schStartTime,
    schValidFrom,
    schValidUntil,
    scheduleError,
    scheduleLoading,
    schedulePlaylistError,
    schedulePlaylistLoading,
    schedules,
    setSchEndTime,
    setSchIsActive,
    setSchName,
    setSchPlaylistId,
    setSchPriority,
    setSchStartTime,
    setSchValidFrom,
    setSchValidUntil,
    setShowScheduleForm,
    showScheduleForm,
    signagePlaylists,
    toggleSchDay,
  } = state;
  return (
    <div>
      {savedSchedule && (
        <div
          role="status"
          className="mb-4 space-y-2 rounded-lg bg-teal-50 p-4 text-sm text-teal-900"
        >
          <p>
            {savedSchedule.name} 일정을 저장했습니다. 실제 기기의 재생 결과는
            별도로 확인하세요.
          </p>
          <Link
            to={`${base}/marketing/signage/player`}
            className="inline-flex min-h-11 items-center underline"
          >
            재생할 안내 확인
          </Link>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">스케줄</h2>
        <button
          onClick={() => {
            resetScheduleForm();
            setShowScheduleForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          <Plus className="w-4 h-4" />새 스케줄
        </button>
      </div>

      {/* ── Create / Edit Form ── */}
      {showScheduleForm && (
        <StoreSignageScheduleForm
          editing={!!editingSchedule}
          playlists={playlists}
          broadcast={!!editingSchedule && !editingSchedule.storePlaylistId}
          broadcastPlaylists={signagePlaylists}
          playlistsLoading={
            editingSchedule && !editingSchedule.storePlaylistId
              ? schedulePlaylistLoading
              : playlistLoading
          }
          playlistsError={
            editingSchedule && !editingSchedule.storePlaylistId
              ? schedulePlaylistError
              : playlistError
          }
          onRetryPlaylists={() => {
            void (editingSchedule && !editingSchedule.storePlaylistId
              ? loadSignagePlaylists()
              : loadPlaylists());
          }}
          schName={schName}
          schPlaylistId={schPlaylistId}
          schPriority={schPriority}
          schDays={schDays}
          schStartTime={schStartTime}
          schEndTime={schEndTime}
          schValidFrom={schValidFrom}
          schValidUntil={schValidUntil}
          schIsActive={schIsActive}
          schSaving={schSaving}
          saveError={schSaveError}
          setSchName={setSchName}
          setSchPlaylistId={setSchPlaylistId}
          setSchPriority={setSchPriority}
          setSchStartTime={setSchStartTime}
          setSchEndTime={setSchEndTime}
          setSchValidFrom={setSchValidFrom}
          setSchValidUntil={setSchValidUntil}
          setSchIsActive={setSchIsActive}
          toggleSchDay={toggleSchDay}
          handleSaveSchedule={handleSaveSchedule}
          resetScheduleForm={resetScheduleForm}
        />
      )}

      {/* ── Schedule List ── */}
      {scheduleLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 스케줄 로딩 중...
        </div>
      ) : scheduleError ? (
        <div className="text-center py-12 text-red-500 text-sm">
          <AlertCircle className="w-5 h-5 mx-auto mb-2" />
          {scheduleError}
          <div>
            <button
              onClick={() => void loadSchedules()}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">스케줄이 없습니다.</p>
          <p className="text-xs mt-1">
            먼저 '재생목록' 탭에서 플레이리스트를 만들고 콘텐츠를 추가하세요.
          </p>
        </div>
      ) : (
        <SignageSelectionTable<SignageScheduleItem>
          selectionKey={organizationId}
          actions={[
            { key: "edit", label: "일정 수정", onSelect: openEditSchedule },
            {
              key: "delete",
              label: "일정 삭제",
              disabled: (row) => deletingScheduleIds.has(row.id),
              onSelect: handleDeleteSchedule,
            },
          ]}
          columns={
            [
              {
                key: "name",
                title: "이름",
                dataIndex: "name",
                render: (v) => (
                  <span className="font-medium text-slate-900">{v}</span>
                ),
              },
              {
                key: "playlist",
                title: "플레이리스트",
                render: (_v, sch) => (
                  <span className="text-slate-600 text-xs">
                    {playlists.find((p) => p.id === sch.storePlaylistId)
                      ?.name ||
                      sch.playlist?.name ||
                      signagePlaylists.find((p) => p.id === sch.playlistId)
                        ?.name ||
                      playlists.find((p) => p.id === sch.playlistId)?.name ||
                      sch.name}
                  </span>
                ),
              },
              {
                key: "daysOfWeek",
                title: "요일",
                render: (_v, sch) => (
                  <div className="flex gap-0.5">
                    {DAY_LABELS.map((label, idx) => (
                      <span
                        key={idx}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                          sch.daysOfWeek.includes(idx)
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-50 text-slate-300"
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                key: "time",
                title: "시간",
                render: (_v, sch) => (
                  <span className="text-xs text-slate-600">
                    {sch.startTime.slice(0, 5)}–{sch.endTime.slice(0, 5)}
                  </span>
                ),
              },
              {
                key: "period",
                title: "기간",
                render: (_v, sch) => (
                  <span className="text-xs text-slate-500">
                    {sch.validFrom || sch.validUntil
                      ? `${sch.validFrom ?? "∞"} ~ ${sch.validUntil ?? "∞"}`
                      : "상시"}
                  </span>
                ),
              },
              {
                key: "priority",
                title: "우선순위",
                dataIndex: "priority",
                align: "center" as const,
                render: (v) => (
                  <span className="text-xs text-slate-500">{v}</span>
                ),
              },
              {
                key: "isActive",
                title: "상태",
                align: "center" as const,
                render: (_v, sch) => (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                      sch.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {sch.isActive ? "활성" : "비활성"}
                  </span>
                ),
              },
              {
                key: "playback",
                title: "재생",
                align: "center" as const,
                render: (_v, sch) => {
                  const now = new Date();
                  const isNowActive = isScheduleNowActive(sch, now);
                  const isUpcoming =
                    !isNowActive &&
                    sch.isActive &&
                    sch.daysOfWeek.includes(now.getDay()) &&
                    toHHMM(sch.startTime) >
                      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                  return isNowActive ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      현재
                    </span>
                  ) : isUpcoming ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600">
                      예정
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  );
                },
              },
              {
                key: "actions",
                title: "",
                align: "right" as const,
                render: (_v, sch) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditSchedule(sch)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      title="수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={deletingScheduleIds.has(sch.id)}
                      onClick={() => handleDeleteSchedule(sch)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ),
              },
            ] as Column<SignageScheduleItem>[]
          }
          dataSource={schedules}
          rowKey="id"
          loading={false}
          onRow={(sch) => ({
            className: isScheduleNowActive(sch, new Date())
              ? "bg-green-50 border-l-2 border-green-500"
              : "",
          })}
          emptyText="스케줄이 없습니다"
        />
      )}
    </div>
  );
}
