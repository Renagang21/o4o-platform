import { useState } from 'react';
import { supplierApi, type SupplierProduct } from '../../../lib/api';
import { toast } from '@o4o/error-handling';

export function useSupplierDistribution(product: SupplierProduct | null, onSaved?: () => void) {
  const [distMgmtOpen, setDistMgmtOpen] = useState(false);
  const [distSaving, setDistSaving] = useState(false);
  const [distForm, setDistForm] = useState<{ isPublic: boolean; serviceKeys: string[] }>({
    isPublic: false,
    serviceKeys: [],
  });
  const [distConfirmRemove, setDistConfirmRemove] = useState<string[] | null>(null);

  const saveDistribution = async () => {
    if (!product) return;
    setDistSaving(true);
    try {
      const r = await supplierApi.updateDistribution(product.id, {
        isPublic: distForm.isPublic,
        serviceKeys: distForm.serviceKeys,
      });
      if (!r.success) {
        toast.error(`공급 방식 변경 실패: ${r.error || '오류'}`);
        setDistSaving(false);
        return;
      }
      toast.success('공급 방식이 변경되었습니다');
      setDistMgmtOpen(false);
      setDistConfirmRemove(null);
      onSaved?.();
    } catch {
      toast.error('공급 방식 변경 중 오류가 발생했습니다');
    } finally {
      setDistSaving(false);
    }
  };

  return {
    distMgmtOpen,
    setDistMgmtOpen,
    distSaving,
    distForm,
    setDistForm,
    distConfirmRemove,
    setDistConfirmRemove,
    saveDistribution,
  };
}
