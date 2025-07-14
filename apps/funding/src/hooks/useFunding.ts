import { useState, useCallback } from 'react';
import { fundingApi } from '../api/fundingApi';
import type {
  FundingProject,
  FundingContribution,
  FundingCreateRequest,
  FundingUpdateRequest,
  FundingContributeRequest,
  FundingListParams,
  FundingListResponse,
} from '@o4o/types';

export const useFunding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleRequest = useCallback(async <T,>(
    request: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await request();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProjects = useCallback(
    (params: FundingListParams) =>
      handleRequest(() => fundingApi.getProjects(params)),
    [handleRequest]
  );

  const getProject = useCallback(
    (id: string) =>
      handleRequest(() => fundingApi.getProject(id)),
    [handleRequest]
  );

  const createProject = useCallback(
    (data: FundingCreateRequest) =>
      handleRequest(() => fundingApi.createProject(data)),
    [handleRequest]
  );

  const updateProject = useCallback(
    (id: string, data: FundingUpdateRequest) =>
      handleRequest(() => fundingApi.updateProject(id, data)),
    [handleRequest]
  );

  const deleteProject = useCallback(
    (id: string) =>
      handleRequest(() => fundingApi.deleteProject(id)),
    [handleRequest]
  );

  const contribute = useCallback(
    (projectId: string, data: FundingContributeRequest) =>
      handleRequest(() => fundingApi.contribute(projectId, data)),
    [handleRequest]
  );

  const getMyProjects = useCallback(
    (params?: FundingListParams) =>
      handleRequest(() => fundingApi.getMyProjects(params)),
    [handleRequest]
  );

  const getMyContributions = useCallback(
    () => handleRequest(() => fundingApi.getMyContributions()),
    [handleRequest]
  );

  return {
    // State
    isLoading,
    error,

    // Methods
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    contribute,
    getMyProjects,
    getMyContributions,
  };
};