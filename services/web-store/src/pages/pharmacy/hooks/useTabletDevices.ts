import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cornerPrimaryLabel,
  type TabletCornerItem,
} from "@o4o/tablet-screen-set-editor";
import {
  createPairingCode,
  disconnectTabletDevice,
  fetchTabletDevices,
  updateTabletDevice,
  type TabletDevice,
} from "../../../api/tabletDisplays";
import { useLatestStoreRequest } from "./useLatestStoreRequest";
import type { TabletOperationToast } from "../tablet/TabletOperationPanels";

export interface TabletPairing {
  locationId: string;
  locationLabel: string;
  code: string;
  expiresAt: string;
  returnFocus?: HTMLElement;
}

/** Location/content editing and physical device operations have separate owners. */
export function useTabletDevices(
  organizationId: string,
  tablets: TabletCornerItem[],
  notify: (toast: TabletOperationToast) => void,
) {
  const listRequest = useLatestStoreRequest(organizationId);
  const operationRequest = useLatestStoreRequest(organizationId);
  const currentStore = useRef(organizationId);
  const storeRevision = useRef(0);
  if (currentStore.current !== organizationId) {
    currentStore.current = organizationId;
    storeRevision.current++;
  }
  useEffect(
    () => () => {
      storeRevision.current++;
    },
    [],
  );
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const deviceLocks = useRef(new Map<string, Set<string>>());
  const pairingLocks = useRef(new Map<string, string>());
  const [devices, setDevices] = useState<TabletDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [pairingBusyId, setPairingBusyId] = useState<string | null>(null);
  const [pairing, setPairing] = useState<TabletPairing | null>(null);

  const reloadDevices = useCallback(async () => {
    if (currentStore.current !== organizationId || !organizationId) return;
    const isCurrent = listRequest.begin();
    setLoading(true);
    setLoadError(null);
    try {
      const items = await fetchTabletDevices();
      if (isCurrent()) setDevices(items);
    } catch {
      if (isCurrent())
        setLoadError(
          "연결된 태블릿을 불러오지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [organizationId, listRequest]);

  useEffect(() => {
    setDevices([]);
    setLoadError(null);
    setLoading(false);
    setPairing(null);
    setPairingBusyId(pairingLocks.current.get(organizationId) ?? null);
    setBusyIds(new Set(deviceLocks.current.get(organizationId)));
    void reloadDevices();
  }, [organizationId, reloadDevices]);

  const connectedDevices = useMemo(
    () => devices.filter((d) => d.isActive && !d.pairingPending),
    [devices],
  );
  const devicesByLocation = useMemo(() => {
    const result: Record<string, TabletDevice[]> = {};
    for (const device of connectedDevices) {
      if (device.currentLocationId)
        (result[device.currentLocationId] ||= []).push(device);
    }
    return result;
  }, [connectedDevices]);

  const handleCreatePairingCode = async (tablet: TabletCornerItem) => {
    if (
      !organizationId ||
      currentStore.current !== organizationId ||
      pairingLocks.current.has(organizationId)
    )
      return;
    const isCurrent = operationRequest.begin();
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    pairingLocks.current.set(organizationId, tablet.id);
    setPairingBusyId(tablet.id);
    try {
      const result = await createPairingCode(tablet.id);
      if (isCurrent())
        setPairing({
          locationId: tablet.id,
          locationLabel: cornerPrimaryLabel(tablet),
          code: result.code,
          expiresAt: result.expiresAt,
          returnFocus,
        });
    } catch {
      if (isCurrent())
        notifyRef.current({
          type: "error",
          message: "연결 코드를 발급하지 못했습니다. 다시 시도해 주세요.",
        });
    } finally {
      pairingLocks.current.delete(organizationId);
      if (currentStore.current === organizationId) setPairingBusyId(null);
    }
  };

  const runDeviceOperation = async (
    device: TabletDevice,
    task: () => Promise<void>,
    successMessage: string,
  ) => {
    if (
      !organizationId ||
      currentStore.current !== organizationId ||
      device.organizationId !== organizationId
    )
      return;
    const locks = deviceLocks.current.get(organizationId) ?? new Set<string>();
    if (locks.has(device.id)) return;
    deviceLocks.current.set(organizationId, locks);
    locks.add(device.id);
    setBusyIds(new Set(locks));
    // Capture a store lifetime without invalidating independent device requests.
    const revision = storeRevision.current;
    const isCurrent = () =>
      revision === storeRevision.current &&
      currentStore.current === organizationId;
    try {
      await task();
      if (!isCurrent()) return;
      await reloadDevices();
      if (isCurrent())
        notifyRef.current({ type: "success", message: successMessage });
    } catch {
      if (isCurrent())
        notifyRef.current({
          type: "error",
          message: "태블릿 작업을 완료하지 못했습니다. 다시 시도해 주세요.",
        });
    } finally {
      locks.delete(device.id);
      if (!locks.size) deviceLocks.current.delete(organizationId);
      if (currentStore.current === organizationId) setBusyIds(new Set(locks));
    }
  };

  const handleMoveDevice = (device: TabletDevice, locationId: string) => {
    const target = tablets.find((t) => t.id === locationId);
    if (!target || locationId === device.currentLocationId) return;
    return runDeviceOperation(
      device,
      () =>
        updateTabletDevice(device.id, { currentLocationId: locationId }).then(
          () => undefined,
        ),
      `"${device.name}" 을(를) ${cornerPrimaryLabel(target)} 위치로 옮겼습니다. 태블릿 화면은 자동으로 바뀝니다.`,
    );
  };
  const handleDisconnectDevice = (device: TabletDevice) => {
    if (busyIds.has(device.id)) return;
    if (
      !confirm(
        `"${device.name}" 연결을 해제하시겠습니까?\n다시 쓰려면 새 연결 코드로 연결해야 합니다.`,
      )
    )
      return;
    return runDeviceOperation(
      device,
      () => disconnectTabletDevice(device.id),
      `"${device.name}" 연결을 해제했습니다.`,
    );
  };
  const closePairing = useCallback(() => {
    setPairing(null);
    void reloadDevices();
  }, [reloadDevices]);
  return {
    connectedDevices,
    devicesByLocation,
    loading,
    loadError,
    reloadDevices,
    busyIds,
    pairingBusyId,
    pairing,
    closePairing,
    handleCreatePairingCode,
    handleMoveDevice,
    handleDisconnectDevice,
  };
}
