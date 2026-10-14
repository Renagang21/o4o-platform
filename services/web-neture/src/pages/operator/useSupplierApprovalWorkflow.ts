import { useEffect, useRef, useState } from 'react';
import { useBatchAction } from '@o4o/operator-ux-core';
import { operatorSupplierApi, type AdminSupplier } from '../../lib/api';
import { EMPTY_EDIT_FORM, toEditForm, type SupplierEditForm } from './operatorSupplierApprovalModel';

export function useSupplierApprovalWorkflow(suppliers: AdminSupplier[], selectedIds: Set<string>, clearSelection: () => void, refetch: () => unknown) {
  const [drawer, setDrawer] = useState<AdminSupplier | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ ids: string[]; bulk: boolean; name?: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // WO-O4O-NETURE-OPERATOR-SUPPLIER-BASIC-INFO-COMPLETION-V1: 운영자 기본 정보 보완 (Drawer 내 편집)
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<SupplierEditForm>(EMPTY_EDIT_FORM);

  const batch = useBatchAction();

  // 드로어를 다시 열 때(다른 공급자 선택) 편집 모드 초기화
  useEffect(() => {
    setEditing(false);
  }, [drawer?.id]);

  // 저장 후 refetch 로 목록이 갱신되면, 열려 있는 드로어를 최신 행으로 동기화하여
  // backend 가 재계산한 activationReady/missingActivationFields 를 그대로 반영한다(프론트 재계산 금지).
  useEffect(() => {
    if (!drawer) return;
    const fresh = suppliers.find((s) => s.id === drawer.id);
    if (fresh && fresh !== drawer) setDrawer(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  const writing = useRef(false);
  const mounted = useRef(true);
  const busy = savingEdit || actionLoading !== null || batch.loading;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // 기본 정보·심사·일괄 재시도는 하나의 write lock으로 직렬화한다. 조회는 독립적이다.
  const runWrite = async (operation: () => Promise<void>) => {
    if (writing.current) return;
    writing.current = true;
    setActionMessage(null);
    try {
      await operation();
    } catch {
      if (mounted.current) setActionMessage({ type: 'error', text: '요청을 완료하지 못했습니다. 입력과 대상을 유지했습니다. 다시 시도해 주세요.' });
    } finally {
      writing.current = false;
      if (mounted.current) {
        setSavingEdit(false);
        setActionLoading(null);
      }
    }
  };
  const openDrawer = (supplier: AdminSupplier) => {
    if (writing.current) return;
    setActionMessage(null);
    setDrawer(supplier);
    setEditing(false);
  };
  const closeDrawer = () => { if (!writing.current) setDrawer(null); };
  const openCategories = (supplier: AdminSupplier) => {
    if (!writing.current) setCategoryModal({ id: supplier.id, name: supplier.name });
  };
  const closeCategories = () => setCategoryModal(null);
  const closeReject = () => {
    if (writing.current) return;
    setRejectModal(null);
    setRejectReason('');
  };
  const openSingleReject = (supplier: AdminSupplier) => {
    if (writing.current || supplier.status !== 'PENDING') return;
    setActionMessage(null);
    setRejectModal({ ids: [supplier.id], bulk: false, name: supplier.name });
    setRejectReason('');
  };
  const handleStartEdit = () => {
    if (!drawer || writing.current) return;
    setEditForm(toEditForm(drawer));
    setEditing(true);
  };
  const handleCancelEdit = () => {
    if (writing.current) return;
    setEditing(false);
    setEditForm(EMPTY_EDIT_FORM);
  };
  const handleSaveEdit = () => {
    if (!drawer || drawer.status !== 'PENDING') return;
    const target = drawer;
    const values = { ...editForm };
    return runWrite(async () => {
      setSavingEdit(true);
      const result = await operatorSupplierApi.updateBasicInfo(target.id, values);
      if (!mounted.current) return;
      if (!result.success) {
        setActionMessage({ type: 'error', text: '정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
        return;
      }
      setActionMessage({ type: 'success', text: `${target.name || '공급자'} 기본 정보를 저장했습니다.` });
      setEditing(false);
      refetch();
    });
  };
  const pendingSelectedIds = () => {
    const pending = new Set(suppliers.filter(s => s.status === 'PENDING').map(s => s.id));
    return Array.from(selectedIds).filter(id => pending.has(id));
  };
  const handleBulkApprove = () => {
    const ids = pendingSelectedIds();
    if (!ids.length) return;
    return runWrite(async () => {
      await batch.executeBatch(bids => operatorSupplierApi.batchProcess(bids, 'approve'), ids);
      if (mounted.current) clearSelection();
    });
  };
  const handleBulkReject = () => {
    const ids = pendingSelectedIds();
    if (!ids.length || writing.current) return;
    setActionMessage(null);
    setRejectModal({ ids, bulk: true });
    setRejectReason('');
  };
  const handleApproveSingle = (supplier: AdminSupplier) => {
    if (supplier.status !== 'PENDING') return;
    return runWrite(async () => {
      setActionLoading(supplier.id);
      const result = await operatorSupplierApi.approveSupplier(supplier.id);
      if (!mounted.current) return;
      if (result.success) {
        setActionMessage({ type: 'success', text: `${supplier.name || '공급자'} 승인 완료 (ACTIVE)` });
        setDrawer(null);
        refetch();
        return;
      }
      const messages: Record<string, string> = {
        INVALID_STATUS: '이미 처리된 공급자입니다. 목록을 새로고침합니다.',
        BUSINESS_REGISTRATION_REQUIRED: '사업자등록증 사본과 등록증의 필수 기재 정보를 확인해 주세요.',
        APPLICANT_NETURE_MEMBERSHIP_NOT_ACTIVE: '신청자의 메인 이메일 확인과 계정 상태를 확인해 주세요.',
        SUPPLIER_NOT_FOUND: '공급자를 찾을 수 없습니다.',
      };
      if (result.code === 'INVALID_STATUS') { setDrawer(null); refetch(); }
      setActionMessage({ type: 'error', text: messages[result.code ?? ''] ?? '승인에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    });
  };
  const handleRejectConfirm = () => {
    if (!rejectModal) return;
    const { ids, bulk, name } = rejectModal;
    const reason = rejectReason;
    return runWrite(async () => {
      if (bulk) {
        await batch.executeBatch((bids, opts) => operatorSupplierApi.batchProcess(bids, 'reject', opts?.reason as string | undefined), ids, { reason });
        if (!mounted.current) return;
        clearSelection();
      } else {
        setActionLoading(ids[0]);
        const ok = await operatorSupplierApi.rejectSupplier(ids[0], reason);
        if (!mounted.current) return;
        if (!ok) {
          setActionMessage({ type: 'error', text: '거절 처리에 실패했습니다. 다시 시도해 주세요.' });
          return;
        }
        setActionMessage({ type: 'success', text: `${name || '공급자'} 거절 처리 완료` });
        setDrawer(null);
        refetch();
      }
      setRejectModal(null);
      setRejectReason('');
    });
  };
  const handleDownloadDocument = async (supplierId: string, documentType: 'business_registration' | 'bank_statement' | 'mail_order_report') => {
    try {
      const blob = await operatorSupplierApi.downloadDocument(supplierId, documentType);
      if (!mounted.current) return;
      if (!blob) throw new Error('Document unavailable');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      if (mounted.current) setActionMessage({ type: 'error', text: '서류를 내려받지 못했습니다. 다시 시도해 주세요.' });
    }
  };
  const closeBatchResult = () => {
    if (writing.current) return;
    batch.clearResult();
    refetch();
  };
  const retryBatch = () => runWrite(async () => { await batch.retryFailed(); });
  return {
    drawer, categoryModal, rejectModal, rejectReason, setRejectReason,
    actionLoading, actionMessage, setActionMessage, editing, savingEdit,
    editForm, setEditForm, batch, busy, openDrawer,
    closeDrawer, openCategories, closeCategories, closeReject, openSingleReject,
    handleStartEdit, handleCancelEdit, handleSaveEdit, handleBulkApprove, handleBulkReject,
    handleApproveSingle, handleRejectConfirm, handleDownloadDocument, closeBatchResult, retryBatch,
  };
}
