import { vendorApi } from '@/services/api/vendorApi';
import toast from 'react-hot-toast';
import { PendingVendor } from './useVendorsPendingData';

interface UseVendorsPendingActionsProps {
  vendors: PendingVendor[];
  setVendors: (vendors: PendingVendor[]) => void;
}

export const useVendorsPendingActions = ({ vendors, setVendors }: UseVendorsPendingActionsProps) => {
  
  const handleApprove = async (id: string) => {
    if (confirm('이 판매자를 승인하시겠습니까?')) {
      try {
        // API call would go here
        await vendorApi.approve(id);
        
        // Remove from pending list after approval
        setVendors(vendors.filter(v => v.id !== id));
        toast.success('판매자가 승인되었습니다.');
        return true;
      } catch (error) {
        toast.error('승인 중 오류가 발생했습니다.');
        return false;
      }
    }
    return false;
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (reason) {
      try {
        // API call would go here
        await vendorApi.reject(id, reason);
        
        // Remove from pending list after rejection
        setVendors(vendors.filter(v => v.id !== id));
        toast.success('판매자 신청이 거부되었습니다.');
        return true;
      } catch (error) {
        toast.error('거부 처리 중 오류가 발생했습니다.');
        return false;
      }
    }
    return false;
  };

  const handleRequestDocuments = async (id: string) => {
    const vendor = vendors.find(v => v.id === id);
    if (!vendor) return false;
    
    const missingDocs = [];
    if (!vendor.documents.businessLicense) missingDocs.push('사업자등록증');
    if (!vendor.documents.taxCertificate) missingDocs.push('세금계산서');
    if (!vendor.documents.bankAccount) missingDocs.push('통장사본');
    
    if (missingDocs.length === 0) {
      alert('모든 서류가 제출되었습니다.');
      return false;
    }
    
    if (confirm(`다음 서류를 요청하시겠습니까?\n${missingDocs.join(', ')}`)) {
      try {
        // API call would go here
        await vendorApi.requestDocuments(id, missingDocs);
        
        toast.success('서류 요청 메일이 발송되었습니다.');
        return true;
      } catch (error) {
        toast.error('서류 요청 중 오류가 발생했습니다.');
        return false;
      }
    }
    return false;
  };

  const handleBulkAction = async (action: string, selectedIds: Set<string>) => {
    if (!action) {
      alert('작업을 선택해주세요.');
      return false;
    }
    
    if (selectedIds.size === 0) {
      alert('선택된 판매자가 없습니다.');
      return false;
    }
    
    if (action === 'approve') {
      if (confirm(`선택한 ${selectedIds.size}개 판매자를 승인하시겠습니까?`)) {
        try {
          const promises = Array.from(selectedIds).map(id => 
            vendorApi.approve(id)
          );
          
          await Promise.all(promises);
          setVendors(vendors.filter(v => !selectedIds.has(v.id)));
          toast.success(`${selectedIds.size}개 판매자가 승인되었습니다.`);
          return true;
        } catch (error) {
          toast.error('일괄 승인 중 오류가 발생했습니다.');
          return false;
        }
      }
    } else if (action === 'reject') {
      const reason = prompt('거부 사유를 입력하세요:');
      if (reason) {
        try {
          const promises = Array.from(selectedIds).map(id => 
            vendorApi.reject(id, reason)
          );
          
          await Promise.all(promises);
          setVendors(vendors.filter(v => !selectedIds.has(v.id)));
          toast.success(`${selectedIds.size}개 판매자 신청이 거부되었습니다.`);
          return true;
        } catch (error) {
          toast.error('일괄 거부 중 오류가 발생했습니다.');
          return false;
        }
      }
    } else if (action === 'message') {
      alert('메시지 발송 기능은 준비 중입니다.');
    }
    
    return false;
  };

  return {
    handleApprove,
    handleReject,
    handleRequestDocuments,
    handleBulkAction
  };
};