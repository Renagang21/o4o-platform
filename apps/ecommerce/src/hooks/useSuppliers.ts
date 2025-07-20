import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  SupplierProfile,
  SupplierPublicProfile,
  SupplierProfileFormData,
  SupplierStats,
  ProductFilters
} from '@o4o/types/ecommerce';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ApiError } from '@/types/api';

// Fetch public supplier profile
export const useSupplierPublicProfile = (slug: string) => {
  return useQuery<SupplierPublicProfile>({
    queryKey: ['supplier', 'public', slug],
    queryFn: () => api.suppliers.getPublicProfile(slug),
    enabled: !!slug
  });
};

// Fetch supplier's public products
export const useSupplierPublicProducts = (supplierId: string, filters?: ProductFilters) => {
  return useQuery({
    queryKey: ['supplier', supplierId, 'products', filters],
    queryFn: () => api.suppliers.getPublicProducts(supplierId, filters),
    enabled: !!supplierId
  });
};

// Fetch current supplier's profile
export const useMySupplierProfile = () => {
  return useQuery<SupplierProfile>({
    queryKey: ['supplier', 'profile'],
    queryFn: api.suppliers.getMyProfile
  });
};

// Update supplier profile
export const useUpdateSupplierProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.suppliers.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['supplier', 'profile'], data);
      queryClient.invalidateQueries({ 
        queryKey: ['supplier', 'public', data.storeSlug] 
      });
      toast.success('매장 정보가 업데이트되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '매장 정보 업데이트에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Upload logo
export const useUploadSupplierLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.suppliers.uploadLogo,
    onSuccess: (data) => {
      // Update the profile with new logo URL
      queryClient.setQueryData(['supplier', 'profile'], (old: SupplierProfile | undefined) => {
        if (!old) return old;
        return { ...old, logo: data.url };
      });
      toast.success('로고가 업로드되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '로고 업로드에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Upload banner
export const useUploadSupplierBanner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.suppliers.uploadBanner,
    onSuccess: (data) => {
      // Update the profile with new banner URL
      queryClient.setQueryData(['supplier', 'profile'], (old: SupplierProfile | undefined) => {
        if (!old) return old;
        return { ...old, banner: data.url };
      });
      toast.success('배너가 업로드되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '배너 업로드에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Get supplier statistics
export const useSupplierStats = () => {
  return useQuery<SupplierStats>({
    queryKey: ['supplier', 'stats'],
    queryFn: api.suppliers.getStats
  });
};

// Check slug availability
export const useCheckSlugAvailability = (slug: string) => {
  return useQuery({
    queryKey: ['supplier', 'slug-check', slug],
    queryFn: () => api.suppliers.checkSlugAvailability(slug),
    enabled: !!slug && slug.length > 2,
    staleTime: 0 // Always check fresh
  });
};

// Generate slug
export const useGenerateSlug = () => {
  return useMutation({
    mutationFn: api.suppliers.generateSlug,
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || 'URL 생성에 실패했습니다.';
      toast.error(message);
    }
  });
};