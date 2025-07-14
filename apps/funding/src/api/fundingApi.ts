import { createApiInstance, createEndpoints } from '@o4o/utils';
import type {
  FundingProject,
  FundingContribution,
  FundingCreateRequest,
  FundingUpdateRequest,
  FundingContributeRequest,
  FundingListParams,
  FundingListResponse,
} from '@o4o/types';

// Create axios instance
const axiosInstance = createApiInstance();

// Define funding endpoints
const FUNDING_ENDPOINTS = createEndpoints({
  LIST: '/api/funding',
  DETAIL: (id: string) => `/api/funding/${id}`,
  CREATE: '/api/funding',
  UPDATE: (id: string) => `/api/funding/${id}`,
  DELETE: (id: string) => `/api/funding/${id}`,
  PARTICIPATE: (id: string) => `/api/funding/${id}/participate`,
  CONTRIBUTIONS: '/api/funding/contributions',
  MY_PROJECTS: '/api/funding/my-projects',
  MY_CONTRIBUTIONS: '/api/funding/my-contributions',
});

export const fundingApi = {
  // Get funding projects list
  getProjects: async (params: FundingListParams): Promise<FundingListResponse> => {
    const response = await axiosInstance.get<FundingListResponse>(
      FUNDING_ENDPOINTS.LIST,
      { params }
    );
    return response.data;
  },

  // Get project details
  getProject: async (id: string): Promise<FundingProject> => {
    const response = await axiosInstance.get<FundingProject>(
      FUNDING_ENDPOINTS.DETAIL(id)
    );
    return response.data;
  },

  // Create new project
  createProject: async (data: FundingCreateRequest): Promise<FundingProject> => {
    const response = await axiosInstance.post<FundingProject>(
      FUNDING_ENDPOINTS.CREATE,
      data
    );
    return response.data;
  },

  // Update project
  updateProject: async (id: string, data: FundingUpdateRequest): Promise<FundingProject> => {
    const response = await axiosInstance.patch<FundingProject>(
      FUNDING_ENDPOINTS.UPDATE(id),
      data
    );
    return response.data;
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await axiosInstance.delete(FUNDING_ENDPOINTS.DELETE(id));
  },

  // Contribute to project
  contribute: async (
    projectId: string,
    data: FundingContributeRequest
  ): Promise<FundingContribution> => {
    const response = await axiosInstance.post<FundingContribution>(
      FUNDING_ENDPOINTS.PARTICIPATE(projectId),
      data
    );
    return response.data;
  },

  // Get my projects
  getMyProjects: async (params?: FundingListParams): Promise<FundingListResponse> => {
    const response = await axiosInstance.get<FundingListResponse>(
      FUNDING_ENDPOINTS.MY_PROJECTS,
      { params }
    );
    return response.data;
  },

  // Get my contributions
  getMyContributions: async (): Promise<FundingContribution[]> => {
    const response = await axiosInstance.get<FundingContribution[]>(
      FUNDING_ENDPOINTS.MY_CONTRIBUTIONS
    );
    return response.data;
  },
};