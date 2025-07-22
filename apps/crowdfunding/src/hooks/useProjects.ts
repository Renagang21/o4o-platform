import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { 
  FundingProject, 
  ProjectFilters, 
  FundingProjectFormData,
  ProjectStats 
} from '@o4o/crowdfunding-types';
import type { Pagination } from '@o4o/types';

interface ProjectsResponse {
  projects: FundingProject[];
  pagination: Pagination;
}

// 프로젝트 목록 조회
export function useFundingProjects(filters?: ProjectFilters & { isStaffPick?: boolean }) {
  return useQuery<ProjectsResponse>({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else {
              params.append(key, String(value));
            }
          }
        });
      }

      const response = await authClient.api.get(`/api/crowdfunding/projects?${params}`);
      return response.data;
    },
  });
}

// 단일 프로젝트 조회
export function useFundingProject(projectId: string) {
  return useQuery<FundingProject>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await authClient.api.get(`/api/crowdfunding/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
  });
}

// 프로젝트 통계 조회
export function useProjectStats(projectId: string) {
  return useQuery<ProjectStats>({
    queryKey: ['project-stats', projectId],
    queryFn: async () => {
      const response = await authClient.api.get(`/api/crowdfunding/projects/${projectId}/stats`);
      return response.data;
    },
    enabled: !!projectId,
  });
}

// 프로젝트 생성
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<FundingProject, Error, FundingProjectFormData>({
    mutationFn: async (data) => {
      const formData = new FormData();
      
      // 파일이 아닌 필드들 추가
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'mainImage' && key !== 'images') {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        }
      });

      // 메인 이미지 추가
      if (data.mainImage && data.mainImage instanceof File) {
        formData.append('mainImage', data.mainImage);
      }

      // 추가 이미지들 추가
      if (data.images && Array.isArray(data.images)) {
        data.images.forEach((image) => {
          if (image instanceof File) {
            formData.append('images', image);
          }
        });
      }

      const response = await authClient.api.post('/api/crowdfunding/projects', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// 프로젝트 업데이트
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<FundingProject, Error, Partial<FundingProjectFormData>>({
    mutationFn: async (data) => {
      const response = await authClient.api.patch(`/api/crowdfunding/projects/${projectId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// 내가 만든 프로젝트 목록
export function useMyProjects(filters?: ProjectFilters) {
  return useQuery<ProjectsResponse>({
    queryKey: ['my-projects', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await authClient.api.get(`/api/crowdfunding/my-projects?${params}`);
      return response.data;
    },
  });
}

// 프로젝트 좋아요 토글
export function useToggleProjectLike(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      await authClient.api.post(`/api/crowdfunding/projects/${projectId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}