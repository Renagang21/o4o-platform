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

  // Fetch pending vendors from database
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const response = await fetch(`${apiUrl}/api/vendors/pending`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Authentication required. Please login.');
            window.location.href = '/login';
          } else if (response.status === 500 || response.status === 503) {
            setError('Server error. Please try again later.');
          } else {
            setError(`Failed to fetch pending vendors: ${response.status}`);
          }
          setVendors([]);
          return;
        }
        
        const data = await response.json();
        const vendorsArray = data.data || data.vendors || [];
        
        // Transform API data to match PendingVendor interface
        const transformedVendors = vendorsArray.map((vendor: any) => {
          // Calculate waiting days
          const appliedDate = new Date(vendor.appliedAt || vendor.createdAt || vendor.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - appliedDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Determine urgency level based on waiting days
          let urgencyLevel: 'normal' | 'urgent' | 'critical' = 'normal';
          if (diffDays > 14) urgencyLevel = 'critical';
          else if (diffDays > 7) urgencyLevel = 'urgent';
          
          return {
            id: vendor.id,
            name: vendor.contactName || vendor.contact_name || vendor.name || 'Unknown',
            email: vendor.email || '',
            businessName: vendor.businessName || vendor.business_name || vendor.company_name || 'Unknown Business',
            businessType: vendor.businessType || vendor.business_type || vendor.type || 'seller',
            businessNumber: vendor.businessNumber || vendor.business_number || vendor.registration_number || '',
            phoneNumber: vendor.phoneNumber || vendor.phone_number || vendor.phone || '',
            address: vendor.address || vendor.business_address || '',
            documents: {
              businessLicense: vendor.documents?.businessLicense || vendor.has_business_license || false,
              taxCertificate: vendor.documents?.taxCertificate || vendor.has_tax_certificate || false,
              bankAccount: vendor.documents?.bankAccount || vendor.has_bank_account || false
            },
            appliedAt: vendor.appliedAt || vendor.createdAt || vendor.created_at || new Date().toISOString(),
            message: vendor.message || vendor.notes || undefined,
            urgencyLevel
          };
        });
        
        setVendors(transformedVendors);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vendors');
        setVendors([]);
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