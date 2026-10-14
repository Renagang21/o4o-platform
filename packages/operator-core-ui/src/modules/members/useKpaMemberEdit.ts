import { useEffect, useRef, useState } from 'react';
import { toast } from '@o4o/error-handling';
import type { KpaEditUserModalProps } from './KpaEditUserModal';
import { buildKpaMemberSavePlan, canEditKpaMemberStatus, createKpaMemberDraft, validateKpaMemberInfo } from './kpaMemberEditModel';

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return '저장에 실패했습니다.';
}

/** info→status 순서, 성공한 단계의 기준값, 아직 저장하지 못한 초안의 소유자. */
export function useKpaMemberEdit({ member, makeRequest, onClose, onSuccess, canChangeMembershipType = false, canAdministerMemberStatus = false }: KpaEditUserModalProps) {
  const [form, setForm] = useState(() => createKpaMemberDraft(member));
  const baseline = useRef(form);
  const busy = useRef(false);
  const mounted = useRef(false);
  const needsRefresh = useRef(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [savedInfo, setSavedInfo] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refreshAndClose = async () => {
    try {
      if (needsRefresh.current) {
        await onSuccess();
        needsRefresh.current = false;
      }
      if (mounted.current) onClose();
    } catch {
      if (mounted.current) setActionError('저장된 변경 사항의 목록 갱신에 실패했습니다. 다시 저장하거나 닫기를 눌러 주세요.');
    }
  };

  const handleClose = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try { await refreshAndClose(); }
    finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const handleSave = async () => {
    if (busy.current || member.status === 'withdrawn' || member.capabilities?.includes('platform:super_admin')) return;
    const plan = buildKpaMemberSavePlan(baseline.current, form, canChangeMembershipType);
    const hasInfoChanges = Object.keys(plan.info).length > 0;
    const validationError = baseline.current.status === 'withdrawn' && (hasInfoChanges || plan.status !== undefined)
      ? '탈퇴 처리된 회원은 수정할 수 없습니다.'
      : plan.status && !canEditKpaMemberStatus(baseline.current.status, plan.status, canAdministerMemberStatus)
        ? '이 상태 변경은 서비스 관리자 권한이 필요합니다.'
        : validateKpaMemberInfo(plan.info);
    setActionError(validationError || '');
    if (validationError) return;
    busy.current = true;
    setSaving(true);
    try {
      if (hasInfoChanges) {
        const response: unknown = await makeRequest('PATCH', `/members/${member.id}/info`, plan.info);
        if (!mounted.current) return;
        baseline.current = { ...baseline.current, ...plan.info };
        needsRefresh.current = true;
        setSavedInfo(true);
        if (response && typeof response === 'object' && 'warnings' in response && Array.isArray(response.warnings)) {
          for (const warning of response.warnings) if (typeof warning === 'string') toast.warning(warning);
        }
      }
      if (plan.status) {
        await makeRequest('PATCH', `/members/${member.id}/status`, { status: plan.status });
        if (!mounted.current) return;
        baseline.current = { ...baseline.current, status: plan.status };
        needsRefresh.current = true;
      }
      if (needsRefresh.current) toast.success('회원 정보가 저장되었습니다.');
      await refreshAndClose();
    } catch (error: unknown) {
      if (mounted.current) setActionError(errorMessage(error));
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return { form, setForm, saving, actionError, savedInfo, savedActivity: baseline.current.activity_type, savedStatus: baseline.current.status, handleSave, handleClose };
}
