/**
 * Hospital Pharmacy — device 연결 상태 컨텍스트(로그인리스)
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §1·§11·§12·§16
 *
 * 일반 사용자(홈·병동·약제부)는 로그인하지 않는다. 이 컨텍스트는 "이 PC 가 병원약국 서비스에
 * 연결됐는가"만 다룬다(개인 신원 아님). 연결되면 이후 화면은 로그인 없이 동작한다(§12).
 * device 가 서버에서 revoke 되면(§16) AI 호출이 401 HOSPITAL_DEVICE_REQUIRED 를 반환하므로,
 * 화면이 `markDisconnected()` 로 상태를 되돌려 재연결 UX 를 다시 보여준다.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getDeviceSession, type DeviceSession } from '../lib/deviceSession';

type DeviceStatus = 'loading' | 'enrolled' | 'unenrolled';

interface DeviceContextValue {
  status: DeviceStatus;
  device: DeviceSession['device'];
  /** 서버에 연결 상태를 다시 물어본다(연결 직후 · 재확인). */
  refresh: () => Promise<void>;
  /** 연결이 끊긴 것으로 알려졌을 때(예: AI 401) 상태를 미연결로 되돌린다. */
  markDisconnected: () => void;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DeviceStatus>('loading');
  const [device, setDevice] = useState<DeviceSession['device']>(undefined);

  const refresh = useCallback(async () => {
    const session = await getDeviceSession();
    if (session.enrolled) {
      setDevice(session.device);
      setStatus('enrolled');
    } else {
      setDevice(undefined);
      setStatus('unenrolled');
    }
  }, []);

  const markDisconnected = useCallback(() => {
    setDevice(undefined);
    setStatus('unenrolled');
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <DeviceContext.Provider value={{ status, device, refresh, markDisconnected }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}
