import { useState, useEffect } from 'react';

export interface VendorsPendingData {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  businessInfo?: any;
  // Additional fields that may be present
  urgencyLevel?: 'high' | 'medium' | 'low' | 'critical' | 'urgent';
  businessName?: string;
  businessNumber?: string;
  businessType?: string;
  phoneNumber?: string;
  address?: string;
  appliedAt?: string;
  documents?: any;
  message?: string;
}

export type PendingVendor = VendorsPendingData;
export type VendorStatus = 'pending' | 'approved' | 'rejected';
export type SortField = 'name' | 'email' | 'createdAt' | 'status';
export type SortOrder = 'asc' | 'desc';
export type DocumentStatus = 'complete' | 'incomplete' | 'pending';

interface UseVendorsPendingDataParams {
  activeTab: VendorStatus;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  itemsPerPage: number;
}

export const useVendorsPendingData = (params: UseVendorsPendingDataParams) => {
  const [data, setData] = useState<VendorsPendingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      setData([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params]);

  // Filter and sort data based on params
  const filteredVendors = data.filter(vendor => {
    if (params.activeTab !== 'pending' && vendor.status !== params.activeTab) return false;
    if (params.searchQuery && !vendor.name.toLowerCase().includes(params.searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const field = params.sortField;
    const order = params.sortOrder === 'asc' ? 1 : -1;
    return a[field] > b[field] ? order : -order;
  });

  // Calculate counts
  const counts = {
    pending: data.filter(v => v.status === 'pending').length,
    approved: data.filter(v => v.status === 'approved').length,
    rejected: data.filter(v => v.status === 'rejected').length,
    total: data.length
  };

  // Utility functions
  const calculateWaitingDays = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDocumentStatus = (vendor: VendorsPendingData) => {
    // Mock implementation
    return 'complete';
  };

  return {
    vendors: data,
    setVendors: setData,
    loading,
    error,
    filteredVendors,
    counts,
    calculateWaitingDays,
    getDocumentStatus,
    refetch: fetchData
  };
};

export default useVendorsPendingData;