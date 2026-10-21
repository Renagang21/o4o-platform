import { useCallback, useState, type SetStateAction } from 'react';

export type ConsultationDirection = 'to-customer' | 'to-staff';
const emptyDrafts = <T,>() => ({
  'to-customer': { text: '', result: null as T | null },
  'to-staff': { text: '', result: null as T | null },
});

/** Two in-memory drafts for the current consultation, discarded with its page lifetime. */
export function useConsultationDrafts<T>(direction: ConsultationDirection) {
  const [drafts, setDrafts] = useState(emptyDrafts<T>);
  const setText = useCallback((value: SetStateAction<string>) => setDrafts(previous => ({
    ...previous,
    [direction]: { ...previous[direction], text: typeof value === 'function' ? value(previous[direction].text) : value },
  })), [direction]);
  const setResult = useCallback((result: T | null) => setDrafts(previous => ({
    ...previous, [direction]: { ...previous[direction], result },
  })), [direction]);
  const clearDrafts = useCallback(() => setDrafts(emptyDrafts<T>()), []);
  return { ...drafts[direction], setText, setResult, clearDrafts };
}
