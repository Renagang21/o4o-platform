import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  TabletKioskPage,
  type IdlePlaylistItem,
  type TabletKioskDisplaySettings,
} from "@o4o/tablet-kiosk-core";
import {
  fetchTabletProducts,
  submitTabletInterest,
  checkTabletInterestStatus,
  fetchTabletScreen,
  fetchTabletIdle,
  fetchTabletSettings,
  loadStoredTabletDevice,
  clearStoredTabletDevice,
  deviceHeartbeat,
} from "../../api/tablet";
/** Public runtime adapter: all presentation and interest handling stay in kiosk-core. */
export default function TabletRunPage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  return (
    <TabletRuntime
      key={slug}
      slug={slug}
      queryTabletId={params.get("tabletId") || undefined}
      fromQr={params.get("from") === "qr"}
    />
  );
}
function TabletRuntime({
  slug,
  queryTabletId,
  fromQr,
}: {
  slug: string;
  queryTabletId?: string;
  fromQr: boolean;
}) {
  const [device, setDevice] = useState(() => {
    const d = loadStoredTabletDevice();
    return d?.storeSlug === slug ? d : null;
  });
  const [location, setLocation] = useState(device?.locationId || undefined),
    [version, setVersion] = useState<string>();
  const [idle, setIdle] = useState<IdlePlaylistItem[]>([]),
    [settings, setSettings] = useState<TabletKioskDisplaySettings>();
  const [deviceError, setDeviceError] = useState(""),
    [settingsError, setSettingsError] = useState(""),
    [retry, setRetry] = useState(0);
  const error = deviceError || settingsError;
  const tabletId = device ? location : queryTabletId;
  useEffect(() => {
    if (!device) return;
    let cancelled = false,
      timer: number | undefined;
    const poll = async () => {
      try {
        const value = await deviceHeartbeat(slug, device.deviceToken);
        if (!cancelled) {
          setLocation(value.locationId || undefined);
          setVersion(value.version);
          setDeviceError("");
        }
      } catch (e) {
        if (!cancelled) {
          setDeviceError("태블릿 연결 상태를 확인하지 못했습니다.");
          if ((e as { status?: number }).status === 401) {
            setDeviceError("태블릿 연결이 해제되었습니다. 기기를 다시 연결해 주세요.");
            clearStoredTabletDevice();
            setDevice(null);
          }
        }
      } finally {
        if (!cancelled) timer = window.setTimeout(() => void poll(), 15_000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [device, slug, retry]);
  useEffect(() => {
    let alive = true;
    setSettingsError("");
    setIdle([]);
    setSettings(undefined);
    Promise.all([fetchTabletIdle(slug, tabletId), fetchTabletSettings(slug)])
      .then(([i, s]) => {
        if (alive) {
          setIdle(i);
          setSettings(s);
        }
      })
      .catch(() => {
        if (alive) setSettingsError("일부 진열 설정을 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [slug, tabletId, version, retry]);
  const api = useMemo(
    () => ({
      fetchProducts: (
        s: string,
        p?: Parameters<typeof fetchTabletProducts>[1],
      ) => fetchTabletProducts(s, { ...p, tabletId }),
      submitInterest: submitTabletInterest,
      checkStatus: checkTabletInterestStatus,
      fetchScreen: (s: string, p?: { language?: string }) =>
        fetchTabletScreen(s, tabletId, p?.language),
    }),
    [tabletId],
  );
  return (
    <div className="min-h-screen bg-slate-50">
      {error && (
        <div role="alert" className="fixed inset-x-0 top-0 z-[1100] flex flex-wrap items-center gap-3 bg-amber-50 p-3 shadow-lg">
          <p>{error}</p>
          <button
            className="min-h-11 rounded border px-4"
            onClick={() => setRetry((n) => n + 1)}
          >
            다시 확인
          </button>
          {!device && (
            <a className="min-h-11 p-3 underline" href="/tablet/setup?reset=1">
              기기 다시 연결
            </a>
          )}
        </div>
      )}
      <TabletKioskPage
        api={api}
        showQrBadge={fromQr}
        idleTimeoutMs={60_000}
        idlePlaylist={idle}
        displaySettings={settings}
        screenRefreshKey={version}
      />
    </div>
  );
}
