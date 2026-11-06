import { signageNow } from '../../../lib/signageClock';
import { useEffect, useState } from 'react';
export function inRequiredWindow(item: { isForced?: boolean; forcedStartAt?: string | null; forcedEndAt?: string | null }, now = signageNow()): boolean {
  if (!item.isForced) return true;
  const start = item.forcedStartAt ? Date.parse(item.forcedStartAt) : -Infinity;
  const end = item.forcedEndAt ? Date.parse(item.forcedEndAt) : Infinity;
  return now >= start && now < end;
}
export function useSignageClock() {
  const [now, setNow] = useState(signageNow());
  useEffect(() => { const timer = setInterval(() => setNow(signageNow()), 1000); return () => clearInterval(timer); }, []);
  return now;
}
