import { createContext, useContext, type ReactNode } from 'react';
import { Link, useNavigate, type LinkProps } from 'react-router-dom';
import type { LectureOperatorApi } from './api';

export interface LectureOperationBindings {
  api: LectureOperatorApi;
  toast: { success(message: string): void; error(message: string): void };
  path?: (sourcePath: string) => string;
}
const Context = createContext<LectureOperationBindings | null>(null);
export function LectureOperationsProvider({ children, ...bindings }: LectureOperationBindings & { children: ReactNode }) {
  return <Context.Provider value={bindings}>{children}</Context.Provider>;
}
export function useLectureBindings(override?: LectureOperationBindings) {
  const context = useContext(Context);
  const bindings = override ?? context;
  if (!bindings) throw new Error('LectureOperationsProvider is required');
  return bindings;
}
export function OperationLink({ to, ...props }: LinkProps) {
  const { path } = useLectureBindings();
  return <Link {...props} to={typeof to === 'string' && path ? path(to) : to} />;
}
export function useOperationNavigate() {
  const navigate = useNavigate();
  const { path } = useLectureBindings();
  return (target: string) => {
    const mapped = path ? path(target) : target;
    if (/^https:\/\//.test(mapped)) window.location.assign(mapped);
    else navigate(mapped);
  };
}

export function useLectureToast(override?: LectureOperationBindings['toast']) {
  const context = useContext(Context);
  const toast = override ?? context?.toast;
  if (!toast) throw new Error('Lecture operations feedback is required');
  return toast;
}
