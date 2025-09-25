import { useState, useEffect } from 'react';
import { vendorApi } from '@/services/api/vendorApi';

export type DocumentStatus = 'complete' | 'incomplete' | 'partial';
export type VendorStatus = 'all' | 'today' | 'urgent' | 'incomplete';
export type SortField = 'businessName' | 'appliedAt' | 'waitingDays' | null;
export type SortOrder = 'asc' | 'desc';

export interface PendingVendor {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessType: 'seller' | 'supplier';
  businessNumber: string;
  phoneNumber: string;
  address: string;
  documents: {
    businessLicense: boolean;
    taxCertificate: boolean;
    bankAccount: boolean;
  };
  appliedAt: string;
  message?: string;
  urgencyLevel?: 'normal' | 'urgent' | 'critical';
}

interface UseVendorsPendingDataProps {
  activeTab: VendorStatus;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  itemsPerPage: number;
}

export const useVendorsPendingData = ({
  activeTab,
  searchQuery,
  sortField,
  sortOrder,
  itemsPerPage
}: UseVendorsPendingDataProps) => {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate mock data for demonstration
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        
        // Mock data generation
        const mockVendors: PendingVendor[] = Array.from({ length: 25 }, (_, i) => {
          const daysAgo = Math.floor(Math.random() * 30);
          const appliedDate = new Date();
          appliedDate.setDate(appliedDate.getDate() - daysAgo);
          
          const hasAllDocs = Math.random() > 0.3;
          const hasPartialDocs = !hasAllDocs && Math.random() > 0.5;
          
          let urgencyLevel: 'normal' | 'urgent' | 'critical' = 'normal';
          if (daysAgo > 14) urgencyLevel = 'critical';
          else if (daysAgo > 7) urgencyLevel = 'urgent';
          
          return {
            id: `vendor-${i + 1}`,
            name: `담당자 ${i + 1}`,
            email: `vendor${i + 1}@example.com`,
            businessName: `${['주식회사', '유한회사', ''][Math.floor(Math.random() * 3)]} ${
              ['테크솔루션', '글로벌무역', '온라인마켓', '디지털커머스', '스마트스토어'][Math.floor(Math.random() * 5)]
            } ${i + 1}`,
            businessType: Math.random() > 0.5 ? 'seller' : 'supplier',
            businessNumber: `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 90000) + 10000}`,
            phoneNumber: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            address: `서울시 ${['강남구', '서초구', '송파구', '강동구', '마포구'][Math.floor(Math.random() * 5)]} 테헤란로 ${Math.floor(Math.random() * 500) + 1}`,
            documents: {
              businessLicense: hasAllDocs || (hasPartialDocs && Math.random() > 0.5),
              taxCertificate: hasAllDocs || (hasPartialDocs && Math.random() > 0.5),
              bankAccount: hasAllDocs || (hasPartialDocs && Math.random() > 0.5)
            },
            appliedAt: appliedDate.toISOString(),
            message: Math.random() > 0.7 ? '빠른 승인 부탁드립니다.' : undefined,
            urgencyLevel
          };
        });
        
        setVendors(mockVendors);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vendors');
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Calculate waiting days
  const calculateWaitingDays = (appliedAt: string) => {
    const applied = new Date(appliedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - applied.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get document status
  const getDocumentStatus = (documents: PendingVendor['documents']): DocumentStatus => {
    const completed = Object.values(documents).filter(v => v).length;
    if (completed === 3) return 'complete';
    if (completed === 0) return 'incomplete';
    return 'partial';
  };

  // Filter and sort vendors
  const getFilteredVendors = () => {
    let filtered = [...vendors];
    
    // Filter by tab
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (activeTab === 'today') {
      filtered = filtered.filter(v => {
        const appliedDate = new Date(v.appliedAt);
        appliedDate.setHours(0, 0, 0, 0);
        return appliedDate.getTime() === today.getTime();
      });
    } else if (activeTab === 'urgent') {
      filtered = filtered.filter(v => v.urgencyLevel === 'urgent' || v.urgencyLevel === 'critical');
    } else if (activeTab === 'incomplete') {
      filtered = filtered.filter(v => getDocumentStatus(v.documents) !== 'complete');
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(v => 
        v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.businessNumber.includes(searchQuery)
      );
    }
    
    // Sort
    if (sortField) {
      filtered = filtered.sort((a, b) => {
        if (sortField === 'businessName') {
          return sortOrder === 'asc' 
            ? a.businessName.localeCompare(b.businessName)
            : b.businessName.localeCompare(a.businessName);
        } else if (sortField === 'appliedAt') {
          return sortOrder === 'asc'
            ? new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
            : new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
        } else if (sortField === 'waitingDays') {
          const daysA = calculateWaitingDays(a.appliedAt);
          const daysB = calculateWaitingDays(b.appliedAt);
          return sortOrder === 'asc' ? daysA - daysB : daysB - daysA;
        }
        return 0;
      });
    } else {
      // Default sort by applied date desc
      filtered = filtered.sort((a, b) => 
        new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
    }
    
    // Apply pagination limit
    return filtered.slice(0, itemsPerPage);
  };

  // Get status counts
  const getStatusCounts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = vendors.filter(v => {
      const appliedDate = new Date(v.appliedAt);
      appliedDate.setHours(0, 0, 0, 0);
      return appliedDate.getTime() === today.getTime();
    }).length;
    
    const urgentCount = vendors.filter(v => 
      v.urgencyLevel === 'urgent' || v.urgencyLevel === 'critical'
    ).length;
    
    const incompleteCount = vendors.filter(v => 
      getDocumentStatus(v.documents) !== 'complete'
    ).length;
    
    return {
      all: vendors.length,
      today: todayCount,
      urgent: urgentCount,
      incomplete: incompleteCount
    };
  };

  return {
    vendors,
    setVendors,
    loading,
    error,
    filteredVendors: getFilteredVendors(),
    counts: getStatusCounts(),
    calculateWaitingDays,
    getDocumentStatus
  };
};