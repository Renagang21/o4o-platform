import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConsultationPairing,
  openConsultationStation,
  stationAction,
  stationHeartbeat,
  type ConsultationStation,
} from "../../../api/consultationWorkspace";

/** Opening is explicit. A language correction keeps the current room and paired device. */
export function useConsultationStation(
  scope: string,
  mode: string,
  language: string,
  stationKey: string,
) {
  const [room, setRoom] = useState<ConsultationStation | null>(null);
  const current = useRef<ConsultationStation | null>(null);
  const generation = useRef(0),
    lock = useRef(false),
    alive = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [heartbeatError, setHeartbeatError] = useState(""),
    [conflict, setConflict] = useState(false);
  const [pairing, setPairing] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const apply = useCallback((data: ConsultationStation) => {
    if (
      current.current?.id === data.id &&
      data.version < current.current.version
    )
      return;
    current.current = data;
    setRoom(data);
  }, []);
  const release = useCallback(() => {
    generation.current++;
    current.current = null;
    setRoom(null);
    setPairing(null);
    setConflict(false);
  }, []);
  useEffect(() => {
    alive.current = true;
    release();
    setError("");
    setHeartbeatError("");
    return () => {
      alive.current = false;
    };
  }, [scope, mode, stationKey, release]);
  const run = useCallback(
    async <T>(operation: () => Promise<T>, accept: (value: T) => void) => {
      if (lock.current) return false;
      const version = generation.current;
      lock.current = true;
      setBusy(true);
      setError("");
      setHeartbeatError("");
      try {
        const value = await operation();
        if (alive.current && generation.current === version) {
          accept(value);
          return true;
        }
      } catch (e) {
        if (alive.current && generation.current === version) {
          setError((e as Error).message);
          setConflict((e as { code?: string }).code === "STATION_IN_USE");
          if ([401, 403].includes((e as { status?: number }).status ?? 0)) release();
        }
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
      return false;
    },
    [release],
  );
  const open = useCallback(
    (replace = false) =>
      run(
        () =>
          openConsultationStation({
            stationKey,
            name: stationKey === "counter-1" ? "매대 1" : stationKey,
            mode,
            language,
            replace,
          }),
        (data) => {
          apply(data);
          setPairing(null);
          setConflict(false);
        },
      ),
    [run, stationKey, mode, language, apply],
  );
  useEffect(() => {
    if (!room?.active) return;
    let cancelled = false,
      inFlight = false;
    const version = generation.current;
    const poll = async () => {
      if (inFlight || lock.current || !current.current) return;
      const captured = current.current;
      inFlight = true;
      try {
        const data = await stationHeartbeat(captured);
        if (!cancelled && generation.current === version) {
          apply(data);
          setHeartbeatError("");
        }
      } catch (e) {
        if (!cancelled && generation.current === version) {
          setHeartbeatError((e as Error).message);
          if ((e as { code?: string }).code === "CONSULTATION_CHANGED" ||
              [401, 403].includes((e as { status?: number }).status ?? 0)) {
            setError((e as Error).message);
            release();
          }
        }
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [room?.id, room?.epoch, room?.active, apply, release]);
  const action = useCallback(
    (input: Record<string, unknown>) => {
      const captured = current.current;
      if (!captured?.active) return Promise.resolve(false);
      return run(
        () => stationAction(captured, input),
        (data) => {
          apply(data);
          if (!data.active) setPairing(null);
        },
      );
    },
    [run, apply],
  );
  const pair = useCallback(() => {
    const captured = current.current;
    if (!captured?.active) return Promise.resolve(false);
    return run(() => createConsultationPairing(captured), setPairing);
  }, [run]);
  return { room, busy, error: error || heartbeatError, conflict, pairing, open, action, pair };
}
