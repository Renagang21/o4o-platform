import { useLatestStoreRequest } from "./useLatestStoreRequest";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchSchedules,
  fetchSignagePlaylists,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  type SignageScheduleItem,
  type SignagePlaylistOption,
  type CreateSchedulePayload,
} from "../../../api/signageSchedule";

/** Schedule inputs and requests share one owner; playlist/media editing is independent. */
export function useSignageSchedules(organizationId: string) {
  const scheduleRequest = useLatestStoreRequest(organizationId);
  const playlistRequest = useLatestStoreRequest(organizationId);
  const saving = useRef(false);
  const saveRequest = useLatestStoreRequest(organizationId);
  // ── Schedule state ──
  const [schedules, setSchedules] = useState<SignageScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  // WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1: 스케줄 조회 실패 표시용
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [signagePlaylists, setSignagePlaylists] = useState<
    SignagePlaylistOption[]
  >([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<SignageScheduleItem | null>(null);

  // Schedule form state
  const [schName, setSchName] = useState("");
  const [schPlaylistId, setSchPlaylistId] = useState("");
  const [schDays, setSchDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [schStartTime, setSchStartTime] = useState("09:00");
  const [schEndTime, setSchEndTime] = useState("18:00");
  const [schValidFrom, setSchValidFrom] = useState("");
  const [schValidUntil, setSchValidUntil] = useState("");
  const [schPriority, setSchPriority] = useState(0);
  const [schIsActive, setSchIsActive] = useState(true);
  const [schSaving, setSchSaving] = useState(false);
  const [schSaveError, setSchSaveError] = useState<string | null>(null);

  // ── Schedule loaders ──
  const loadSchedules = useCallback(async () => {
    if (!organizationId) return;
    const isCurrent = scheduleRequest.begin();
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const res = await fetchSchedules(organizationId);
      if (!isCurrent()) return;
      setSchedules(
        Array.isArray(res.items)
          ? res.items
          : Array.isArray(res)
            ? (res as unknown as SignageScheduleItem[])
            : [],
      );
    } catch {
      if (isCurrent())
        setScheduleError(
          "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
    } finally {
      if (isCurrent()) setScheduleLoading(false);
    }
  }, [organizationId, scheduleRequest]);

  const loadSignagePlaylists = useCallback(async () => {
    if (!organizationId) return;
    const isCurrent = playlistRequest.begin();
    try {
      const data = await fetchSignagePlaylists(organizationId);
      if (isCurrent()) setSignagePlaylists(data);
    } catch {
      if (isCurrent())
        setScheduleError(
          "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
    }
  }, [organizationId, playlistRequest]);

  useEffect(() => {
    void loadSchedules();
    void loadSignagePlaylists();
  }, [loadSchedules, loadSignagePlaylists]);
  // ── Schedule handlers ──
  const resetScheduleForm = useCallback(() => {
    setSchSaveError(null);
    setSchName("");
    setSchPlaylistId("");
    setSchDays([1, 2, 3, 4, 5]);
    setSchStartTime("09:00");
    setSchEndTime("18:00");
    setSchValidFrom("");
    setSchValidUntil("");
    setSchPriority(0);
    setSchIsActive(true);
    setEditingSchedule(null);
    setShowScheduleForm(false);
  }, []);

  const openEditSchedule = (sch: SignageScheduleItem) => {
    setSchSaveError(null);
    setEditingSchedule(sch);
    setSchName(sch.name);
    setSchPlaylistId(sch.storePlaylistId || sch.playlistId || "");
    setSchDays([...sch.daysOfWeek]);
    setSchStartTime(sch.startTime.slice(0, 5)); // HH:MM:SS → HH:MM
    setSchEndTime(sch.endTime.slice(0, 5));
    setSchValidFrom(sch.validFrom ?? "");
    setSchValidUntil(sch.validUntil ?? "");
    setSchPriority(sch.priority);
    setSchIsActive(sch.isActive);
    setShowScheduleForm(true);
  };

  const handleSaveSchedule = async () => {
    if (
      !schName.trim() ||
      !schPlaylistId ||
      schDays.length === 0 ||
      !organizationId
    )
      return;
    if (saving.current) return;
    const isCurrent = saveRequest.begin();
    saving.current = true;
    setSchSaving(true);
    setSchSaveError(null);
    try {
      if (editingSchedule) {
        await updateSchedule(organizationId, editingSchedule.id, {
          name: schName.trim(),
          storePlaylistId: schPlaylistId,
          daysOfWeek: schDays,
          startTime: schStartTime,
          endTime: schEndTime,
          validFrom: schValidFrom || null,
          validUntil: schValidUntil || null,
          priority: schPriority,
          isActive: schIsActive,
        });
      } else {
        const payload: CreateSchedulePayload = {
          name: schName.trim(),
          storePlaylistId: schPlaylistId,
          daysOfWeek: schDays,
          startTime: schStartTime,
          endTime: schEndTime,
          priority: schPriority,
          isActive: schIsActive,
        };
        if (schValidFrom) payload.validFrom = schValidFrom;
        if (schValidUntil) payload.validUntil = schValidUntil;
        await createSchedule(organizationId, payload);
      }
      if (!isCurrent()) return;
      resetScheduleForm();
      loadSchedules();
    } catch {
      if (isCurrent())
        setSchSaveError(
          "스케줄을 저장하지 못했습니다. 입력 내용을 확인한 후 다시 시도해 주세요.",
        );
    } finally {
      saving.current = false;
      setSchSaving(false);
    }
  };

  const handleDeleteSchedule = async (sch: SignageScheduleItem) => {
    if (!confirm(`"${sch.name}" 스케줄을 삭제하시겠습니까?`)) return;
    if (!organizationId) return;
    try {
      await deleteSchedule(organizationId, sch.id);
      loadSchedules();
    } catch {
      setScheduleError("스케줄을 삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  useEffect(() => {
    setSchedules([]);
    setSignagePlaylists([]);
    resetScheduleForm();
  }, [organizationId, resetScheduleForm]);

  const toggleSchDay = (day: number) => {
    setSchDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  return {
    loadSchedules,
    loadSignagePlaylists,
    schedules,
    scheduleLoading,
    scheduleError,
    signagePlaylists,
    showScheduleForm,
    editingSchedule,
    schName,
    schPlaylistId,
    schDays,
    schStartTime,
    schEndTime,
    schValidFrom,
    schValidUntil,
    schPriority,
    schIsActive,
    schSaving,
    schSaveError,
    setShowScheduleForm,
    setSchName,
    setSchPlaylistId,
    setSchPriority,
    setSchStartTime,
    setSchEndTime,
    setSchValidFrom,
    setSchValidUntil,
    setSchIsActive,
    resetScheduleForm,
    openEditSchedule,
    handleSaveSchedule,
    handleDeleteSchedule,
    toggleSchDay,
  };
}
